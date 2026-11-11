import { NextResponse } from 'next/server';
import { getOwner, readDoc, writeDoc } from '@/lib/store';

const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const owner = await getOwner();

    if (data.action === 'reset') {
      await writeDoc('pregnancy_appointments', [], owner);
      await writeDoc('appointments_month', monthKey(), owner);
      return NextResponse.json({ success: true, appointments: [] });
    }

    const stored = await readDoc<any[]>('pregnancy_appointments', [], owner);
    const appointments = Array.isArray(stored) ? stored : [];

    if (data.action === 'toggle' && typeof data.index === 'number' && appointments[data.index]) {
      appointments[data.index] = { ...appointments[data.index], completed: !appointments[data.index].completed };
      await writeDoc('pregnancy_appointments', appointments, owner);
      return NextResponse.json({ success: true, appointments });
    }

    if (data.action === 'add' && data.appointment?.name) {
      appointments.push({
        name: String(data.appointment.name),
        date: String(data.appointment.date || 'Upcoming'),
        completed: Boolean(data.appointment.completed),
      });
      await writeDoc('pregnancy_appointments', appointments, owner);
      return NextResponse.json({ success: true, appointments });
    }

    if (Array.isArray(data.appointments)) {
      await writeDoc('pregnancy_appointments', data.appointments, owner);
      await writeDoc('appointments_month', monthKey(), owner);
      return NextResponse.json({ success: true, appointments: data.appointments });
    }

    return NextResponse.json({ success: true, appointments });
  } catch (err: any) {
    console.error('Appointments API error:', err);
    return NextResponse.json({ error: 'Failed to update appointments' }, { status: 500 });
  }
}
