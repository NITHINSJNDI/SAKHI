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

// GET: Fetch real dashboard data for user (with robust database and cookie fallback)
export async function GET() {
  const session = await getServerSession(authOptions);
  const cookieStore = await cookies();

  let email = 'demo_user';
  if (session?.user?.email) {
    email = session.user.email.replace(/[^a-zA-Z0-9]/g, '_');
  } else {
    const allCookies = cookieStore.getAll();
    const match = allCookies.find(c => c.name.startsWith('sakhi_her_profile_'));
    if (match) {
      email = match.name.replace('sakhi_her_profile_', '');
    }
  }

  // Read saved cookie overrides if any
  const overridesStr = cookieStore.get(`sakhi_her_profile_${email}`)?.value;
  let cookieProfile: any = null;
  if (overridesStr) {
    try {
      cookieProfile = JSON.parse(overridesStr);
    } catch {
      cookieProfile = null;
    }
  }

  // Read actual saved daily logs from cookies
  const dailyLogsStr = cookieStore.get(`sakhi_daily_logs_${email}`)?.value;
  let cookieLogs: any[] = [];
  if (dailyLogsStr) {
    try {
      cookieLogs = JSON.parse(dailyLogsStr);
    } catch {
      cookieLogs = [];
    }
  }

  // Read cycle history from cookies
  const cycleHistoryStr = cookieStore.get(`sakhi_cycle_history_${email}`)?.value;
  let cookieCycleHistory: any[] = [];
  if (cycleHistoryStr) {
    try {
      cookieCycleHistory = JSON.parse(cycleHistoryStr);
    } catch {
      cookieCycleHistory = [];
    }
  }

  const defaultPastPeriod = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const defaultProfile = {
    preferred_name: cookieProfile?.preferred_name || session?.user?.name?.split(' ')[0] || "Beautiful",
    last_period_start: cookieProfile?.last_period_start || defaultPastPeriod,
    last_period_end: cookieProfile?.last_period_end || new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    cycle_length_avg: cookieProfile?.cycle_length ? parseInt(cookieProfile.cycle_length) : (cookieProfile?.cycle_length_avg ? parseInt(cookieProfile.cycle_length_avg) : 28),
    period_duration: cookieProfile?.period_duration ? parseInt(cookieProfile.period_duration) : 5,
    cycle_regularity: cookieProfile?.cycle_regularity || "Regular",
    primary_goal: cookieProfile?.primary_goal || "Track Period & PMS",
    diagnosed_conditions: cookieProfile?.diagnosed_conditions || []
  };

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'short' });
  const initialCycleHistory = [
    { 
      month: `${currentMonth} (Setup)`, 
      cycleLength: defaultProfile.cycle_length_avg, 
      periodDuration: defaultProfile.period_duration 
    }
  ];

  if (!pool || !session?.user?.email) {
    return NextResponse.json({ 
      profile: defaultProfile, 
      logs: cookieLogs, 
      cycleHistory: cookieCycleHistory.length > 0 ? cookieCycleHistory : initialCycleHistory, 
      mode: session?.user?.email ? 'live' : 'preview' 
    });
  }

  try {
    const client = await pool.connect();
    
    // Get user id, or insert user if not yet registered
    let userRes = await client.query('SELECT id FROM users WHERE email = $1', [session.user.email]);
    let userId: number;
    if (userRes.rows.length === 0) {
      const insertUser = await client.query(
        'INSERT INTO users (email, name, image) VALUES ($1, $2, $3) RETURNING id',
        [session.user.email, session.user.name, session.user.image]
      );
      userId = insertUser.rows[0].id;
    } else {
      userId = userRes.rows[0].id;
    }

    // Fetch Profile
    const profileRes = await client.query('SELECT * FROM user_health_profiles WHERE user_id = $1', [userId]);
    let profile = profileRes.rows.length > 0 ? profileRes.rows[0] : null;

    if (!profile) {
      // If no profile exists in PostgreSQL, persist defaultProfile so database is in sync
      const insertProfile = await client.query(
        `INSERT INTO user_health_profiles 
          (user_id, preferred_name, last_period_start, cycle_length_avg, period_duration, cycle_regularity, diagnosed_conditions)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          userId,
          defaultProfile.preferred_name,
          defaultProfile.last_period_start,
          defaultProfile.cycle_length_avg,
          defaultProfile.period_duration,
          defaultProfile.cycle_regularity,
          defaultProfile.diagnosed_conditions
        ]
      );
      profile = insertProfile.rows[0];
    }

    // Fetch real daily logs
    const logsRes = await client.query(
      'SELECT * FROM daily_health_logs WHERE user_id = $1 ORDER BY log_date ASC',
      [userId]
    );
    let logs = logsRes.rows;
    if (logs.length === 0 && cookieLogs.length > 0) {
      logs = cookieLogs;
    }

    client.release();
    
    return NextResponse.json({ 
      profile, 
      logs, 
      cycleHistory: cookieCycleHistory.length > 0 ? cookieCycleHistory : initialCycleHistory,
      mode: 'live' 
    });
    
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ 
      profile: defaultProfile, 
      logs: cookieLogs, 
      cycleHistory: cookieCycleHistory.length > 0 ? cookieCycleHistory : initialCycleHistory,
      mode: 'fallback' 
    });
  }
}
