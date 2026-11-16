// CareFollow Client Application Logic

let allPatients = [];
let duePatients = [];
let currentDraftInReview = null;
let currentPatientInReview = null;

// DOM Elements
const tabButtons = document.querySelectorAll('.nav-tab');
const tabPanes = document.querySelectorAll('.tab-pane');
const inputTargetDate = document.getElementById('input-target-date');
const currentDateDisplay = document.getElementById('current-date-display');
const dueContainer = document.getElementById('due-patients-container');
const patientsTableBody = document.getElementById('patients-table-body');
const patientSearch = document.getElementById('patient-search');
const filterButtons = document.querySelectorAll('.filter-btn');

// Metrics
const statDueToday = document.getElementById('stat-due-today');
const statPendingReview = document.getElementById('stat-pending-review');
const statCompleted = document.getElementById('stat-completed');
const badgeDueCount = document.getElementById('badge-due-count');
const badgeAllCount = document.getElementById('badge-all-count');

// Modals
const modalAddPatient = document.getElementById('modal-add-patient');
const modalReviewDraft = document.getElementById('modal-review-draft');
const modalReceipt = document.getElementById('modal-receipt');
const formAddPatient = document.getElementById('form-add-patient');
const formErrorMsg = document.getElementById('form-error-msg');
const toastEl = document.getElementById('toast');

// Review Modal Elements
const reviewPatientName = document.getElementById('review-patient-name');
const reviewPatientPhone = document.getElementById('review-patient-phone');
const reviewPatientCondition = document.getElementById('review-patient-condition');
const reviewPatientDoctor = document.getElementById('review-patient-doctor');
const reviewPatientConsult = document.getElementById('review-patient-consult');
const reviewAiProvider = document.getElementById('review-ai-provider');
const reviewAiMode = document.getElementById('review-ai-mode');
const reviewAiNote = document.getElementById('review-ai-note');
const reviewStaffName = document.getElementById('review-staff-name');
const reviewMessageEdit = document.getElementById('review-message-edit');
const waBubblePreview = document.getElementById('wa-bubble-preview');
const waBubbleTimeText = document.getElementById('wa-bubble-time-text');
const btnSyncPreview = document.getElementById('btn-sync-preview');
const btnApproveDraft = document.getElementById('btn-approve-draft');
const btnRejectDraft = document.getElementById('btn-reject-draft');

// Action Buttons
const btnOpenAddPatient = document.getElementById('btn-open-add-patient');
const btnSeed = document.getElementById('btn-seed');
const btnBatchGenerate = document.getElementById('btn-batch-generate');
const btnRefreshDue = document.getElementById('btn-refresh-due');

// Helper to format date as YYYY-MM-DD
function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Toast notification helper
function showToast(message, duration = 3500) {
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  setTimeout(() => {
    toastEl.classList.add('hidden');
  }, duration);
}

// Check health & AI engine status
async function checkEngineStatus() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    const engineStatusEl = document.getElementById('ai-engine-status');
    const engineLabel = document.getElementById('engine-label');

    // Fetch patients to see active drafts provider
    const draftsRes = await fetch('/api/ai/drafts');
    const draftsData = await draftsRes.json();
    const hasLive = draftsData.data?.some(d => !d.is_mock);

    if (hasLive) {
      engineStatusEl.className = 'engine-badge live';
      engineLabel.textContent = 'AI Engine: Live Model Active';
    } else {
      engineStatusEl.className = 'engine-badge mock';
      engineLabel.textContent = 'AI Engine: Mock / Offline Mode';
    }
  } catch (err) {
    console.error('Failed to check health:', err);
  }
}

// Tab navigation handler
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetTab = btn.getAttribute('data-tab');
    tabButtons.forEach(b => b.classList.remove('active'));
    tabPanes.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(targetTab)?.classList.add('active');
  });
});

