import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { mode, profile, resetData } = await req.json();

    if (!mode || !profile) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    // In a real app with a DB, we would write to PostgreSQL here using `pool`.
    // Because the dashboard works in local demo mode, we'll store the updated profile in an HTTP cookie
    // so the GET routes can read it and instantly update the dashboards.
    
    const cookieStore = await cookies();
    
    let email = 'demo_user';
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      email = session.user.email.replace(/[^a-zA-Z0-9]/g, '_');
    } else {
      const allCookies = cookieStore.getAll();
      const match = allCookies.find(c => c.name.startsWith('sakhi_preg_profile_') || c.name.startsWith('sakhi_her_profile_'));
      if (match) {
        email = match.name.replace('sakhi_preg_profile_', '').replace('sakhi_her_profile_', '');
      }
    }

    if (profile.preferred_name) {
      cookieStore.set('sakhi_preferred_name', profile.preferred_name, { path: '/' });
    }
    
    if (mode === 'pregnancy') {
      const cookieName = `sakhi_preg_profile_${email}`;
      if (resetData) {
        // Completely fresh start for Mom Mode:
        cookieStore.set(cookieName, JSON.stringify(profile), { path: '/' });
        cookieStore.set(`sakhi_pregnancy_logs_${email}`, JSON.stringify([]), { path: '/' });
        cookieStore.set(`sakhi_pregnancy_nutrition_${email}`, JSON.stringify(null), { path: '/' });
        cookieStore.set(`sakhi_pregnancy_appointments_${email}`, JSON.stringify([]), { path: '/' });
        const today = new Date();
        const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        cookieStore.set(`sakhi_appointments_month_${email}`, currentMonthStr, { path: '/' });
      } else {
        const existingStr = cookieStore.get(cookieName)?.value;
        const existing = existingStr ? JSON.parse(existingStr) : {};
        cookieStore.set(cookieName, JSON.stringify({ ...existing, ...profile }), { path: '/' });
      }

      if (profile.preferred_name) {
        const herCookie = `sakhi_her_profile_${email}`;
        const herStr = cookieStore.get(herCookie)?.value;
        if (herStr) {
          try {
            const herExisting = JSON.parse(herStr);
            cookieStore.set(herCookie, JSON.stringify({ ...herExisting, preferred_name: profile.preferred_name }), { path: '/' });
          } catch (e) {}
        }
      }
    } else if (mode === 'her') {
      const cookieName = `sakhi_her_profile_${email}`;
      if (resetData) {
        // Completely fresh start for Her Mode:
        cookieStore.set(cookieName, JSON.stringify(profile), { path: '/' });
        cookieStore.set(`sakhi_daily_logs_${email}`, JSON.stringify([]), { path: '/' });
        cookieStore.set(`sakhi_notifications_${email}`, JSON.stringify([]), { path: '/' });

        const currentMonth = new Date().toLocaleDateString('en-US', { month: 'short' });
        const initialCycleHistory = [
          {
            month: `${currentMonth} (Setup)`,
            cycleLength: parseInt(profile.cycle_length || 28),
            periodDuration: parseInt(profile.period_duration || 5)
          }
        ];
        cookieStore.set(`sakhi_cycle_history_${email}`, JSON.stringify(initialCycleHistory), { path: '/' });
      } else {
        const existingStr = cookieStore.get(cookieName)?.value;
        const existing = existingStr ? JSON.parse(existingStr) : {};
        cookieStore.set(cookieName, JSON.stringify({ ...existing, ...profile }), { path: '/' });
      }

      if (profile.preferred_name) {
        const pregCookie = `sakhi_preg_profile_${email}`;
        const pregStr = cookieStore.get(pregCookie)?.value;
        if (pregStr) {
          try {
            const pregExisting = JSON.parse(pregStr);
            cookieStore.set(pregCookie, JSON.stringify({ ...pregExisting, preferred_name: profile.preferred_name }), { path: '/' });
          } catch (e) {}
        }
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Update Profile API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
