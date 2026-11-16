import { getDb } from '../../database/db.js';
import { patientService } from './patientService.js';
import { getFormattedDate } from '../../database/seed.js';

export class AIService {
  constructor(db = getDb()) {
    this.db = db;
    this.clinicName = process.env.CLINIC_NAME || 'Apex Health & Wellness Clinic';
    this.clinicPhone = process.env.CLINIC_PHONE || '+1 (555) 019-2831';
  }

  /**
   * Generates a personalized clinical follow-up draft using condition-specific templates.
   * Used as the robust fallback when external AI APIs are not configured or unreachable.
   */
  generateClinicalMockMessage(patient, options = {}) {
    const { name, doctor_name, condition_or_treatment, consultation_date, notes } = patient;
    const conditionLower = (condition_or_treatment || '').toLowerCase();
    const firstName = name.split(' ')[0];
    const drName = doctor_name || 'your care team';

    let specificCheck = `How have you been feeling since your consultation on ${consultation_date}?`;

    if (conditionLower.includes('root canal') || conditionLower.includes('tooth') || conditionLower.includes('dental')) {
      specificCheck = `We want to check on your recovery after your dental procedure:
• Has the local soreness or swelling subsided?
• Are you able to chew soft foods comfortably?
• Please continue taking any prescribed antibiotic or rinse as instructed.`;
    } else if (conditionLower.includes('hypertension') || conditionLower.includes('blood pressure')) {
      specificCheck = `We're following up on your blood pressure medication adjustment:
• Have you taken your morning BP readings this week?
• Have you experienced any dizziness, lightheadedness, or persistent cough?
• Please keep a written log of your morning and evening readings.`;
    } else if (conditionLower.includes('bronchitis') || conditionLower.includes('asthma') || conditionLower.includes('respiratory')) {
      specificCheck = `Following up regarding your respiratory check-up:
• How is your breathing feeling today?
• Has the coughing eased, especially at night?
• Are you using your inhaler as directed by Dr. ${drName.replace(/^Dr\.\s*/i, '')}?`;
    } else if (conditionLower.includes('knee') || conditionLower.includes('ortho') || conditionLower.includes('surgery') || conditionLower.includes('post-op')) {
      specificCheck = `Checking in on your post-procedure rehabilitation:
• How is your range of motion and joint stiffness?
• Are you keeping up with your recommended exercises and ice application?
• Is your pain well-managed?`;
    } else {
      specificCheck = `How is your recovery and overall comfort progressing today? Please let us know if your symptoms have improved as expected.`;
    }

    const clinicalNoteReference = notes
      ? `\n\n📌 *Care Note:* ${notes}`
      : '';

    return `Hello ${firstName}! 👋

This is your care coordinator from *${this.clinicName}* following up on your consultation with *${drName}* on ${consultation_date} for *${condition_or_treatment}*.

${specificCheck}${clinicalNoteReference}

💬 *Next Step:* Simply reply directly to this message with how you're feeling today, or call us at ${this.clinicPhone} if you need to schedule an earlier review.

*(If you experience severe pain, high fever, or unexpected symptoms, please seek urgent medical evaluation).*

Wishing you a smooth recovery! 🩺`;
  }

