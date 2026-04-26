import express from 'express';
import request from 'supertest';
import exportRouter, { sanitizeFilename } from '../../routes/api/export.js';

// Mirror server.js wiring: per-route 2mb body limit for /api/export.
const app = express();
app.use('/api/export', express.json({ limit: '2mb' }), exportRouter);

// Minimal valid 1x1 PNG (signature + IHDR + IDAT + IEND).
const VALID_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const VALID_DATA_URL = `data:image/png;base64,${VALID_PNG_B64}`;

describe('POST /api/export', () => {
  test('valid PNG dataUrl returns 200 with image/png Content-Type', async () => {
    const res = await request(app)
      .post('/api/export')
      .send({ dataUrl: VALID_DATA_URL, filename: 'shot.png' });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^image\/png/);
    // body should start with PNG signature
    expect(res.body).toBeInstanceOf(Buffer);
    expect(res.body.slice(0, 4).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47]))).toBe(true);
  });

  test('valid request has Content-Disposition attachment header', async () => {
    const res = await request(app)
      .post('/api/export')
      .send({ dataUrl: VALID_DATA_URL, filename: 'my-export.png' });
    expect(res.status).toBe(200);
    const cd = res.headers['content-disposition'];
    expect(cd).toBeDefined();
    expect(cd).toMatch(/attachment;\s*filename=/);
    expect(cd).toMatch(/filename\*=UTF-8''/);
    expect(cd).toContain('my-export.png');
  });

  test('missing dataUrl returns 400', async () => {
    const res = await request(app)
      .post('/api/export')
      .send({ filename: 'oops.png' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('non-PNG dataUrl (JPEG prefix) returns 400', async () => {
    const res = await request(app)
      .post('/api/export')
      .send({ dataUrl: 'data:image/jpeg;base64,/9j/4AAQSk==', filename: 'x.png' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('malformed base64 returns 400', async () => {
    const res = await request(app)
      .post('/api/export')
      .send({ dataUrl: 'data:image/png;base64,!!!not-base64!!!', filename: 'x.png' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('valid dataUrl with suspicious filename gets sanitized', async () => {
    const res = await request(app)
      .post('/api/export')
      .send({ dataUrl: VALID_DATA_URL, filename: '../../evil' });
    expect(res.status).toBe(200);
    const cd = res.headers['content-disposition'];
    // No path traversal characters in the resulting filename.
    expect(cd).not.toMatch(/\.\.\//);
    expect(cd).not.toContain('/');
    expect(cd).not.toContain('..');
    // Per the spec sanitizer, "../../evil" collapses to the safe default.
    expect(cd).toContain('export.png');
  });
});

describe('GET /api/export', () => {
  test('returns 404', async () => {
    const res = await request(app).get('/api/export');
    expect(res.status).toBe(404);
  });
});

describe('sanitizeFilename', () => {
  test('strips path traversal to safe default', () => {
    // The spec sanitizer's regex chain collapses "../../evil" to empty,
    // which falls back to "export.png".
    expect(sanitizeFilename('../../evil')).toBe('export.png');
  });

  test('preserves a clean basename', () => {
    expect(sanitizeFilename('my-shot')).toBe('my-shot.png');
  });

  test('empty input returns export.png', () => {
    expect(sanitizeFilename('')).toBe('export.png');
    expect(sanitizeFilename('   ')).toBe('export.png');
  });

  test('overlong input returns export.png', () => {
    expect(sanitizeFilename('a'.repeat(300))).toBe('export.png');
  });

  test('removes disallowed characters', () => {
    expect(sanitizeFilename('weird$%name.png')).toBe('weirdname.png');
  });

  test('strips trailing extension and re-adds .png', () => {
    expect(sanitizeFilename('foo.jpg')).toBe('foo.png');
  });
});
