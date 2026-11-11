import { NextResponse } from 'next/server';
import { getOwner, patchDoc, readDoc } from '@/lib/store';

// GET: Has the user completed Her Mode onboarding? Returns the saved profile.
export async function GET() {
  try {
    const profile = await readDoc<any>('her_profile', null);
    return NextResponse.json(profile ? { onboarded: true, profile } : { onboarded: false });
  } catch (error: any) {
    console.error('Error fetching onboarding state:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Save onboarding answers (from the /dashboard assessment) into the Her Mode profile
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const owner = await getOwner();
    const clean = (v: any) => (v === undefined || v === '' ? undefined : v);
    const patch = Object.fromEntries(
      Object.entries({
        preferred_name: clean(body.preferredName),
        last_period_start: clean(body.lastPeriodStart),
        last_period_end: clean(body.lastPeriodEnd),
        period_duration: clean(body.periodDuration),
        cycle_length: clean(body.cycleLengthAvg),
        cycle_regularity: clean(body.cycleRegularity),
        diagnosed_conditions: clean(body.diagnosedConditions),
      }).filter(([, v]) => v !== undefined)
    );
    const profile = await patchDoc('her_profile', patch, owner);
    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    console.error('Error saving onboarding data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
