"use client";

import { useEffect, useState } from "react";
import { Printer, ArrowLeft, FirstAidKit, WarningCircle, ChatCircleText } from "@phosphor-icons/react";
import { useLanguage } from "@/context/LanguageContext";
import LanguageSelector from "@/components/LanguageSelector";

type Mode = "her" | "pregnancy";

const getLocale = (lang: string) => {
  const map: Record<string, string> = {
    en: "en-GB", ta: "ta-IN", hi: "hi-IN", te: "te-IN",
    ml: "ml-IN", kn: "kn-IN", bn: "bn-IN", mr: "mr-IN"
  };
  return map[lang] || "en-GB";
};

const fmtDate = (d?: string | null, lang = "en") =>
  d ? new Date(`${String(d).split("T")[0]}T00:00:00`).toLocaleDateString(getLocale(lang), { day: "numeric", month: "short", year: "numeric" }) : "—";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid mb-5">
      <h2 className="text-xs font-semibold text-plum-900/60 border-b border-plum-900/10 pb-1 mb-2">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-plum-900/10 px-3 py-2">
      <div className="text-[11px] text-plum-900/55">{label}</div>
      <div className="text-sm font-semibold text-plum-900">{value ?? "—"}</div>
    </div>
  );
}

function Screen({ title, data, detail, notScoredText, screeningAidText }: { title: string; data: any; detail?: string; notScoredText?: string; screeningAidText?: string }) {
  if (!data) return null;
  if (data.not_scored) {
    return (
      <div className="rounded-lg border border-plum-900/10 p-3 break-inside-avoid">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-plum-900">{title}</span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-plum-900/5 text-plum-900/60 border-plum-900/10">{notScoredText || "Not scored"}</span>
        </div>
        <p className="text-xs text-plum-900/70 mt-1">{data.reason}</p>
      </div>
    );
  }
  const level = data.risk_level || "—";
  const tone = level === "High" ? "bg-red-50 text-red-800 border-red-200" : level === "Moderate" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-emerald-50 text-emerald-800 border-emerald-200";
  return (
    <div className="rounded-lg border border-plum-900/10 p-3 break-inside-avoid">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-plum-900">{title}</span>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${tone}`}>{level}</span>
      </div>
      {detail && <p className="text-xs text-plum-900/70 mt-1">{detail}</p>}
      {(data.clinical_flags || []).length > 0 && (
        <ul className="mt-1 text-xs text-plum-900/80 list-disc pl-4">
          {data.clinical_flags.map((f: string) => <li key={f}>{f}</li>)}
        </ul>
      )}
      {data.model && (
        <p className="text-[10px] text-plum-900/45 mt-1">
          {data.model.name}; {data.model.dataset}, n={data.model.n}, AUC {data.model.roc_auc}. {screeningAidText || "Screening aid, not a diagnosis."}
        </p>
      )}
      {data.method && !data.model && <p className="text-[10px] text-plum-900/45 mt-1">Method: {data.method}</p>}
    </div>
  );
}

const List = ({ items, emptyText }: { items: { label: string; count: number }[]; emptyText?: string }) =>
  items.length ? (
    <p className="text-xs text-plum-900/80">{items.slice(0, 8).map(i => `${i.label} (${i.count})`).join(" · ")}</p>
  ) : (
    <p className="text-xs text-plum-900/50">{emptyText || "None recorded"}</p>
  );

