import { NextRequest, NextResponse } from 'next/server';
import { getUserByName } from '@/lib/db/queries';
import { verifyPassword, createSession, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { name, password } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const user = await getUserByName(name.trim());
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // If user has a password, verify it; if no password set, allow login without one
    if (user.passwordHash) {
      const valid = await verifyPassword(password || '', user.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
      }
    }

    const token = createSession(user.id);

    const response = NextResponse.json({
      user: { id: user.id, name: user.name },
    });

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
