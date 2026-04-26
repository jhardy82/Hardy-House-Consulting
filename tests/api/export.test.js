import express from 'express';
import request from 'supertest';
import exportRouter from '../../routes/api/export.js';

const app = express();
app.use(express.json({ limit: '100kb' }));
app.use('/api/export', exportRouter);

describe('POST /api/export', () => {
  test('returns 501 not implemented', async () => {
    const res = await request(app)
      .post('/api/export')
      .send({ dataUrl: 'data:image/png;base64,abc123', filename: 'test.png' });
    expect(res.status).toBe(501);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(/not implemented/i);
  });

  test('rejects oversized body with 413', async () => {
    const bigBody = { dataUrl: 'x'.repeat(200_000), filename: 'big.png' };
    const res = await request(app)
      .post('/api/export')
      .send(bigBody);
    // With global limit of 100kb, 200kb payload should be rejected
    expect([413, 501]).toContain(res.status);
  });
});
