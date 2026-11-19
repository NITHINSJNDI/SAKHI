import { NextResponse } from 'next/server';
import { getOwner, readDoc, writeDoc } from '@/lib/store';
import { getLanguage } from '@/lib/languages';

export interface UserPreferences {
  language: string;       // ISO code (e.g. 'ta', 'hi', 'en')
  bcp47: string;          // BCP-47 tag (e.g. 'ta-IN')
  voiceName?: string;     // Preferred Gemini Live / TTS voice
  voiceEnabled: boolean;  // Audio playback on/off
  voiceMode: 'live' | 'assisted' | 'text';
  direction: 'ltr' | 'rtl';
  updatedAt: string;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  language: 'en',
  bcp47: 'en-IN',
  voiceName: 'Kore',
  voiceEnabled: true,
  voiceMode: 'live',
  direction: 'ltr',
  updatedAt: new Date().toISOString(),
};

export async function GET() {
  try {
    const owner = await getOwner();
    const stored = await readDoc<Partial<UserPreferences>>('preferences', {}, owner);
    const lang = getLanguage(stored?.language || 'en');
    const prefs: UserPreferences = {
      ...DEFAULT_PREFERENCES,
      ...stored,
      language: lang.code,
      bcp47: lang.bcp47,
      direction: lang.direction,
    };
    return NextResponse.json({ preferences: prefs });
  } catch (err: any) {
    console.error('[preferences GET] error:', err?.message);
    return NextResponse.json({ error: 'Failed to load preferences' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const owner = await getOwner();
    const current = await readDoc<Partial<UserPreferences>>('preferences', {}, owner);

    let nextLanguage = current?.language || DEFAULT_PREFERENCES.language;
    if (typeof body.language === 'string' && body.language.trim()) {
      nextLanguage = getLanguage(body.language.trim()).code;
    }
    const langInfo = getLanguage(nextLanguage);

    const next: UserPreferences = {
      language: langInfo.code,
      bcp47: langInfo.bcp47,
      direction: langInfo.direction,
      voiceName: typeof body.voiceName === 'string' ? body.voiceName : current?.voiceName || DEFAULT_PREFERENCES.voiceName,
      voiceEnabled: typeof body.voiceEnabled === 'boolean' ? body.voiceEnabled : (current?.voiceEnabled !== false),
      voiceMode: ['live', 'assisted', 'text'].includes(body.voiceMode) ? body.voiceMode : (current?.voiceMode || 'live'),
      updatedAt: new Date().toISOString(),
    };

    await writeDoc('preferences', next, owner);
    return NextResponse.json({ success: true, preferences: next });
  } catch (err: any) {
    console.error('[preferences PATCH] error:', err?.message);
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return PATCH(req);
}

