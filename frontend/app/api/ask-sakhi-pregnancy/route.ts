import { NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { cookies } from 'next/headers';
import { executeGeminiWithAutoSwitch, getGeminiKeyPool } from '@/lib/gemini';
import { getOwner, readDoc } from '@/lib/store';
import { clientKey, rateLimit } from '@/lib/rateLimit';
import { onceper, runPregnancyTool } from '@/lib/sakhiTools';
import { offlinePregnancyReply } from '@/lib/offlineChat';

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

const SYSTEM_PROMPT = (name: string) => `You are Sakhi, an empathetic, caring, and nurturing feminine AI maternal health companion.
The mother's name is "${name}". Address her with warmth, love, and gentleness, referring to her by "${name}".

CRITICAL MEDICAL & COMMUNICATION RULES:
1. STRICT MEDICAL SAFETY - NO PRESCRIPTIONS: You are an AI companion, NOT a licensed doctor. You MUST NEVER give or suggest any medical prescriptions, medication names, pharmaceutical treatments, or drug dosages. If the user asks for medications, drugs, or medical prescriptions, gently and clearly inform them that you cannot prescribe medications and advise them to consult their OB/GYN or doctor.
2. STRICT DASHBOARD RULE - DO NOT MENTION DASHBOARD LOGGING: NEVER say "I noted this in your dashboard", "I updated your dashboard", "I have logged this in your dashboard", or tell the user that you recorded anything in the dashboard. Perform any function tool calls silently in the background, and reply conversationally and empathetically about how they are doing with maternal comfort.
3. Keep spoken replies concise (2-3 short sentences max) so they sound natural and caring when spoken aloud.
4. Monitor for danger signs (heavy bleeding, severe abdominal pain, vision loss, absence of movement). If present, urgently urge them to visit the hospital or emergency room immediately.

BACKGROUND DATA SYNCHRONIZATION:
- If the user mentions Blood Pressure, Blood Sugar, Baby kicks/movement, Sleep hours, Weight, Mood, or Symptoms, call the 'log_pregnancy_vital_entry' function.
- If the user mentions current pregnancy week or due date, call 'update_pregnancy_progress'.
- If the user mentions an upcoming doctor appointment or scan, call 'schedule_pregnancy_appointment'.
- If the user mentions nutrition, call 'log_pregnancy_nutrition'.`;

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { message: rawMessage, data = {}, userName } = body;
  if (!rawMessage || typeof rawMessage !== 'string') {
    return NextResponse.json({ error: 'Missing message' }, { status: 400 });
  }
  const message = rawMessage.slice(0, 2000);

  try {
    const owner = await getOwner();
    // 20 messages/minute per user+IP protects the shared Gemini key pool
    const limit = rateLimit(`chat:${clientKey(req, owner.key)}`, 20, 60_000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many messages', reply: "Let's take a short breath together. Please try again in a moment." },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      );
    }
    const cookieStore = await cookies();
    const profile = (await readDoc<any>('preg_profile', null, owner)) || data.profile || {};
    const effectiveName: string = String(
      userName || profile.preferred_name || cookieStore.get('sakhi_preferred_name')?.value || owner.name?.split(' ')[0] || 'Mama'
    ).slice(0, 60);

    // Use the offline engine when no Gemini key is configured, or when the user
    // opted out of AI processing in the consent screen.
    const consent = await readDoc<any>('consent', null, owner);
    if (getGeminiKeyPool().length === 0 || consent?.aiProcessing === false) {
      const { reply, chartData } = await offlinePregnancyReply(message, owner, effectiveName);
      return NextResponse.json({ reply, updatedChartData: chartData, offline: true });
    }

    const conditions: string[] = Array.isArray(profile.maternal_conditions) ? profile.maternal_conditions : [];
    const userContext = `
      [SYSTEM CONTEXT - DO NOT READ ALOUD]
      User's name: ${effectiveName}.
      Current Gestational Age: ${profile.weeks_pregnant ? `${profile.weeks_pregnant} weeks` : 'Pregnant'}.
      Maternal Medical Background: ${conditions.join(', ') || 'None reported'}.
      [END SYSTEM CONTEXT]

      User says: ${message}
    `;
    const runTool = onceper(runPregnancyTool);

    try {
      const { replyText, updatedChartData } = await executeGeminiWithAutoSwitch(async (ai) => {
        const chat = ai.chats.create({
          model: 'gemini-flash-lite-latest',
          config: {
            systemInstruction: SYSTEM_PROMPT(effectiveName),
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

        let response = await chat.sendMessage({ message: userContext });
        let chartData: any = null;

        if (response.functionCalls && response.functionCalls.length > 0) {
          const call = response.functionCalls[0];
          let apiResult: any;
          try {
            const outcome = await runTool(call.name || '', call.args || {}, owner);
            apiResult = outcome?.apiResult ?? { error: `Unknown tool ${call.name}` };
            chartData = outcome?.chartData ?? null;
          } catch (toolErr) {
            console.error('Function Execution Error in Pregnancy Chat:', toolErr);
            apiResult = { error: 'Could not save right now. Providing gentle maternal guidance directly.' };
          }
          response = await chat.sendMessage({
            message: [{ functionResponse: { name: call.name, response: apiResult } }]
          });
        }
        return { replyText: response.text, updatedChartData: chartData };
      });
      return NextResponse.json({ reply: replyText, updatedChartData });
    } catch (geminiErr: any) {
      console.warn('Gemini unavailable, using offline Sakhi (pregnancy):', geminiErr?.message || geminiErr);
      const { reply, chartData } = await offlinePregnancyReply(message, owner, effectiveName);
      return NextResponse.json({ reply, updatedChartData: chartData, offline: true });
    }
  } catch (error: any) {
    console.error('Sakhi Pregnancy API Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response', reply: "I'm having a little trouble connecting right now. Please give me a moment and ask again gently." },
      { status: 500 }
    );
  }
}
