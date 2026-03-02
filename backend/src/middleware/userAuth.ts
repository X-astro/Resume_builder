import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const USER_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

function getTokenSecret(): string {
  return (
    process.env.USER_TOKEN_SECRET?.trim() ||
    process.env.ADMIN_TOKEN_SECRET?.trim() ||
    'resume-builder-user-secret'
  );
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signPayload(encodedPayload: string): string {
  return crypto
    .createHmac('sha256', getTokenSecret())
    .update(encodedPayload)
    .digest('base64url');
}

export function generateUserToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    userId,
    iat: now,
    exp: now + USER_TOKEN_TTL_SECONDS,
    nonce: crypto.randomBytes(16).toString('hex'),
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

interface DecodedPayload {
  userId: string;
}

export function decodeUserToken(token: string): DecodedPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, providedSignature] = parts;
  if (!encodedPayload || !providedSignature) return null;

  const expectedSignature = signPayload(encodedPayload);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as {
      userId?: string;
      exp?: number;
    };
    const now = Math.floor(Date.now() / 1000);
    if (!payload.userId || !payload.exp || typeof payload.exp !== 'number') return null;
    if (payload.exp <= now) return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export function userAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.substring(7);
  const decoded = decodeUserToken(token);
  if (!decoded) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    return;
  }

  req.userId = decoded.userId;
  next();
}
