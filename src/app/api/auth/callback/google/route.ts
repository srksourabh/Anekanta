import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { findOrCreateOAuthUser, createSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(`${baseUrl}/auth/login?error=oauth_denied`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${baseUrl}/auth/login?error=oauth_invalid`);
    }

    // Verify state
    const cookieStore = await cookies();
    const storedState = cookieStore.get('oauth_state')?.value;
    cookieStore.delete('oauth_state');

    if (state !== storedState) {
      return NextResponse.redirect(`${baseUrl}/auth/login?error=oauth_state`);
    }

    // Exchange code for tokens
    const redirectUri = `${baseUrl}/api/auth/callback/google`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(`${baseUrl}/auth/login?error=oauth_token`);
    }

    const tokens = await tokenRes.json();

    // Fetch user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userRes.ok) {
      return NextResponse.redirect(`${baseUrl}/auth/login?error=oauth_profile`);
    }

    const profile = await userRes.json();
    const { id: googleId, email, name } = profile;

    if (!email) {
      return NextResponse.redirect(`${baseUrl}/auth/login?error=oauth_no_email`);
    }

    // Find or create user, then create session
    const user = await findOrCreateOAuthUser('google', googleId, email, name || email.split('@')[0]);
    await createSession(user);

    return NextResponse.redirect(baseUrl);
  } catch {
    return NextResponse.redirect(`${baseUrl}/auth/login?error=oauth_failed`);
  }
}
