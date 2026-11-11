import { NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { cookies } from 'next/headers';
import { executeGeminiWithAutoSwitch, getGeminiKeyPool } from '@/lib/gemini';
import { getOwner, readDoc } from '@/lib/store';
import { clientKey, rateLimit } from '@/lib/rateLimit';
import { onceper, runHerTool } from '@/lib/sakhiTools';
import { offlineHerReply } from '@/lib/offlineChat';

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

const SYSTEM_PROMPT = (name: string) => `You are Sakhi, an empathetic feminine AI health companion.
The user's name is "${name}". Address them warmly and naturally by their name ("${name}") in your responses whenever suitable.

CRITICAL MEDICAL & COMMUNICATION RULES:
1. STRICT MEDICAL SAFETY - NO PRESCRIPTIONS: You are an AI companion, NOT a licensed physician. You MUST NEVER give or suggest any medical prescriptions, drug names, dosage amounts, or pharmaceutical treatments. If the user asks for medications, drugs, or prescriptions, gently and clearly inform them that you cannot prescribe medications and advise them to consult their doctor or gynecologist.
2. STRICT DASHBOARD RULE - DO NOT MENTION DASHBOARD LOGGING: NEVER say "I have updated this in your dashboard", "I noted that in your dashboard", "I recorded this in your dashboard", or tell the user that you recorded anything in the dashboard. Perform any function tool calls silently in the background, and reply conversationally, directly, and empathetically about how they are doing.
3. Keep your answers direct, concise, and focused. Only reply the direct answers to what the user asked or shared, without long unnecessary pleasantries or excessive filler.

BACKGROUND DYNAMIC DASHBOARD ACTIONS:
1. Whenever the user mentions physical sensations, symptoms (like acne, cramps, headache, fatigue, nausea, bloating), pain level, bleeding flow, mood, or sleep hours, call log_health_entry silently.
2. Whenever the user says their period started today or gives a period start date, cycle length, or past cycle history, call update_period_info silently.
3. If they ask about PCOS risk or cycle prediction, call analyze_pcos_risk or analyze_cycle.`;

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { prompt, userName } = body;
  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }
  const message = prompt.slice(0, 2000);

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
    const profile = await readDoc<any>('her_profile', null, owner);
    const effectiveName: string = String(
      userName || profile?.preferred_name || cookieStore.get('sakhi_preferred_name')?.value || owner.name?.split(' ')[0] || ''
    ).slice(0, 60);

    // No Gemini key configured: answer with the offline engine straight away
    // Use the offline engine when no Gemini key is configured, or when the user
    // opted out of AI processing in the consent screen.
    const consent = await readDoc<any>('consent', null, owner);
    if (getGeminiKeyPool().length === 0 || consent?.aiProcessing === false) {
      const { reply, chartData } = await offlineHerReply(message, owner, effectiveName);
      return NextResponse.json({ reply, updatedChartData: chartData, offline: true });
    }

    const personalizedPrompt = effectiveName
      ? `[The user's preferred name is ${effectiveName}. Please address ${effectiveName} naturally in your response.]\n${message}`
      : message;
    const runTool = onceper(runHerTool);

    try {
      const { replyText, updatedChartData } = await executeGeminiWithAutoSwitch(async (ai) => {
        const chat = ai.chats.create({
          model: 'gemini-flash-lite-latest',
          config: {
            systemInstruction: SYSTEM_PROMPT(effectiveName || 'friend'),
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

        let response = await chat.sendMessage({ message: personalizedPrompt });
        let chartData: any = null;

        if (response.functionCalls && response.functionCalls.length > 0) {
          const call = response.functionCalls[0];
          let apiResult: any;
          try {
            const outcome = await runTool(call.name || '', call.args || {}, owner);
            apiResult = outcome?.apiResult ?? { error: `Unknown tool ${call.name}` };
            chartData = outcome?.chartData ?? null;
          } catch (toolErr) {
            console.error('Tool execution error:', toolErr);
            apiResult = { error: 'Service momentarily unavailable. Providing gentle guidance directly.' };
          }
          response = await chat.sendMessage({
            message: [{ functionResponse: { name: call.name, response: apiResult } }]
          });
        }
        return { replyText: response.text, updatedChartData: chartData };
      });
      return NextResponse.json({ reply: replyText, updatedChartData });
    } catch (geminiErr: any) {
      // Every key failed (quota, network, outage): fall back to the offline engine
      console.warn('Gemini unavailable, using offline Sakhi:', geminiErr?.message || geminiErr);
      const { reply, chartData } = await offlineHerReply(message, owner, effectiveName);
      return NextResponse.json({ reply, updatedChartData: chartData, offline: true });
    }
  } catch (error: any) {
    console.error('Ask Sakhi API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', reply: "I'm having a little trouble connecting right now. Please give me a moment and ask again gently." },
      { status: 500 }
    );
  }
}
