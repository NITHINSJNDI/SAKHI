/**
 * Port of frontend/components/Postpartum.tsx: baby-arrived switch, baby header,
 * feeds & nappies, the 6-week recovery check, vaccines, back-to-Her and the
 * postnatal visits.
 */
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ArrowCounterClockwise, Baby, Check, Drop, FirstAid, Flower, Syringe } from "phosphor-react-native";
import { useState } from "react";
import { Alert, View } from "react-native";

import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/ui";
import { DateField } from "@/components/web/DateField";
import { Bullet, CheckRow, Field, PillButton, ToggleChip } from "@/components/web/Atoms";
import { Panel, PanelTitle, ink } from "@/components/web/Panel";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { emitEmergency } from "@/lib/events";
import { useT } from "@/lib/i18n";
import { useMode } from "@/lib/mode";
import { UNDO_DAYS, VACCINES, VISITS, ageDays, babyAge, babyToday, checkRecovery, dueDate, nextVaccine, stageOf, type PostpartumDoc, type Recovery } from "@/lib/shared/postpartum";
import { TW } from "@/lib/tw";
import { dayKey } from "@/lib/useUserDoc";
import { fonts, palette } from "@/theme";

export interface PP {
  doc: PostpartumDoc;
  save: (next: PostpartumDoc | ((p: PostpartumDoc) => PostpartumDoc)) => Promise<boolean>;
  loaded: boolean;
}

const shortDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const fmtSince = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ""}`.trim());
const Small = ({ children, color = ink[60] }: { children: React.ReactNode; color?: string }) => <AppText style={{ fontSize: 12, lineHeight: 17, color }}>{children}</AppText>;
const Note = ({ children, bg, fg }: { children: React.ReactNode; bg: string; fg: string }) => (
  <View style={{ borderRadius: 16, padding: 14, backgroundColor: bg }}>
    <AppText style={{ fontSize: 14, lineHeight: 20, color: fg }}>{children}</AppText>
  </View>
);

/** "Baby has arrived": switches Mom Mode to after-birth care. */
export function BabyArrivedCard({ pp, compact = false }: { pp: PP; compact?: boolean }) {
  const today = dayKey();
  const [open, setOpen] = useState(!compact);
  const [date, setDate] = useState(today);
  const [name, setName] = useState("");
  const [delivery, setDelivery] = useState<"normal" | "csection">("normal");
  const [sex, setSex] = useState<"girl" | "boy" | null>(null);
  const [kg, setKg] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!date || date > today) return;
    const w = kg.trim() ? Number(kg.replace(",", ".")) : null;
    if (w !== null && !(w >= 0.5 && w <= 6)) return setError("Birth weight looks wrong. Enter it in kg, like 2.9.");
    setError(null);
    void pp.save((d) => ({
      ...d,
      birth_date: date,
      baby_name: name.trim().slice(0, 40) || undefined,
      delivery,
      sex: sex || undefined,
      vaccines_done: d.vaccines_done || [],
      growth: w !== null ? [{ date, weight: Math.round(w * 100) / 100 }] : [],
      milestones: {},
    }));
  };

  return (
    <Panel>
      <PanelTitle title="Has your baby arrived?" icon={Baby} iconColor={palette.blush500} right={!open ? <ToggleChip label="Yes, tell Sakhi" on={false} onPress={() => setOpen(true)} /> : undefined} />
      {open ? (
        <View style={{ marginTop: 14, gap: 14 }}>
          <DateField label="Date of birth" value={date} onChange={setDate} max={today} />
          <Field label="Baby's name (optional)" value={name} onChangeText={setName} maxLength={40} placeholder="You can add it later" />
          <View style={{ gap: 6 }}>
            <AppText style={{ fontSize: 14, fontWeight: "500", color: palette.plum900 }}>Delivery</AppText>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <ToggleChip label="Normal" on={delivery === "normal"} onPress={() => setDelivery("normal")} />
              <ToggleChip label="C-section" on={delivery === "csection"} onPress={() => setDelivery("csection")} />
            </View>
          </View>
          <View style={{ gap: 6 }}>
            <AppText style={{ fontSize: 14, fontWeight: "500", color: palette.plum900 }}>Baby is a (for the growth chart)</AppText>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <ToggleChip label="Girl" on={sex === "girl"} onPress={() => setSex(sex === "girl" ? null : "girl")} />
              <ToggleChip label="Boy" on={sex === "boy"} onPress={() => setSex(sex === "boy" ? null : "boy")} />
            </View>
          </View>
          <Field label="Birth weight (kg, optional)" value={kg} onChangeText={setKg} keyboardType="decimal-pad" placeholder="e.g. 2.9" />
          {error ? <Small color={TW.rose[700]}>{error}</Small> : null}
          <PillButton label="Switch to after-birth care" onPress={submit} />
          <Small>Sakhi will track feeds, your recovery and baby&apos;s vaccine dates. Your pregnancy records stay saved.</Small>
        </View>
      ) : null}
    </Panel>
  );
}

/** Top of Today after the birth: who, how old, and an undo. */
export function BabyHeader({ pp }: { pp: PP }) {
  const { doc } = pp;
  if (!doc.birth_date) return null;
  const today = dayKey();
  const days = Math.round((Date.parse(today) - Date.parse(doc.birth_date)) / 86_400_000);
  const stage = days <= 42 ? `Day ${days + 1} of your 6-week recovery` : days <= 182 ? "Recovery weeks done. Keep up feeds and vaccines." : "Growing up: vaccines, food and play";
  const undo = () =>
    Alert.alert("Back to pregnancy view?", "Baby's logs stay saved.", [
      { text: "Cancel", style: "cancel" },
      { text: "Go back", onPress: () => void pp.save((d) => ({ ...d, birth_date: undefined })) },
    ]);
  return (
    <Panel>
      <Small>{stage}</Small>
      <AppText style={{ marginTop: 4, fontSize: 26, lineHeight: 32, fontWeight: "600", letterSpacing: -0.5, color: palette.plum900 }}>
        {doc.baby_name || "Your baby"} is <AppText style={{ fontFamily: fonts.serifItalic, fontSize: 28, color: palette.blush500 }}>{babyAge(doc.birth_date, today)}</AppText>.
      </AppText>
      <AppText style={{ marginTop: 4, fontSize: 14, color: ink[60] }}>
        Born {shortDate(doc.birth_date)} · {doc.delivery === "csection" ? "C-section" : "Normal delivery"}
      </AppText>
      {days <= UNDO_DAYS ? (
        <PressableScale onPress={undo} style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40, alignSelf: "flex-start" }}>
          <ArrowCounterClockwise size={14} color={ink[60]} />
          <Small>Tapped by mistake? Back to pregnancy view</Small>
        </PressableScale>
      ) : null}
    </Panel>
  );
}

function Stat({ value, label, warn = false }: { value: number; label: string; warn?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: warn ? TW.amber[300] : ink[7], backgroundColor: warn ? TW.amber[50] : "rgba(255,255,255,0.8)" }}>
      <AppText style={{ fontSize: 24, fontWeight: "600", color: palette.plum900 }}>{value}</AppText>
      <AppText style={{ fontSize: 11, color: ink[60], textAlign: "center" }}>{label}</AppText>
    </View>
  );
}

/** One-tap feed and diaper log. */
export function NewbornCard({ pp }: { pp: PP }) {
  const { t: tr } = useT();
  const { doc, save } = pp;
  const [, tick] = useState(0);
  const now = new Date();
  const t = babyToday(doc, now);
  const days = doc.birth_date ? Math.round((Date.parse(dayKey()) - Date.parse(doc.birth_date)) / 86_400_000) : 0;
  const addFeed = (kind: "left" | "right" | "bottle") => {
    void save((d) => ({ ...d, feeds: [...d.feeds, { at: new Date().toISOString(), kind }].slice(-400) }));
    tick((x) => x + 1);
  };
  const addDiaper = (kind: "wet" | "dirty") => void save((d) => ({ ...d, diapers: [...d.diapers, { at: new Date().toISOString(), kind }].slice(-400) }));
  const undoLast = () =>
    void save((d) => {
      const lf = d.feeds[d.feeds.length - 1]?.at || "";
      const ld = d.diapers[d.diapers.length - 1]?.at || "";
      if (!lf && !ld) return d;
      return lf >= ld ? { ...d, feeds: d.feeds.slice(0, -1) } : { ...d, diapers: d.diapers.slice(0, -1) };
    });
  const wetGoal = days >= 5 ? 6 : Math.max(1, days + 1);
  const longGap = t.sinceMin !== null && t.sinceMin > 180 && days < 28;

  return (
    <Panel>
      <PanelTitle title={tr("mom.newbornTitle")} icon={Drop} iconColor={palette.lavender500} subtitle="Tap when a feed starts. Most newborns feed 8 to 12 times a day." />
      <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
        <Stat value={t.feeds} label="feeds today" />
        <Stat value={t.wet} label={`wet (aim ${wetGoal}+)`} warn={days >= 5 && t.wet < 6 && now.getHours() >= 20} />
        <Stat value={t.dirty} label="dirty" />
      </View>
      <AppText style={{ marginTop: 12, fontSize: 14, lineHeight: 20, color: longGap ? TW.amber[700] : ink[60] }} accessibilityLiveRegion="polite">
        {t.sinceMin === null ? "No feeds logged yet." : `Last feed ${fmtSince(t.sinceMin)} ago${t.lastFeed?.kind === "bottle" ? " (bottle)" : ` (${t.lastFeed?.kind} side)`}.`}
        {t.nextSide ? ` Next time, start on the ${t.nextSide}.` : ""}
        {longGap ? " Newborns shouldn't go more than 3 hours without a feed in the first weeks. Wake baby gently to feed." : ""}
      </AppText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        <ToggleChip label="Fed · left" on={t.nextSide === "left"} onPress={() => addFeed("left")} />
        <ToggleChip label="Fed · right" on={t.nextSide === "right"} onPress={() => addFeed("right")} />
        <ToggleChip label="Bottle" on={false} onPress={() => addFeed("bottle")} />
        <ToggleChip label="Wet nappy" on={false} onPress={() => addDiaper("wet")} />
        <ToggleChip label="Dirty nappy" on={false} onPress={() => addDiaper("dirty")} />
      </View>
      {doc.feeds.length > 0 || doc.diapers.length > 0 ? (
        <PressableScale onPress={undoLast} style={{ alignSelf: "flex-end", minHeight: 40, justifyContent: "center", paddingHorizontal: 6 }}>
          <Small>Undo last</Small>
        </PressableScale>
      ) : null}
      <View style={{ marginTop: 8 }}>
        <Small color={ink[45]}>See a doctor the same day if baby feeds poorly, is very sleepy, has a fever or feels cold, breathes fast, or the skin or eyes look yellow.</Small>
      </View>
    </Panel>
  );
}

const SIGNS: { key: keyof Recovery; label: string }[] = [
  { key: "fever", label: "Fever or chills" },
  { key: "smell", label: "Bad-smelling discharge" },
  { key: "breast", label: "Hard, red, painful breast" },
  { key: "wound", label: "Stitches red, leaking or very painful" },
  { key: "headache", label: "Bad headache or blurred vision" },
  { key: "calf", label: "Pain or swelling in one leg" },
  { key: "breathless", label: "Chest pain or hard to breathe" },
];
const BLEEDING: { v: Recovery["bleeding"]; label: string }[] = [
  { v: "none", label: "None" },
  { v: "light", label: "Light" },
  { v: "moderate", label: "Like a period" },
  { v: "heavy", label: "Pad soaked in 1 hour" },
  { v: "clots", label: "Big clots" },
];
const blank = (date: string): Recovery => ({ date, bleeding: "light", fever: false, pain: 2, breast: false, wound: false, headache: false, calf: false, breathless: false, smell: false });

/** Daily recovery check for the first 6 weeks, with the postnatal danger signs. */
export function RecoveryCard({ pp }: { pp: PP }) {
  const { t } = useT();
  const { doc, save } = pp;
  const today = dayKey();
  const saved = doc.recovery.find((r) => r.date === today);
  const [form, setForm] = useState<Recovery>(saved || blank(today));
  const [editing, setEditing] = useState(!saved);
  const result = saved ? checkRecovery(saved, doc.delivery) : null;

  const submit = () => {
    const entry = { ...form, date: today };
    void save((d) => ({ ...d, recovery: [...d.recovery.filter((r) => r.date !== today), entry].slice(-60) }));
    setEditing(false);
    const c = checkRecovery(entry, doc.delivery);
    if (c.level === "emergency") emitEmergency(c.alertReason);
  };

  return (
    <Panel>
      <PanelTitle
        title={t("mom.recoveryTitle")}
        icon={FirstAid}
        iconColor={palette.blush500}
        subtitle="A 30-second check each day for the first 6 weeks."
        right={
          saved && !editing ? (
            <PressableScale onPress={() => { setForm(saved); setEditing(true); }} style={{ minHeight: 40, justifyContent: "center" }}>
              <Small>Change</Small>
            </PressableScale>
          ) : undefined
        }
      />
      {editing ? (
        <View style={{ marginTop: 14, gap: 16 }}>
          <View style={{ gap: 8 }}>
            <AppText style={{ fontSize: 14, fontWeight: "500", color: palette.plum900 }}>Bleeding today</AppText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {BLEEDING.map((b) => (
                <ToggleChip key={b.v} label={b.label} on={form.bleeding === b.v} onPress={() => setForm((f) => ({ ...f, bleeding: b.v }))} />
              ))}
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <AppText style={{ fontSize: 14, fontWeight: "500", color: palette.plum900 }}>Pain</AppText>
              <AppText style={{ fontSize: 14, fontWeight: "500", color: palette.plum900 }}>{form.pain}/10</AppText>
            </View>
            <View style={{ flexDirection: "row", gap: 3 }}>
              {Array.from({ length: 11 }, (_, n) => (
                <PressableScale key={n} onPress={() => setForm((f) => ({ ...f, pain: n }))} scaleTo={0.9} accessibilityLabel={`Pain ${n} of 10`} accessibilityState={{ selected: form.pain === n }} style={{ flex: 1, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: form.pain === n ? palette.plum900 : n <= form.pain ? palette.lavender100 : "#fff", borderWidth: 1, borderColor: ink[10] }}>
                  <AppText style={{ fontSize: 12, fontWeight: "600", color: form.pain === n ? "#fff" : palette.plum900 }}>{n}</AppText>
                </PressableScale>
              ))}
            </View>
          </View>
          <View style={{ gap: 6 }}>
            <AppText style={{ fontSize: 14, fontWeight: "500", color: palette.plum900 }}>Any of these today?</AppText>
            {SIGNS.map((s) => (
              <CheckRow key={s.key} label={s.label} checked={Boolean(form[s.key])} onChange={(v) => setForm((f) => ({ ...f, [s.key]: v }))} />
            ))}
          </View>
          <PillButton label="Save today" onPress={submit} />
        </View>
      ) : result ? (
        <View
          accessibilityRole={result.level === "ok" ? undefined : "alert"}
          style={{ marginTop: 14, borderRadius: 16, padding: 14, gap: 4, backgroundColor: result.level === "emergency" ? TW.rose[50] : result.level === "doctor" ? TW.amber[50] : TW.emerald[50] }}
        >
          {(() => {
            const fg = result.level === "emergency" ? TW.rose[800] : result.level === "doctor" ? TW.amber[800] : TW.emerald[800];
            return (
              <>
                <AppText style={{ fontSize: 14, fontWeight: "600", color: fg }}>
                  {result.level === "emergency" ? "Go to hospital now, or call 108." : result.level === "doctor" ? "Please see your doctor or ANM today." : "Healing as expected today."}
                </AppText>
                {result.reasons.map((r) => (
                  <Bullet key={r} color={fg}>{r}</Bullet>
                ))}
                {result.level === "ok" ? <AppText style={{ fontSize: 14, lineHeight: 20, color: fg }}>Rest when baby sleeps, drink plenty of water, and keep taking your iron and calcium tablets.</AppText> : null}
              </>
            );
          })()}
        </View>
      ) : null}
    </Panel>
  );
}

function TickRow({ done, title, right, sub, onPress, warn }: { done: boolean; title: string; right: string; sub: string; onPress: () => void; warn?: boolean }) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={title}
      style={{ flexDirection: "row", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: warn ? TW.amber[300] : ink[7], backgroundColor: warn ? "rgba(255,251,235,0.6)" : "rgba(255,255,255,0.8)" }}
    >
      <View style={{ marginTop: 2, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: done ? TW.emerald[500] : "rgba(42,21,47,0.25)", backgroundColor: done ? TW.emerald[500] : "#fff" }}>
        {done ? <Check size={12} color="#fff" weight="bold" /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <AppText style={{ fontSize: 14, fontWeight: "600", color: palette.plum900 }}>{title}</AppText>
          <AppText style={{ fontSize: 13, color: warn ? TW.amber[800] : ink[60] }}>{right}</AppText>
        </View>
        <AppText style={{ marginTop: 2, fontSize: 12, lineHeight: 17, color: done ? ink[40] : ink[60], textDecorationLine: done ? "line-through" : "none" }}>{sub}</AppText>
      </View>
    </PressableScale>
  );
}

/** Baby's vaccines on India's Universal Immunisation Programme schedule. */
export function VaccineCard({ pp }: { pp: PP }) {
  const { t } = useT();
  const { doc, save } = pp;
  if (!doc.birth_date) return null;
  const birth = doc.birth_date;
  const next = nextVaccine(doc, dayKey());
  const toggle = (id: string) => void save((d) => ({ ...d, vaccines_done: d.vaccines_done.includes(id) ? d.vaccines_done.filter((x) => x !== id) : [...d.vaccines_done, id] }));
  return (
    <Panel>
      <PanelTitle title={t("mom.vaccinesTitle")} icon={Syringe} iconColor={palette.lavender500} subtitle="Free at every government health centre and Anganwadi under the Universal Immunisation Programme. Take the MCP card each time." />
      {next ? (
        <View style={{ marginTop: 14 }}>
          <Note bg={next.overdue ? TW.amber[50] : palette.lavender50} fg={next.overdue ? TW.amber[800] : palette.plum900}>
            {next.overdue ? `${next.due} vaccines are due since ${shortDate(next.date)}. It's fine to go late. Go this week and the schedule carries on from there.` : next.daysAway === 0 ? `${next.due} vaccines are due today.` : `Next: ${next.due} vaccines on ${shortDate(next.date)} (in ${next.daysAway} days).`}
          </Note>
        </View>
      ) : null}
      <View style={{ marginTop: 14, gap: 8 }}>
        {VACCINES.map((v) => (
          <TickRow key={v.id} done={doc.vaccines_done.includes(v.id)} title={v.due} right={shortDate(dueDate(birth, v.weeks))} sub={v.items} onPress={() => toggle(v.id)} />
        ))}
      </View>
    </Panel>
  );
}

