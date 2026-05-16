import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || '';
if (!SECRET) {
  throw new Error('JWT_SECRET is required');
}

export type AuthedUser = {
  id: string;
  email: string;
  role: 'owner' | 'sitter';
};

export interface AuthedRequest extends Request {
  user?: AuthedUser;
}

export function signToken(user: AuthedUser): string {
  return jwt.sign(user, SECRET, { expiresIn: '30d' });
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie('petsitter_auth', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    domain: process.env.COOKIE_DOMAIN || undefined,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie('petsitter_auth', {
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: '/',
  });
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.petsitter_auth;
  if (!token) return res.status(401).json({ error: 'unauthenticated' });
  try {
    const decoded = jwt.verify(token, SECRET) as AuthedUser;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'invalid_token' });
  }
}

export function requireOwner(req: AuthedRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, (err?: any) => {
    if (err) return;
    if (req.user?.role !== 'owner') {
      return res.status(403).json({ error: 'owner_only' });
    }
    next();
  });
}
