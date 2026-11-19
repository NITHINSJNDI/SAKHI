import { NextResponse } from 'next/server';
import { executeGeminiWithAutoSwitch, getGeminiKeyPool } from '@/lib/gemini';
import { getLanguage } from '@/lib/languages';

const TTS_MODEL = process.env.GEMINI_TTS_MODEL || process.env.GEMINI_VOICE_MODEL || 'gemini-2.5-flash-preview-tts';

// Supported Google prebuilt voices
const VALID_VOICES = ['Kore', 'Aoede', 'Puck', 'Charon', 'Fenrir'];

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawText = String(body.text || '').trim();
    if (!rawText) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Clean text for speech: strip markdown, emoji, URLs, bullet points
    const cleanText = rawText
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[*_`#>~]+/g, '')
      .replace(/^\s*[-•]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      .replace(/\p{Extended_Pictographic}|️|‍/gu, '')
      .replace(/\s*\n+\s*/g, '. ')
      .replace(/\.{2,}/g, '.')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (!cleanText) {
      return NextResponse.json({ error: 'No pronounceable text' }, { status: 400 });
    }

    const langInfo = getLanguage(body.lang || body.language);
    const voiceName = VALID_VOICES.includes(body.voiceName) ? body.voiceName : 'Kore';

    // If no keys configured or unsupported voice tier, signal client fallback
    if (getGeminiKeyPool().length === 0 || langInfo.voiceTier !== 'live') {
      return NextResponse.json({
        fallback: true,
        reason: langInfo.voiceTier !== 'live' ? 'assisted_tier' : 'no_key',
        langCode: langInfo.code,
        bcp47: langInfo.bcp47,
      });
    }

    // Execute with automatic multi-key failover
    const audioResult = await executeGeminiWithAutoSwitch(async (client) => {
      const response = await client.models.generateContent({
        model: TTS_MODEL,
        contents: cleanText.slice(0, 1000), // Protect against overly long utterances
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName }
            }
          }
        }
      });

      const audioPart = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (!audioPart || !audioPart.data) {
        throw new Error('No audio returned by Gemini');
      }

      return {
        data: audioPart.data,
        mimeType: audioPart.mimeType || 'audio/L16;codec=pcm;rate=24000',
        sampleRate: 24000,
      };
    });

    return NextResponse.json({
      ok: true,
      audioBase64: audioResult.data,
      mimeType: audioResult.mimeType,
      sampleRate: audioResult.sampleRate,
      voice: voiceName,
      lang: langInfo.code,
    });
  } catch (err: any) {
    console.warn('[Voice API speak] Gemini TTS unavailable, signalling browser fallback:', err?.message || err);
    return NextResponse.json({
      fallback: true,
      reason: 'gemini_tts_error',
      error: err?.message,
    });
  }
}

