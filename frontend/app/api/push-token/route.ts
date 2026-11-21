import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getOwner } from '@/lib/store';

const EXPO_TOKEN_RE = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$/;

// POST { token, platform } — the mobile app registers its Expo push token.
// DELETE { token } — forget it (on sign-out).
export async function POST(req: Request) {
  const owner = await getOwner();
  if (owner.isGuest || !owner.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const token = String(body?.token || '');
  if (!EXPO_TOKEN_RE.test(token)) return NextResponse.json({ error: 'Invalid push token' }, { status: 400 });
  const platform = body?.platform === 'ios' || body?.platform === 'android' ? body.platform : null;
  await query(
    `INSERT INTO push_tokens (token, user_id, platform, updated_at) VALUES ($1, $2, $3, NOW())
     ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, updated_at = NOW()`,
    [token, owner.userId, platform]
  );
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const owner = await getOwner();
  if (owner.isGuest || !owner.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  await query('DELETE FROM push_tokens WHERE token = $1 AND user_id = $2', [String(body?.token || ''), owner.userId]);
  return NextResponse.json({ success: true });
}
