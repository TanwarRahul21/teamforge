import { type NextFunction, type Request, type Response } from 'express';

import { verifyAccessToken, type AccessTokenClaims } from './tokens.js';

import { isSessionActive } from './session-check.js';

export interface AuthenticatedRequest extends Request {
  user?: AccessTokenClaims;
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authorization = req.header('Authorization');

  if (!authorization) {
    res.status(401).json({
      error: 'unauthorized',
      message: 'Authorization header is required',
    });
    return;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    res.status(401).json({
      error: 'unauthorized',
      message: 'Authorization header must use Bearer token',
    });
    return;
  }

  const token = match[1];

  try {
    const claims = verifyAccessToken(token);

    const active = await isSessionActive(claims.sid);

    if (!active) {
      res.status(401).json({
        error: 'session_revoked',
        message: 'The session is no longer active',
      });
      return;
    }

    req.user = claims;
    next();
  } catch {
    res.status(401).json({
      error: 'invalid_token',
      message: 'The access token is invalid or expired',
    });
  }
}
