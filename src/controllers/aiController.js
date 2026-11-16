import { aiService } from '../services/aiService.js';
import { patientService } from '../services/patientService.js';
import { getFormattedDate } from '../../database/seed.js';

export class AIController {
  /**
   * GET /api/ai/due-followups
   * Identifies patients due for follow-up today and their draft status.
   */
  async getDueFollowups(req, res, next) {
    try {
      const { date } = req.query;
      const targetDate = date || getFormattedDate(0);
      const duePatients = patientService.getPatientsDueToday(targetDate);

      res.status(200).json({
        success: true,
        count: duePatients.length,
        target_date: targetDate,
        data: duePatients
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/ai/generate-draft/:patientId
   * Generates a personalized WhatsApp follow-up draft using Gemini or Clinical Mock Engine.
   */
  async generateDraft(req, res, next) {
    try {
      const patientId = Number(req.params.patientId);
      const options = {
        tone: req.body?.tone,
        custom_instructions: req.body?.custom_instructions
      };

      const result = await aiService.generateFollowupDraft(patientId, options);

      res.status(201).json({
        success: true,
        message: 'Personalized WhatsApp follow-up draft generated successfully.',
        data: result
      });
    } catch (err) {
      if (err.message && err.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: err.message
        });
      }
      next(err);
    }
  }

  /**
   * POST /api/ai/batch-generate-due
   * Batch generates drafts for all patients currently due today.
   */
  async batchGenerateDue(req, res, next) {
    try {
      const { date } = req.body || {};
      const targetDate = date || getFormattedDate(0);

      const results = await aiService.batchGenerateDueFollowups(targetDate);

      res.status(200).json({
        success: true,
        message: `Batch generation completed for date ${targetDate}.`,
        count: results.length,
        data: results
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/ai/drafts
   * Retrieves all drafts, with optional ?status=pending_review|approved|rejected
   */
  async getAllDrafts(req, res, next) {
    try {
      const { status } = req.query;
      const drafts = aiService.getAllDrafts(status);

      res.status(200).json({
        success: true,
        count: drafts.length,
        filter: status ? { status } : 'all',
        data: drafts
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/ai/drafts/:id
   * Retrieves single draft by ID
   */
  async getDraftById(req, res, next) {
    try {
      const id = Number(req.params.id);
      const draft = aiService.getDraftById(id);

      if (!draft) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Draft with ID ${id} was not found.`
        });
      }

      res.status(200).json({
        success: true,
        data: draft
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/ai/drafts/:id/review
   * Review endpoint: Allows staff to review, edit, approve or reject the draft.
   * If approved, marks message approved, simulates mock WhatsApp dispatch, and updates patient follow-up to completed.
   */
  async reviewDraft(req, res, next) {
    try {
      const id = Number(req.params.id);
      const { status, edited_message, reviewer, notes } = req.body;

      const result = aiService.reviewDraft(id, {
        status,
        edited_message,
        reviewer,
        notes
      });

      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Draft with ID ${id} was not found.`
        });
      }

      const responseMessage =
        status === 'approved'
          ? 'Draft approved! Mock WhatsApp message dispatched and patient follow-up marked as completed.'
          : 'Draft rejected by staff member.';

      res.status(200).json({
        success: true,
        message: responseMessage,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}

export const aiController = new AIController();
