"use client";

import { useEffect, useState } from "react";
import { EyeSlash } from "@phosphor-icons/react";
import { DISCREET_CHANGED, disableDiscreet, enableDiscreet, checkPin, isDiscreet, validPin } from "@/lib/discreet";
import { useLanguage } from "@/context/LanguageContext";

/** Settings block: turn discreet mode on with a PIN, or off after confirming the PIN. */
export default function DiscreetSettings() {
  const { t } = useLanguage();
  const [on, setOn] = useState(false);
  const [step, setStep] = useState<"idle" | "set" | "off">("idle");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setOn(isDiscreet());
    sync();
    window.addEventListener(DISCREET_CHANGED, sync);
    return () => window.removeEventListener(DISCREET_CHANGED, sync);
  }, []);

  const close = () => { setStep("idle"); setPin(""); setConfirm(""); setError(null); };

  const turnOn = async () => {
    if (!validPin(pin)) return setError(t("settings.pinDigitsError"));
    if (pin !== confirm) return setError(t("settings.pinMismatchError"));
    await enableDiscreet(pin);
    close();
  };
  const turnOff = async () => {
    if (!(await checkPin(pin))) return setError(t("settings.pinWrongError"));
    disableDiscreet();
    close();
  };

  const field = "w-24 rounded-xl border border-black/10 bg-white px-3 py-2 text-center text-lg tracking-[0.4em] text-plum-900 focus:ring-2 focus:ring-pink-300 outline-none";
  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 4);

  return (
    <div>
      <h3 className="text-base sm:text-lg font-medium text-plum-900 flex items-center gap-2 mb-3 sm:mb-4">
        <EyeSlash weight="duotone" className="text-pink-500" /> {t("settings.discreetTitle")}
      </h3>
      <div className="p-3.5 sm:p-4 bg-gray-50 rounded-2xl border border-black/5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-sm sm:text-base text-plum-900">{t("settings.discreetMode")}</p>
            <p className="text-xs sm:text-sm text-plum-900/60">
              {t("settings.discreetDesc")}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={t("settings.discreetMode")}
            onClick={() => { setError(null); setPin(""); setConfirm(""); setStep(on ? "off" : "set"); }}
            className={`w-12 sm:w-14 h-7 sm:h-8 shrink-0 rounded-full p-1 transition-colors ${on ? "bg-pink-500" : "bg-gray-200"}`}
          >
            <div className={`w-5 sm:w-6 h-5 sm:h-6 rounded-full bg-white shadow-sm transition-transform ${on ? "translate-x-5 sm:translate-x-6" : "translate-x-0"}`} />
          </button>
        </div>

        {step === "set" && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs font-medium text-plum-900/70">{t("settings.pinNew")}
                <input type="password" inputMode="numeric" autoComplete="new-password" value={pin} onChange={e => setPin(digits(e.target.value))} className={`mt-1 block ${field}`} />
              </label>
              <label className="text-xs font-medium text-plum-900/70">{t("settings.pinConfirm")}
                <input type="password" inputMode="numeric" autoComplete="new-password" value={confirm} onChange={e => setConfirm(digits(e.target.value))} className={`mt-1 block ${field}`} />
              </label>
            </div>
            <p className="text-xs text-plum-900/55">{t("settings.pinNote")}</p>
            {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={close} className="rounded-xl px-3 py-2 text-sm font-medium text-plum-900/70 hover:bg-white">{t("common.cancel")}</button>
              <button type="button" onClick={turnOn} className="rounded-xl bg-pink-500 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-600">{t("settings.pinTurnOn")}</button>
            </div>
          </div>
        )}

        {step === "off" && (
          <div className="mt-4 space-y-3">
            <label className="text-xs font-medium text-plum-900/70">{t("settings.pinEnterOff")}
              <input type="password" inputMode="numeric" autoComplete="current-password" value={pin} onChange={e => setPin(digits(e.target.value))} className={`mt-1 block ${field}`} />
            </label>
            {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={close} className="rounded-xl px-3 py-2 text-sm font-medium text-plum-900/70 hover:bg-white">{t("common.cancel")}</button>
              <button type="button" onClick={turnOff} className="rounded-xl bg-plum-900 px-4 py-2 text-sm font-semibold text-cream hover:bg-plum-800">{t("settings.pinTurnOff")}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
