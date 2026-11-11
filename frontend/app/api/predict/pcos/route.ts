import { NextResponse } from 'next/server';
import { runPrediction } from '@/lib/ml/client';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    // ?engine=local forces the in-process scorer (used by the parity check)
    const forceLocal = new URL(req.url).searchParams.get('engine') === 'local';
    return NextResponse.json(await runPrediction('pcos', body, { forceLocal }));
  } catch (error: any) {
    const status = error?.status === 400 ? 400 : 500;
    console.error('pcos prediction error:', error?.message);
    return NextResponse.json({ error: 'Prediction failed', details: error?.message }, { status });
  }
}
