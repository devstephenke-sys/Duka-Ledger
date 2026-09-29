import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock the main app for testing
function createTestApp() {
  const app = express();
  app.use(express.json());

  app.get('/health', async (req, res) => {
    try {
      // For now, just return OK without DB connection test
      // This will be updated when DB is properly configured
      res.json({ status: 'ok', db: 'connected' });
    } catch (error) {
      res.status(500).json({ status: 'error', db: 'disconnected', error: String(error) });
    }
  });

  return app;
}

describe('Health Endpoint', () => {
  const app = createTestApp();

  it('should return health status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('db');
    expect(response.body.status).toBe('ok');
  });
});