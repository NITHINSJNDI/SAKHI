import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// 1. Tool to log or update maternal vitals and daily check-in metrics
const log_pregnancy_vital_declaration = {
  name: "log_pregnancy_vital_entry",
  description: "Log or update daily maternal health metrics including blood pressure, fasting blood sugar, baby kicks/movement, weight, sleep hours, mood, or pregnancy symptoms. Use this WHENEVER the user mentions any reading, symptom, kicks, sleep, or mood in chat.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      blood_pressure_systolic: {
        type: Type.INTEGER,
        description: "Systolic blood pressure number in mmHg if mentioned (e.g. 120, 130, 140)."
      },
      blood_pressure_diastolic: {
        type: Type.INTEGER,
        description: "Diastolic blood pressure number in mmHg if mentioned (e.g. 80, 85, 90)."
      },
      blood_sugar: {
        type: Type.NUMBER,
        description: "Fasting or post-meal blood sugar in mg/dL if mentioned (e.g. 88, 92, 110)."
      },
      baby_movement: {
        type: Type.INTEGER,
        description: "Number of fetal kicks or movements felt if mentioned (e.g. 6, 10, 12 kicks)."
      },
      weight: {
        type: Type.NUMBER,
        description: "Maternal weight in kg if mentioned (e.g. 64, 65.5)."
      },
      sleep_hours: {
        type: Type.NUMBER,
        description: "Hours of sleep if mentioned (e.g. 6, 7.5, 9)."
      },
      mood: {
        type: Type.STRING,
        description: "Emotional mood: 'Happy', 'Calm', 'Fatigued', 'Anxious', 'Irritable', or 'Nauseous'."
      },
      symptoms: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Pregnancy symptoms mentioned (e.g. ['Swelling', 'Headache', 'Heartburn', 'Back Pain', 'Nausea', 'Braxton Hicks', 'Fatigue', 'Dizziness'])."
      }
    }
  }
};

// 2. Tool to update pregnancy progress or gestational age
const update_pregnancy_progress_declaration = {
  name: "update_pregnancy_progress",
  description: "Update gestational age (weeks pregnant) or expected due date when the user mentions their current pregnancy week or due date (e.g. 'I am in week 20 now', 'Doctor said I am 22 weeks').",
  parameters: {
    type: Type.OBJECT,
    properties: {
      weeks_pregnant: {
        type: Type.INTEGER,
        description: "Gestational age in weeks (1 to 42)."
      },
      expected_due_date: {
        type: Type.STRING,
        description: "Estimated delivery due date in YYYY-MM-DD format if mentioned."
      }
    }
  }
};

// 3. Tool to schedule or update prenatal appointments
const schedule_pregnancy_appointment_declaration = {
  name: "schedule_pregnancy_appointment",
  description: "Schedule or record upcoming prenatal/ANC appointments, ultrasounds, or doctor visits (e.g. 'I have an anomaly scan next Tuesday', 'Doctor scheduled glucose screening on Friday').",
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: {
        type: Type.STRING,
        description: "Name of the visit or scan (e.g. 'Anomaly Ultrasound', 'Routine ANC Visit', 'Glucose Tolerance Test')."
      },
      date: {
        type: Type.STRING,
        description: "Date or time description of the appointment (e.g. 'Next Tuesday', '2026-10-25')."
      },
      completed: {
        type: Type.BOOLEAN,
        description: "Whether the appointment was already attended/completed."
      }
    },
    required: ["name"]
  }
};

// 4. Tool to log prenatal nutrition
const log_pregnancy_nutrition_declaration = {
  name: "log_pregnancy_nutrition",
  description: "Log daily prenatal nutrition intake such as protein, iron, calcium, or water glasses/liters.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      protein: {
        type: Type.NUMBER,
        description: "Protein intake in grams or score."
      },
      iron: {
        type: Type.NUMBER,
        description: "Iron intake in mg or score."
      },
      calcium: {
        type: Type.NUMBER,
        description: "Calcium intake in mg or score."
      },
      water: {
        type: Type.NUMBER,
        description: "Water intake in liters or glasses."
      }
    }
  }
};

