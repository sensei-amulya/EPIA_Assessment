# 🎥 Demonstration Video Script & Recording Guide (≤ 3 Minutes)

This script provides a concise, step-by-step walkthrough to record your 3-minute demonstration video showing the Patient Follow-up System working end-to-end.

---

## ⏱️ Video Timeline Summary

| Timestamp | Section | Visual on Screen | Key Talking Point |
|---|---|---|---|
| **0:00 – 0:30** | Introduction & Architecture | Browser at `http://localhost:3000` | Project goals, Express + SQLite backend, AI-assisted WhatsApp workflow. |
| **0:30 – 1:15** | Task 1: Backend & Patient CRUD | Patient Directory tab + Terminal/Postman curl | Adding patient, viewing all patients, filtering due today, completing status. |
| **1:15 – 2:15** | Task 2: AI Generation & Staff Review | Due Today tab + WhatsApp Review Modal | Identifying due patients, AI draft generation, staff editing, simulated WhatsApp send. |
| **2:15 – 2:45** | Verification & Automated Tests | Terminal running `npm test` | 15 passing automated tests verifying validation and workflow. |
| **2:45 – 3:00** | Conclusion & Ethical Safety | Browser Dashboard + `AI_IMPLEMENTATION_NOTE.md` | Human-in-the-loop clinical safety, mock fallback, recap. |

---

## 🎬 Step-by-Step Recording Walkthrough

### Part 1: Introduction (0:00 – 0:30)
**On Screen:** CareFollow dashboard (`http://localhost:3000`) with clean metrics cards visible.  
**What to say:**
> *"Hello! Today I'm demonstrating CareFollow, a patient follow-up system designed to solve post-consultation continuity of care. The system consists of two core components: a Node.js Express REST API backed by persistent SQLite for Task 1, and an AI-assisted WhatsApp follow-up automation workflow with a human-in-the-loop review interface for Task 2. All patient records shown are 100% fictional."*

---

### Part 2: Task 1 — Backend Development & Patient Management (0:30 – 1:15)
**On Screen:** Switch to **All Patients Directory** tab. Click **"+ New Patient"**.  
**Action:**
1. Fill in the form:
   - Name: `Fictional David Miller`
   - Phone: `+1-555-0199`
   - Consult Date: (Pick a date 7 days ago)
   - Next Follow-up Date: (Pick today's date)
   - Condition: `Wisdom Tooth Extraction Post-Op`
   - Care Notes: `Check for bleeding and pain scale.`
2. Click **"Save Patient"**. Point out the success toast and the new record in the table.
3. Show the filter buttons (`Pending`, `Completed`) and search bar in action.
4. Click **"Mark Done"** on one patient to show the status update to `completed`.

**What to say:**
> *"For Task 1, the backend supports full patient management. When adding a patient, the API validates the input—including date chronological order and phone numbers. We can retrieve all patients, filter by status, and retrieve patients due for follow-up today. We can also update any patient's status to completed with a single request."*

---

### Part 3: Task 2 — AI Follow-up Generation & Staff Approval (1:15 – 2:15)
**On Screen:** Switch to **"Follow-ups Due Today"** tab.  
**Action:**
1. Point to the patients listed under **"Patients Due for Follow-up Today"**.
2. Click **"Generate AI Draft"** on Maria Rodriguez (Hypertension).
3. The modal opens automatically, showing the **WhatsApp Phone Simulator** on the right and **Patient & AI Metadata** on the left.
4. Point out the personalized clinical details:
   - Patient first name addressed warmly.
   - Specific mention of Dr. Sarah Mitchell and Hypertension medication adjustment.
   - Targeted clinical questions: checking morning blood pressure readings and dizziness.
5. In the **"Staff Message Editor"** textarea, edit a line (e.g. add: *"Please drink plenty of water."*). Click **"Update Preview"** to show real-time synchronization.
6. Click **"Approve & Send (Mock WhatsApp)"**.
7. The **Mock Dispatch Receipt** modal appears, displaying the simulated WhatsApp Message ID (`wamid.mock_...`), recipient phone, and delivery status.
8. Close the receipt: point out that the patient is now marked **"Completed"** in the due queue!

**What to say:**
> *"Now for Task 2: the AI automation workflow. The system identifies patients whose follow-up is due today. When we trigger generation, our AI engine drafts a personalized WhatsApp message tailored to the patient's condition. For clinical safety, messages are never sent automatically. Instead, our human-in-the-loop dashboard lets clinical staff review and edit the draft. Once approved, the system logs a mock WhatsApp dispatch receipt and automatically updates the patient's follow-up status to completed."*

---

### Part 4: Automated Testing & Verification (2:15 – 2:45)
**On Screen:** Terminal window in the project directory.  
**Action:**
Run the command:
```bash
npm test
```
Show the 15 passing tests in 211ms.

**What to say:**
> *"To ensure reliability, the backend includes 15 automated integration tests using Node's native test runner and Supertest. These test suite passes 100%, covering input validation, bad request handling, date logic, AI prompt generation, mock fallback, and staff approval transitions."*

---

### Part 5: Conclusion & Wrap-up (2:45 – 3:00)
**On Screen:** Return to Dashboard and point to the AI Engine indicator badge in the top right.  
**What to say:**
> *"If an external AI API is unavailable, CareFollow includes a built-in Clinical Mock Engine so the workflow remains completely functional offline. All source code, API docs, and implementation notes are available in the repository. Thank you!"*

---

## 💡 Quick Tips for Recording
- **Resolution:** 1080p (1920x1080) or 720p.
- **Audio:** Use a clean microphone or headset; minimize background noise.
- **Speed:** Rehearse once with a stopwatch; the script easily completes in 2 minutes and 40 seconds.
- **Tools:** Use macOS QuickTime Player (File → New Screen Recording) or OBS Studio.
