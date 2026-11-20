import { NextResponse } from 'next/server';
import { getOwner, readDoc, writeDoc, storeErrorResponse } from '@/lib/store';
import { addPainEvent, PAIN_WHERE, removePainEvent } from '@/lib/painLog';

/**
 * Pain at a moment of the day, for days when it changes ("fine this morning,
 * 7/10 by afternoon"). Each report lands in that day's daily log.
 *
 * POST   { level: 0-10, where?: string[], date?: 'YYYY-MM-DD' }  -> { log }
 * DELETE { at: ISO time, date: 'YYYY-MM-DD' }                     -> { log }
 */

const dayKey = (iso: string) => iso.slice(0, 10);

async function updateDay(date: string, change: (entry: any) => any) {
  const owner = await getOwner();
  const raw = await readDoc<any[]>('daily_logs', [], owner);
  const list = Array.isArray(raw) ? raw : [];
  const i = list.findIndex(l => String(l?.log_date || '').startsWith(date));
  const existing = i >= 0 ? list[i] : { log_date: date, flow_intensity: 'None', symptoms: ['None'], mood: 'Calm', on_period: false };
  const log = change(existing);
  if (i >= 0) list[i] = log; else list.push(log);
  list.sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());
  await writeDoc('daily_logs', list, owner);
  return log;
}

async function handlePOST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const level = Number(body.level);
  if (!Number.isFinite(level) || level < 0 || level > 10) {
    return NextResponse.json({ error: 'level must be 0 to 10' }, { status: 400 });
  }
  const where = Array.isArray(body.where) ? body.where.filter((w: any) => (PAIN_WHERE as readonly string[]).includes(w)) : [];
  const date = typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : dayKey(new Date().toISOString());
  const log = await updateDay(date, e => addPainEvent(e, level, 'quick', { where }));
  return NextResponse.json({ success: true, log });
}

async function handleDELETE(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (typeof body.at !== 'string' || typeof body.date !== 'string') {
    return NextResponse.json({ error: 'at and date are required' }, { status: 400 });
  }
  const log = await updateDay(body.date, e => removePainEvent(e, body.at));
  return NextResponse.json({ success: true, log });
}

// Storage errors become a JSON 503 (her outbox retries) instead of a blind save
export async function POST(req: Request) {
  try {
    return await handlePOST(req);
  } catch (err) {
    return storeErrorResponse(err);
  }
}

// Storage errors become a JSON 503 (her outbox retries) instead of a blind save
export async function DELETE(req: Request) {
  try {
    return await handleDELETE(req);
  } catch (err) {
    return storeErrorResponse(err);
  }
}