  /**
   * Generates a personalized WhatsApp message draft for a patient using Gemini API or OpenAI.
   * If API keys are not present or the call fails, automatically falls back to ClinicalMockEngine.
   */
  async generateFollowupDraft(patientId, options = {}) {
    const patient = patientService.getPatientById(patientId);
    if (!patient) {
      throw new Error(`Patient with ID ${patientId} not found.`);
    }

    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const openaiKey = process.env.OPENAI_API_KEY?.trim();

    let draftMessage = '';
    let aiProvider = 'mock-clinical-engine';
    let isMock = 1;
    let aiNote = 'Generated via Built-in Clinical Mock Engine (no external API key provided). Provide GEMINI_API_KEY in .env to use live Gemini model.';

    // Try live Gemini if configured
    if (geminiKey) {
      try {
        const geminiResult = await this.callGeminiAPI(patient, geminiKey, options);
        draftMessage = geminiResult.message;
        aiProvider = geminiResult.model;
        isMock = 0;
        aiNote = `Live generation successful via Google ${geminiResult.model}.`;
      } catch (err) {
        console.warn(`Gemini API call failed: ${err.message}. Falling back to Clinical Mock Engine.`);
        draftMessage = this.generateClinicalMockMessage(patient, options);
        aiNote = `Gemini API attempt failed (${err.message}). Gracefully fell back to Clinical Mock Engine.`;
      }
    } else if (openaiKey) {
      try {
        const openaiResult = await this.callOpenAI(patient, openaiKey, options);
        draftMessage = openaiResult.message;
        aiProvider = openaiResult.model;
        isMock = 0;
        aiNote = `Live generation successful via OpenAI ${openaiResult.model}.`;
      } catch (err) {
        console.warn(`OpenAI API call failed: ${err.message}. Falling back to Clinical Mock Engine.`);
        draftMessage = this.generateClinicalMockMessage(patient, options);
        aiNote = `OpenAI API attempt failed (${err.message}). Gracefully fell back to Clinical Mock Engine.`;
      }
    } else {
      // Use Clinical Mock Engine
      draftMessage = this.generateClinicalMockMessage(patient, options);
    }

    // Save draft to SQLite database
    const stmt = this.db.prepare(`
      INSERT INTO followup_drafts (
        patient_id,
        message,
        status,
        ai_provider,
        is_mock,
        ai_note,
        tone,
        created_at,
        updated_at
      )
      VALUES (?, ?, 'pending_review', ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    const result = stmt.run(
      patientId,
      draftMessage.trim(),
      aiProvider,
      isMock,
      aiNote,
      options.tone || 'caring'
    );

    const draft = this.getDraftById(result.lastInsertRowid);
    return {
      draft,
      patient
    };
  }

  /**
   * Calls Google Gemini REST API (gemini-2.5-flash with fallback to gemini-1.5-flash)
   */
  async callGeminiAPI(patient, apiKey, options = {}) {
    const prompt = this.buildPrompt(patient, options);
    const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash'];
    let lastError = null;

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 600
            }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
          throw new Error('Empty response received from Gemini');
        }

        return { message: text.trim(), model };
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('Failed to connect to Gemini API');
  }

  /**
   * Calls OpenAI Chat Completions API
   */
  async callOpenAI(patient, apiKey, options = {}) {
    const prompt = this.buildPrompt(patient, options);
    const model = 'gpt-4o-mini';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `You are a clinical care coordinator at ${this.clinicName}. You write personalized, caring, and professional follow-up WhatsApp messages to patients.`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('Empty response received from OpenAI');
    }

    return { message: text.trim(), model };
  }

  /**
   * Builds clinical prompt for LLMs
   */
  buildPrompt(patient, options = {}) {
    return `Generate a warm, professional, personalized WhatsApp follow-up message for a patient.
Clinic Name: ${this.clinicName}
Clinic Phone: ${this.clinicPhone}

Patient Details:
- Name: ${patient.name}
- Phone: ${patient.phone}
- Consultation Date: ${patient.consultation_date}
- Attending Doctor: ${patient.doctor_name || 'Dr. Sarah Mitchell'}
- Treatment/Condition: ${patient.condition_or_treatment || 'General Consultation'}
- Clinical Notes/Instructions: ${patient.notes || 'Routine check-in'}

Requirements:
1. Address the patient warmly by their first name.
2. Introduce yourself as their clinic care coordinator from ${this.clinicName}.
3. Specifically mention their consultation date and the specific treatment/condition.
4. Ask 1-2 targeted recovery questions relevant to their condition (e.g., pain scale, swelling, medication adherence, blood pressure, mobility).
5. Remind them they can reply to this message directly or call ${this.clinicPhone}.
6. Add a brief medical caution advising them to seek urgent care if experiencing severe warning signs.
7. Format suitably for WhatsApp using clean line breaks, bold formatting (*bold*), and a few tasteful emojis (🩺, 👋).
8. Do NOT include any placeholders or brackets like [Date] or [Name]. Use the exact patient data provided above.`;
  }

  /**
   * Retrieves single draft by ID with patient details
   */
  getDraftById(id) {
    const stmt = this.db.prepare(`
      SELECT 
        d.*,
        p.name AS patient_name,
        p.phone AS patient_phone,
        p.consultation_date,
        p.next_followup_date,
        p.doctor_name,
        p.condition_or_treatment,
        p.followup_status AS patient_followup_status
      FROM followup_drafts d
      JOIN patients p ON p.id = d.patient_id
      WHERE d.id = ?
    `);
    return stmt.get(id);
  }

  /**
   * Retrieves all drafts, optionally filtered by status ('pending_review', 'approved', 'rejected')
   */
  getAllDrafts(status) {
    let query = `
      SELECT 
        d.*,
        p.name AS patient_name,
        p.phone AS patient_phone,
        p.consultation_date,
        p.next_followup_date,
        p.doctor_name,
        p.condition_or_treatment,
        p.followup_status AS patient_followup_status
      FROM followup_drafts d
      JOIN patients p ON p.id = d.patient_id
    `;
    const params = [];
    if (status) {
      query += ` WHERE d.status = ?`;
      params.push(status);
    }
    query += ` ORDER BY d.created_at DESC, d.id DESC`;

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Batch generates drafts for all patients whose follow-up is due and do not yet have a pending draft.
   */
  async batchGenerateDueFollowups(date) {
    const duePatients = patientService.getPatientsDueToday(date);
    const results = [];

    for (const patient of duePatients) {
      // If patient already has a pending draft, skip regenerating to prevent duplicate pending reviews
      const existingDraft = this.db.prepare(`
        SELECT id FROM followup_drafts 
        WHERE patient_id = ? AND status = 'pending_review'
      `).get(patient.id);

      if (existingDraft) {
        results.push({
          patientId: patient.id,
          name: patient.name,
          status: 'already_pending',
          draftId: existingDraft.id
        });
      } else {
        const generated = await this.generateFollowupDraft(patient.id);
        results.push({
          patientId: patient.id,
          name: patient.name,
          status: 'generated',
          draftId: generated.draft.id,
          provider: generated.draft.ai_provider,
          is_mock: generated.draft.is_mock
        });
      }
    }

    return results;
  }

  /**
   * Reviews and approves or rejects a draft.
   * On approval, simulates mock WhatsApp sending and automatically updates patient's followup_status to 'completed'.
   */
  reviewDraft(draftId, { status, edited_message, reviewer = 'Clinic Staff Nurse', notes = '' }) {
    const draft = this.getDraftById(draftId);
    if (!draft) {
      return null;
    }

    const finalMessage = edited_message !== undefined ? edited_message.trim() : draft.message;

    // Update draft record
    const updateDraftStmt = this.db.prepare(`
      UPDATE followup_drafts
      SET 
        status = ?,
        message = ?,
        reviewed_by = ?,
        staff_notes = ?,
        reviewed_at = datetime('now'),
        updated_at = datetime('now')
      WHERE id = ?
    `);
    updateDraftStmt.run(status, finalMessage, reviewer, notes, draftId);

    let mockDispatch = null;

    if (status === 'approved') {
      // Mock WhatsApp Dispatch
      mockDispatch = {
        mockMessageId: `wamid.mock_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        recipientPhone: draft.patient_phone,
        recipientName: draft.patient_name,
        dispatchedAt: new Date().toISOString(),
        messageText: finalMessage,
        deliveryStatus: 'simulated_delivered',
        note: 'WhatsApp message dispatch mocked for safety and compliance. No real SMS/WhatsApp sent.'
      };

      // Automatically update patient follow-up status to completed!
      patientService.updateFollowupStatus(draft.patient_id, 'completed');
    }

    const updatedDraft = this.getDraftById(draftId);
    const updatedPatient = patientService.getPatientById(draft.patient_id);

    return {
      draft: updatedDraft,
      patient: updatedPatient,
      mockDispatch
    };
  }
}

export const aiService = new AIService();
