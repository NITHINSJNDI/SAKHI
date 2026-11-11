import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { triageSymptoms, SymptomInput } from "@/lib/triage";
import { generateWellnessAdvice, WellnessSymptomInput } from "@/lib/wellness";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userRes = await query("SELECT id FROM users WHERE email = $1", [session.user.email]);
    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const userId = userRes.rows[0].id;

    const data = await req.json();
    
    // Construct Triage input
    const triageInput: SymptomInput = {
      flowIntensity: data.flowIntensity,
      periodLengthDays: data.periodLength,
      cycleLengthDays: data.cycleLength,
      missedPeriodsStreak: data.missedPeriodsStreak || 0,
      
      crampSeverity: Number(data.crampSeverity || 0),
      headacheSeverity: Number(data.headacheSeverity || 0),
      headacheWithVisionChanges: !!data.headacheWithVisionChanges,
      bloatingSeverity: Number(data.bloatingSeverity || 0),
      feverC: data.feverC ? Number(data.feverC) : undefined,
      faintingOrDizziness: !!data.faintingOrDizziness,
      soakingPadHourly: !!data.soakingPadHourly,
      severeAbdominalPain: !!data.severeAbdominalPain,
      tirednessSevere: !!data.tirednessSevere,

      acneSeverity: Number(data.acneSeverity || 0),
      hairGrowthNew: !!data.hairGrowthNew,
      skinDarkening: !!data.skinDarkening,
      weightGainRapid: !!data.weightGainRapid
    };

    // 1. Run Triage Heuristics
    const triageResult = triageSymptoms(triageInput);

    // Determine current cycle phase (heuristic for wellness input)
    let cyclePhase = 'unknown';
    if (data.isCurrentlyBleeding) {
      cyclePhase = 'menstrual';
    } else if (data.daysSincePeriodStart) {
      const days = Number(data.daysSincePeriodStart);
      if (days >= 1 && days <= 5) cyclePhase = 'menstrual';
      else if (days >= 6 && days <= 12) cyclePhase = 'follicular';
      else if (days >= 13 && days <= 16) cyclePhase = 'ovulation';
      else if (days >= 17 && days <= 35) cyclePhase = 'luteal';
    }

    // Construct Wellness input
    const wellnessInput: WellnessSymptomInput = {
      cyclePhase,
      crampSeverity: triageInput.crampSeverity,
      headacheSeverity: triageInput.headacheSeverity,
      bloatingSeverity: triageInput.bloatingSeverity,
      nausea: !!data.nausea,
      // Use the reported fatigue score; previously this wrongly reused the cramp score
      fatigueSeverity: Number(data.fatigueSeverity ?? 0),
      anxietyOrStress: !!data.anxietyOrStress,
      moodSwings: !!data.moodSwings,
      cycleDelayed: !!data.cycleDelayed,
      flowIntensity: triageInput.flowIntensity
    };

    // 2. Run Wellness Advisor Heuristics
    const wellnessAdvice = generateWellnessAdvice(wellnessInput);

    // 3. Log Triage Results to PostgreSQL Database
    await query(
      `INSERT INTO triage_logs (
        user_id, log_date, urgency, reasons, suspected_profiles, advice
      ) VALUES ($1, CURRENT_DATE, $2, $3, $4, $5)`,
      [
        userId,
        triageResult.urgency,
        triageResult.reasons,
        triageResult.suspectedProfiles,
        triageResult.advice
      ]
    );

    return NextResponse.json({
      success: true,
      triageResult,
      wellnessAdvice
    });
  } catch (err: any) {
    console.error("Error executing triage route:", err.message);
    return NextResponse.json({ error: "Database error", details: err.message }, { status: 500 });
  }
}
