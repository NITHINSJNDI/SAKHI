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

// POST: Save daily log data
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      log_date,
      logDate,
      onPeriod,
      flow_intensity,
      flowIntensity,
      cramps_severity,
      crampsSeverity,
      symptoms,
      mood,
      sleep_hours,
      sleepHours,
      waterConsumed,
      exercised,
      warningSigns,
      notes
    } = body;

    const email = session.user.email.replace(/[^a-zA-Z0-9]/g, '_');
    const cookieStore = await cookies();
    const cookieName = `sakhi_daily_logs_${email}`;

    // Normalize values
    const dateToSave = logDate || log_date || new Date().toISOString().split('T')[0];
    const flowToSave = flowIntensity || flow_intensity || 'None';
    const crampsToSave = crampsSeverity !== undefined ? crampsSeverity : (cramps_severity !== undefined ? cramps_severity : 0);
    const sleepToSave = sleepHours !== undefined ? sleepHours : (sleep_hours !== undefined ? sleep_hours : 7.5);

    // Save to persistent cookie store
    const existingStr = cookieStore.get(cookieName)?.value;
    const logsList = existingStr ? JSON.parse(existingStr) : [];
    
    // Replace today's log if it exists, or append new
    const dayStr = dateToSave.split('T')[0];
    const filtered = logsList.filter((l: any) => !l.log_date.startsWith(dayStr));
    filtered.push({
      log_date: dateToSave,
      flow_intensity: flowToSave,
      cramps_severity: crampsToSave,
      symptoms: symptoms || ['None'],
      mood: mood || 'Calm',
      sleep_hours: sleepToSave,
      on_period: flowToSave !== 'None'
    });

    cookieStore.set(cookieName, JSON.stringify(filtered), { path: '/' });

    // If PostgreSQL connected, save to DB as well
    if (pool) {
      const client = await pool.connect();
      const userRes = await client.query('SELECT id FROM users WHERE email = $1', [session.user.email]);
      if (userRes.rows.length > 0) {
        const userId = userRes.rows[0].id;
        const existingLog = await client.query('SELECT id FROM daily_health_logs WHERE user_id = $1 AND log_date = $2', [userId, dayStr]);

        if (existingLog.rows.length > 0) {
          await client.query(
            `UPDATE daily_health_logs 
             SET on_period = $1, flow_intensity = $2, cramps_severity = $3, symptoms = $4, 
                 mood = $5, sleep_hours = $6, water_consumed = $7, exercised = $8, 
                 warning_signs = $9, notes = $10 
             WHERE user_id = $11 AND log_date = $12`,
            [flowToSave !== 'None', flowToSave, crampsToSave, symptoms, mood, sleepToSave, waterConsumed, exercised, warningSigns, notes, userId, dayStr]
          );
        } else {
          await client.query(
            `INSERT INTO daily_health_logs 
             (user_id, log_date, on_period, flow_intensity, cramps_severity, symptoms, mood, sleep_hours, water_consumed, exercised, warning_signs, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [userId, dayStr, flowToSave !== 'None', flowToSave, crampsToSave, symptoms, mood, sleepToSave, waterConsumed, exercised, warningSigns, notes]
          );
        }
      }
      client.release();
    }

    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('Error saving daily log:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
