import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { getDb, closeDb } from '../database/db.js';
import { seedDatabase, getFormattedDate } from '../database/seed.js';

describe('Task 2: AI Automation & Staff Review Workflow', () => {
  let app;
  let db;

  before(() => {
    db = getDb(':memory:');
    seedDatabase(db);
    app = createApp();
  });

  after(() => {
    closeDb();
  });

  it('GET /api/ai/due-followups should identify patients due for follow-up', async () => {
    const today = getFormattedDate(0);
    const res = await request(app).get(`/api/ai/due-followups?date=${today}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 2);
  });

  it('POST /api/ai/generate-draft/:patientId should generate a personalized WhatsApp draft', async () => {
    const res = await request(app)
      .post('/api/ai/generate-draft/2')
      .send({ tone: 'caring' });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.draft);
    assert.equal(res.body.data.draft.status, 'pending_review');

    const message = res.body.data.draft.message;
    // Patient 2 is Maria Rodriguez (Hypertension)
    assert.ok(message.includes('Maria'), 'Message should address patient by first name');
    assert.ok(message.includes('Hypertension') || message.includes('blood pressure'), 'Message should reference clinical condition');
    assert.ok(res.body.data.draft.is_mock === 1 || res.body.data.draft.is_mock === 0);
  });

  it('POST /api/ai/batch-generate-due should batch generate drafts for all due patients', async () => {
    const today = getFormattedDate(0);
    const res = await request(app)
      .post('/api/ai/batch-generate-due')
      .send({ date: today });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
  });

  it('PATCH /api/ai/drafts/:id/review should allow staff to approve draft and auto-complete patient follow-up', async () => {
    // Liam Chen (Patient 1) has draft ID 1 pre-seeded in pending_review
    const res = await request(app)
      .patch('/api/ai/drafts/1/review')
      .send({
        status: 'approved',
        reviewer: 'Head Nurse Jennifer, RN',
        edited_message: 'Hello Liam! Checking in on your tooth recovery. Hope you are resting well.'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.draft.status, 'approved');
    assert.equal(res.body.data.draft.reviewed_by, 'Head Nurse Jennifer, RN');
    assert.equal(res.body.data.draft.message, 'Hello Liam! Checking in on your tooth recovery. Hope you are resting well.');

    // Verifies mock WhatsApp dispatch receipt
    assert.ok(res.body.data.mockDispatch);
    assert.ok(res.body.data.mockDispatch.mockMessageId.startsWith('wamid.mock_'));
    assert.equal(res.body.data.mockDispatch.deliveryStatus, 'simulated_delivered');

    // Verifies that patient follow-up status is automatically updated to completed!
    assert.equal(res.body.data.patient.followup_status, 'completed');
  });

  it('PATCH /api/ai/drafts/:id/review should reject draft when status is rejected', async () => {
    // Generate a fresh draft for patient 3
    const genRes = await request(app).post('/api/ai/generate-draft/3');
    const draftId = genRes.body.data.draft.id;

    const res = await request(app)
      .patch(`/api/ai/drafts/${draftId}/review`)
      .send({
        status: 'rejected',
        reviewer: 'Dr. Sarah Mitchell'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.draft.status, 'rejected');
  });
});
