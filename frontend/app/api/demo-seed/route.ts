import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getOwner, writeDoc } from '@/lib/store';
import { clientKey, rateLimit } from '@/lib/rateLimit';
import { buildHerDemo, buildPregnancyDemo } from '@/lib/demoData';

const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// POST { mode: 'her' | 'pregnancy' | 'both', confirm?: boolean }
// Loads the demo dataset into the current user's (or guest's) store.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const mode = ['her', 'pregnancy', 'both'].includes(body.mode) ? body.mode : 'both';
    const owner = await getOwner();
    if (!rateLimit(`seed:${clientKey(req, owner.key)}`, 10, 60_000).ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Never silently overwrite a signed-in user's real data
    if (!owner.isGuest && body.confirm !== true) {
      return NextResponse.json(
        { error: 'Loading demo data replaces your saved data. Send confirm: true to proceed.' },
        { status: 409 }
      );
    }

    if (mode === 'her' || mode === 'both') {
      const her = buildHerDemo();
      await writeDoc('her_profile', her.profile, owner);
      await writeDoc('daily_logs', her.logs, owner);
      await writeDoc('cycle_history', her.history, owner);
    }
    if (mode === 'pregnancy' || mode === 'both') {
      const preg = buildPregnancyDemo();
      await writeDoc('preg_profile', preg.profile, owner);
      await writeDoc('pregnancy_logs', preg.logs, owner);
      await writeDoc('pregnancy_appointments', preg.appointments, owner);
      await writeDoc('pregnancy_nutrition', preg.nutrition, owner);
      await writeDoc('appointments_month', monthKey(), owner);
    }

    // Demo walkthroughs skip the consent screen (no real personal data is involved)
    await writeDoc('consent', { accepted: true, demo: true, at: new Date().toISOString(), version: 1 }, owner);
    (await cookies()).set('sakhi_preferred_name', mode === 'pregnancy' ? 'Meera' : 'Priya', {
      path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax',
    });

    return NextResponse.json({ success: true, mode, redirect: mode === 'pregnancy' ? '/pregnancy-mode' : '/her-mode' });
  } catch (err: any) {
    console.error('Demo seed error:', err);
    return NextResponse.json({ error: 'Failed to load demo data' }, { status: 500 });
  }
}