export async function POST(req: Request) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const session = await getServerSession(authOptions);

  try {
    const { message, chatHistory = [], data = {}, userName } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const email = session?.user?.email?.replace(/[^a-zA-Z0-9]/g, '_') || 'demo_user';
    const cookieStore = await cookies();
    const storedPreferredName = cookieStore.get('sakhi_preferred_name')?.value;
    const effectiveName = userName || storedPreferredName || data.profile?.preferred_name || session?.user?.name?.split(' ')[0] || 'Mama';

    const chat = ai.chats.create({
      model: 'gemini-flash-lite-latest',
      config: {
        systemInstruction: `You are Sakhi, an empathetic, caring, and nurturing feminine AI maternal health companion.
The mother's name is "${effectiveName}". Address her with warmth, love, and gentleness, referring to her by "${effectiveName}".

CRITICAL MEDICAL & COMMUNICATION RULES:
1. STRICT MEDICAL SAFETY - NO PRESCRIPTIONS: You are an AI companion, NOT a licensed doctor. You MUST NEVER give or suggest any medical prescriptions, medication names, pharmaceutical treatments, or drug dosages. If the user asks for medications, drugs, or medical prescriptions, gently and clearly inform them that you cannot prescribe medications and advise them to consult their OB/GYN or doctor.
2. STRICT DASHBOARD RULE - DO NOT MENTION DASHBOARD LOGGING: NEVER say "I noted this in your dashboard", "I updated your dashboard", "I have logged this in your dashboard", or tell the user that you recorded anything in the dashboard. Perform any function tool calls silently in the background, and reply conversationally and empathetically about how they are doing with maternal comfort.
3. Keep spoken replies concise (2-3 short sentences max) so they sound natural and caring when spoken aloud.
4. Monitor for danger signs (heavy bleeding, severe abdominal pain, vision loss, absence of movement). If present, urgently urge them to visit the hospital or emergency room immediately.

BACKGROUND DATA SYNCHRONIZATION:
- If the user mentions Blood Pressure, Blood Sugar, Baby kicks/movement, Sleep hours, Weight, Mood, or Symptoms, call the 'log_pregnancy_vital_entry' function.
- If the user mentions current pregnancy week or due date, call 'update_pregnancy_progress'.
- If the user mentions an upcoming doctor appointment or scan, call 'schedule_pregnancy_appointment'.
- If the user mentions nutrition, call 'log_pregnancy_nutrition'.`,
        tools: [{
          functionDeclarations: [
            log_pregnancy_vital_declaration,
            update_pregnancy_progress_declaration,
            schedule_pregnancy_appointment_declaration,
            log_pregnancy_nutrition_declaration
          ]
        }]
      }
    });

    const userContext = `
      [SYSTEM CONTEXT - DO NOT READ ALOUD]
      User's name: ${effectiveName}.
      Current Gestational Age: ${data.profile?.weeks_pregnant ? `${data.profile.weeks_pregnant} weeks` : 'Pregnant'}.
      Maternal Medical Background: ${(data.profile?.maternal_conditions || []).join(', ') || 'None reported'}.
      [END SYSTEM CONTEXT]

      User says: ${message}
    `;

    let response = await chat.sendMessage({ message: userContext });
    let updatedChartData: any = null;

    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      let apiResult: any = null;

      try {
        if (call.name === "log_pregnancy_vital_entry") {
          const args = call.args as any;
          const cookieName = `sakhi_pregnancy_logs_${email}`;
          const existingStr = cookieStore.get(cookieName)?.value;
          let logsList: any[] = [];
          try {
            logsList = existingStr ? JSON.parse(existingStr) : [];
          } catch {
            logsList = [];
          }

          const todayDateStr = new Date().toISOString().split('T')[0];
          const existingIndex = logsList.findIndex((l: any) => (l.log_date || '').split('T')[0] === todayDateStr);
          const existingToday = existingIndex >= 0 ? logsList[existingIndex] : {};

          // Non-destructive merge: preserve all past history and keep non-mentioned fields
          const newSymptoms = Array.isArray(args.symptoms) ? args.symptoms : (args.symptoms ? [args.symptoms] : []);
          const mergedSymptoms = Array.from(new Set([
            ...(existingToday.symptoms || []).filter((s: string) => s && s !== 'None'),
            ...newSymptoms.filter((s: string) => s && s !== 'None')
          ]));

          const finalLog = {
            log_date: todayDateStr,
            weight: args.weight !== undefined && args.weight !== null ? Number(args.weight) : (existingToday.weight ?? (logsList.length > 0 ? logsList[logsList.length - 1].weight : null)),
            blood_pressure_systolic: args.blood_pressure_systolic !== undefined && args.blood_pressure_systolic !== null ? Number(args.blood_pressure_systolic) : (existingToday.blood_pressure_systolic ?? null),
            blood_pressure_diastolic: args.blood_pressure_diastolic !== undefined && args.blood_pressure_diastolic !== null ? Number(args.blood_pressure_diastolic) : (existingToday.blood_pressure_diastolic ?? null),
            blood_sugar: args.blood_sugar !== undefined && args.blood_sugar !== null ? Number(args.blood_sugar) : (existingToday.blood_sugar ?? null),
            baby_movement: args.baby_movement !== undefined && args.baby_movement !== null ? Number(args.baby_movement) : (existingToday.baby_movement ?? null),
            mood: args.mood || existingToday.mood || "Calm",
            sleep_hours: args.sleep_hours !== undefined && args.sleep_hours !== null ? Number(args.sleep_hours) : (existingToday.sleep_hours ?? 8),
            symptoms: mergedSymptoms.length > 0 ? mergedSymptoms : (existingToday.symptoms || ["None"])
          };

          if (existingIndex >= 0) {
            logsList[existingIndex] = finalLog;
          } else {
            logsList.push(finalLog);
          }

          logsList.sort((a: any, b: any) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());

          cookieStore.set(cookieName, JSON.stringify(logsList), { 
            path: '/',
            maxAge: 60 * 60 * 24 * 365 
          });

          apiResult = {
            success: true,
            message: "Maternal vital log updated in dashboard.",
            log: finalLog
          };
          updatedChartData = { type: "daily_log", log: finalLog, logs: logsList };

        } else if (call.name === "update_pregnancy_progress") {
          const args = call.args as any;
          const cookieName = `sakhi_preg_profile_${email}`;
          const existingStr = cookieStore.get(cookieName)?.value;
          let profile: any = {};
          try {
            profile = existingStr ? JSON.parse(existingStr) : {};
          } catch {
            profile = {};
          }

          if (args.weeks_pregnant) {
            profile.weeks_pregnant = Number(args.weeks_pregnant);
          }
          if (args.expected_due_date) {
            profile.expected_due_date = args.expected_due_date;
          }

          cookieStore.set(cookieName, JSON.stringify(profile), { 
            path: '/',
            maxAge: 60 * 60 * 24 * 365 
          });

          apiResult = {
            success: true,
            message: "Pregnancy gestational progress updated.",
            profile
          };
          updatedChartData = { type: "profile_update", profile };

        } else if (call.name === "schedule_pregnancy_appointment") {
          const args = call.args as any;
          const cookieName = `sakhi_pregnancy_appointments_${email}`;
          const existingStr = cookieStore.get(cookieName)?.value;
          let appointments: any[] = [];
          try {
            appointments = existingStr ? JSON.parse(existingStr) : [];
          } catch {
            appointments = [];
          }

          appointments.push({
            name: args.name,
            date: args.date || "Upcoming",
            completed: Boolean(args.completed)
          });

          cookieStore.set(cookieName, JSON.stringify(appointments), { 
            path: '/',
            maxAge: 60 * 60 * 24 * 365 
          });

          apiResult = {
            success: true,
            message: "Appointment saved to maternal timeline.",
            appointments
          };
          updatedChartData = { type: "appointment_update", appointments };

        } else if (call.name === "log_pregnancy_nutrition") {
          const args = call.args as any;
          const cookieName = `sakhi_pregnancy_nutrition_${email}`;
          const existingStr = cookieStore.get(cookieName)?.value;
          let nutrition: any = {};
          try {
            nutrition = existingStr ? JSON.parse(existingStr) : {};
          } catch {
            nutrition = {};
          }

          nutrition = {
            protein: args.protein !== undefined ? Number(args.protein) : (nutrition.protein || 0),
            iron: args.iron !== undefined ? Number(args.iron) : (nutrition.iron || 0),
            calcium: args.calcium !== undefined ? Number(args.calcium) : (nutrition.calcium || 0),
            water: args.water !== undefined ? Number(args.water) : (nutrition.water || 0)
          };

          cookieStore.set(cookieName, JSON.stringify(nutrition), { 
            path: '/',
            maxAge: 60 * 60 * 24 * 365 
          });

          apiResult = {
            success: true,
            message: "Nutrition logged.",
            nutrition
          };
          updatedChartData = { type: "nutrition_update", nutrition };
        }

        if (apiResult) {
          response = await chat.sendMessage({
            message: [{
              functionResponse: {
                name: call.name,
                response: apiResult
              }
            }]
          });
        }
      } catch (toolErr) {
        console.error("Function Execution Error in Pregnancy Chat:", toolErr);
        response = await chat.sendMessage({
          message: [{
            functionResponse: {
              name: call.name,
              response: { error: "Could not update dashboard immediately. Providing gentle maternal guidance directly." }
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
    console.error('Sakhi Pregnancy API Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response', reply: "I'm having a little trouble connecting right now. Please give me a moment and ask again gently." },
      { status: 500 }
    );
  }
}
