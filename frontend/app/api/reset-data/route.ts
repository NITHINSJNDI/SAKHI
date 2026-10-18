import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Pool } from 'pg';

let pool: Pool | null = null;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('supabase') || process.env.DATABASE_URL.includes('neon.tech')
      ? { rejectUnauthorized: false }
      : undefined
  });
}

async function wipeAllData() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ? session.user.email.replace(/[^a-zA-Z0-9]/g, '_') : null;
  const cookieStore = await cookies();

  // Delete all cookies matching sakhi_* across all users
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

  // Also clear in PostgreSQL if database is connected
  if (pool) {
    try {
      const client = await pool.connect();
      if (session?.user?.email) {
        const userRes = await client.query('SELECT id FROM users WHERE email = $1', [session.user.email]);
        if (userRes.rows.length > 0) {
          const userId = userRes.rows[0].id;
          await client.query('DELETE FROM daily_health_logs WHERE user_id = $1', [userId]);
          await client.query('DELETE FROM user_health_profiles WHERE user_id = $1', [userId]);
          await client.query('DELETE FROM cycle_logs WHERE user_id = $1', [userId]);
          await client.query('DELETE FROM triage_logs WHERE user_id = $1', [userId]);
        }
      } else {
        // Clear all mock tables
        await client.query('DELETE FROM daily_health_logs');
        await client.query('DELETE FROM user_health_profiles');
        await client.query('DELETE FROM cycle_logs');
        await client.query('DELETE FROM triage_logs');
      }
      client.release();
    } catch (e) {
      console.error('Failed to clean postgres database:', e);
    }
  }
}

export async function POST() {
  await wipeAllData();
  return NextResponse.json({ success: true, message: 'All user data, cookies, and database records successfully wiped.' });
}

export async function GET(req: Request) {
  await wipeAllData();
  return NextResponse.redirect(new URL('/onboarding', req.url));
}
