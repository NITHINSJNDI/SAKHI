import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mlUrl = process.env.NEXT_PUBLIC_ML_BACKEND_URL || 'http://127.0.0.1:8000';
    
    const response = await fetch(`${mlUrl}/predict/thyroid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // `??` (not `||`) so a real 0 score is not replaced by the default
        fatigue_severity: Number(body.fatigue_severity ?? 3),
        heavy_or_prolonged_flow: body.heavy_or_prolonged_flow ? 1 : 0,
        cycle_regularity: Number(body.cycle_regularity ?? 1)
      })
    });

    if (!response.ok) {
      throw new Error(`FastAPI returned status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Thyroid ML Predict Route Error:', error.message);
    return NextResponse.json({ 
      error: 'ML microservice unreachable', 
      details: error.message 
    }, { status: 500 });
  }
}
