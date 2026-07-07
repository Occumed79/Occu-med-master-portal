import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

const COOKIE_NAME = 'occu_med_admin_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

type SessionPayload = {
  email: string;
  exp: number;
};

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is required.');
  return secret;
}

function base64Url(input: string): string {
  return Buffer.from(input).toString('base64url');
}

function signPayload(encodedPayload: string): string {
  return crypto.createHmac('sha256', getSessionSecret()).update(encodedPayload).digest('base64url');
}

export function createAdminSession(email: string): string {
  const payload: SessionPayload = { email, exp: Date.now() + SESSION_TTL_MS };
  const encodedPayload = base64Url(JSON.stringify(payload));
  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

export function verifyAdminSession(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  const expectedSignature = signPayload(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload.email || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function setAdminCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
}

export function clearAdminCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const session = verifyAdminSession(req.cookies?.[COOKIE_NAME]);
  if (!session) {
    res.status(401).json({ error: 'Admin login required.' });
    return;
  }
  next();
}

export function hasValidAdminSession(req: Request): boolean {
  return verifyAdminSession(req.cookies?.[COOKIE_NAME]) !== null;
}
