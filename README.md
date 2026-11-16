# 🩺 CareFollow — Patient Follow-up & AI Automation System

A lightweight, production-grade Patient Follow-up System and REST API built with Node.js, Express, and SQLite. Features an AI-assisted WhatsApp follow-up workflow with a human-in-the-loop clinical review and approval dashboard.

> **Note on Data:** All patient records used in this application and repository are **100% fictional** for testing and demonstration purposes.

---

## 🌟 Highlights & Capabilities

- **Task 1 — Backend Development (60%):**
  - Robust REST API built with Node.js and Express.
  - Persistent SQLite storage using `better-sqlite3` with Write-Ahead Logging (WAL) and foreign key integrity.
  - Endpoints to register patients, retrieve all patients, filter patients due today, and update follow-up statuses.
  - Strict input validation (date logic, international phone formatting, required fields) and structured error handling.
  - 15 automated integration tests with zero external test runners (`node:test` + `supertest`).

- **Task 2 — AI Automation & Staff Review (40%):**
  - **Identifies Due Follow-ups:** Queries patients whose consultation follow-up is scheduled for today.
  - **Condition-Specific Personalization:** Incorporates patient first name, consultation date, attending doctor, procedure, and clinical care instructions.
  - **Multi-Engine AI Architecture:**
    - Live **Google Gemini** (`gemini-2.5-flash` / `gemini-1.5-flash`) via REST API.
    - Live **OpenAI** (`gpt-4o-mini`) support.
    - Built-in **Clinical Mock Engine** for offline/keyless environments with zero downtime.
  - **Human-in-the-Loop Review:** Clinicians or nurses can inspect, edit, and approve drafts in an interactive WhatsApp preview interface before simulated dispatch.
  - **Automated Status Progression:** Approving a draft marks the simulated WhatsApp message dispatched and automatically updates the patient's follow-up status to `completed`.
  - **Safe by Design:** Real WhatsApp messages are **never** dispatched automatically; dispatches are simulated and logged.

---

## 🏗️ Architecture & Project Structure

```
flip/
├── server.js                  # Main server entry point
├── package.json               # Dependencies and npm scripts
├── .env.example               # Template environment variables
├── .env                       # Local runtime configuration
├── database/
│   ├── db.js                  # SQLite connection and migration runner
│   ├── schema.sql             # SQL schema (patients and followup_drafts tables)
│   ├── seed.js                # Fictional patient seed generator
│   └── patients.db            # SQLite database file (auto-generated)
├── src/
│   ├── app.js                 # Express app factory with middleware & routing
│   ├── controllers/
│   │   ├── patientController.js  # Patient CRUD handlers
│   │   └── aiController.js       # AI draft & review handlers
│   ├── services/
│   │   ├── patientService.js     # Patient business logic & DB queries
│   │   └── aiService.js          # Gemini/OpenAI caller & Clinical Mock Engine
│   ├── middleware/
│   │   ├── validate.js           # Request payload validators
│   │   └── errorHandler.js       # Centralized 404 & error handlers
│   └── routes/
│       ├── patientRoutes.js      # /api/patients router
│       └── aiRoutes.js           # /api/ai router
├── public/                    # Frontend Staff Review Dashboard
│   ├── index.html             # Responsive clinic dashboard & WhatsApp preview
│   ├── style.css              # Modern UI styling
│   └── app.js                 # Frontend interactions & API client
├── tests/
│   ├── patient.test.js        # Task 1 integration tests
│   └── ai.test.js             # Task 2 AI workflow tests
├── AI_IMPLEMENTATION_NOTE.md  # Detailed note on AI tools used & personal implementation
└── DEMO_VIDEO_SCRIPT.md       # 3-minute video presentation guide & script
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** v18.0.0 or higher (v20+ recommended, tested on v24)
- **npm** v9.0.0 or higher

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone <your-repo-url>
cd flip
npm install
```

### 3. Environment Configuration
Create your `.env` file from the example template:
```bash
cp .env.example .env
```

