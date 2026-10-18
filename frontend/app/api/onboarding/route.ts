import { NextResponse } from 'next/server';
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

// GET: Check if the user has onboarded and return their profile
export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!pool) {
    return NextResponse.json({ onboarded: false, mode: 'mock' });
  }

  try {
    const client = await pool.connect();
    
    // Get user id
    const userRes = await client.query('SELECT id FROM users WHERE email = $1', [session.user.email]);
    if (userRes.rows.length === 0) {
      client.release();
      return NextResponse.json({ onboarded: false });
    }
    
    const userId = userRes.rows[0].id;
    
    // Check onboarding profile
    const profileRes = await client.query('SELECT * FROM user_health_profiles WHERE user_id = $1', [userId]);
    client.release();

    if (profileRes.rows.length > 0) {
      return NextResponse.json({ onboarded: true, profile: profileRes.rows[0] });
    } else {
      return NextResponse.json({ onboarded: false });
    }
    
  } catch (error: any) {
    console.error('Error fetching onboarding state:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Save onboarding data
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      preferredName,
      lastPeriodStart,
      lastPeriodEnd,
      periodDuration,
      cycleLengthAvg,
      cycleRegularity,
      diagnosedConditions
    } = body;

    if (!pool) {
      // Mock mode: just return success
      return NextResponse.json({ success: true, message: 'Saved to mock store' });
    }

    const client = await pool.connect();
    
    // Ensure user exists
    let userRes = await client.query('SELECT id FROM users WHERE email = $1', [session.user.email]);
    let userId;
    
    if (userRes.rows.length === 0) {
      const insertUser = await client.query(
        'INSERT INTO users (email, name, image) VALUES ($1, $2, $3) RETURNING id',
        [session.user.email, session.user.name, session.user.image]
      );
      userId = insertUser.rows[0].id;
    } else {
      userId = userRes.rows[0].id;
    }

    // Insert or update profile
    const existingProfile = await client.query('SELECT id FROM user_health_profiles WHERE user_id = $1', [userId]);
    
    if (existingProfile.rows.length > 0) {
      await client.query(
        `UPDATE user_health_profiles 
         SET preferred_name = $1, last_period_start = $2, last_period_end = $3, 
             period_duration = $4, cycle_length_avg = $5, cycle_regularity = $6, 
             diagnosed_conditions = $7, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $8`,
        [preferredName, lastPeriodStart, lastPeriodEnd, periodDuration, cycleLengthAvg, cycleRegularity, diagnosedConditions, userId]
      );
    } else {
      await client.query(
        `INSERT INTO user_health_profiles 
         (user_id, preferred_name, last_period_start, last_period_end, period_duration, cycle_length_avg, cycle_regularity, diagnosed_conditions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, preferredName, lastPeriodStart, lastPeriodEnd, periodDuration, cycleLengthAvg, cycleRegularity, diagnosedConditions]
      );
    }
    
    client.release();
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('Error saving onboarding data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
