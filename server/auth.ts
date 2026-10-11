import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { getDb, queryOne } from './db.ts';

const TOKEN_SECRET = process.env.SESSION_SECRET || 'nova-ai-super-secret-auth-key-2026';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(derivedKey, 'hex'));
  } catch {
    return false;
  }
}

export interface UserPayload {
  id: string;
  email: string;
  displayName: string;
}

export function createToken(payload: UserPayload): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({
    ...payload,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days
  })).toString('base64url');

  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): UserPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;

    const expectedSignature = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');

    if (signature !== expectedSignature) return null;

    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (decoded.exp && Date.now() > decoded.exp) {
      return null;
    }

    return {
      id: decoded.id,
      email: decoded.email,
      displayName: decoded.displayName,
    };
  } catch {
    return null;
  }
}

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
    return;
  }

  // Ensure user still exists in database
  const db = await getDb();
  const user = queryOne(db, 'SELECT id, email, display_name FROM users WHERE id = ?', [payload.id]);
  if (!user) {
    res.status(401).json({ error: 'User account not found.' });
    return;
  }

  req.user = {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
  };
  next();
}
