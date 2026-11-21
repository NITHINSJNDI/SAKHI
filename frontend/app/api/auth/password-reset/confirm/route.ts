import { NextResponse } from 'next/server';
import { confirmPasswordReset } from '@/lib/passwordReset';
import { clientKey, rateLimit } from '@/lib/rateLimit';

// POST { email, code, password } -> { ok: true }
// Checks the emailed code (5 tries, 15 minutes) and sets the new password.
export async function POST(req: Request) {
  const limit = rateLimit(`reset-confirm:${clientKey(req, 'anon')}`, 10, 10 * 60_000);
  if (!limit.ok) return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  try {
    const res = await confirmPasswordReset({
      email: String(body?.email || ''),
      code: String(body?.code || ''),
      password: String(body?.password || ''),
    });
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[password-reset/confirm]', err?.message);
    return NextResponse.json({ error: 'Could not reset your password. Please try again.' }, { status: 500 });
  }
}