// Load due patients for specified date
async function loadDuePatients() {
  const targetDate = inputTargetDate.value || getTodayString();
  currentDateDisplay.textContent = targetDate;

  try {
    const res = await fetch(`/api/patients/due-today?date=${targetDate}`);
    const result = await res.json();
    duePatients = result.data || [];

    renderDuePatients(duePatients);
    updateMetrics();
  } catch (err) {
    console.error('Error loading due patients:', err);
    dueContainer.innerHTML = `<div class="empty-state error">Failed to load due patients. Please ensure server is running.</div>`;
  }
}

// Render due patient cards
function renderDuePatients(patients) {
  if (!patients || patients.length === 0) {
    dueContainer.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px; background: #fff; border-radius: 10px; border: 1px dashed #cbd5e1;">
        <div style="font-size: 36px; margin-bottom: 8px;">🎉</div>
        <h3 style="font-weight: 600; margin-bottom: 4px;">No Follow-ups Due Today!</h3>
        <p style="color: #64748b; font-size: 13px;">All scheduled patient follow-ups for this date have been reviewed and completed.</p>
      </div>
    `;
    return;
  }

  dueContainer.innerHTML = patients.map(p => {
    const hasDraft = Boolean(p.latest_draft_id);
    const draftStatus = p.latest_draft_status;
    const isPendingReview = hasDraft && draftStatus === 'pending_review';
    const isApproved = hasDraft && draftStatus === 'approved';

    let draftBox = '';
    if (isPendingReview) {
      draftBox = `
        <div class="draft-status-box has-draft">
          <span>📝 <strong>AI Draft Ready</strong> (${p.latest_draft_provider || 'AI Engine'})</span>
          <span class="status-badge pending">Awaiting Review</span>
        </div>
      `;
    } else if (isApproved) {
      draftBox = `
        <div class="draft-status-box approved">
          <span>✅ <strong>Draft Approved & Sent (Mock)</strong></span>
          <span class="status-badge completed">Completed</span>
        </div>
      `;
    } else {
      draftBox = `
        <div class="draft-status-box">
          <span>⏳ No draft generated yet</span>
          <span class="status-badge due">Action Required</span>
        </div>
      `;
    }

    return `
      <div class="patient-card">
        <div>
          <div class="card-top">
            <div>
              <h3 class="patient-name-title">${escapeHtml(p.name)}</h3>
              <div class="patient-phone-sub">${escapeHtml(p.phone)}</div>
            </div>
            <span class="status-badge ${p.followup_status === 'completed' ? 'completed' : 'due'}">
              ${p.followup_status === 'completed' ? 'Completed' : 'Due Today'}
            </span>
          </div>

          <div class="card-meta-list">
            <div class="card-meta-row">
              <span class="meta-lbl">Condition:</span>
              <span class="meta-val">${escapeHtml(p.condition_or_treatment || 'General Check')}</span>
            </div>
            <div class="card-meta-row">
              <span class="meta-lbl">Attending Doctor:</span>
              <span class="meta-val">${escapeHtml(p.doctor_name || 'Dr. Mitchell')}</span>
            </div>
            <div class="card-meta-row">
              <span class="meta-lbl">Consultation Date:</span>
              <span class="meta-val">${escapeHtml(p.consultation_date)}</span>
            </div>
            ${p.notes ? `
              <div class="card-meta-row" style="flex-direction: column; gap: 2px; margin-top: 4px;">
                <span class="meta-lbl">Care Note:</span>
                <span style="font-size: 12px; color: #475569; font-style: italic;">"${escapeHtml(p.notes)}"</span>
              </div>
            ` : ''}
          </div>

          ${draftBox}
        </div>

        <div class="card-actions">
          ${isPendingReview ? `
            <button class="btn btn-accent w-full" onclick="openReviewModal(${p.latest_draft_id})">
              <span>🔍</span> Review & Approve Draft
            </button>
          ` : `
            <button class="btn btn-primary w-full" onclick="generateDraftForPatient(${p.id})">
              <span>✨</span> ${hasDraft ? 'Regenerate AI Draft' : 'Generate AI Draft'}
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');
}

// Load all patients directory
async function loadAllPatients() {
  try {
    const res = await fetch('/api/patients');
    const result = await res.json();
    allPatients = result.data || [];

    renderPatientsTable(allPatients);
    updateMetrics();
  } catch (err) {
    console.error('Error loading patients:', err);
    patientsTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error loading patients.</td></tr>`;
  }
}

// Render patients table
function renderPatientsTable(list) {
  const searchTerm = patientSearch.value.toLowerCase().trim();
  const activeFilter = document.querySelector('.filter-btn.active')?.getAttribute('data-filter') || 'all';

  let filtered = list;

  if (activeFilter !== 'all') {
    filtered = filtered.filter(p => p.followup_status === activeFilter);
  }

  if (searchTerm) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(searchTerm) ||
      (p.condition_or_treatment && p.condition_or_treatment.toLowerCase().includes(searchTerm)) ||
      (p.doctor_name && p.doctor_name.toLowerCase().includes(searchTerm)) ||
      p.phone.includes(searchTerm)
    );
  }

  badgeAllCount.textContent = list.length;

  if (filtered.length === 0) {
    patientsTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding: 24px;">No patients matching the criteria.</td></tr>`;
    return;
  }

  patientsTableBody.innerHTML = filtered.map(p => {
    const isCompleted = p.followup_status === 'completed';
    return `
      <tr>
        <td><strong>${escapeHtml(p.name)}</strong></td>
        <td><code>${escapeHtml(p.phone)}</code></td>
        <td>${escapeHtml(p.condition_or_treatment || 'General Consultation')}</td>
        <td>${escapeHtml(p.doctor_name || 'Dr. Mitchell')}</td>
        <td>${escapeHtml(p.consultation_date)}</td>
        <td><strong>${escapeHtml(p.next_followup_date)}</strong></td>
        <td>
          <span class="status-badge ${isCompleted ? 'completed' : 'pending'}">
            ${isCompleted ? 'Completed' : 'Pending'}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 6px;">
            ${isCompleted ? `
              <button class="btn btn-xs btn-outline" onclick="togglePatientStatus(${p.id}, 'pending')">
                Reopen
              </button>
            ` : `
              <button class="btn btn-xs btn-success" onclick="togglePatientStatus(${p.id}, 'completed')">
                Mark Done
              </button>
            `}
            ${p.latest_draft_id && p.latest_draft_status === 'pending_review' ? `
              <button class="btn btn-xs btn-accent" onclick="openReviewModal(${p.latest_draft_id})">
                Review Draft
              </button>
            ` : `
              <button class="btn btn-xs btn-secondary" onclick="generateDraftForPatient(${p.id})">
                AI Draft
              </button>
            `}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Update top statistics
function updateMetrics() {
  const dueCount = duePatients.filter(p => p.followup_status === 'pending').length;
  const pendingReviewCount = duePatients.filter(p => p.latest_draft_status === 'pending_review').length;
  const completedCount = allPatients.filter(p => p.followup_status === 'completed').length;

  statDueToday.textContent = dueCount;
  statPendingReview.textContent = pendingReviewCount;
  statCompleted.textContent = completedCount;
  badgeDueCount.textContent = dueCount;
}

// Generate AI draft for individual patient
window.generateDraftForPatient = async function(patientId) {
  showToast('Generating personalized WhatsApp follow-up draft...');
  try {
    const res = await fetch(`/api/ai/generate-draft/${patientId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tone: 'caring' })
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || result.message || 'Generation failed');

    showToast('✨ Draft generated! Opening staff review screen...');
    await refreshAll();
    openReviewModal(result.data.draft.id);
  } catch (err) {
    alert(`Failed to generate draft: ${err.message}`);
  }
};

