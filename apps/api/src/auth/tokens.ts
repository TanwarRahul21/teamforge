import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';

const ACCESS_TOKEN_TTL_SECONDS = 5 * 60;

export interface AccessTokenClaims {
  sub: string;
  sid: string;
}

export interface RefreshToken {
  raw: string;
  hash: Buffer;
}

function getKeys(): {
  privateKey: string;
  publicKey: string;
} {
  const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH;
  const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH;

  if (!privateKeyPath) {
    throw new Error('JWT_PRIVATE_KEY_PATH is required');
  }

  if (!publicKeyPath) {
    throw new Error('JWT_PUBLIC_KEY_PATH is required');
  }

  return {
    privateKey: readFileSync(privateKeyPath, 'utf8'),
    publicKey: readFileSync(publicKeyPath, 'utf8'),
  };
}

export function createAccessToken(claims: AccessTokenClaims): string {
  const { privateKey } = getKeys();

  return jwt.sign(claims, privateKey, {
    algorithm: 'RS256',
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    jwtid: randomBytes(16).toString('hex'),
  });
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  const { publicKey } = getKeys();

  return jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
  }) as AccessTokenClaims;
}

export function newRefreshToken(): RefreshToken {
  const raw = randomBytes(32).toString('base64url');

  const hash = createHash('sha256').update(raw).digest();

  return {
    raw,
    hash,
  };
}
