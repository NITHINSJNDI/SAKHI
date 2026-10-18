import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const email = session.user.email.replace(/[^a-zA-Z0-9]/g, '_');
  const today = new Date();
  
  // Get user profile from cookies
  const cookieStore = await cookies();
  const overridesStr = cookieStore.get(`sakhi_preg_profile_${email}`)?.value;
  const overrides = overridesStr ? JSON.parse(overridesStr) : null;

  if (!overrides || !overrides.preferred_name) {
    return NextResponse.json({
      profile: { preferred_name: "" },
      logs: [],
      nutrition: null,
      appointments: []
    });
  }
  
  const weeksPregnant = overrides.weeks_pregnant ? parseInt(overrides.weeks_pregnant) : 12;
  const daysPregnant = weeksPregnant * 7;
  const conceptionDate = new Date(today.getTime() - (daysPregnant * 24 * 60 * 60 * 1000));
  const rawDue = overrides.expected_due_date || overrides.due_date;
  const expectedDueDate = rawDue ? new Date(rawDue) : new Date(conceptionDate.getTime() + (280 * 24 * 60 * 60 * 1000));
  
  const maternalConditions = overrides.maternal_conditions || [];
  const hasRisk = maternalConditions.length > 0 && !maternalConditions.includes("None");

  const profile = {
    preferred_name: overrides.preferred_name || "",
    weeks_pregnant: weeksPregnant,
    conception_date: conceptionDate.toISOString(),
    expected_due_date: expectedDueDate.toISOString(),
    pregnancy_experience: overrides.pregnancy_experience || "First-time Mother",
    maternal_conditions: maternalConditions,
    primary_goal: overrides.primary_goal || "Tracking Baby Growth & Fetal Movement",
    risk_level: hasRisk ? "Elevated" : "Low",
    baby_size_fruit: weeksPregnant < 12 ? "Lime" : weeksPregnant < 20 ? "Mango" : weeksPregnant < 28 ? "Eggplant" : "Pineapple"
  };

  // Read actual logs saved by the user (no fake 90 days of generated data)
  const pregnancyLogsStr = cookieStore.get(`sakhi_pregnancy_logs_${email}`)?.value;
  let realLogs: any[] = [];
  try {
    realLogs = pregnancyLogsStr ? JSON.parse(pregnancyLogsStr) : [];
  } catch {
    realLogs = [];
  }

  // Read actual nutrition entries logged by user (or null)
  const nutritionStr = cookieStore.get(`sakhi_pregnancy_nutrition_${email}`)?.value;
  let realNutrition = null;
  try {
    realNutrition = nutritionStr ? JSON.parse(nutritionStr) : null;
  } catch {
    realNutrition = null;
  }

  // Read actual appointments entered by user with monthly reset check
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const monthCookieName = `sakhi_appointments_month_${email}`;
  const recordedMonth = cookieStore.get(monthCookieName)?.value;

  const appointmentsStr = cookieStore.get(`sakhi_pregnancy_appointments_${email}`)?.value;
  let realAppointments: any[] = [];
  try {
    realAppointments = appointmentsStr ? JSON.parse(appointmentsStr) : [];
  } catch {
    realAppointments = [];
  }

  // Automatic monthly reset: if recorded month is from a previous month, reset appointments for the new month
  if (recordedMonth && recordedMonth !== currentMonthStr) {
    realAppointments = [];
    cookieStore.set(`sakhi_pregnancy_appointments_${email}`, JSON.stringify([]), { path: '/' });
    cookieStore.set(monthCookieName, currentMonthStr, { path: '/' });
  } else if (!recordedMonth) {
    cookieStore.set(monthCookieName, currentMonthStr, { path: '/' });
  }

  return NextResponse.json({ 
    profile, 
    logs: realLogs, 
    nutrition: realNutrition,
    appointments: realAppointments
  });
}
