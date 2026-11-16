import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './src/app.js';
import { getDb } from './database/db.js';

// Ensure database connection and schema are ready
getDb();

const app = createApp();
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`
=====================================================
🏥 Patient Follow-up System running successfully!
=====================================================
📡 Server Port:         ${PORT}
🌐 Staff Review UI:     http://localhost:${PORT}
📋 API Health:          http://localhost:${PORT}/api/health
👥 All Patients:        http://localhost:${PORT}/api/patients
⏰ Due Today:           http://localhost:${PORT}/api/patients/due-today
🤖 AI Follow-up Queue:  http://localhost:${PORT}/api/ai/due-followups
-----------------------------------------------------
AI Provider:            ${process.env.GEMINI_API_KEY ? 'Google Gemini (Live)' : (process.env.OPENAI_API_KEY ? 'OpenAI (Live)' : 'Clinical Mock Engine (Fallback/Offline)')}
Database:               SQLite (${process.env.DB_PATH || './database/patients.db'})
=====================================================
`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
