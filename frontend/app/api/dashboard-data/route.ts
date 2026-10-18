import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Pool } from 'pg';
import { cookies } from 'next/headers';

let pool: Pool | null = null;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('supabase') || process.env.DATABASE_URL.includes('neon.tech') 
      ? { rejectUnauthorized: false } 
      : undefined
  });
}

// GET: Fetch real dashboard data for user (No hardcoded fake logs)
export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const email = session.user.email.replace(/[^a-zA-Z0-9]/g, '_');
  const cookieStore = await cookies();

  if (!pool) {
    // Read the user's actual profile from cookie
    const overridesStr = cookieStore.get(`sakhi_her_profile_${email}`)?.value;
    const overrides = overridesStr ? JSON.parse(overridesStr) : null;
    
    // Read actual saved daily logs submitted by this user
    const dailyLogsStr = cookieStore.get(`sakhi_daily_logs_${email}`)?.value;
    const realLogs = dailyLogsStr ? JSON.parse(dailyLogsStr) : [];

    const userProfile = overrides ? {
      preferred_name: overrides.preferred_name || "",
      last_period_start: overrides.last_period_start || new Date().toISOString(),
      cycle_length_avg: overrides.cycle_length ? parseInt(overrides.cycle_length) : 28,
      period_duration: overrides.period_duration ? parseInt(overrides.period_duration) : 5,
      cycle_regularity: overrides.cycle_regularity || "Regular",
      primary_goal: overrides.primary_goal || "Track Period & PMS",
      diagnosed_conditions: overrides.diagnosed_conditions || []
    } : { preferred_name: "" };

    const cycleHistoryStr = cookieStore.get(`sakhi_cycle_history_${email}`)?.value;
    let realCycleHistory: any[] = [];
    try {
      realCycleHistory = cycleHistoryStr ? JSON.parse(cycleHistoryStr) : [];
    } catch {
      realCycleHistory = [];
    }

    if (realCycleHistory.length === 0 && overrides && overrides.cycle_length) {
      const currentMonth = new Date().toLocaleDateString('en-US', { month: 'short' });
      realCycleHistory = [
        { 
          month: `${currentMonth} (Setup)`, 
          cycleLength: parseInt(overrides.cycle_length), 
          periodDuration: parseInt(overrides.period_duration || 5) 
        }
      ];
    }

    return NextResponse.json({ 
      profile: userProfile, 
      logs: realLogs, 
      cycleHistory: realCycleHistory, 
      mode: 'live' 
    });
  }

  try {
    const client = await pool.connect();
    
    // Get user id
    const userRes = await client.query('SELECT id FROM users WHERE email = $1', [session.user.email]);
    if (userRes.rows.length === 0) {
      client.release();
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const userId = userRes.rows[0].id;

    // Fetch Profile
    const profileRes = await client.query('SELECT * FROM user_health_profiles WHERE user_id = $1', [userId]);
    const profile = profileRes.rows.length > 0 ? profileRes.rows[0] : null;

    // Fetch real daily logs
    const logsRes = await client.query(
      'SELECT * FROM daily_health_logs WHERE user_id = $1 ORDER BY log_date ASC',
      [userId]
    );
    const logs = logsRes.rows;

    client.release();
    
    return NextResponse.json({ profile, logs, cycleHistory: [] });
    
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
