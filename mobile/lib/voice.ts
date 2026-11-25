/**
 * Spoken replies, the phone's version of frontend/lib/voice.ts: on/off, a
 * voice style, and speaking in the app language with the phone's own voices.
 */
import * as Speech from "expo-speech";

import { getString, setString } from "./storage";

export type VoiceStyle = "girl" | "woman";
export const VOICE_STYLES: { code: VoiceStyle; label: string }[] = [
  { code: "girl", label: "Young" },
  { code: "woman", label: "Warm" },
];
const ENABLED_KEY = "sakhi_voice_enabled";
const STYLE_KEY = "sakhi_voice_style";

export const getVoiceEnabled = async () => (await getString(ENABLED_KEY)) !== "false";
export const setVoiceEnabled = (on: boolean) => {
  if (!on) void Speech.stop();
  return setString(ENABLED_KEY, String(on));
};
export const getVoiceStyle = async (): Promise<VoiceStyle> => ((await getString(STYLE_KEY)) === "woman" ? "woman" : "girl");
export const setVoiceStyle = (s: VoiceStyle) => setString(STYLE_KEY, s);

/** Strip markdown and emoji so the voice reads naturally. */
export function cleanForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[*_`#>~]/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Sentence-sized pieces (about 180 chars), so the first one starts speaking right away. */
export function speechChunks(text: string): string[] {
  const sentences = cleanForSpeech(text).match(/[^.!?।]+[.!?।]*\s*/g) ?? [];
  const out: string[] = [];
  for (const s of sentences) {
    const last = out.length - 1;
    if (last >= 0 && out[last].length + s.length <= 180) out[last] += s;
    else out.push(s);
  }
  return out.map((c) => c.trim()).filter(Boolean);
}

export async function speak(text: string, bcp47 = "en-IN", style?: VoiceStyle, onDone?: () => void) {
  const s = style ?? (await getVoiceStyle());
  await Speech.stop();
  // One long utterance is synthesised whole before any sound; queued sentences start at once
  const chunks = speechChunks(text);
  if (!chunks.length) return onDone?.();
  chunks.forEach((chunk, i) => {
    const last = i === chunks.length - 1;
    Speech.speak(chunk, {
      language: bcp47,
      pitch: s === "girl" ? 1.15 : 1.0,
      rate: 0.95,
      onDone: last ? onDone : undefined,
      onStopped: onDone,
      onError: onDone,
    });
  });
}

export const stopSpeaking = () => Speech.stop();
