import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';

async function wipeAllData() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ? session.user.email.replace(/[^a-zA-Z0-9]/g, '_') : null;
  const cookieStore = await cookies();

  // Delete this browser's Sakhi + auth cookies
  const allCookies = cookieStore.getAll();
  for (const c of allCookies) {
    if (
      c.name.startsWith('sakhi_') ||
      c.name.includes('profile') ||
      c.name.includes('daily_logs') ||
      c.name.includes('cycle_history') ||
      c.name.includes('notifications') ||
      c.name.includes('next-auth')
    ) {
      cookieStore.delete(c.name);
    }
  }

  cookieStore.delete('next-auth.session-token');
  cookieStore.delete('__Secure-next-auth.session-token');
  cookieStore.delete('next-auth.csrf-token');
  cookieStore.delete('next-auth.callback-url');

  if (email) {
    cookieStore.delete(`sakhi_her_profile_${email}`);
    cookieStore.delete(`sakhi_preg_profile_${email}`);
    cookieStore.delete(`sakhi_daily_logs_${email}`);
    cookieStore.delete(`sakhi_cycle_history_${email}`);
    cookieStore.delete(`sakhi_notifications_${email}`);
    cookieStore.delete(`sakhi_pregnancy_logs_${email}`);
    cookieStore.delete(`sakhi_pregnancy_nutrition_${email}`);
    cookieStore.delete(`sakhi_pregnancy_appointments_${email}`);
  }

  // Clear the signed-in user's rows in PostgreSQL. Never touch other users' data:
  // an unauthenticated request only clears its own cookies.
  const pool = await getPool();
  if (pool && session?.user?.email) {
    const client = await pool.connect();
    try {
      const userRes = await client.query('SELECT id FROM users WHERE email = $1', [session.user.email]);
      if (userRes.rows.length > 0) {
        const userId = userRes.rows[0].id;
        await client.query('DELETE FROM daily_health_logs WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM user_health_profiles WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM cycle_logs WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM triage_logs WHERE user_id = $1', [userId]);
      }
    } catch (e) {
      console.error('Failed to clean postgres database:', e);
    } finally {
      client.release();
    }
  }
}

export async function POST() {
  try {
    await wipeAllData();
    return NextResponse.json({ success: true, message: 'All user data, cookies, and database records successfully wiped.' });
  } catch (err: any) {
    console.error('Reset data error:', err);
    return NextResponse.json({ error: 'Failed to reset data' }, { status: 500 });
  }
}

// GET must not have destructive side effects (link prefetchers, crawlers and
// browser previews issue GETs). Send the user to the /reset page, which POSTs.
export async function GET(req: Request) {
  return NextResponse.redirect(new URL('/reset', req.url));
}
