import { NextRequest, NextResponse } from 'next/server';
import { createUser, authenticateUser, createSessionToken, destroySession } from '@/lib/auth';

const COOKIE_NAME = 'anekanta-session';

function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return response;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'register') {
      const { username, email, password, displayName } = body;
      if (!username || !email || !password || !displayName) {
        return NextResponse.json({ error: 'All fields required' }, { status: 400 });
      }
      if (username.length < 3 || username.length > 30) {
        return NextResponse.json({ error: 'Username must be 3-30 characters' }, { status: 400 });
      }
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }
      try {
        const user = await createUser(username, email, password, displayName);
        const token = await createSessionToken(user);
        const response = NextResponse.json({ user });
        return setSessionCookie(response, token);
      } catch (e: any) {
        if (e.message?.includes('UNIQUE')) {
          return NextResponse.json({ error: 'Username or email already exists' }, { status: 409 });
        }
        throw e;
      }
    }

    if (action === 'login') {
      const { email, password } = body;
      const user = await authenticateUser(email, password);
      if (!user) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      const token = await createSessionToken(user);
      const response = NextResponse.json({ user });
      return setSessionCookie(response, token);
    }

    if (action === 'logout') {
      await destroySession();
      const response = NextResponse.json({ ok: true });
      response.cookies.delete(COOKIE_NAME);
      return response;
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e: any) {
    console.error('Auth error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