// Batch generate drafts
btnBatchGenerate.addEventListener('click', async () => {
  btnBatchGenerate.disabled = true;
  btnBatchGenerate.innerHTML = `<span>⏳</span> Generating...`;

  try {
    const targetDate = inputTargetDate.value || getTodayString();
    const res = await fetch('/api/ai/batch-generate-due', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: targetDate })
    });

    const result = await res.json();
    showToast(`Batch generation complete: ${result.count} patient drafts processed.`);
    await refreshAll();
  } catch (err) {
    alert('Error running batch generation: ' + err.message);
  } finally {
    btnBatchGenerate.disabled = false;
    btnBatchGenerate.innerHTML = `<span>✨</span> Batch Generate Drafts`;
  }
});

// Open Staff Review & WhatsApp Approval Modal
window.openReviewModal = async function(draftId) {
  try {
    const res = await fetch(`/api/ai/drafts/${draftId}`);
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Draft not found');

    const draft = result.data;
    currentDraftInReview = draft;

    // Fill metadata
    reviewPatientName.textContent = draft.patient_name;
    reviewPatientPhone.textContent = draft.patient_phone;
    reviewPatientCondition.textContent = draft.condition_or_treatment || 'General Follow-up';
    reviewPatientDoctor.textContent = draft.doctor_name || 'Dr. Mitchell';
    reviewPatientConsult.textContent = draft.consultation_date;

    reviewAiProvider.textContent = draft.ai_provider;
    reviewAiMode.textContent = draft.is_mock ? 'Mock Fallback Engine' : 'Live Generative AI';
    reviewAiNote.textContent = draft.ai_note || 'Generated according to clinical guidelines.';

    // Message edit & WhatsApp preview
    reviewMessageEdit.value = draft.message;
    updateWhatsAppBubble(draft.message);

    // Show modal
    modalReviewDraft.classList.remove('hidden');
  } catch (err) {
    alert('Error opening draft review: ' + err.message);
  }
};

