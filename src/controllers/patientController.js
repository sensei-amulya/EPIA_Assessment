import { patientService } from '../services/patientService.js';
import { getFormattedDate } from '../../database/seed.js';

export class PatientController {
  /**
   * POST /api/patients
   * Registers a new patient.
   */
  async createPatient(req, res, next) {
    try {
      const patient = patientService.createPatient(req.body);
      res.status(201).json({
        success: true,
        message: 'Patient registered successfully.',
        data: patient
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/patients
   * Retrieves all patients, with optional ?status=pending|completed.
   */
  async getAllPatients(req, res, next) {
    try {
      const { status } = req.query;
      const patients = patientService.getAllPatients({ status });
      res.status(200).json({
        success: true,
        count: patients.length,
        filter: status ? { status } : 'all',
        data: patients
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/patients/due-today
   * Retrieves patients whose follow-up is due today (and pending).
   * Supports optional ?date=YYYY-MM-DD and ?include_overdue=true|false.
   */
  async getPatientsDueToday(req, res, next) {
    try {
      const { date, include_overdue } = req.query;
      const targetDate = date || getFormattedDate(0);
      const includeOverdue = include_overdue !== 'false';

      const patients = patientService.getPatientsDueToday(targetDate, includeOverdue);

      res.status(200).json({
        success: true,
        count: patients.length,
        target_date: targetDate,
        included_overdue: includeOverdue,
        data: patients
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/patients/:id
   * Retrieves single patient by ID with follow-up draft history.
   */
  async getPatientById(req, res, next) {
    try {
      const id = Number(req.params.id);
      const patient = patientService.getPatientById(id);

      if (!patient) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Patient with ID ${id} was not found.`
        });
      }

      res.status(200).json({
        success: true,
        data: patient
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/patients/:id/status
   * Updates follow-up status (e.g. to 'completed').
   */
  async updateFollowupStatus(req, res, next) {
    try {
      const id = Number(req.params.id);
      const { status } = req.body;

      const updated = patientService.updateFollowupStatus(id, status);

      if (!updated) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Patient with ID ${id} was not found.`
        });
      }

      res.status(200).json({
        success: true,
        message: `Patient follow-up status updated to '${status}'.`,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/patients/:id/complete
   * Convenience endpoint to quickly mark a patient follow-up as completed.
   */
  async completeFollowup(req, res, next) {
    try {
      const id = Number(req.params.id);
      const updated = patientService.updateFollowupStatus(id, 'completed');

      if (!updated) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Patient with ID ${id} was not found.`
        });
      }

      res.status(200).json({
        success: true,
        message: "Patient follow-up status marked as 'completed'.",
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }
}

export const patientController = new PatientController();
