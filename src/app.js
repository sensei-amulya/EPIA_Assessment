import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import patientRoutes from './routes/patientRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { seedDatabase } from '../database/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  // Standard middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static UI from public/
  const publicDir = path.join(__dirname, '..', 'public');
  app.use(express.static(publicDir));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'Patient Follow-up & AI Automation API',
      version: '1.0.0'
    });
  });

  // Database reseed endpoint (Convenient for manual testing & review demos)
  app.post('/api/seed', (req, res) => {
    try {
      seedDatabase();
      res.status(200).json({
        success: true,
        message: 'Database reseeded successfully with realistic fictional patients.'
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: 'Failed to reseed database',
        details: err.message
      });
    }
  });

  // REST API Routes
  app.use('/api/patients', patientRoutes);
  app.use('/api/ai', aiRoutes);

  // Fallback to index.html for root path or SPA navigation if needed
  app.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  // Error handling middleware
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp();
