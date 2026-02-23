import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByName } from '@/lib/db/queries';
import { hashPassword, createSession, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { name, password } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Check if name is already taken
    const existing = await getUserByName(name.trim());
    if (existing) {
      return NextResponse.json({ error: 'Name already taken' }, { status: 409 });
    }

    // Password is optional — hash if provided, otherwise store empty
    const passwordHash = password ? await hashPassword(password) : '';
    const user = await createUser({ name: name.trim(), passwordHash });
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
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
