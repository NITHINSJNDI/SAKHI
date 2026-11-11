import { NextResponse } from 'next/server';
import { getOwner, readDoc, writeDoc } from '@/lib/store';

// Bump when the consent text changes so users are asked again
// (not exported: route files may only export handlers and route config)
const CONSENT_VERSION = 1;

export async function GET() {
  const consent = await readDoc<any>('consent', null);
  return NextResponse.json({
    consent,
    required: !consent?.accepted || consent.version !== CONSENT_VERSION,
    version: CONSENT_VERSION,
  });
}

// POST { accepted: true, aiProcessing: boolean }
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body.accepted !== true) {
      return NextResponse.json({ error: 'Consent must be explicitly accepted' }, { status: 400 });
    }
    const owner = await getOwner();
    const record = {
      accepted: true,
      version: CONSENT_VERSION,
      aiProcessing: body.aiProcessing !== false,
      at: new Date().toISOString(),
    };
    await writeDoc('consent', record, owner);
    return NextResponse.json({ success: true, consent: record });
  } catch (err: any) {
    console.error('Consent error:', err);
    return NextResponse.json({ error: 'Failed to save consent' }, { status: 500 });
  }
}
