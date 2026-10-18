import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// 1. Tool to log user's daily symptoms, pain, bleeding flow, mood, and sleep
const log_health_entry_declaration = {
  name: "log_health_entry",
  description: "Log or update daily symptoms, cramps severity, bleeding flow, mood, sleep hours, or weight. Use this WHENEVER the user describes how they feel, mentions pain/cramps, bleeding flow, fatigue, acne, headache, mood, or sleep.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      cramps_severity: {
        type: Type.INTEGER,
        description: "Pain or cramps severity score from 0 (none) to 10 (severe). If user says 'terrible/severe cramps' infer 7-9. If mild infer 2-3."
      },
      flow_intensity: {
        type: Type.STRING,
        description: "Bleeding flow: 'None', 'Spotting', 'Light', 'Moderate', 'Heavy', or 'Very Heavy'."
      },
      symptoms: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of physical symptoms mentioned (e.g. ['Acne', 'Cramps', 'Fatigue', 'Headache', 'Bloating', 'Pelvic Pain', 'Back Pain', 'Nausea'])."
      },
      mood: {
        type: Type.STRING,
        description: "Emotional mood: 'Happy', 'Calm', 'Energetic', 'Fatigued', 'Anxious', 'Irritable', or 'Sad'."
      },
      sleep_hours: {
        type: Type.NUMBER,
        description: "Hours of sleep if mentioned (e.g. 5, 6, 8)."
      },
      weight: {
        type: Type.NUMBER,
        description: "User's weight in kg if mentioned."
      }
    }
  }
};

// 2. Tool to update period start date or cycle parameters and trends
const update_period_info_declaration = {
  name: "update_period_info",
  description: "Update cycle parameters or past cycle history when the user states their period started today or on a specific date, or mentions their cycle length, period duration, or past months' cycle history (e.g. 'In August my cycle was 28 days, September was 27 days').",
  parameters: {
    type: Type.OBJECT,
    properties: {
      last_period_date: {
        type: Type.STRING,
        description: "Date in YYYY-MM-DD format when the period started."
      },
      cycle_length_avg: {
        type: Type.INTEGER,
        description: "Average cycle length in days if mentioned."
      },
      period_duration: {
        type: Type.INTEGER,
        description: "Average period bleeding duration in days if mentioned."
      },
      cycle_history: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            month: { type: Type.STRING, description: "Month name, e.g. 'Aug', 'Sep', 'Oct'" },
            cycleLength: { type: Type.INTEGER, description: "Cycle length in days" },
            periodDuration: { type: Type.INTEGER, description: "Bleeding duration in days" }
          }
        },
        description: "Array of completed cycle records if user shares past months."
      }
    }
  }
};

// 3. Tool to analyze cycle
const analyze_cycle_declaration = {
  name: "analyze_cycle",
  description: "Predict the user's cycle regularity and days until their next period. Use this when the user asks about cycle timing, late periods, or irregular periods.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      last_period_date: {
        type: Type.STRING,
        description: "The date of their last period in YYYY-MM-DD format."
      },
      cycle_length_avg: {
        type: Type.INTEGER,
        description: "The user's average cycle length. Default to 28 if unknown."
      }
    },
    required: ["last_period_date", "cycle_length_avg"]
  }
};

// 4. Tool to analyze PCOS risk
const analyze_pcos_risk_declaration = {
  name: "analyze_pcos_risk",
  description: "Predict the risk of PCOS based on weight, cycle regularity, and acne severity.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      weight: {
        type: Type.NUMBER,
        description: "The user's weight in kg. Default to 60.0 if unknown."
      },
      cycle_regularity: {
        type: Type.INTEGER,
        description: "0 if their cycles are irregular, 1 if they are regular."
      },
      acne_severity: {
        type: Type.INTEGER,
        description: "Acne severity from 1 to 10."
      }
    },
    required: ["weight", "cycle_regularity", "acne_severity"]
  }
};

