import { getDb } from '../../database/db.js';
import { getFormattedDate } from '../../database/seed.js';

export class PatientService {
  constructor(db = getDb()) {
    this.db = db;
  }

  /**
   * Adds a new patient record.
   */
  createPatient({
    name,
    phone,
    consultation_date,
    next_followup_date,
    followup_status = 'pending',
    doctor_name = 'Dr. Sarah Mitchell',
    condition_or_treatment = 'General Consultation',
    notes = ''
  }) {
    const stmt = this.db.prepare(`
      INSERT INTO patients (
        name,
        phone,
        consultation_date,
        next_followup_date,
        followup_status,
        doctor_name,
        condition_or_treatment,
        notes,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    const result = stmt.run(
      name.trim(),
      phone.trim(),
      consultation_date.trim(),
      next_followup_date.trim(),
      followup_status,
      doctor_name?.trim() || 'Dr. Sarah Mitchell',
      condition_or_treatment?.trim() || 'General Consultation',
      notes?.trim() || ''
    );

    return this.getPatientById(result.lastInsertRowid);
  }

  /**
   * Retrieves all patients, optionally filtered by status ('pending' | 'completed').
   */
  getAllPatients({ status } = {}) {
    let query = `
      SELECT 
        p.*,
        d.id AS latest_draft_id,
        d.message AS latest_draft_message,
        d.status AS latest_draft_status,
        d.ai_provider AS latest_draft_provider,
        d.is_mock AS latest_draft_is_mock,
        d.created_at AS latest_draft_created_at
      FROM patients p
      LEFT JOIN followup_drafts d ON d.id = (
        SELECT id FROM followup_drafts 
        WHERE patient_id = p.id 
        ORDER BY created_at DESC, id DESC 
        LIMIT 1
      )
    `;

    const params = [];
    if (status) {
      query += ` WHERE p.followup_status = ?`;
      params.push(status);
    }

    query += ` ORDER BY p.next_followup_date ASC, p.id DESC`;

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Retrieves patients whose follow-up is due today.
   * @param {string} [date] Optional YYYY-MM-DD date override (defaults to current date)
   * @param {boolean} [includeOverdue=true] Also includes past due pending patients
   */
  getPatientsDueToday(date, includeOverdue = true) {
    const targetDate = date || getFormattedDate(0);

    const operator = includeOverdue ? '<=' : '=';
    const query = `
      SELECT 
        p.*,
        d.id AS latest_draft_id,
        d.message AS latest_draft_message,
        d.status AS latest_draft_status,
        d.ai_provider AS latest_draft_provider,
        d.is_mock AS latest_draft_is_mock,
        d.created_at AS latest_draft_created_at
      FROM patients p
      LEFT JOIN followup_drafts d ON d.id = (
        SELECT id FROM followup_drafts 
        WHERE patient_id = p.id 
        ORDER BY created_at DESC, id DESC 
        LIMIT 1
      )
      WHERE p.next_followup_date ${operator} ?
        AND p.followup_status = 'pending'
      ORDER BY p.next_followup_date ASC, p.id ASC
    `;

    const stmt = this.db.prepare(query);
    return stmt.all(targetDate);
  }

  /**
   * Retrieves single patient by ID along with their follow-up draft history.
   */
  getPatientById(id) {
    const patientStmt = this.db.prepare(`SELECT * FROM patients WHERE id = ?`);
    const patient = patientStmt.get(id);

    if (!patient) return null;

    const draftsStmt = this.db.prepare(`
      SELECT * FROM followup_drafts 
      WHERE patient_id = ? 
      ORDER BY created_at DESC, id DESC
    `);
    const drafts = draftsStmt.all(id);

    return {
      ...patient,
      drafts
    };
  }

  /**
   * Updates a patient's follow-up status (e.g., 'completed' or 'pending').
   */
  updateFollowupStatus(id, status) {
    const existing = this.db.prepare(`SELECT * FROM patients WHERE id = ?`).get(id);
    if (!existing) {
      return null;
    }

    const stmt = this.db.prepare(`
      UPDATE patients 
      SET followup_status = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(status, id);

    return this.getPatientById(id);
  }

  /**
   * Deletes a patient (cascades to drafts).
   */
  deletePatient(id) {
    const existing = this.db.prepare(`SELECT * FROM patients WHERE id = ?`).get(id);
    if (!existing) return false;

    this.db.prepare(`DELETE FROM patients WHERE id = ?`).run(id);
    return true;
  }
}

export const patientService = new PatientService();
