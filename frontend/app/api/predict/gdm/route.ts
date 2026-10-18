import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mlUrl = process.env.NEXT_PUBLIC_ML_BACKEND_URL || 'http://127.0.0.1:8000';
    
    const response = await fetch(`${mlUrl}/predict/gdm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blood_sugar: body.blood_sugar !== undefined ? Number(body.blood_sugar) : 85.0,
        diabetes_history: body.diabetes_history ? 1 : 0
      })
    });

    if (!response.ok) {
      throw new Error(`FastAPI GDM returned status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('GDM ML Predict Route Error:', error.message);
    return NextResponse.json({ 
      error: 'ML microservice unreachable', 
      details: error.message 
    }, { status: 500 });
  }
}
