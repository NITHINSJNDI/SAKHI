import { createHash, randomInt } from 'crypto';
import { query, getPool } from '@/lib/db';
import { hashPassword, normalizeEmail } from '@/lib/userAccounts';

const CODE_TTL_MIN = 15;
const MAX_ATTEMPTS = 5;

const hashCode = (email: string, code: string) =>
  createHash('sha256').update(`${email}:${code}`).digest('hex');

async function sendResetEmail(to: string, code: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Local development without email set up: log the code so it can be tested.
    if (process.env.NODE_ENV !== 'production') console.log(`[password-reset] code for ${to}: ${code}`);
    else console.error('[password-reset] RESEND_API_KEY is not set; reset email not sent');
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESET_EMAIL_FROM || 'Sakhi <onboarding@resend.dev>',
      to,
      subject: 'Your Sakhi password reset code',
      text: `Your Sakhi password reset code is ${code}.\n\nIt expires in ${CODE_TTL_MIN} minutes. If you didn't ask for this, you can ignore this email.`,
    }),
  });
  if (!res.ok) console.error('[password-reset] Resend error', res.status, await res.text().catch(() => ''));
}

/** Always resolves the same way, so it never reveals whether an email has an account. */
export async function requestPasswordReset(rawEmail: string): Promise<void> {
  const email = normalizeEmail(rawEmail || '');
  if (!email) return;
  await getPool();
  const { rows } = await query('SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1', [email]);
  if (rows.length === 0) return;
  const userId = rows[0].id;
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await query('DELETE FROM password_resets WHERE user_id = $1', [userId]);
  await query(
    `INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '${CODE_TTL_MIN} minutes')`,
    [hashCode(email, code), userId]
  );
  await sendResetEmail(email, code);
}

export async function confirmPasswordReset(input: { email: string; code: string; password: string }):
  Promise<{ ok: true; userId: number } | { ok: false; error: string }> {
  const email = normalizeEmail(input.email || '');
  const code = String(input.code || '').trim();
  const password = String(input.password || '');
  if (password.length < 8 || password.length > 128) {
    return { ok: false, error: 'Password must be 8 to 128 characters.' };
  }
  const invalid = { ok: false as const, error: 'That code is wrong or has expired. Request a new one.' };
  if (!email || !/^\d{6}$/.test(code)) return invalid;

  await getPool();
  const { rows } = await query(
    `SELECT pr.token_hash, pr.user_id, pr.attempts FROM password_resets pr
       JOIN users u ON u.id = pr.user_id
      WHERE LOWER(u.email) = $1 AND pr.used_at IS NULL AND pr.expires_at > NOW()
      LIMIT 1`,
    [email]
  );
  const row = rows[0];
  if (!row || row.attempts >= MAX_ATTEMPTS) return invalid;
  if (row.token_hash !== hashCode(email, code)) {
    await query('UPDATE password_resets SET attempts = attempts + 1 WHERE token_hash = $1', [row.token_hash]);
    return invalid;
  }

  await query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [await hashPassword(password), row.user_id]
  );
  await query('UPDATE password_resets SET used_at = NOW() WHERE token_hash = $1', [row.token_hash]);
  return { ok: true, userId: row.user_id };
}
