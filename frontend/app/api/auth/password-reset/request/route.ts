import { NextResponse } from 'next/server';
import { requestPasswordReset } from '@/lib/passwordReset';
import { clientKey, rateLimit } from '@/lib/rateLimit';

// POST { email } -> { ok: true }
// Emails a 6-digit code if the account exists. The reply is the same either
// way, so this can't be used to find out who has an account.
export async function POST(req: Request) {
  const limit = rateLimit(`reset-request:${clientKey(req, 'anon')}`, 5, 10 * 60_000);
  if (!limit.ok) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  try {
    await requestPasswordReset(String(body?.email || ''));
  } catch (err: any) {
    console.error('[password-reset/request]', err?.message);
  }
  return NextResponse.json({ ok: true });
}