Contents of `.env`:
```env
PORT=3000
NODE_ENV=development
DB_PATH=./database/patients.db
CLINIC_NAME="Apex Health & Wellness Clinic"
CLINIC_PHONE="+1 (555) 019-2831"

# Optional: Add your Gemini or OpenAI API key for live LLM generation.
# If omitted, the system seamlessly uses the built-in Clinical Mock Engine.
GEMINI_API_KEY=
OPENAI_API_KEY=
```

### 4. Seed Realistic Fictional Data
Initialize the SQLite database with sample fictional patients:
```bash
npm run seed
```

### 5. Start the Application
Run the server:
```bash
npm start
```
For development with hot reload:
```bash
npm run dev
```

Visit the interactive Staff Review Dashboard in your browser:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🧪 Running Automated Tests

Run the full integration test suite covering Task 1 (REST API) and Task 2 (AI automation & approval flow):

```bash
npm test
```

Expected output:
```
✔ Task 2: AI Automation & Staff Review Workflow (5 tests passed)
✔ Task 1: Patient Follow-up Backend REST API (10 tests passed)
ℹ tests 15
ℹ suites 6
ℹ pass 15
ℹ fail 0
```

---

## 📚 REST API Reference

### 1. Patient Endpoints (Task 1)

#### ➕ Register a New Patient
- **Endpoint:** `POST /api/patients`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "name": "Sarah Connor",
    "phone": "+1-555-0143",
    "consultation_date": "2026-11-10",
    "next_followup_date": "2026-11-16",
    "doctor_name": "Dr. Sarah Mitchell",
    "condition_or_treatment": "Root Canal Post-Op",
    "notes": "Check swelling and pain level; verify antibiotics taken."
  }
  ```
- **Response (`201 Created`):**
  ```json
  {
    "success": true,
    "message": "Patient registered successfully.",
    "data": {
      "id": 7,
      "name": "Sarah Connor",
      "phone": "+1-555-0143",
      "consultation_date": "2026-11-10",
      "next_followup_date": "2026-11-16",
      "followup_status": "pending",
      "doctor_name": "Dr. Sarah Mitchell",
      "condition_or_treatment": "Root Canal Post-Op",
      "notes": "Check swelling and pain level; verify antibiotics taken."
    }
  }
  ```

#### 📋 Retrieve All Patients
- **Endpoint:** `GET /api/patients`
- **Query Parameters:**
  - `status` *(optional)*: Filter by `pending` or `completed`.
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "count": 6,
    "filter": "all",
    "data": [ ... ]
  }
  ```

#### ⏰ Retrieve Patients Due Today
- **Endpoint:** `GET /api/patients/due-today`
- **Query Parameters:**
  - `date` *(optional, YYYY-MM-DD)*: Target date override (defaults to current date).
  - `include_overdue` *(optional, default `true`)*: Includes prior pending follow-ups.
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "count": 3,
    "target_date": "2026-11-16",
    "data": [
      {
        "id": 1,
        "name": "Liam Chen",
        "phone": "+1-555-0143",
        "consultation_date": "2026-11-09",
        "next_followup_date": "2026-11-16",
        "followup_status": "pending",
        "condition_or_treatment": "Root Canal Therapy (Tooth #19)",
        "latest_draft_id": 1,
        "latest_draft_status": "pending_review"
      }
    ]
  }
  ```

#### 🔄 Update Follow-up Status
- **Endpoint:** `PATCH /api/patients/:id/status`
- **Request Body:**
  ```json
  {
    "status": "completed"
  }
  ```
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Patient follow-up status updated to 'completed'.",
    "data": {
      "id": 1,
      "name": "Liam Chen",
      "followup_status": "completed"
    }
  }
  ```

*(Convenience endpoint also available: `PUT /api/patients/:id/complete`)*

---

### 2. AI Automation Endpoints (Task 2)

#### 🤖 Generate Personalized WhatsApp Draft
- **Endpoint:** `POST /api/ai/generate-draft/:patientId`
- **Request Body:** *(optional)*
  ```json
  {
    "tone": "caring"
  }
  ```
