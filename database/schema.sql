-- Schema for Patient Follow-up System

CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  consultation_date TEXT NOT NULL,      -- Format: YYYY-MM-DD
  next_followup_date TEXT NOT NULL,     -- Format: YYYY-MM-DD
  followup_status TEXT NOT NULL DEFAULT 'pending' CHECK(followup_status IN ('pending', 'completed')),
  doctor_name TEXT DEFAULT 'Dr. Sarah Mitchell',
  condition_or_treatment TEXT DEFAULT 'General Consultation',
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_patients_followup_date_status
ON patients(next_followup_date, followup_status);

CREATE TABLE IF NOT EXISTS followup_drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK(status IN ('pending_review', 'approved', 'rejected')),
  ai_provider TEXT NOT NULL,
  is_mock INTEGER NOT NULL DEFAULT 0 CHECK(is_mock IN (0, 1)),
  ai_note TEXT DEFAULT '',
  tone TEXT DEFAULT 'caring',
  reviewed_by TEXT DEFAULT NULL,
  staff_notes TEXT DEFAULT NULL,
  reviewed_at TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_drafts_patient_id
ON followup_drafts(patient_id);

CREATE INDEX IF NOT EXISTS idx_drafts_status
ON followup_drafts(status);
