import { NextResponse } from 'next/server';
import { getOwner } from '@/lib/store';
import { buildHerSummary, buildPregnancySummary } from '@/lib/doctorSummary';

// GET /api/doctor-summary?mode=her|pregnancy&days=90
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get('mode') === 'pregnancy' ? 'pregnancy' : 'her';
    const days = Math.min(365, Math.max(7, parseInt(url.searchParams.get('days') || '90') || 90));
    const owner = await getOwner();
    const summary = mode === 'pregnancy' ? await buildPregnancySummary(owner, days) : await buildHerSummary(owner, days);
    return NextResponse.json(summary, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    console.error('Doctor summary error:', err);
    return NextResponse.json({ error: 'Failed to build summary' }, { status: 500 });
  }
}
