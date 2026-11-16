import { getDb } from './db.js';

/**
 * Returns formatted YYYY-MM-DD string for today +/- offset days.
 */
export function getFormattedDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function seedDatabase(db = getDb()) {
  console.log('🌱 Seeding database with realistic fictional patients...');

  // Clear existing records
  db.exec('DELETE FROM followup_drafts;');
  db.exec('DELETE FROM patients;');
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('patients', 'followup_drafts');");

  const today = getFormattedDate(0);
  const sevenDaysAgo = getFormattedDate(-7);
  const threeDaysAgo = getFormattedDate(-3);
  const twoWeeksAgo = getFormattedDate(-14);
  const fiveDaysAhead = getFormattedDate(5);
  const tenDaysAhead = getFormattedDate(10);

  const insertPatient = db.prepare(`
    INSERT INTO patients (name, phone, consultation_date, next_followup_date, followup_status, doctor_name, condition_or_treatment, notes)
    VALUES (@name, @phone, @consultation_date, @next_followup_date, @followup_status, @doctor_name, @condition_or_treatment, @notes)
  `);

  const patients = [
    {
      name: 'Liam Chen',
      phone: '+1-555-0143',
      consultation_date: sevenDaysAgo,
      next_followup_date: today,
      followup_status: 'pending',
      doctor_name: 'Dr. Emily Vance',
      condition_or_treatment: 'Root Canal Therapy (Tooth #19)',
      notes: 'Patient was prescribed amoxicillin and ibuprofen. Check if swelling subsided and pain is below 2/10.'
    },
    {
      name: 'Maria Rodriguez',
      phone: '+1-555-0188',
      consultation_date: twoWeeksAgo,
      next_followup_date: today,
      followup_status: 'pending',
      doctor_name: 'Dr. Sarah Mitchell',
      condition_or_treatment: 'Hypertension Medication Adjustment',
      notes: 'Switched to Lisinopril 10mg. Check morning BP readings and inquire about any persistent dry cough or dizziness.'
    },
    {
      name: 'James Wilson',
      phone: '+1-555-0129',
      consultation_date: threeDaysAgo,
      next_followup_date: today,
      followup_status: 'pending',
      doctor_name: 'Dr. Sarah Mitchell',
      condition_or_treatment: 'Acute Bronchitis & Inhaler Review',
      notes: 'Started Albuterol inhaler. Check respiratory ease and nighttime coughing episodes.'
    },
    {
      name: 'Aisha Patel',
      phone: '+1-555-0174',
      consultation_date: sevenDaysAgo,
      next_followup_date: fiveDaysAhead,
      followup_status: 'pending',
      doctor_name: 'Dr. David Kim',
      condition_or_treatment: 'Right Knee Arthroscopy Rehab',
      notes: 'Physical therapy protocol stage 1. Check range of motion and weight-bearing progress next week.'
    },
    {
      name: 'Robert Fox',
      phone: '+1-555-0195',
      consultation_date: twoWeeksAgo,
      next_followup_date: tenDaysAhead,
      followup_status: 'pending',
      doctor_name: 'Dr. Sarah Mitchell',
      condition_or_treatment: 'Type 2 Diabetes Routine Review',
      notes: 'Fasting blood glucose log review scheduled. Remind to bring 14-day glucometer records.'
    },
    {
      name: 'Elena Rostova',
      phone: '+1-555-0112',
      consultation_date: twoWeeksAgo,
      next_followup_date: sevenDaysAgo,
      followup_status: 'completed',
      doctor_name: 'Dr. Emily Vance',
      condition_or_treatment: 'Allergic Rhinitis Treatment',
      notes: 'Patient confirmed symptoms cleared with prescribed antihistamines. Completed follow-up successfully.'
    }
  ];

  const insertMany = db.transaction((list) => {
    for (const p of list) {
      insertPatient.run(p);
    }
  });

  insertMany(patients);

  // Pre-seed an initial AI draft for Liam Chen (id: 1) to demonstrate the review screen right away
  const insertDraft = db.prepare(`
    INSERT INTO followup_drafts (patient_id, message, status, ai_provider, is_mock, ai_note, tone, created_at)
    VALUES (?, ?, 'pending_review', 'mock-clinical-engine', 1, 'Sample clinical mock generated during database seeding.', 'caring', datetime('now'))
  `);

  const initialDraftMsg = `Hello Liam! 👋 This is Nurse Alex from Apex Health & Wellness Clinic following up on your consultation with Dr. Emily Vance on ${sevenDaysAgo} for Root Canal Therapy (Tooth #19).

How has your recovery been feeling today? We wanted to check if the swelling has gone down and if your comfort level is improving.

Please let us know how you are doing, or reply here if you have any questions or need Dr. Vance to adjust your medication. Take care! 🩺`;

  insertDraft.run(1, initialDraftMsg);

  console.log(`✅ Seeded ${patients.length} fictional patients and 1 sample review draft.`);
}

// Run directly when executed via CLI
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase();
  process.exit(0);
}