- **Response (`201 Created`):**
  ```json
  {
    "success": true,
    "message": "Personalized WhatsApp follow-up draft generated successfully.",
    "data": {
      "draft": {
        "id": 2,
        "patient_id": 2,
        "status": "pending_review",
        "ai_provider": "gemini-2.5-flash",
        "is_mock": 0,
        "message": "Hello Maria! 👋 This is your care coordinator from Apex Health & Wellness Clinic...",
        "ai_note": "Live generation successful via Google gemini-2.5-flash."
      }
    }
  }
  ```

#### 📦 Batch Generate Drafts for Due Patients
- **Endpoint:** `POST /api/ai/batch-generate-due`
- **Request Body:** *(optional)*
  ```json
  {
    "date": "2026-11-16"
  }
  ```
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Batch generation completed for date 2026-11-16.",
    "count": 3,
    "data": [ ... ]
  }
  ```

#### 🩺 Staff Review & Approval (WhatsApp Mock Dispatch)
- **Endpoint:** `PATCH /api/ai/drafts/:id/review`
- **Request Body:**
  ```json
  {
    "status": "approved",
    "reviewer": "Nurse Alex Rivera, RN",
    "edited_message": "Hello Liam! Checking in on your recovery. Hope you are resting well."
  }
  ```
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Draft approved! Mock WhatsApp message dispatched and patient follow-up marked as completed.",
    "data": {
      "draft": {
        "id": 1,
        "status": "approved",
        "reviewed_by": "Nurse Alex Rivera, RN"
      },
      "patient": {
        "id": 1,
        "followup_status": "completed"
      },
      "mockDispatch": {
        "mockMessageId": "wamid.mock_1731765000_4821",
        "recipientPhone": "+1-555-0143",
        "recipientName": "Liam Chen",
        "deliveryStatus": "simulated_delivered",
        "note": "WhatsApp message dispatch mocked for safety and compliance. No real SMS/WhatsApp sent."
      }
    }
  }
  ```

---

## 💻 Interactive Web Dashboard

To make review and grading seamless, an embedded web dashboard runs on `http://localhost:3000`:
- **Follow-ups Due Today Tab:** Visual cards of patients requiring attention, draft statuses, and one-click draft generation.
- **WhatsApp Chat Simulator:** A pixel-perfect WhatsApp bubble preview that updates live as clinical staff edit drafts.
- **Approval & Dispatch Receipt:** Shows mock delivery confirmations with simulated WhatsApp Message IDs.
- **Patient Directory:** Complete list of fictional patients with status filters and search.
- **Reset Demo Data:** One-click re-seed button to quickly reset data to fresh sample state anytime.

---

## 🛡️ AI & Medical Safety Design

1. **Human-in-the-Loop:** AI never sends messages directly. Every draft enters a `pending_review` state that requires deliberate approval from a clinic staff member.
2. **Clinical Personalization:** Prompts are engineered to ask condition-appropriate follow-up questions (e.g. swelling/pain for oral surgery, BP logs and dizziness for hypertension).
3. **Safety Fallback (Offline Mode):** If no API key is supplied, or if network connectivity is absent, the system does not crash. It activates the **Clinical Mock Engine**, clearly informing the reviewer of the limitation while preserving 100% of the workflow.
4. **Mock WhatsApp Connection:** In adherence to safety guidelines, real WhatsApp or SMS messages are never transmitted. Dispatch receipts are simulated with unique mock IDs.

---

## 📦 Submission Artifacts

- **Source Code:** Clean, modular repository ready for execution.
- **Documentation:** This `README.md` file.
- **Demonstration Video Guide:** [`DEMO_VIDEO_SCRIPT.md`](DEMO_VIDEO_SCRIPT.md) for recording a crisp <= 3-minute video.
- **AI Implementation Note:** [`AI_IMPLEMENTATION_NOTE.md`](AI_IMPLEMENTATION_NOTE.md) documenting AI tools used vs. personal engineering.
