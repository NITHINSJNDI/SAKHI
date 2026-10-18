import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    const email = session.user.email.replace(/[^a-zA-Z0-9]/g, '_');
    const cookieStore = await cookies();
    const cookieName = `sakhi_pregnancy_appointments_${email}`;
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    if (data.action === 'reset') {
      // Clear appointments for the month
      cookieStore.set(cookieName, JSON.stringify([]), { path: '/' });
      cookieStore.set(`sakhi_appointments_month_${email}`, currentMonthStr, { path: '/' });
      return NextResponse.json({ success: true, appointments: [] });
    }

    const existingStr = cookieStore.get(cookieName)?.value;
    let appointments = existingStr ? JSON.parse(existingStr) : [];

    if (data.action === 'toggle' && typeof data.index === 'number') {
      if (appointments[data.index]) {
        appointments[data.index].completed = !appointments[data.index].completed;
        cookieStore.set(cookieName, JSON.stringify(appointments), { path: '/' });
        return NextResponse.json({ success: true, appointments });
      }
    }

    if (data.appointments && Array.isArray(data.appointments)) {
      cookieStore.set(cookieName, JSON.stringify(data.appointments), { path: '/' });
      cookieStore.set(`sakhi_appointments_month_${email}`, currentMonthStr, { path: '/' });
      return NextResponse.json({ success: true, appointments: data.appointments });
    }

    return NextResponse.json({ success: true, appointments });
  } catch (err: any) {
    console.error("Appointments API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
