import { NextResponse } from 'next/server';
import { getOwner, readDoc, storageMode } from '@/lib/store';

// GET: Her Mode / dashboard data for the current user (or guest) from the unified store
export async function GET() {
  try {
    const owner = await getOwner();
    const [saved, logs, cycleHistory, mode] = await Promise.all([
      readDoc<any>('her_profile', null, owner),
      readDoc<any[]>('daily_logs', [], owner),
      readDoc<any[]>('cycle_history', [], owner),
      storageMode(),
    ]);

    const DAY = 24 * 60 * 60 * 1000;
    const cycleLength = parseInt(saved?.cycle_length ?? saved?.cycle_length_avg) || 28;
    const periodDuration = parseInt(saved?.period_duration) || 5;
    const profile = {
      ...(saved || {}),
      preferred_name: saved?.preferred_name || owner.name?.split(' ')[0] || (saved ? 'Beautiful' : ''),
      last_period_start: saved?.last_period_start || new Date(Date.now() - 14 * DAY).toISOString().split('T')[0],
      last_period_end: saved?.last_period_end || new Date(Date.now() - 9 * DAY).toISOString().split('T')[0],
      cycle_length_avg: cycleLength,
      period_duration: periodDuration,
      cycle_regularity: saved?.cycle_regularity || 'Regular',
      primary_goal: saved?.primary_goal || 'Track Period & PMS',
      diagnosed_conditions: saved?.diagnosed_conditions || [],
    };

    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'short' });
    const sortedLogs = (Array.isArray(logs) ? logs : [])
      .filter((l: any) => l && l.log_date)
      .sort((a: any, b: any) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());

    return NextResponse.json({
      profile,
      onboarded: Boolean(saved),
      logs: sortedLogs,
      cycleHistory: Array.isArray(cycleHistory) && cycleHistory.length > 0
        ? cycleHistory
        : [{ month: `${currentMonth} (Setup)`, cycleLength, periodDuration }],
      mode: owner.isGuest ? 'preview' : 'live',
      storage: mode,
    });
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 });
  }
}