export default function DoctorSummaryPage() {
  const { t, language } = useLanguage();
  const [mode, setMode] = useState<Mode>("her");
  const [days, setDays] = useState(90);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setMode(params.get("mode") === "pregnancy" ? "pregnancy" : "her");
    setDays(parseInt(params.get("days") || "90") || 90);
  }, []);

  useEffect(() => {
    setData(null);
    setError(null);
    fetch(`/api/doctor-summary?mode=${mode}&days=${days}`, { cache: "no-store" })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch(e => setError(String(e?.message || e)));
  }, [mode, days]);

  const back = mode === "pregnancy" ? "/pregnancy-mode" : "/her-mode";

  return (
    <div className="min-h-screen bg-cream print:bg-white py-6 px-4 print:p-0">
      <style>{`@media print { @page { size: A4; margin: 14mm; } .no-print { display: none !important; } }`}</style>

      <div className="no-print max-w-[210mm] mx-auto mb-4 flex flex-wrap items-center gap-3 justify-between">
        <a href={back} className="inline-flex items-center gap-1.5 text-sm text-plum-900/70 hover:text-plum-900">
          <ArrowLeft className="w-4 h-4" /> {t("common.backToDashboard")}
        </a>
        <div className="flex flex-wrap items-center gap-3">
          <LanguageSelector />
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="text-sm rounded-full border border-plum-900/15 bg-white px-3 py-1.5 cursor-pointer text-plum-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-400"
            aria-label="Summary period"
          >
            <option value={30}>{t("common.last30Days")}</option>
            <option value={90}>{t("common.last90Days")}</option>
            <option value={180}>{t("common.last6Months")}</option>
          </select>
          <button
            onClick={() => window.print()}
            disabled={!data}
            className="inline-flex items-center gap-2 rounded-full bg-plum-900 text-white text-sm font-medium px-4 py-2 disabled:opacity-40 cursor-pointer hover:bg-plum-800 transition-colors"
          >
            <Printer className="w-4 h-4" /> {t("common.printPdf")}
          </button>
        </div>
      </div>

      <article className="max-w-[210mm] mx-auto bg-white rounded-2xl print:rounded-none shadow-sm print:shadow-none border border-plum-900/10 print:border-0 p-6 sm:p-8 print:p-0 text-plum-900">
        <header className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 text-pink-600">
              <FirstAidKit weight="duotone" className="w-5 h-5" />
              <span className="text-xs font-semibold">{t("common.doctorVisitSummary")}</span>
            </div>
            <h1 className="text-2xl font-semibold mt-1">
              {mode === "pregnancy" ? (data?.postnatal ? t("doctor.postnatalTitle") : t("doctor.antenatalTitle")) : t("doctor.menstrualTitle")}
            </h1>
            {data && (
              <p className="text-sm text-plum-900/60">
                {data.patient.name} · {data.stats.checkIns} {t("doctor.checkIns")} · {fmtDate(data.period.from, language)} {t("common.to")} {fmtDate(data.period.to, language)}
              </p>
            )}
          </div>
          <div className="text-right text-[11px] text-plum-900/50">
            {t("doctor.generated")} {data ? fmtDate(data.generatedAt, language) : "…"}
            <br />{t("doctor.patientReported")}
          </div>
        </header>

        {error && <p className="text-sm text-red-700">{t("doctor.couldNotBuild")} ({error}).</p>}
        {!data && !error && <p className="text-sm text-plum-900/50">{t("doctor.buildingSummary")}</p>}

        {data?.kind === "her" && (
          <>
            <Section title={t("doctor.cycle")}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Stat label={t("doctor.lastPeriod")} value={fmtDate(data.cycle.lastPeriodStart, language)} />
                <Stat label={t("doctor.cycleLength")} value={data.cycle.prediction?.average_cycle_length ?? data.cycle.reportedCycleLength ? `${data.cycle.prediction?.average_cycle_length ?? data.cycle.reportedCycleLength} ${t("doctor.daysLabel")}` : null} />
                <Stat label={t("doctor.periodDuration")} value={data.cycle.reportedPeriodDuration ? `${data.cycle.reportedPeriodDuration} ${t("doctor.daysLabel")}` : null} />
                <Stat label={t("doctor.nextPeriodEst")} value={fmtDate(data.cycle.prediction?.next_period_date, language)} />
              </div>
              {data.cycle.history.length > 0 && (
                <p className="text-xs text-plum-900/70 mt-2">
                  {t("doctor.history")}: {data.cycle.history.map((h: any) => `${h.month}: ${h.cycleLength}d cycle / ${h.periodDuration}d bleed`).join(" · ")}
                </p>
              )}
              <p className="text-xs text-plum-900/70 mt-1">{t("doctor.regularity")}: {data.cycle.regularity || "—"} · {t("doctor.conditions")}: {data.patient.diagnosedConditions.length ? data.patient.diagnosedConditions.join(", ") : t("doctor.none")}</p>
            </Section>

            <Section title={t("doctor.symptomsPeriod")}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                <Stat label={t("doctor.avgCramps")} value={data.stats.avgCramps !== null ? `${data.stats.avgCramps}/10` : null} />
                <Stat label={t("doctor.worstCramps")} value={data.stats.maxCramps !== null ? `${data.stats.maxCramps}/10` : null} />
                <Stat label={t("doctor.heavyFlowDays")} value={data.stats.heavyDays} />
                <Stat label={t("doctor.bloodLoss")} value={data.stats.bloodLoss?.length ? data.stats.bloodLoss.map((p: any) => p.score).join(", ") + (data.stats.bloodLoss.some((p: any) => p.score > 100) ? " (over 100 = heavy)" : "") : null} />
                <Stat label={t("doctor.avgSleep")} value={data.stats.avgSleep !== null ? `${data.stats.avgSleep} h` : null} />
              </div>
              <p className="text-[11px] font-semibold text-plum-900/60">{t("doctor.mostSymptoms")}</p>
              <List items={data.stats.symptoms} emptyText={t("doctor.noneRecorded")} />
              <p className="text-[11px] font-semibold text-plum-900/60 mt-1">{t("doctor.flow")}</p>
              <List items={data.stats.flow} emptyText={t("doctor.noneRecorded")} />
              <p className="text-[11px] font-semibold text-plum-900/60 mt-1">{t("doctor.mood")}</p>
              <List items={data.stats.moods} emptyText={t("doctor.noneRecorded")} />
            </Section>

            {data.pcosPattern && data.pcosPattern.rows.some((r: any) => r.checkIns > 0) && (
              <Section title={t("doctor.monthByMonth")}>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-plum-900/50">
                      <th className="py-1 font-medium">{t("doctor.colMonth")}</th>
                      <th className="font-medium">{t("doctor.colPeriod")}</th>
                      <th className="font-medium">{t("doctor.colCycle")}</th>
                      <th className="font-medium">{t("doctor.colBleedDays")}</th>
                      <th className="font-medium">{t("doctor.colAcne")}</th>
                      <th className="font-medium">{t("doctor.colHairGrowth")}</th>
                      <th className="font-medium">{t("doctor.colHairLoss")}</th>
                      <th className="font-medium">{t("doctor.colWeight")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pcosPattern.rows.map((r: any) => (
                      <tr key={r.label} className="border-t border-plum-900/5">
                        <td className="py-1">{r.label}</td>
                        <td className={!r.periodStarted && r.checkIns >= 10 ? "font-bold text-red-700" : ""}>{r.periodStarted ? t("common.yes") : r.checkIns ? t("common.no") : "—"}</td>
                        <td className={r.cycleLength && (r.cycleLength > 35 || r.cycleLength < 21) ? "font-bold text-red-700" : ""}>{r.cycleLength ? `${r.cycleLength} d` : "—"}</td>
                        <td>{r.checkIns ? r.bleedDays : "—"}</td>
                        <td>{r.checkIns ? r.acneDays : "—"}</td>
                        <td>{r.checkIns ? r.hairGrowthDays : "—"}</td>
                        <td>{r.checkIns ? r.hairLossDays : "—"}</td>
                        <td>{r.weight ? `${r.weight} kg` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}

            <Section title={t("doctor.screeningResults")}>
              <div className="grid sm:grid-cols-2 gap-2">
                <Screen title={t("doctor.pcosCriteria")} data={data.screens.pcos} detail={data.screens.pcos?.next_step} notScoredText={t("doctor.notScored")} screeningAidText={t("doctor.screeningAid")} />
                <Screen title={t("doctor.thyroidScreen")} data={data.screens.thyroid} detail={data.screens.thyroid?.next_step} notScoredText={t("doctor.notScored")} screeningAidText={t("doctor.screeningAid")} />
              </div>
            </Section>
          </>
        )}

        {data?.kind === "pregnancy" && (
          <>
            {data.postnatal ? (
            <Section title={t("doctor.postnatalTitle")}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Stat label="Baby" value={[data.postnatal.babyName, data.postnatal.sex].filter(Boolean).join(", ") || "Baby"} />
                <Stat label="Born" value={`${fmtDate(data.postnatal.birthDate, language)} (${data.postnatal.age})`} />
                <Stat label="Delivery" value={data.postnatal.delivery} />
                <Stat label="Birth weight" value={data.postnatal.birthWeight ? `${data.postnatal.birthWeight} kg` : null} />
                <Stat label="Latest weight" value={data.postnatal.latestWeight ? `${data.postnatal.latestWeight.weight} kg (${fmtDate(data.postnatal.latestWeight.date, language)})` : null} />
                <Stat label="Weight for age" value={data.postnatal.latestWeight?.band || null} />
                <Stat label="Vaccine visits done" value={`${data.postnatal.vaccines.done} of ${data.postnatal.vaccines.total}`} />
                <Stat label="Next vaccines" value={data.postnatal.vaccines.next ? `${data.postnatal.vaccines.next.name}, ${fmtDate(data.postnatal.vaccines.next.date, language)}${data.postnatal.vaccines.next.overdue ? " (overdue)" : ""}` : "All done"} />
              </div>
              <p className="text-xs text-plum-900/70 mt-2">
                {data.postnatal.corrected ? `${data.postnatal.corrected}. ` : ""}Recovery check-ins in the last 2 weeks: {data.postnatal.recoveryChecks}. Known conditions: {data.patient.conditions.length ? data.patient.conditions.join(", ") : t("doctor.none")}
              </p>
            </Section>
            ) : (
            <Section title={t("doctor.antenatalTitle")}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Stat label={t("doctor.gestation")} value={data.patient.weeksPregnant ? `${data.patient.weeksPregnant} ${t("doctor.daysLabel")}` : null} />
                <Stat label={t("doctor.dueDate")} value={fmtDate(data.patient.dueDate, language)} />
                <Stat label={t("doctor.weightChange")} value={data.vitals.weightChange !== null ? `${data.vitals.weightChange > 0 ? "+" : ""}${data.vitals.weightChange} kg` : null} />
                <Stat label={t("doctor.babyKicks")} value={data.vitals.avgKicks !== null ? `${data.vitals.avgKicks} / ${data.vitals.minKicks}` : null} />
              </div>
              <p className="text-xs text-plum-900/70 mt-2">
                {data.patient.experience || ""}{data.patient.experience ? " · " : ""}{t("doctor.conditions")}: {data.patient.conditions.length ? data.patient.conditions.join(", ") : t("doctor.none")}
              </p>
            </Section>
            )}

            <Section title={t("doctor.bpGlucose")}>
              {data.vitals.bp.length === 0 && data.vitals.sugar.length === 0 ? (
                <p className="text-xs text-plum-900/50">{t("doctor.noneRecorded")}</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-plum-900/50">
                      <th className="py-1 font-medium">Date</th><th className="font-medium">BP (mmHg)</th><th className="font-medium">Glucose (mg/dL)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(new Set([...data.vitals.bp.map((b: any) => b.date), ...data.vitals.sugar.map((s: any) => s.date)]))
                      .sort().slice(-15).map((d: any) => {
                        const b = data.vitals.bp.find((x: any) => x.date === d);
                        const s = data.vitals.sugar.find((x: any) => x.date === d);
                        const highBp = b && (b.systolic >= 140 || b.diastolic >= 90);
                        return (
                          <tr key={d} className="border-t border-plum-900/5">
                            <td className="py-1">{fmtDate(d, language)}</td>
                            <td className={highBp ? "font-bold text-red-700" : ""}>{b ? `${b.systolic}/${b.diastolic}` : "—"}</td>
                            <td className={s && s.value >= 140 ? "font-bold text-red-700" : ""}>{s ? s.value : "—"}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </Section>

            <Section title={t("doctor.mostSymptoms")}>
              <List items={data.stats.symptoms} emptyText={t("doctor.noneRecorded")} />
            </Section>

            {!data.postnatal && (
            <Section title={t("doctor.screeningResults")}>
              <div className="grid sm:grid-cols-2 gap-2">
                <Screen title="Preeclampsia / hypertensive risk" data={data.screens.preeclampsia} notScoredText={t("doctor.notScored")} screeningAidText={t("doctor.screeningAid")} />
                <Screen title="Blood sugar risk" data={data.screens.gdm} detail="General diabetes model (trained on non-pregnant women) used as a guide; OGTT at 24 to 28 weeks diagnoses gestational diabetes." notScoredText={t("doctor.notScored")} screeningAidText={t("doctor.screeningAid")} />
              </div>
            </Section>
            )}

            {data.appointments.length > 0 && (
              <Section title={t("doctor.appointments")}>
                <p className="text-xs text-plum-900/80">
                  {data.appointments.map((a: any) => `${a.completed ? "✓" : "○"} ${a.name} (${fmtDate(a.date, language)})`).join(" · ")}
                </p>
              </Section>
            )}
          </>
        )}

        {data && (
          <>
            {data.labs?.length > 0 && (
              <Section title={t("doctor.labResults")}>
                <table className="w-full text-xs">
                  <tbody>
                    {data.labs.map((l: any) => (
                      <tr key={l.key} className="border-t border-plum-900/5 align-top">
                        <td className="py-1 pr-2 font-medium">{l.label}</td>
                        <td className={`pr-2 tabular-nums ${l.status === "attention" || l.status === "urgent" ? "font-bold text-red-700" : ""}`}>{l.value}</td>
                        <td className="pr-2 text-plum-900/60">{fmtDate(l.date, language)}</td>
                        <td className="text-plum-900/70">{l.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}

            {data.tablets && (
              <Section title={t("doctor.tabletsTaken", { days: String(data.tablets.days) })}>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-plum-900/50">
                      <th className="py-1 font-medium">Tablet</th><th className="font-medium">Schedule</th><th className="font-medium">On time</th><th className="font-medium">Late</th><th className="font-medium">Missed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tablets.rows.map((tRow: any) => (
                      <tr key={tRow.name} className="border-t border-plum-900/5">
                        <td className="py-1">{tRow.name}</td><td>{tRow.schedule}</td><td>{tRow.onTime}</td><td>{tRow.late}</td>
                        <td className={tRow.missed > 3 ? "font-bold text-red-700" : ""}>{tRow.missed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}

            <Section title={t("doctor.pointsToDiscuss")}>
              {data.flags.length > 0 && (
                <div className="flex gap-2 mb-2">
                  <WarningCircle weight="fill" className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <ul className="text-xs text-plum-900/85 list-disc pl-4">
                    {data.flags.map((f: string) => <li key={f}>{f}</li>)}
                  </ul>
                </div>
              )}
              <div className="flex gap-2">
                <ChatCircleText weight="fill" className="w-4 h-4 text-pink-600 shrink-0 mt-0.5" />
                <ul className="text-xs text-plum-900/85 list-disc pl-4">
                  {data.questions.map((q: string) => <li key={q}>{q}</li>)}
                </ul>
              </div>
            </Section>

            <footer className="text-[10px] text-plum-900/45 border-t border-plum-900/10 pt-2">
              {t("doctor.footerDisclaimer")}
            </footer>
          </>
        )}
      </article>
    </div>
  );
}