// Update WhatsApp bubble with formatted text (bold, line breaks)
function updateWhatsAppBubble(text) {
  // Simple WhatsApp format parser: *bold* -> <strong>bold</strong>
  let formatted = escapeHtml(text)
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');

  waBubblePreview.innerHTML = formatted;
  const now = new Date();
  waBubbleTimeText.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Live sync WhatsApp preview when typing in textarea
reviewMessageEdit.addEventListener('input', (e) => {
  updateWhatsAppBubble(e.target.value);
});

btnSyncPreview.addEventListener('click', () => {
  updateWhatsAppBubble(reviewMessageEdit.value);
});

// Approve Draft
btnApproveDraft.addEventListener('click', async () => {
  if (!currentDraftInReview) return;

  btnApproveDraft.disabled = true;
  btnApproveDraft.innerHTML = `<span>⏳</span> Approving & Sending...`;

  try {
    const reviewer = reviewStaffName.value.trim() || 'Staff Nurse';
    const editedMessage = reviewMessageEdit.value.trim();

    const res = await fetch(`/api/ai/drafts/${currentDraftInReview.id}/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'approved',
        reviewer,
        edited_message: editedMessage
      })
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Approval failed');

    // Close review modal
    modalReviewDraft.classList.add('hidden');

    // Show receipt modal
    document.getElementById('receipt-recipient').textContent = result.data.mockDispatch?.recipientName || currentDraftInReview.patient_name;
    document.getElementById('receipt-phone').textContent = result.data.mockDispatch?.recipientPhone || currentDraftInReview.patient_phone;
    document.getElementById('receipt-mid').textContent = result.data.mockDispatch?.mockMessageId || 'wamid.mock_173000';
    document.getElementById('receipt-time').textContent = new Date().toLocaleString();

    modalReceipt.classList.remove('hidden');
    showToast('✅ Follow-up approved, mock dispatch recorded, and patient marked Completed!');
    await refreshAll();
  } catch (err) {
    alert('Failed to approve draft: ' + err.message);
  } finally {
    btnApproveDraft.disabled = false;
    btnApproveDraft.innerHTML = `<span class="icon">✅</span> Approve & Send (Mock WhatsApp)`;
  }
});

// Reject Draft
btnRejectDraft.addEventListener('click', async () => {
  if (!currentDraftInReview) return;
  if (!confirm('Are you sure you want to reject this draft?')) return;

  try {
    const res = await fetch(`/api/ai/drafts/${currentDraftInReview.id}/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'rejected',
        reviewer: reviewStaffName.value.trim() || 'Staff Nurse'
      })
    });

    modalReviewDraft.classList.add('hidden');
    showToast('Draft was rejected by staff member.');
    await refreshAll();
  } catch (err) {
    alert('Failed to reject draft: ' + err.message);
  }
});

