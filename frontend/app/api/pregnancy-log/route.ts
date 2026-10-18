import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    const email = session.user.email.replace(/[^a-zA-Z0-9]/g, '_');
    const cookieStore = await cookies();
    const cookieName = `sakhi_pregnancy_logs_${email}`;

    const existingStr = cookieStore.get(cookieName)?.value;
    let existingLogs: any[] = [];
    try {
      existingLogs = existingStr ? JSON.parse(existingStr) : [];
    } catch {
      existingLogs = [];
    }

    const dateToSave = data.log_date || new Date().toISOString().split('T')[0];
    
    // Find if a log already exists for this exact day
    const existingIndex = existingLogs.findIndex((l: any) => (l.log_date || '').split('T')[0] === dateToSave);
    const existingToday = existingIndex >= 0 ? existingLogs[existingIndex] : {};

    // Merge without overwriting previously logged fields with null
    const newLog = {
      log_date: dateToSave,
      weight: data.weight !== undefined && data.weight !== null ? Number(data.weight) : (existingToday.weight ?? (existingLogs.length > 0 ? existingLogs[existingLogs.length - 1].weight : null)),
      blood_pressure_systolic: data.blood_pressure_systolic !== undefined && data.blood_pressure_systolic !== null ? Number(data.blood_pressure_systolic) : (existingToday.blood_pressure_systolic ?? null),
      blood_pressure_diastolic: data.blood_pressure_diastolic !== undefined && data.blood_pressure_diastolic !== null ? Number(data.blood_pressure_diastolic) : (existingToday.blood_pressure_diastolic ?? null),
      blood_sugar: data.blood_sugar !== undefined && data.blood_sugar !== null ? Number(data.blood_sugar) : (existingToday.blood_sugar ?? null),
      baby_movement: data.baby_movement !== undefined && data.baby_movement !== null ? Number(data.baby_movement) : (existingToday.baby_movement ?? null),
      mood: data.mood || existingToday.mood || "Calm",
      sleep_hours: data.sleep_hours !== undefined && data.sleep_hours !== null ? Number(data.sleep_hours) : (existingToday.sleep_hours ?? 8),
      symptoms: (data.symptoms && data.symptoms.length > 0 && !data.symptoms.includes("None"))
        ? Array.from(new Set([...(existingToday.symptoms || []).filter((s: string) => s && s !== 'None'), ...data.symptoms]))
        : (existingToday.symptoms || ["None"])
    };

    if (existingIndex >= 0) {
      existingLogs[existingIndex] = newLog;
    } else {
      existingLogs.push(newLog);
    }

    // Keep all past logs in chronological order
    existingLogs.sort((a: any, b: any) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());

    cookieStore.set(cookieName, JSON.stringify(existingLogs), { 
      path: '/',
      maxAge: 60 * 60 * 24 * 365 // 1 year persistence
    });

    return NextResponse.json({ success: true, log: newLog, logs: existingLogs });
  } catch (err) {
    console.error("Pregnancy Log API Error:", err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
