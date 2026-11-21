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

export async function speak(text: string, bcp47 = "en-IN", style?: VoiceStyle, onDone?: () => void) {
  const s = style ?? (await getVoiceStyle());
  await Speech.stop();
  Speech.speak(cleanForSpeech(text), {
    language: bcp47,
    pitch: s === "girl" ? 1.15 : 1.0,
    rate: 0.95,
    onDone,
    onStopped: onDone,
    onError: onDone,
  });
}

export const stopSpeaking = () => Speech.stop();
