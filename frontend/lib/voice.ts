"use client";
/**
 * Voice Subsystem for SAKHI:
 * 1. Gemini AI HD Voice Player (Web Audio API PCM 24kHz stream playback)
 * 2. Browser Speech Synthesis Fallback (for Tier 2 regional languages / offline)
 * 3. High-Accuracy Speech Recognition with automatic BCP-47 locale binding for all 23 Indian languages
 * 4. Immediate Barge-in / Interruption Support
 */

import { INDIAN_LANGUAGES, getLanguage, LanguageInfo } from '@/lib/languages';

export const VOICE_ENABLED_KEY = 'sakhi_voice_enabled';
export const VOICE_LANG_KEY = 'sakhi_voice_lang';
export const VOICE_PREFERRED_LANG_KEY = 'sakhi_preferred_language';
export const VOICE_STYLE_KEY = 'sakhi_voice_style';

export const VOICE_LANGS = INDIAN_LANGUAGES.map(l => ({
  code: l.bcp47,
  langCode: l.code,
  label: `${l.nativeName} (${l.name})`,
  name: l.name,
  nativeName: l.nativeName,
  tier: l.voiceTier,
}));

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };

export function getVoiceLang(): string {
  const preferred = read(VOICE_PREFERRED_LANG_KEY);
  if (preferred) {
    return getLanguage(preferred).bcp47;
  }
  const v = read(VOICE_LANG_KEY);
  if (v) {
    return getLanguage(v).bcp47;
  }
  return 'en-IN';
}

export function getSelectedLanguageCode(): string {
  const preferred = read(VOICE_PREFERRED_LANG_KEY) || read(VOICE_LANG_KEY);
  return getLanguage(preferred).code;
}

export const voiceEnabled = () => read(VOICE_ENABLED_KEY) !== 'false';
export const speechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;
export const recognitionSupported = () =>
  typeof window !== 'undefined' && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

