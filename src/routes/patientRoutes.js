import express from 'express';
import { patientController } from '../controllers/patientController.js';
import { validateCreatePatient, validateUpdateStatus } from '../middleware/validate.js';

const router = express.Router();

// GET /api/patients/due-today - Patients whose follow-up is due today (Must precede /:id)
router.get('/due-today', patientController.getPatientsDueToday);

// POST /api/patients - Add a new patient
router.post('/', validateCreatePatient, patientController.createPatient);

// GET /api/patients - Retrieve all patients
router.get('/', patientController.getAllPatients);

// GET /api/patients/:id - Retrieve single patient
router.get('/:id', patientController.getPatientById);

// PATCH /api/patients/:id/status - Update follow-up status (e.g. to 'completed')
router.patch('/:id/status', validateUpdateStatus, patientController.updateFollowupStatus);

// PUT /api/patients/:id/complete - Quick mark completed endpoint
router.put('/:id/complete', patientController.completeFollowup);

export default router;
