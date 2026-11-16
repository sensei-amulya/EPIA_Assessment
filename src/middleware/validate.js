/**
 * Helper to validate ISO date format (YYYY-MM-DD) and real calendar dates.
 */
export function isValidDateString(dateStr) {
  if (typeof dateStr !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;

  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Validates phone number format (allows +, -, (, ), spaces, and 7 to 15 digits).
 */
export function isValidPhone(phone) {
  if (typeof phone !== 'string') return false;
  const trimmed = phone.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length < 7 || digitsOnly.length > 15) return false;
  // Allow international formatting like +1-555-0143 or +44 20 7946 0912 or 9876543210
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;
  return phoneRegex.test(trimmed);
}

/**
 * Middleware: Validates payload for adding a new patient.
 */
export function validateCreatePatient(req, res, next) {
  const { name, phone, consultation_date, next_followup_date, followup_status } = req.body;
  const errors = [];

  // Name validation
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Patient name is required and must be at least 2 characters long.');
  }

  // Phone validation
  if (!phone || !isValidPhone(phone)) {
    errors.push('A valid phone number is required (between 7 and 15 digits, international format accepted).');
  }

  // Consultation date validation
  if (!consultation_date || !isValidDateString(consultation_date)) {
    errors.push('consultation_date is required and must be in YYYY-MM-DD format.');
  }

  // Next follow-up date validation
  if (!next_followup_date || !isValidDateString(next_followup_date)) {
    errors.push('next_followup_date is required and must be in YYYY-MM-DD format.');
  }

  // Next follow-up date should logically not be before consultation date
  if (
    consultation_date &&
    next_followup_date &&
    isValidDateString(consultation_date) &&
    isValidDateString(next_followup_date)
  ) {
    if (next_followup_date < consultation_date) {
      errors.push('next_followup_date cannot be earlier than consultation_date.');
    }
  }

  // Status validation (optional on creation)
  if (followup_status && !['pending', 'completed'].includes(followup_status)) {
    errors.push("followup_status must be either 'pending' or 'completed'.");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: errors
    });
  }

  next();
}

/**
 * Middleware: Validates status update for a patient.
 */
export function validateUpdateStatus(req, res, next) {
  const { status } = req.body;

  if (!status || !['pending', 'completed'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: ["Field 'status' is required and must be either 'pending' or 'completed'."]
    });
  }

  next();
}

/**
 * Middleware: Validates draft review request.
 */
export function validateDraftReview(req, res, next) {
  const { status } = req.body;

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: ["Field 'status' is required and must be either 'approved' or 'rejected'."]
    });
  }

  next();
}