/** Clean text for speech synthesis: strips markdown, formatting, emoji, and urls. */
export function cleanForSpeech(text: string): string {
  return text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[*_`#>~]+/g, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\p{Extended_Pictographic}|️|‍/gu, '')
    .replace(/\s*\n+\s*/g, '. ')
    .replace(/\.{2,}/g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Split into sentences for browser speech fallback. */
export function splitSentences(text: string): string[] {
  const parts = text.match(/[^.!?]+[.!?]*/g) || [text];
  const out: string[] = [];
  for (const raw of parts) {
    let s = raw.trim();
    if (!s) continue;
    while (s.length > 180) {
      const cut = s.lastIndexOf(',', 180) > 60 ? s.lastIndexOf(',', 180) + 1 : s.lastIndexOf(' ', 180);
      out.push(s.slice(0, cut > 0 ? cut : 180).trim());
      s = s.slice(cut > 0 ? cut : 180).trim();
    }
    if (s) out.push(s);
  }
  return out;
}

export type VoiceStyle = 'girl' | 'woman';
export const VOICE_STYLES: { code: VoiceStyle; label: string }[] = [
  { code: 'girl', label: 'Young girl' },
  { code: 'woman', label: 'Woman' },
];
export const getVoiceStyle = (): VoiceStyle => (read(VOICE_STYLE_KEY) === 'woman' ? 'woman' : 'girl');

const PREFERRED = /neerja|heera|veena|kalpana|swara|lekha|pallavi|shruti|google हिन्दी|google தமிழ்|google বাংলা|sonia|libby|aria|jenny|female/i;
const norm = (l: string) => l.replace('_', '-').toLowerCase();

export function pickVoice(lang: string, style: VoiceStyle = 'woman'): SpeechSynthesisVoice | null {
  if (!speechSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const exact = voices.filter(v => norm(v.lang) === lang.toLowerCase());
  const family = voices.filter(v => norm(v.lang).split('-')[0] === lang.toLowerCase().split('-')[0]);
  if (exact.length || family.length) {
    const pool = exact.length ? exact : family;
    return pool.find(v => PREFERRED.test(v.name) && /natural|online/i.test(v.name)) || pool.find(v => PREFERRED.test(v.name)) || pool[0];
  }
  // If target language is English, find best English voice
  if (norm(lang).startsWith('en')) {
    const english = voices.filter(v => norm(v.lang).startsWith('en'));
    return english.find(v => PREFERRED.test(v.name)) || voices[0] || null;
  }
  // For non-English target languages, NEVER fall back to an English voice!
  return null;
}

function delivery(style: VoiceStyle, voice: SpeechSynthesisVoice | null) {
  if (style === 'woman') return { pitch: 1.05, rate: 0.97 };
  return { pitch: 1.25, rate: 1.02 };
}

// ------------------------------------------------------------ Web Audio Context for Gemini PCM
let audioCtx: AudioContext | null = null;
let currentSourceNode: AudioBufferSourceNode | null = null;
let session = 0;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/** Stop any currently playing audio immediately (instant barge-in). */
export function stopSpeaking() {
  session++;
  if (currentSourceNode) {
    try {
      currentSourceNode.stop();
      currentSourceNode.disconnect();
    } catch {
      // ignore
    }
    currentSourceNode = null;
  }
  if (speechSupported()) {
    try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
  }
}

/** Decode base64 16-bit PCM little-endian audio into an AudioBuffer. */
function decodePcmToBuffer(ctx: AudioContext, base64Pcm: string, sampleRate = 24000): AudioBuffer {
  const binaryString = atob(base64Pcm);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // 16-bit PCM is 2 bytes per sample
  const numSamples = Math.floor(len / 2);
  const audioBuffer = ctx.createBuffer(1, numSamples, sampleRate);
  const channelData = audioBuffer.getChannelData(0);
  const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  for (let i = 0; i < numSamples; i++) {
    const int16 = dataView.getInt16(i * 2, true); // little-endian
    channelData[i] = int16 / 32768.0; // normalize to [-1.0, 1.0]
  }

  return audioBuffer;
}

/** Play high-fidelity Gemini AI spoken audio via Web Audio API. */
function playGeminiAudio(
  base64Pcm: string,
  sampleRate: number = 24000,
  handlers: { onStart?: () => void; onEnd?: () => void; onWord?: () => void } = {}
): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) return Promise.resolve();

  return new Promise(resolve => {
    try {
      const audioBuffer = decodePcmToBuffer(ctx, base64Pcm, sampleRate);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      currentSourceNode = source;

      handlers.onStart?.();

      // Mouth animation pulse
      const pulseInterval = setInterval(() => {
        handlers.onWord?.();
      }, 120);

      source.onended = () => {
        clearInterval(pulseInterval);
        currentSourceNode = null;
        handlers.onEnd?.();
        resolve();
      };

      source.start();
    } catch (e) {
      console.warn('Could not play Gemini PCM audio buffer:', e);
      handlers.onEnd?.();
      resolve();
    }
  });
}

/** Browser speech synthesis fallback (Tier 2 languages or offline). */
function speakBrowser(
  text: string,
  handlers: { onStart?: () => void; onEnd?: () => void; onWord?: () => void } = {}
): Promise<void> {
  if (!speechSupported()) return Promise.resolve();
  const mine = ++session;
  const lang = getVoiceLang();
  const style = getVoiceStyle();
  const voice = pickVoice(lang, style);
  if (!voice && !norm(lang).startsWith('en')) {
    // Unsupported voice locale in user's browser: handle gracefully without speaking in wrong language
    handlers.onEnd?.();
    return Promise.resolve();
  }
  const { pitch, rate } = delivery(style, voice);
  const chunks = splitSentences(cleanForSpeech(text));
  if (!chunks.length) return Promise.resolve();

  return new Promise(resolve => {
    let started = false;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      if (mine === session) handlers.onEnd?.();
      resolve();
    };

    chunks.forEach((chunk, i) => {
      const u = new SpeechSynthesisUtterance(chunk);
      if (voice) u.voice = voice;
      u.lang = voice?.lang || lang;
      u.rate = rate;
      u.pitch = pitch;
      u.volume = 1;
      u.onstart = () => {
        if (!started && mine === session) {
          started = true;
          handlers.onStart?.();
        }
      };
      u.onboundary = (e: any) => {
        if (mine === session && (!e.name || e.name === 'word')) handlers.onWord?.();
      };
      u.onerror = () => { if (i === chunks.length - 1 || mine !== session) finish(); };
      u.onend = () => { if (i === chunks.length - 1 || mine !== session) finish(); };
      window.speechSynthesis.speak(u);
    });

    const guard = setInterval(() => {
      if (mine !== session || !window.speechSynthesis.speaking) {
        clearInterval(guard);
        if (mine !== session) finish();
      }
    }, 1000);
  });
}

/**
 * Unified speak function:
 * First attempts Gemini AI HD Voice via `/api/voice/speak`.
 * Seamlessly falls back to browser synthesis for Tier 2 languages or offline mode.
 */
export async function speak(
  text: string,
  handlers: { onStart?: () => void; onEnd?: () => void; onWord?: () => void } = {}
): Promise<void> {
  stopSpeaking();
  const currentSession = session;
  const langCode = getSelectedLanguageCode();

  // Attempt server-side Gemini HD Voice
  try {
    const res = await fetch('/api/voice/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        lang: langCode,
        voiceName: 'Kore',
      }),
    });

    if (currentSession !== session) return; // Interrupted while fetching

    const data = await res.json().catch(() => ({}));
    if (data.ok && data.audioBase64) {
      await playGeminiAudio(data.audioBase64, data.sampleRate || 24000, handlers);
      return;
    }
  } catch {
    // network failure: fall through to browser speech
  }

  if (currentSession !== session) return;
  return speakBrowser(text, handlers);
}

const MIC_ERRORS: Record<string, string> = {
  'not-allowed': "Microphone access is blocked. Allow it in your browser's site settings, then tap the mic again.",
  'service-not-allowed': 'Voice input is turned off in this browser. You can still type to me.',
  'no-speech': "I didn't hear anything. Tap the mic and try again.",
  'audio-capture': 'No microphone was found on this device.',
  network: 'Voice input needs an internet connection in this browser.',
};

export interface Recognizer { start: () => void; stop: () => void; isListening: () => boolean }

/**
 * Creates speech recognizer bound to the user's active Indian language.
 */
export function createRecognizer(h: {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}): Recognizer | null {
  if (!recognitionSupported()) return null;
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  let rec: any = null;
  let finalText = '';
  let active = false;

  return {
    start() {
      stopSpeaking(); // Immediate barge-in on mic press
      try { rec?.abort(); } catch { /* ignore */ }
      rec = new SR();
      rec.lang = getVoiceLang();
      rec.continuous = false;
      rec.interimResults = true;
      finalText = '';
      active = true;

      rec.onresult = (e: any) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalText += r[0].transcript;
          else interim += r[0].transcript;
        }
        h.onInterim((finalText + interim).trim());
      };

      rec.onerror = (e: any) => {
        active = false;
        if (e.error !== 'aborted') {
          h.onError(MIC_ERRORS[e.error] || 'Voice input stopped unexpectedly. Please try again.');
        }
      };

      rec.onend = () => {
        active = false;
        const text = finalText.trim();
        if (text) h.onFinal(text);
        h.onEnd();
      };

      try {
        rec.start();
      } catch {
        active = false;
        h.onError('Voice input is busy. Please try again.');
        h.onEnd();
      }
    },
    stop() {
      active = false;
      try { rec?.stop(); } catch { /* ignore */ }
    },
    isListening() {
      return active;
    },
  };
}
