import { NextResponse } from 'next/server';
import { getOwner, readDoc, writeDoc } from '@/lib/store';
import { mergePregnancyLog } from '@/lib/pregnancyLogs';

export async function POST(req: Request) {
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
