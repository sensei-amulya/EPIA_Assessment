import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { getDb, closeDb } from '../database/db.js';
import { seedDatabase, getFormattedDate } from '../database/seed.js';

describe('Task 1: Patient Follow-up Backend REST API', () => {
  let app;
  let db;

  before(() => {
    // Use in-memory or fresh DB for tests
    db = getDb(':memory:');
    seedDatabase(db);
    app = createApp();
  });

  after(() => {
    closeDb();
  });

  it('GET /api/health should return 200 and healthy status', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'healthy');
  });

  describe('POST /api/patients (Adding a patient)', () => {
    it('should create a new patient with valid data', async () => {
      const today = getFormattedDate(0);
      const nextWeek = getFormattedDate(7);

      const payload = {
        name: 'Fictional Jane Doe',
        phone: '+1-555-0987',
        consultation_date: today,
        next_followup_date: nextWeek,
        doctor_name: 'Dr. Sarah Mitchell',
        condition_or_treatment: 'Orthodontic Consultation',
        notes: 'Check aligner fit.'
      };

      const res = await request(app)
        .post('/api/patients')
        .send(payload);

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.name, 'Fictional Jane Doe');
      assert.equal(res.body.data.phone, '+1-555-0987');
      assert.equal(res.body.data.followup_status, 'pending');
    });

    it('should return 400 Bad Request when required fields are missing or invalid', async () => {
      const res = await request(app)
        .post('/api/patients')
        .send({
          name: '',
          phone: 'invalid',
          consultation_date: 'not-a-date',
          next_followup_date: '2026-99-99'
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(Array.isArray(res.body.details));
      assert.ok(res.body.details.length >= 3);
    });

    it('should return 400 Bad Request when next_followup_date is before consultation_date', async () => {
      const res = await request(app)
        .post('/api/patients')
        .send({
          name: 'Time Traveler',
          phone: '+1-555-0100',
          consultation_date: '2026-11-20',
          next_followup_date: '2026-11-10'
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.details.some(d => d.includes('cannot be earlier than consultation_date')));
    });
  });

  describe('GET /api/patients (Retrieving all patients)', () => {
    it('should retrieve all patients', async () => {
      const res = await request(app).get('/api/patients');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 6);
    });

    it('should support filtering patients by status', async () => {
      const res = await request(app).get('/api/patients?status=completed');
      assert.equal(res.status, 200);
      assert.ok(res.body.data.every(p => p.followup_status === 'completed'));
    });
  });

  describe('GET /api/patients/due-today (Retrieving due patients)', () => {
    it('should retrieve patients whose follow-up is due today and pending', async () => {
      const today = getFormattedDate(0);
      const res = await request(app).get(`/api/patients/due-today?date=${today}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length > 0);
      // Ensure all returned patients have followup_status = pending
      assert.ok(res.body.data.every(p => p.followup_status === 'pending'));
    });
  });

  describe('PATCH /api/patients/:id/status (Updating follow-up status)', () => {
    it('should update a patient follow-up status to completed', async () => {
      const res = await request(app)
        .patch('/api/patients/1/status')
        .send({ status: 'completed' });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.followup_status, 'completed');
    });

    it('should return 404 Not Found for non-existent patient ID', async () => {
      const res = await request(app)
        .patch('/api/patients/99999/status')
        .send({ status: 'completed' });

      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
    });

    it('should return 400 Bad Request for invalid status value', async () => {
      const res = await request(app)
        .patch('/api/patients/1/status')
        .send({ status: 'unknown_status' });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });
  });
});