export async function POST(req: Request) {
  try {
    const { prompt, userName } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const email = session?.user?.email ? session.user.email.replace(/[^a-zA-Z0-9]/g, '_') : 'guest';
    const cookieStore = await cookies();

    // Determine user's name
    let effectiveName = userName || cookieStore.get('sakhi_preferred_name')?.value;
    if (!effectiveName) {
      const profileCookie = cookieStore.get(`sakhi_her_profile_${email}`)?.value;
      if (profileCookie) {
        try {
          const parsed = JSON.parse(profileCookie);
          if (parsed.preferred_name) effectiveName = parsed.preferred_name;
        } catch {}
      }
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const chat = ai.chats.create({
      model: 'gemini-flash-lite-latest',
      config: {
        systemInstruction: `You are Sakhi, an empathetic feminine AI health companion.
The user's name is "${effectiveName || 'friend'}". Address them warmly and naturally by their name ("${effectiveName || 'friend'}") in your responses whenever suitable.

CRITICAL MEDICAL & COMMUNICATION RULES:
1. STRICT MEDICAL SAFETY - NO PRESCRIPTIONS: You are an AI companion, NOT a licensed physician. You MUST NEVER give or suggest any medical prescriptions, drug names, dosage amounts, or pharmaceutical treatments. If the user asks for medications, drugs, or prescriptions, gently and clearly inform them that you cannot prescribe medications and advise them to consult their doctor or gynecologist.
2. STRICT DASHBOARD RULE - DO NOT MENTION DASHBOARD LOGGING: NEVER say "I have updated this in your dashboard", "I noted that in your dashboard", "I recorded this in your dashboard", or tell the user that you recorded anything in the dashboard. Perform any function tool calls silently in the background, and reply conversationally, directly, and empathetically about how they are doing.
3. Keep your answers direct, concise, and focused. Only reply the direct answers to what the user asked or shared, without long unnecessary pleasantries or excessive filler.

BACKGROUND DYNAMIC DASHBOARD ACTIONS:
1. Whenever the user mentions physical sensations, symptoms (like acne, cramps, headache, fatigue, nausea, bloating), pain level, bleeding flow, mood, or sleep hours, call log_health_entry silently.
2. Whenever the user says their period started today or gives a period start date, cycle length, or past cycle history, call update_period_info silently.
3. If they ask about PCOS risk or cycle prediction, call analyze_pcos_risk or analyze_cycle.`,
        tools: [{ 
          functionDeclarations: [
            log_health_entry_declaration, 
            update_period_info_declaration, 
            analyze_cycle_declaration, 
            analyze_pcos_risk_declaration
          ] 
        }]
      }
    });

    const personalizedPrompt = effectiveName ? `[The user's preferred name is ${effectiveName}. Please address ${effectiveName} naturally in your response.]\n${prompt}` : prompt;

    let response = await chat.sendMessage({ message: personalizedPrompt });
    let updatedChartData: any = null;

    // Handle function calls
    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      let apiResult: any = null;

      try {
        if (call.name === "log_health_entry") {
          const args = call.args as any;
          const cookieName = `sakhi_daily_logs_${email}`;
          const existingStr = cookieStore.get(cookieName)?.value;
          const logsList = existingStr ? JSON.parse(existingStr) : [];

          const todayIso = new Date().toISOString();
          const todayDateStr = todayIso.split('T')[0];

          const newLog = {
            log_date: todayIso,
            flow_intensity: args.flow_intensity || 'None',
            cramps_severity: args.cramps_severity !== undefined ? Number(args.cramps_severity) : 0,
            symptoms: Array.isArray(args.symptoms) ? args.symptoms : (args.symptoms ? [args.symptoms] : []),
            mood: args.mood || 'Calm',
            sleep_hours: args.sleep_hours !== undefined ? Number(args.sleep_hours) : 7.5,
            weight: args.weight !== undefined ? Number(args.weight) : undefined
          };

          const index = logsList.findIndex((l: any) => l.log_date?.split('T')[0] === todayDateStr);
          const existingLog = index >= 0 ? logsList[index] : {};

          // Non-destructive merge: preserve existing symptoms + append any newly mentioned
          const newSymptoms = Array.isArray(args.symptoms) ? args.symptoms : (args.symptoms ? [args.symptoms] : []);
          const mergedSymptoms = Array.from(new Set([
            ...(existingLog.symptoms || []).filter((s: string) => s && s !== 'None'),
            ...newSymptoms.filter((s: string) => s && s !== 'None')
          ]));

          const finalLog = {
            log_date: existingLog.log_date || todayIso,
            flow_intensity: args.flow_intensity !== undefined ? args.flow_intensity : (existingLog.flow_intensity || 'None'),
            cramps_severity: args.cramps_severity !== undefined ? Number(args.cramps_severity) : (existingLog.cramps_severity !== undefined ? existingLog.cramps_severity : 0),
            symptoms: mergedSymptoms.length > 0 ? mergedSymptoms : (existingLog.symptoms || ['None']),
            mood: args.mood || existingLog.mood || 'Calm',
            sleep_hours: args.sleep_hours !== undefined ? Number(args.sleep_hours) : (existingLog.sleep_hours !== undefined ? existingLog.sleep_hours : 7.5),
            weight: args.weight !== undefined ? Number(args.weight) : existingLog.weight
          };

          if (index >= 0) {
            logsList[index] = finalLog;
          } else {
            logsList.push(finalLog);
          }

          cookieStore.set(cookieName, JSON.stringify(logsList), { path: '/' });

          apiResult = { 
            success: true, 
            message: "Daily health log successfully updated and saved to dashboard.", 
            logged: finalLog 
          };
          updatedChartData = { type: "daily_log", log: finalLog };

        } else if (call.name === "update_period_info") {
          const args = call.args as any;
          const profileCookieName = `sakhi_her_profile_${email}`;
          const existingStr = cookieStore.get(profileCookieName)?.value;
          const profile = existingStr ? JSON.parse(existingStr) : {};

          if (args.last_period_date) profile.last_period_start = args.last_period_date;
          if (args.cycle_length_avg) profile.cycle_length = Number(args.cycle_length_avg);
          if (args.period_duration) profile.period_duration = Number(args.period_duration);

          cookieStore.set(profileCookieName, JSON.stringify(profile), { path: '/' });

          let updatedHistory: any[] | null = null;
          if (Array.isArray(args.cycle_history) && args.cycle_history.length > 0) {
            const histCookieName = `sakhi_cycle_history_${email}`;
            const existingHistStr = cookieStore.get(histCookieName)?.value;
            let histList: any[] = [];
            try { histList = existingHistStr ? JSON.parse(existingHistStr) : []; } catch { histList = []; }

            args.cycle_history.forEach((newCycle: any) => {
              const idx = histList.findIndex((h: any) => h.month === newCycle.month);
              if (idx >= 0) {
                histList[idx] = {
                  ...histList[idx],
                  month: newCycle.month,
                  cycleLength: newCycle.cycleLength !== undefined ? Number(newCycle.cycleLength) : (histList[idx].cycleLength || 28),
                  periodDuration: newCycle.periodDuration !== undefined ? Number(newCycle.periodDuration) : (histList[idx].periodDuration || 5)
                };
              } else {
                histList.push({
                  month: newCycle.month,
                  cycleLength: newCycle.cycleLength !== undefined ? Number(newCycle.cycleLength) : (profile.cycle_length || 28),
                  periodDuration: newCycle.periodDuration !== undefined ? Number(newCycle.periodDuration) : (profile.period_duration || 5)
                });
              }
            });

            cookieStore.set(histCookieName, JSON.stringify(histList), { path: '/' });
            updatedHistory = histList;
          }

          apiResult = { 
            success: true, 
            message: "Cycle parameters and trends updated successfully.", 
            profile,
            cycleHistory: updatedHistory
          };
          updatedChartData = { 
            type: updatedHistory ? "cycle_history_update" : "profile_update", 
            profile, 
            cycleHistory: updatedHistory 
          };

        } else if (call.name === "analyze_cycle") {
          const args = call.args as any;
          const backendUrl = process.env.NEXT_PUBLIC_ML_BACKEND_URL || "http://127.0.0.1:8000";
          const res = await fetch(`${backendUrl}/predict/cycle`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              last_period_date: args.last_period_date,
              cycle_length_avg: args.cycle_length_avg
            })
          });
          apiResult = await res.json();
          updatedChartData = { type: "cycle", data: apiResult };

        } else if (call.name === "analyze_pcos_risk") {
          const args = call.args as any;
          const backendUrl = process.env.NEXT_PUBLIC_ML_BACKEND_URL || "http://127.0.0.1:8000";
          const res = await fetch(`${backendUrl}/predict/pcos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              weight: args.weight,
              cycle_regularity: args.cycle_regularity,
              acne_severity: args.acne_severity
            })
          });
          apiResult = await res.json();
          updatedChartData = { type: "pcos", data: apiResult };
        }

        if (apiResult) {
          // Send the result back to Gemini so it can incorporate it smoothly into the voice/text response
          response = await chat.sendMessage({
            message: [{
              functionResponse: {
                name: call.name,
                response: apiResult
              }
            }]
          });
        }
      } catch (backendErr) {
        console.error("Function Execution Error:", backendErr);
        response = await chat.sendMessage({
          message: [{
            functionResponse: {
              name: call.name,
              response: { error: "Service momentarily unavailable. Providing gentle guidance directly." }
            }
          }]
        });
      }
    }

    return NextResponse.json({
      reply: response.text,
      updatedChartData
    });
  } catch (error: any) {
    console.error("Ask Sakhi API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", reply: "I'm having a little trouble connecting right now. Please give me a moment and ask again gently." },
      { status: 500 }
    );
  }
}
