import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { authMiddleware } from './middleware.js';

const app = express();

app.get('/protected', authMiddleware, (_req, res) => {
  res.status(200).json({ ok: true });
});

describe('authMiddleware', () => {
  it('rejects requests missing an authorization header', async () => {
    const response = await request(app).get('/protected');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      error: 'unauthorized',
      message: 'Authorization header is required',
    });
  });
});
