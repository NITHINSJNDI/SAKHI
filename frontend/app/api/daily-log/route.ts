import { NextResponse } from 'next/server';
import { getOwner, readDoc, writeDoc } from '@/lib/store';

// POST: Save (or merge into) today's Her Mode daily log
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      log_date, logDate, onPeriod, flow_intensity, flowIntensity, cramps_severity, crampsSeverity,
      symptoms, mood, sleep_hours, sleepHours, waterConsumed, exercised, warningSigns, notes,
    } = body;

    const owner = await getOwner();
    const logs = await readDoc<any[]>('daily_logs', [], owner);
    const list = Array.isArray(logs) ? logs : [];

    const dateToSave = String(logDate || log_date || new Date().toISOString().split('T')[0]);
    const dayStr = dateToSave.split('T')[0];
    const existing = list.find((l: any) => String(l?.log_date || '').startsWith(dayStr)) || {};
    const flow = flowIntensity || flow_intensity || existing.flow_intensity || 'None';
    const cramps = crampsSeverity ?? cramps_severity ?? existing.cramps_severity ?? 0;
    const sleep = sleepHours ?? sleep_hours ?? existing.sleep_hours ?? 7.5;

    // Merge so fields logged earlier today (e.g. via chat) are not overwritten by defaults
    const entry = {
      ...existing,
      log_date: dateToSave,
      flow_intensity: flow,
      cramps_severity: Number(cramps),
      symptoms: symptoms || existing.symptoms || ['None'],
      mood: mood || existing.mood || 'Calm',
      sleep_hours: Number(sleep),
      on_period: onPeriod !== undefined ? Boolean(onPeriod) : flow !== 'None',
      ...(waterConsumed !== undefined ? { water_consumed: waterConsumed } : {}),
      ...(exercised !== undefined ? { exercised: Boolean(exercised) } : {}),
      ...(warningSigns !== undefined ? { warning_signs: warningSigns } : {}),
      ...(notes !== undefined ? { notes } : {}),
    };

    const next = [...list.filter((l: any) => !String(l?.log_date || '').startsWith(dayStr)), entry]
      .sort((a: any, b: any) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());
    await writeDoc('daily_logs', next, owner);

    return NextResponse.json({ success: true, log: entry });
  } catch (error: any) {
    console.error('Error saving daily log:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