/** From 6 weeks: periods coming back, family planning, and the way back to Her Mode. */
export function BackToHerCard({ pp, name }: { pp: PP; name: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { refreshSession } = useAuth();
  const { setMode } = useMode();
  const today = dayKey();
  const [answer, setAnswer] = useState<"yes" | "no" | null>(null);
  const [date, setDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const birth = pp.doc.birth_date;
  if (!birth) return null;
  const stage = stageOf(ageDays(birth, today));
  if (stage === "recovery") return null;

  const switchToHer = async () => {
    if (!date || date > today || date <= birth) return setError("Pick a date after the birth, up to today.");
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/update-profile", { method: "POST", body: JSON.stringify({ mode: "her", profile: { preferred_name: name, last_period_start: date, is_pregnancy_mode: false } }) });
      await apiFetch("/api/period-start", { method: "POST", body: JSON.stringify({ date, correction: true }) }).catch(() => null);
      await setMode("her");
      await refreshSession();
      await qc.invalidateQueries();
      router.replace("/her/today");
    } catch {
      setBusy(false);
      setError("Couldn't switch. Check your connection and try again.");
    }
  };

  return (
    <Panel>
      <PanelTitle
        title={stage === "done" ? "Ready to go back to Her Mode?" : "Have your periods come back?"}
        icon={Flower}
        iconColor={palette.blush500}
        subtitle={
          stage === "done"
            ? `${pp.doc.baby_name || "Your baby"} has had all the routine vaccines. Her Mode tracks your cycle and health again; your pregnancy and baby records stay saved.`
            : "Periods usually return 6 to 8 weeks after birth if you're not breastfeeding, and can take many months if you are. When they start, Sakhi switches back to tracking your cycle."
        }
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
        <ToggleChip label="Yes, my period came" on={answer === "yes"} onPress={() => setAnswer("yes")} />
        <ToggleChip label="Not yet" on={answer === "no"} onPress={() => setAnswer("no")} />
      </View>
      {answer === "yes" ? (
        <View style={{ marginTop: 14, gap: 12 }}>
          <DateField label="First day of this period" value={date} onChange={setDate} min={birth} max={today} />
          <PillButton label={busy ? "Switching…" : "Switch to Her Mode"} onPress={() => void switchToHer()} busy={busy} />
          {error ? <Small color={TW.rose[700]}>{error}</Small> : null}
        </View>
      ) : null}
      {answer === "no" ? (
        <View style={{ marginTop: 14 }}>
          <Note bg={palette.lavender50} fg={palette.plum900}>
            That&apos;s normal, especially while breastfeeding. You can get pregnant again before your first period returns, so talk to your ASHA or doctor about spacing. Copper-T (PPIUCD), Antara injections and Chhaya pills are free at government health centres.
          </Note>
        </View>
      ) : null}
    </Panel>
  );
}

/** After-birth check-ups in place of the pregnancy appointments. */
export function PostnatalVisitsCard({ pp }: { pp: PP }) {
  const { t } = useT();
  const { doc, save } = pp;
  if (!doc.birth_date) return null;
  const today = dayKey();
  const birth = doc.birth_date;
  const days = ageDays(birth, today);
  const done = doc.visits_done || [];
  const list = VISITS.map((v) => ({ ...v, date: dueDate(birth, v.days / 7), done: done.includes(v.id) })).filter((v) => v.days <= days + 120 || v.done);
  const toggle = (id: string) =>
    void save((d) => {
      const cur = d.visits_done || [];
      return { ...d, visits_done: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] };
    });
  return (
    <Panel>
      <PanelTitle title={t("mom.postnatalVisits")} icon={FirstAid} iconColor={palette.lavender500} subtitle="Your ASHA visits you and baby at home on these days, for free. If she hasn't come, call her or the sub-centre." />
      <View style={{ marginTop: 14, gap: 8 }}>
        {list.map((v) => {
          const overdue = !v.done && v.date < today;
          return <TickRow key={v.id} done={v.done} title={v.title} right={`${shortDate(v.date)}${overdue ? " · due" : ""}`} sub={v.what} warn={overdue} onPress={() => toggle(v.id)} />;
        })}
      </View>
    </Panel>
  );
}
