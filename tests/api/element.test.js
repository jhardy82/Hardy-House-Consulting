import express from 'express';
import session from 'express-session';
import request from 'supertest';
import elementRouter from '../../routes/api/element.js';

const app = express();
app.use(express.json());
app.use(session({
  secret: 'test-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false },
}));
app.use('/api/element', elementRouter);

describe('GET /api/element', () => {
  test('returns 200 with element key null when no session', async () => {
    const res = await request(app).get('/api/element');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('element', null);
  });
});

describe('POST /api/element', () => {
  test('valid element "fire" returns 200 with element and ok:true', async () => {
    const res = await request(app)
      .post('/api/element')
      .send({ element: 'fire' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ element: 'fire', ok: true });
  });

  test('valid element "earth" returns 200 with element and ok:true', async () => {
    const res = await request(app)
      .post('/api/element')
      .send({ element: 'earth' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ element: 'earth', ok: true });
  });

  test('invalid element returns 400', async () => {
    const res = await request(app)
      .post('/api/element')
      .send({ element: 'invalid' });
    expect(res.status).toBe(400);
  });

  test('missing element field returns 400', async () => {
    const res = await request(app)
      .post('/api/element')
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('session persistence', () => {
  test('POST then GET in same agent returns the posted element', async () => {
    const agent = request.agent(app);
    await agent.post('/api/element').send({ element: 'aether' });
    const res = await agent.get('/api/element');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ element: 'aether' });
  });
});
