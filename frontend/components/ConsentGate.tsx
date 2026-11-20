"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Lock, Robot, DownloadSimple, Trash, Stethoscope } from "@phosphor-icons/react";
import { useLanguage } from "@/context/LanguageContext";

/**
 * First-use privacy consent. Shown over Her Mode / Mom Mode until the user (or
 * guest) accepts the current consent version. Explains what is stored, where,
 * the AI processing, and the user's export/delete rights.
 */
export default function ConsentGate() {
  const { t } = useLanguage();
  const [required, setRequired] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/consent", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(d => setRequired(Boolean(d?.required)))
      .catch(() => setRequired(false));
  }, []);

  if (!required) return null;

  const accept = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: true, aiProcessing }),
      });
      if (res.ok) setRequired(false);
    } finally {
      setSaving(false);
    }
  };

  const points = [
    { icon: Lock, text: t("consent.point1") },
    { icon: Robot, text: t("consent.point2") },
    { icon: Stethoscope, text: t("consent.point3") },
    { icon: DownloadSimple, text: t("consent.point4") },
    { icon: Trash, text: t("consent.point5") },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-plum-900/40 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="consent-title">
      <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl bg-cream border border-white/60 shadow-2xl p-6 sm:p-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-pink-100 text-pink-600">
          <ShieldCheck weight="duotone" className="w-7 h-7" />
        </div>
        <h2 id="consent-title" className="text-xl font-semibold text-center text-plum-900">{t("consent.title")}</h2>
        <p className="mt-1 text-sm text-center text-plum-900/60">{t("consent.subtitle")}</p>

        <ul className="mt-5 space-y-3">
          {points.map(({ icon: Icon, text }) => (
            <li key={text} className="flex gap-3 text-sm text-plum-900/80">
              <Icon weight="duotone" className="w-5 h-5 shrink-0 text-pink-500 mt-0.5" />
              <span>{text}</span>
            </li>
          ))}
        </ul>

        <label className="mt-5 flex items-start gap-3 rounded-2xl bg-white/70 border border-plum-900/10 p-3 text-sm text-plum-900/80 cursor-pointer">
          <input
            type="checkbox"
            checked={aiProcessing}
            onChange={e => setAiProcessing(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-pink-500"
          />
          <span>{t("consent.checkbox")}</span>
        </label>

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={accept}
            disabled={saving}
            className="w-full rounded-full bg-plum-900 text-white font-medium py-3 disabled:opacity-50 cursor-pointer"
          >
            {saving ? t("common.saving") : t("consent.agreeBtn")}
          </button>
          <a href="/" className="w-full text-center rounded-full py-2.5 text-sm text-plum-900/60 hover:text-plum-900">
            {t("consent.notNow")}
          </a>
        </div>
      </div>
    </div>
  );
}
