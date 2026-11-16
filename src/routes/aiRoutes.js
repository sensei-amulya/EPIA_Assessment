import express from 'express';
import { aiController } from '../controllers/aiController.js';
import { validateDraftReview } from '../middleware/validate.js';

const router = express.Router();

// GET /api/ai/due-followups - Patients due today along with draft status
router.get('/due-followups', aiController.getDueFollowups);

// POST /api/ai/generate-draft/:patientId - Generate a personalized WhatsApp follow-up draft
router.post('/generate-draft/:patientId', aiController.generateDraft);

// POST /api/ai/batch-generate-due - Batch generate drafts for all due patients
router.post('/batch-generate-due', aiController.batchGenerateDue);

// GET /api/ai/drafts - Retrieve all generated drafts (optional ?status=)
router.get('/drafts', aiController.getAllDrafts);

// GET /api/ai/drafts/:id - Retrieve single draft details
router.get('/drafts/:id', aiController.getDraftById);

// PATCH /api/ai/drafts/:id/review - Review draft (approve with mock send / reject)
router.patch('/drafts/:id/review', validateDraftReview, aiController.reviewDraft);

export default router;
