import { NextResponse } from 'next/server';
import { getOwner, readDoc, writeDoc } from '@/lib/store';
import {
  RED_FLAGS, RELIEF_TIPS, SEE_DOCTOR_SOON, favourites, pickRelief, recordFeedback, recordShown,
  type ReliefFeedback,
} from '@/lib/reliefTips';

// GET ?severity=1-10 : a fresh, varied set of relief steps for right now
export async function GET(req: Request) {
  const url = new URL(req.url);
  const severity = Math.max(0, Math.min(10, Number(url.searchParams.get('severity')) || 5));
  const owner = await getOwner();
  const fb = await readDoc<ReliefFeedback | null>('relief_feedback', null, owner);
  // ?peek=1 : just her favourites, without counting a new set as shown
  if (url.searchParams.get('peek') === '1') {
    return NextResponse.json({ favourites: favourites(fb) });
  }
  const tips = pickRelief(fb, 3, severity);
  await writeDoc('relief_feedback', recordShown(fb, tips.map(t => t.id)), owner);
  return NextResponse.json({
    severity,
    tips,
    favourites: favourites(fb),
    redFlags: RED_FLAGS,
    seeDoctor: SEE_DOCTOR_SOON,
    urgent: severity >= 9,
  });
}

// POST { tipId, helped: boolean } : learn what works for her
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const tipId = String(body.tipId || '');
  if (!RELIEF_TIPS.some(t => t.id === tipId) || typeof body.helped !== 'boolean') {
    return NextResponse.json({ error: 'tipId and helped are required' }, { status: 400 });
  }
  const owner = await getOwner();
  const fb = await readDoc<ReliefFeedback | null>('relief_feedback', null, owner);
  const next = recordFeedback(fb, tipId, body.helped);
  await writeDoc('relief_feedback', next, owner);
  return NextResponse.json({ success: true, favourites: favourites(next) });
}
