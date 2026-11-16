# 📝 AI Implementation Note

**Project:** CareFollow — Patient Follow-up System & AI Automation  
**Author:** Amulya Gupta  
**Date:** November 2026  

---

## 1. Overview of AI Tools Used

During the research, development, and execution of this project, the following AI tools and models were utilized:

1. **Google Gemini Models (`gemini-2.5-flash` / `gemini-1.5-flash` via Google AI Studio API):**
   - Integrated directly into the backend runtime (`src/services/aiService.js`) to generate real-time, personalized WhatsApp follow-up messages tailored to each patient's consultation notes, attending doctor, and clinical condition.
   - Configured with low temperature (\(0.7\)) and strict prompt constraints to maintain empathetic, medically safe, and professional communication.

2. **Antigravity AI Coding Assistant (Google DeepMind):**
   - Utilized as an intelligent pair programmer for rapid scaffolding, automated test generation, architectural sanity checks, and debugging sandbox environment interactions.

3. **Built-in Clinical Mock Engine (Deterministic Fallback):**
   - Engineered locally in JavaScript to simulate intelligent, condition-specific follow-up drafts whenever live external LLM APIs are unreachable, unconfigured, or rate-limited.

---

## 2. Personal Implementation vs. AI Tool Contribution

To ensure complete academic and professional transparency, here is the breakdown of what was personally conceptualized, designed, and implemented:

### ✅ Personally Designed & Implemented:

1. **System Architecture & Domain Modeling:**
   - Designed the relational schema in SQLite (`schema.sql`) modeling the lifecycle of a patient follow-up:
     - `patients` table with clinical metadata, consultation dates, next follow-up dates, and status enums (`pending`, `completed`).
     - `followup_drafts` table with foreign key linkage, generation mode tracking (`is_mock`), staff review attribution, and approval audit timestamps.
   - Established the layered architectural pattern: Routes → Controllers → Services → Database / LLM Provider → Middleware.

2. **Backend REST API & Business Logic (Task 1):**
   - Implemented all required endpoints in Node.js/Express (`POST /api/patients`, `GET /api/patients`, `GET /api/patients/due-today`, `PATCH /api/patients/:id/status`).
   - Implemented custom validation middleware (`src/middleware/validate.js`):
     - Validates international phone numbers across multiple formats.
     - Validates calendar dates and verifies chronological integrity (e.g., `next_followup_date` cannot precede `consultation_date`).
     - Centralized error handling providing structured JSON feedback with appropriate HTTP status codes (200, 201, 400, 404, 500).

3. **Prompt Engineering & Clinical Safety Safeguards (Task 2):**
   - Developed the clinical prompt template in `aiService.js`:
     - Injects patient name, consultation date, attending doctor, treatment category, and care notes.
     - Enforces polite WhatsApp formatting (clean line breaks, bold highlights with `*`, tasteful emojis).
     - Incorporates a safety warning instructing patients to seek urgent medical attention for severe red-flag symptoms.
     - Explicitly bans placeholder brackets (e.g., `[Patient Name]`), requiring complete, ready-to-send messages.

4. **Human-in-the-Loop Review & Approval Workflow:**
   - Designed and built the staff review mechanism: AI drafts are never sent automatically; they are held in a `pending_review` queue.
   - Built the state transition: approving a draft logs the reviewer's identity, simulates a safe WhatsApp dispatch, and automatically transitions the patient's status to `completed`.

5. **Built-in Clinical Mock Fallback Engine:**
   - Authored the condition-specific rule engine in `generateClinicalMockMessage()`:
     - Differentiates recovery questions by clinical category (e.g., dental root canal post-op vs. hypertension medication titration vs. asthma/bronchitis inhaler review vs. orthopedic rehab).
     - Provides a seamless fallback so reviewers can evaluate the system end-to-end even without an internet connection or API keys.

6. **Interactive Staff Review Dashboard & WhatsApp Simulator:**
   - Handcrafted the frontend (`public/index.html`, `public/style.css`, `public/app.js`):
     - WhatsApp chat bubble simulation with live two-way editing synchronization.
     - Dynamic metrics, due today queue, patient directory search/filters, and interactive REST API documentation.

7. **Automated Integration Testing:**
   - Authored 15 integration tests (`tests/patient.test.js`, `tests/ai.test.js`) using Node's native test runner (`node:test`) and `supertest`, validating input constraints, status progressions, and mock dispatches.

---

## 3. Reflection on AI in Healthcare & Ethical Considerations

- **Why Full Automation is Dangerous in Healthcare:**  
  Clinical communication carries direct patient-safety consequences. An unmonitored LLM could hallucinate dosages, offer inappropriate medical reassurance, or miss urgent red-flag symptoms. For this reason, CareFollow strictly implements a **human-in-the-loop** paradigm: the AI acts as a **copilot** that saves clinical staff time by drafting personalized context, but a human clinician must review, edit if necessary, and approve the message.

- **Data Privacy & Fictional Data:**  
  In compliance with healthcare privacy standards (e.g., HIPAA / GDPR), this project operates entirely with fictional patient data. Real patient identifiers or protected health information (PHI) should never be sent to third-party consumer LLM APIs without enterprise Business Associate Agreements (BAAs) and de-identification pipelines.
