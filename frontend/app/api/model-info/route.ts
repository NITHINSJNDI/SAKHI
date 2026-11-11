import { NextResponse } from 'next/server';
import { modelInfo } from '@/lib/ml/scoring';

// Model cards: datasets, sample sizes and cross-validated metrics.
export async function GET() {
  return NextResponse.json(modelInfo());
}
