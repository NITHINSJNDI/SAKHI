import { NextResponse } from 'next/server';
import { getOwner, readDoc, writeDoc, storeErrorResponse } from '@/lib/store';
import { mergePregnancyLog } from '@/lib/pregnancyLogs';

async function handlePOST(req: Request) {
  try {
    const data = await req.json();
    const owner = await getOwner();
    const existing = await readDoc<any[]>('pregnancy_logs', [], owner);
    const { entry, logs } = mergePregnancyLog(existing, data);
    await writeDoc('pregnancy_logs', logs, owner);
    return NextResponse.json({ success: true, log: entry, logs });
  } catch (err) {
    console.error('Pregnancy Log API Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Storage errors become a JSON 503 (her outbox retries) instead of a blind save
export async function POST(req: Request) {
  try {
    return await handlePOST(req);
  } catch (err) {
    return storeErrorResponse(err);
  }
}
