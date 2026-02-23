import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

export const SESSION_COOKIE = 'ai-tutor-session';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const SESSION_EXPIRY = '7d';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function createSession(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: SESSION_EXPIRY });
}

export function verifySession(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export function getSessionFromRequest(request: NextRequest): { userId: string } | null {
  const cookie = request.cookies.get(SESSION_COOKIE);
  if (!cookie?.value) return null;
  return verifySession(cookie.value);
}
