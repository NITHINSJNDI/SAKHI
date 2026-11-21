import { NextResponse } from 'next/server';
import { query, getPool } from '@/lib/db';
import { issueNativeToken } from '@/lib/sessionUser';
import { clientKey, rateLimit } from '@/lib/rateLimit';

// POST { idToken } -> { token, expiresAt, user }
// The mobile app signs in with Google natively (expo-auth-session) and sends the
// Google ID token here. We verify it with Google, then issue the same app token
// as email sign-in. Accepted audiences: the web client plus the native clients.
const allowedAudiences = () =>
  [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
  ].filter(Boolean) as string[];

export async function POST(req: Request) {
  const limit = rateLimit(`native-google:${clientKey(req, 'anon')}`, 20, 60_000);
  if (!limit.ok) return NextResponse.json({ error: 'Too many attempts. Please wait a minute.' }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const idToken = typeof body?.idToken === 'string' ? body.idToken : '';
  if (!idToken) return NextResponse.json({ error: 'Missing Google token.' }, { status: 400 });

  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!res.ok) return NextResponse.json({ error: 'Google sign-in failed. Please try again.' }, { status: 401 });
  const info = await res.json();

  const audOk = allowedAudiences().includes(String(info.aud));
  const issOk = info.iss === 'accounts.google.com' || info.iss === 'https://accounts.google.com';
  const verified = info.email_verified === true || info.email_verified === 'true';
  if (!audOk || !issOk || !verified || !info.email) {
    return NextResponse.json({ error: 'Google sign-in failed. Please try again.' }, { status: 401 });
  }

  const email = String(info.email).toLowerCase();
  const name: string | null = info.name || null;
  const image: string | null = info.picture || null;

  // Same upsert the web NextAuth signIn callback does for Google users
  let id = '';
  try {
    await getPool();
    const { rows } = await query('SELECT id FROM users WHERE LOWER(email) = $1', [email]);
    if (rows.length === 0) {
      const ins = await query(
        "INSERT INTO users (email, name, full_name, image, auth_provider, created_at, updated_at) VALUES ($1, $2, $2, $3, 'google', NOW(), NOW()) RETURNING id",
        [email, name, image]
      );
      id = String(ins.rows[0]?.id ?? '');
    } else {
      id = String(rows[0].id);
      await query(
        'UPDATE users SET name = COALESCE(name, $1), image = COALESCE($2, image), updated_at = NOW() WHERE id = $3',
        [name, image, rows[0].id]
      );
    }
  } catch (err: any) {
    console.error('[native/google] user upsert failed:', err?.message);
  }

  const user = { id, email, name: name || email.split('@')[0], image };
  const { token, expiresAt } = await issueNativeToken(user);
  return NextResponse.json({ token, expiresAt, user });
}
