import { NextResponse } from 'next/server';
import { verifyManualAccount } from '@/lib/userAccounts';
import { issueNativeToken } from '@/lib/sessionUser';
import { clientKey, rateLimit } from '@/lib/rateLimit';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, X-Requested-With',
    },
  });
}

// POST { email, password } -> { token, expiresAt, user }
// Email/password sign-in for the mobile app, which can't use NextAuth's cookies.
export async function POST(req: Request) {
  const limit = rateLimit(`native-login:${clientKey(req, 'anon')}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'Too many attempts. Please wait a minute.' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || '');
  const password = String(body?.password || '');
  if (!email || !password) {
    return NextResponse.json({ error: 'Please enter both your email and password.' }, { status: 400 });
  }

  const res = await verifyManualAccount({ email, password });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 401 });

  const user = {
    id: String(res.user.id),
    email: res.user.email,
    name: res.user.name || res.user.email.split('@')[0],
    image: res.user.image || null,
  };
  const { token, expiresAt } = await issueNativeToken(user);
  return NextResponse.json({ token, expiresAt, user });
}
