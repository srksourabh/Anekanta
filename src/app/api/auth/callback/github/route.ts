import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { findOrCreateOAuthUser, createSessionToken } from '@/lib/auth';

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

    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${baseUrl}/api/auth/callback/github`,
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(`${baseUrl}/auth/login?error=oauth_token`);
    }

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      return NextResponse.redirect(`${baseUrl}/auth/login?error=oauth_token`);
    }

    const accessToken = tokenData.access_token;

    // Fetch user profile
    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    });

    if (!userRes.ok) {
      return NextResponse.redirect(`${baseUrl}/auth/login?error=oauth_profile`);
    }

    const profile = await userRes.json();

    // Fetch primary email (may be private)
    let email = profile.email;
    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      });
      if (emailsRes.ok) {
        const emails = await emailsRes.json();
        const primary = emails.find((e: any) => e.primary && e.verified);
        email = primary?.email || emails[0]?.email;
      }
    }

    if (!email) {
      return NextResponse.redirect(`${baseUrl}/auth/login?error=oauth_no_email`);
    }

    const displayName = profile.name || profile.login || email.split('@')[0];

    // Find or create user, then create session
    const user = await findOrCreateOAuthUser('github', String(profile.id), email, displayName);
    const token = await createSessionToken(user);

    const response = NextResponse.redirect(baseUrl);
    response.cookies.set('anekanta-session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return response;
  } catch {
    return NextResponse.redirect(`${baseUrl}/auth/login?error=oauth_failed`);
  }
}
