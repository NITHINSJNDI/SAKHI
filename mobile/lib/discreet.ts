/**
 * Port of frontend/lib/discreet.ts, for a phone shared with family: a 4-digit
 * PIN lock on this device and reminders that don't say what they are about.
 * The PIN is stored only as a salted SHA-256 hash, as on the web. Signing
 * out clears it, which is also how a forgotten PIN is reset.
 */
import * as Crypto from "expo-crypto";

import { getString, setString } from "./storage";

const PIN_KEY = "sakhi_discreet_pin";
const SALT_KEY = "sakhi_discreet_salt";
const FLAG_KEY = "sakhi_discreet_on";

type Listener = () => void;
const listeners = new Set<Listener>();
export const onDiscreetChange = (l: Listener) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const notify = () => listeners.forEach((l) => l());

const lockListeners = new Set<Listener>();
export const onLockRequest = (l: Listener) => {
  lockListeners.add(l);
  return () => {
    lockListeners.delete(l);
  };
};
/** Lock the screen right now (the hide button in the header). */
export const lockNow = () => lockListeners.forEach((l) => l());

let cached = false;
export const isDiscreet = () => cached;
export async function loadDiscreet(): Promise<boolean> {
  cached = (await getString(FLAG_KEY)) === "1";
  return cached;
}

const hash = (pin: string, salt: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
export const validPin = (pin: string) => /^\d{4}$/.test(pin);

export async function enableDiscreet(pin: string) {
  if (!validPin(pin)) throw new Error("Use exactly 4 digits.");
  const salt = Array.from(Crypto.getRandomBytes(12)).map((b) => b.toString(16).padStart(2, "0")).join("");
  await setString(SALT_KEY, salt);
  await setString(PIN_KEY, await hash(pin, salt));
  await setString(FLAG_KEY, "1");
  cached = true;
  notify();
}

export async function disableDiscreet() {
  await setString(PIN_KEY, "");
  await setString(SALT_KEY, "");
  await setString(FLAG_KEY, "0");
  cached = false;
  notify();
}

export async function checkPin(pin: string) {
  const [stored, salt] = await Promise.all([getString(PIN_KEY), getString(SALT_KEY)]);
  return Boolean(stored && salt && (await hash(pin, salt)) === stored);
}

/** Reminder text that gives nothing away while discreet mode is on. */
export function discreetNotice(title: string, body: string) {
  return cached ? { title: "Reminder", body: "You have a reminder." } : { title, body };
}
