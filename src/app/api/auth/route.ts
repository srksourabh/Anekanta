import { NextRequest, NextResponse } from 'next/server';
import { createUser, authenticateUser, createSession, destroySession } from '@/lib/auth';

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
        await createSession(user);
        return NextResponse.json({ user });
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
      await createSession(user);
      return NextResponse.json({ user });
    }

    if (action === 'logout') {
      await destroySession();
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e: any) {
    console.error('Auth error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
