import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionUser";
import { query } from "@/lib/db";

export async function GET() {
  const user = await getSessionUser();
  const session = user ? { user } : null;
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get user id first
    const userRes = await query("SELECT id FROM users WHERE email = $1", [session.user.email]);
    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const userId = userRes.rows[0].id;

    // Fetch user cycle logs
    const { rows } = await query(
      "SELECT * FROM cycle_logs WHERE user_id = $1 ORDER BY start_date DESC",
      [userId]
    );

    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("Error fetching cycle logs:", err.message);
    return NextResponse.json({ error: "Database error", details: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  const session = user ? { user } : null;
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userRes = await query("SELECT id FROM users WHERE email = $1", [session.user.email]);
    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const userId = userRes.rows[0].id;

    const data = await req.json();
    const {
      startDate,
      endDate,
      flowIntensity,
      crampSeverity,
      bloatingSeverity,
      headacheSeverity,
      fatigueSeverity,
      acneSeverity,
      stressLevel,
      sleepHours,
      exerciseFrequency,
      diet,
    } = data;

    if (!startDate) {
      return NextResponse.json({ error: "Start date is required" }, { status: 400 });
    }

    // 1. Calculate Period Length
    let periodLength: number | null = null;
    if (startDate && endDate) {
      const diffTime = Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime());
      periodLength = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
    }

    // 2. Calculate Cycle Length (days between start of this period and start of the previous period)
    let cycleLength: number | null = null;
    // Find the closest previous cycle start date
    const prevCycle = await query(
      "SELECT start_date FROM cycle_logs WHERE user_id = $1 AND start_date < $2 ORDER BY start_date DESC LIMIT 1",
      [userId, startDate]
    );
    if (prevCycle.rows.length > 0) {
      const prevStart = new Date(prevCycle.rows[0].start_date);
      const currentStart = new Date(startDate);
      const diffTime = Math.abs(currentStart.getTime() - prevStart.getTime());
      cycleLength = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // 3. Save log to PostgreSQL
    const { rows } = await query(
      `INSERT INTO cycle_logs (
        user_id, start_date, end_date, cycle_length, period_length, flow_intensity,
        cramp_severity, bloating_severity, headache_severity, fatigue_severity,
        acne_severity, stress_level, sleep_hours, exercise_frequency, diet
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        userId,
        startDate,
        endDate || null,
        cycleLength,
        periodLength,
        flowIntensity || 'normal',
        crampSeverity !== undefined ? Number(crampSeverity) : 0,
        bloatingSeverity !== undefined ? Number(bloatingSeverity) : 0,
        headacheSeverity !== undefined ? Number(headacheSeverity) : 0,
        fatigueSeverity !== undefined ? Number(fatigueSeverity) : 0,
        acneSeverity !== undefined ? Number(acneSeverity) : 0,
        stressLevel !== undefined ? Number(stressLevel) : 0,
        sleepHours !== undefined ? Number(sleepHours) : null,
        exerciseFrequency || null,
        diet || null
      ]
    );

    // If there is a next cycle that started after this one, we should also update its cycle_length
    const nextCycle = await query(
      "SELECT id, start_date FROM cycle_logs WHERE user_id = $1 AND start_date > $2 ORDER BY start_date ASC LIMIT 1",
      [userId, startDate]
    );
    if (nextCycle.rows.length > 0) {
      const nextStart = new Date(nextCycle.rows[0].start_date);
      const currentStart = new Date(startDate);
      const diffTime = Math.abs(nextStart.getTime() - currentStart.getTime());
      const updatedNextCycleLength = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      await query(
        "UPDATE cycle_logs SET cycle_length = $1 WHERE id = $2",
        [updatedNextCycleLength, nextCycle.rows[0].id]
      );
    }

    return NextResponse.json({ success: true, log: rows[0] });
  } catch (err: any) {
    console.error("Error creating cycle log:", err.message);
    return NextResponse.json({ error: "Database error", details: err.message }, { status: 500 });
  }
}