// Toggle patient status directly (e.g. from Directory)
window.togglePatientStatus = async function(id, newStatus) {
  try {
    const res = await fetch(`/api/patients/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Status update failed');

    showToast(`Patient status updated to "${newStatus}".`);
    await refreshAll();
  } catch (err) {
    alert('Error updating status: ' + err.message);
  }
};

// Add Patient Form Submit
formAddPatient.addEventListener('submit', async (e) => {
  e.preventDefault();
  formErrorMsg.classList.add('hidden');

  const payload = {
    name: document.getElementById('new-name').value.trim(),
    phone: document.getElementById('new-phone').value.trim(),
    consultation_date: document.getElementById('new-consult-date').value,
    next_followup_date: document.getElementById('new-followup-date').value,
    doctor_name: document.getElementById('new-doctor').value.trim(),
    condition_or_treatment: document.getElementById('new-condition').value.trim(),
    notes: document.getElementById('new-notes').value.trim()
  };

  try {
    const res = await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (!res.ok) {
      const msg = result.details ? result.details.join(' ') : (result.error || 'Validation error');
      throw new Error(msg);
    }

    formAddPatient.reset();
    modalAddPatient.classList.add('hidden');
    showToast('🎉 Patient registered successfully!');
    await refreshAll();
  } catch (err) {
    formErrorMsg.textContent = err.message;
    formErrorMsg.classList.remove('hidden');
  }
});

// Seed / Reset Database button
btnSeed.addEventListener('click', async () => {
  if (!confirm('Reset database to clean fictional sample patients?')) return;

  btnSeed.disabled = true;
  btnSeed.textContent = 'Resetting...';

  try {
    const res = await fetch('/api/seed', { method: 'POST' });
    const result = await res.json();
    showToast(result.message || 'Database reset successfully!');
    await refreshAll();
  } catch (err) {
    alert('Failed to reset: ' + err.message);
  } finally {
    btnSeed.disabled = false;
    btnSeed.innerHTML = `<span class="icon">🌱</span> Reset Demo Data`;
  }
});

// Refresh button for Due Today
btnRefreshDue.addEventListener('click', loadDuePatients);
inputTargetDate.addEventListener('change', loadDuePatients);

// Search & Directory Filter events
patientSearch.addEventListener('input', () => renderPatientsTable(allPatients));
filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    filterButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderPatientsTable(allPatients);
  });
});

// Modal Close Handlers
btnOpenAddPatient.addEventListener('click', () => {
  // Set default dates: consult = today, follow-up = today
  const today = getTodayString();
  document.getElementById('new-consult-date').value = today;
  document.getElementById('new-followup-date').value = today;
  formErrorMsg.classList.add('hidden');
  modalAddPatient.classList.remove('hidden');
});

document.querySelectorAll('[data-close-modal]').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetModal = btn.getAttribute('data-close-modal');
    document.getElementById(targetModal)?.classList.add('hidden');
  });
});

// Close modal when clicking outside card
document.querySelectorAll('.modal-backdrop').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });
});

// Escape HTML helper
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Master refresh
async function refreshAll() {
  await Promise.all([
    loadDuePatients(),
    loadAllPatients(),
    checkEngineStatus()
  ]);
}

// Initial bootstrap
document.addEventListener('DOMContentLoaded', () => {
  inputTargetDate.value = getTodayString();
  refreshAll();
});
