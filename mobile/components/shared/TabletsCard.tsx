/**
 * Port of frontend/components/TabletsCard.tsx: tablets by time of day, tap to mark
 * taken, fix the time, streak, on-time rate, 14-day ledger, meal times, add/remove.
 * Mobile adds real daily phone reminders for each dose.
 */
import { CaretDown, Check, ClockCounterClockwise, CloudSun, Fire, Moon, PencilSimple, Pill, Plus, Sun, SunHorizon, Trash, type Icon } from "phosphor-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/ui";
import { atom, Field, InfoBox, PillButton, StatusBadge, ToggleChip } from "@/components/web/Atoms";
import { ink, Panel, PanelTitle } from "@/components/web/Panel";
import { TimeField } from "@/components/web/TimeField";
import { successHaptic } from "@/lib/haptics";
import { useT } from "@/lib/i18n";
import { setDailyReminders } from "@/lib/localReminders";
import {
  DEFAULT_MEALS,
  doseOf,
  doseState,
  EMPTY_TABLETS,
  fmtHm,
  fmtLate,
  FOOD_LABEL,
  ledger,
  normalise,
  ON_TIME_MIN,
  PATTERNS,
  patternOf,
  plannedDoses,
  setDose,
  SLOT_LABEL,
  SLOTS,
  streak,
  type DoseStatus,
  type Food,
  type Meals,
  type Slot,
  type Tablet,
  type TabletsDoc,
} from "@/lib/shared/tablets";
import { TW } from "@/lib/tw";
import { dayKey, useUserDoc } from "@/lib/useUserDoc";
import { palette } from "@/theme";

function pregnancyDefaults(weeks: number, since: string): Tablet[] {
  if (weeks < 13) return [{ id: "folic", name: "Folic acid (400 mcg)", note: "Protects baby's brain and spine.", slots: ["morning"], food: "after", since }];
  return [
    { id: "ifa", name: "Iron + folic acid (IFA)", note: "With lemon water. Not with tea, coffee or milk.", slots: ["night"], food: "after", since },
    { id: "calcium", name: "Calcium (2 tablets)", note: "Keep it 2 hours apart from iron.", slots: ["afternoon"], food: "after", since },
  ];
}

const SUGGEST: Omit<Tablet, "id" | "since">[] = [
  { name: "Iron tablet", note: "With lemon water, not with tea or milk.", slots: ["night"], food: "after" },
  { name: "Folic acid", note: "", slots: ["morning"], food: "after" },
  { name: "Vitamin D", note: "", slots: ["afternoon"], food: "with" },
  { name: "Thyroid tablet", note: "Wait 30 to 45 minutes before tea or breakfast.", slots: ["morning"], food: "empty" },
];
const SLOT_ICON: Record<Slot, Icon> = { morning: SunHorizon, afternoon: Sun, evening: CloudSun, night: Moon };
const FOODS: Food[] = ["before", "after", "with", "empty", "any"];
const nowHm = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const dayLabel = (day: string, today: string) => {
  if (day === today) return "Today";
  const d = new Date(day + "T00:00:00");
  const y = new Date(today + "T00:00:00");
  y.setDate(y.getDate() - 1);
  return d.toDateString() === y.toDateString() ? "Yesterday" : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
};
const CHIP: Record<DoseStatus, { bg: string; fg: string }> = {
  on_time: { bg: TW.emerald[100], fg: TW.emerald[800] },
  late: { bg: TW.amber[100], fg: TW.amber[800] },
  missed: { bg: TW.rose[100], fg: TW.rose[700] },
  overdue: { bg: TW.rose[50], fg: TW.rose[700] },
  due: { bg: ink[5], fg: "rgba(42,21,47,0.68)" },
  not_started: { bg: "transparent", fg: "transparent" },
};

export default function TabletsCard({ mode, weeks = 0 }: { mode: "her" | "pregnancy"; weeks?: number }) {
  const { t } = useT();
  const { doc, save, loaded } = useUserDoc<TabletsDoc>("tablets", EMPTY_TABLETS);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<{ name: string; slots: Slot[]; food: Food }>({ name: "", slots: ["morning"], food: "after" });
  const [editing, setEditing] = useState<string | null>(null);
  const [showLedger, setShowLedger] = useState(false);
  const [showMeals, setShowMeals] = useState(false);
  const [showList, setShowList] = useState(false);
  const [clock, setClock] = useState(nowHm());
  const today = dayKey();
  const meals: Meals = { ...DEFAULT_MEALS, ...(doc.meals || {}) };

  useEffect(() => {
    const id = setInterval(() => setClock(nowHm()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (loaded && mode === "pregnancy" && !doc.seeded && doc.list.length === 0) {
      void save({ ...doc, list: pregnancyDefaults(weeks, today), seeded: true });
    }
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const plan = useMemo(() => plannedDoses(doc), [doc]);
  const run = useMemo(() => streak(doc, today), [doc, today]);
  const book = useMemo(() => ledger(doc, today, clock, 14), [doc, today, clock]);

  // Daily phone reminder for every planned dose (replaces the previous set)
  useEffect(() => {
    if (!loaded) return;
    void setDailyReminders(
      "tablets",
      plan.map((p) => {
        const [h, m] = p.time.split(":").map(Number);
        const food = p.tablet.food !== "any" ? `, ${FOOD_LABEL[p.tablet.food].toLowerCase()}` : "";
        return { hour: h, minute: m, title: `${SLOT_LABEL[p.slot]} tablet: ${p.tablet.name}`, body: `Time to take it${food}.` };
      }),
    );
  }, [plan, loaded]);

  const take = (key: string) => {
    const was = doseOf(doc, today, key);
    void save((d) => setDose(d, today, key, doseOf(d, today, key) ? null : nowHm()));
    if (!was) successHaptic();
  };
  const retime = (key: string, at: string) => {
    if (at) void save((d) => setDose(d, today, key, at));
    setEditing(null);
  };
  const add = (tb: Omit<Tablet, "id" | "since">) => {
    if (!tb.name.trim() || !tb.slots.length) return;
    void save((d) => ({ ...d, seeded: true, list: [...d.list, { ...tb, name: tb.name.trim().slice(0, 60), id: `t${Date.now().toString(36)}`, since: today }] }));
    setAdding(false);
    setDraft({ name: "", slots: ["morning"], food: "after" });
  };
  const remove = (id: string) => void save((d) => ({ ...d, seeded: true, list: d.list.filter((x) => x.id !== id) }));
  const setMeal = (k: keyof Meals, v: string) => {
    if (v) void save((d) => ({ ...d, meals: { ...DEFAULT_MEALS, ...(d.meals || {}), [k]: v } }));
  };

  const todays = plan.filter((p) => !p.tablet.since || today >= p.tablet.since);
  const allDone = todays.length > 0 && todays.every((p) => doseOf(doc, today, p.key));
  const bySlot = SLOTS.map((slot) => ({ slot, doses: todays.filter((p) => p.slot === slot) })).filter((g) => g.doses.length);
  const list = doc.list.map(normalise);

  return (
    <Panel>
      <PanelTitle title={t("tablets.title")} subtitle={allDone ? t("tablets.allDone") : t("tablets.tapPrompt")} />
      {run > 0 || book.rate !== null ? (
        <View style={[atom.wrap, { marginTop: 8 }]}>
          {run > 0 ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, backgroundColor: TW.amber[50], paddingHorizontal: 12, paddingVertical: 6 }}>
              <Fire size={16} color={TW.amber[500]} weight="fill" />
              <AppText style={{ fontSize: 14, fontWeight: "600", color: TW.amber[800] }}>{t("tablets.streak", { days: run })}</AppText>
            </View>
          ) : null}
          {book.rate !== null ? <StatusBadge text={`${book.rate}% on time`} bg={TW.emerald[50]} fg={TW.emerald[800]} /> : null}
        </View>
      ) : null}

      {list.length === 0 && !adding ? (
        <InfoBox style={{ marginTop: 16, padding: 16 }}>
          <AppText style={atom.soft}>{t("tablets.emptyHint")}</AppText>
        </InfoBox>
      ) : null}

      <View style={{ marginTop: 16, gap: 16 }}>
        {bySlot.map(({ slot, doses }) => {
          const SlotIcon = SLOT_ICON[slot];
          return (
            <View key={slot} accessibilityLabel={SLOT_LABEL[slot]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <SlotIcon size={16} color={palette.lavender500} weight="duotone" />
                <AppText style={{ fontSize: 12, fontWeight: "600", color: ink[65] }}>{SLOT_LABEL[slot]}</AppText>
              </View>
              <View style={{ gap: 8 }}>
                {doses.map((p) => {
                  const st = doseState(doc, p, today, today, clock);
                  const taken = st.status === "on_time" || st.status === "late";
                  const food = p.tablet.food !== "any" ? FOOD_LABEL[p.tablet.food] : null;
                  const beforeFood = p.tablet.food === "before" || p.tablet.food === "empty";
                  return (
                    <View key={p.key} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <PressableScale
                        haptic={false}
                        onPress={() => take(p.key)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: taken }}
                        scaleTo={0.98}
                        style={{
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          borderRadius: 16,
                          borderWidth: 1,
                          padding: 12,
                          minHeight: 60,
                          borderColor: taken ? TW.emerald[200] : st.status === "overdue" ? TW.rose[200] : "rgba(42,21,47,0.08)",
                          backgroundColor: taken ? TW.emerald[50] : st.status === "overdue" ? "rgba(255,241,242,0.6)" : "rgba(255,255,255,0.8)",
                        }}
                      >
                        <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: taken ? TW.emerald[500] : palette.lavender100 }}>
                          {taken ? <Check size={16} color="#fff" weight="bold" /> : <Pill size={16} color={palette.lavender600} weight="duotone" />}
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                            <AppText style={{ fontSize: 14, fontWeight: "600", color: taken ? "#064E3B" : palette.plum900 }}>{p.tablet.name}</AppText>
                            {food ? (
                              <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: beforeFood ? TW.sky[100] : TW.orange[100] }}>
                                <AppText style={{ fontSize: 10, fontWeight: "600", color: beforeFood ? "#075985" : "#9A3412" }}>{food}</AppText>
                              </View>
                            ) : null}
                          </View>
                          <AppText style={atom.small}>
                            {taken
                              ? `Taken at ${fmtHm(st.at) || "an unknown time"}${st.status === "late" ? ` · ${fmtLate(st.lateBy)}` : ""}`
                              : `Due ${fmtHm(p.time)}${st.status === "overdue" ? " · overdue" : ""}${p.tablet.note ? ` · ${p.tablet.note}` : ""}`}
                          </AppText>
                        </View>
                      </PressableScale>
                      {taken ? (
                        editing === p.key ? (
                          <TimeField value={st.at || clock} onChange={(hm) => retime(p.key, hm)} compact />
                        ) : (
                          <Pressable onPress={() => setEditing(p.key)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Change the time you took ${p.tablet.name}`} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
                            <ClockCounterClockwise size={18} color={ink[40]} />
                          </Pressable>
                        )
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>

      {list.length > 0 ? (
        <View style={{ marginTop: 16 }}>
          <Pressable onPress={() => setShowList((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: showList }} style={{ minHeight: 36, justifyContent: "center" }}>
            <AppText style={{ fontSize: 12, fontWeight: "500", color: "rgba(42,21,47,0.68)" }}>Your tablets ({list.length}) · manage</AppText>
          </Pressable>
          {showList ? (
            <View style={{ marginTop: 8, gap: 6 }}>
              {list.map((tb) => (
                <View key={tb.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.6)", paddingHorizontal: 12, paddingVertical: 8 }}>
                  <AppText style={{ flex: 1, fontSize: 14, color: palette.plum900 }}>
                    <AppText style={{ fontSize: 14, fontWeight: "500" }}>{tb.name}</AppText>
                    <AppText style={atom.small}> · {patternOf(tb.slots) ?? tb.slots.map((sl) => SLOT_LABEL[sl]).join(", ")} · {FOOD_LABEL[tb.food]}</AppText>
                  </AppText>
                  <Pressable onPress={() => remove(tb.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${tb.name}`} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
                    <Trash size={16} color={ink[40]} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {adding ? (
        <View style={{ marginTop: 12, gap: 12, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.7)", padding: 14 }}>
          <View style={atom.wrap}>
            {SUGGEST.filter((sg) => !list.some((x) => x.name === sg.name)).map((sg) => (
              <PressableScale key={sg.name} onPress={() => add(sg)} scaleTo={0.95} style={{ borderRadius: 999, borderWidth: 1, borderColor: palette.lavender200, backgroundColor: palette.lavender50, paddingHorizontal: 12, minHeight: 36, justifyContent: "center" }}>
                <AppText style={{ fontSize: 12, fontWeight: "500", color: palette.lavender600 }}>+ {sg.name}</AppText>
              </PressableScale>
            ))}
          </View>
          <Field label="Tablet name" value={draft.name} onChangeText={(v) => setDraft((d) => ({ ...d, name: v }))} placeholder="e.g. Calcium, Metformin 500" />
          <View style={{ gap: 6 }}>
            <AppText style={{ fontSize: 12, fontWeight: "500", color: ink[70] }}>When (as on the prescription)</AppText>
            <View style={atom.wrap}>
              {PATTERNS.map((pt) => (
                <ToggleChip key={pt.code} label={pt.code} on={patternOf(draft.slots) === pt.code} onPress={() => setDraft((d) => ({ ...d, slots: pt.slots }))} />
              ))}
            </View>
            <View style={atom.wrap}>
              {SLOTS.map((sl) => {
                const on = draft.slots.includes(sl);
                return (
                  <ToggleChip
                    key={sl}
                    label={SLOT_LABEL[sl]}
                    on={on}
                    onPress={() => setDraft((d) => ({ ...d, slots: on ? d.slots.filter((x) => x !== sl) : SLOTS.filter((x) => x === sl || d.slots.includes(x)) }))}
                  />
                );
              })}
            </View>
          </View>
          <View style={{ gap: 6 }}>
            <AppText style={{ fontSize: 12, fontWeight: "500", color: ink[70] }}>Food</AppText>
            <View style={atom.wrap}>
              {FOODS.map((f) => (
                <ToggleChip key={f} label={FOOD_LABEL[f]} on={draft.food === f} onPress={() => setDraft((d) => ({ ...d, food: f }))} />
              ))}
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <PillButton label="Add tablet" onPress={() => add({ name: draft.name, note: "", slots: draft.slots, food: draft.food })} disabled={!draft.name.trim() || !draft.slots.length} />
            <PillButton label="Cancel" variant="ghost" onPress={() => setAdding(false)} />
          </View>
        </View>
      ) : (
        <View style={{ marginTop: 12, gap: 8 }}>
          <Pressable onPress={() => setAdding(true)} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40 }}>
            <Plus size={16} color={palette.lavender600} />
            <AppText style={{ fontSize: 14, fontWeight: "500", color: palette.lavender600 }}>{t("tablets.addTablet")}</AppText>
          </Pressable>
          <Pressable onPress={() => setShowMeals((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: showMeals }} style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36 }}>
            <PencilSimple size={14} color="rgba(42,21,47,0.68)" />
            <AppText style={[atom.small, { flex: 1 }]}>
              {t("tablets.mealTimes")}: breakfast {fmtHm(meals.breakfast)}, lunch {fmtHm(meals.lunch)}, dinner {fmtHm(meals.dinner)}
            </AppText>
          </Pressable>
        </View>
      )}

      {showMeals && !adding ? (
        <View style={{ marginTop: 12, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.7)", padding: 12, gap: 8 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(
              [
                ["breakfast", "Breakfast"],
                ["lunch", "Lunch"],
                ["snack", "Evening tea"],
                ["dinner", "Dinner"],
              ] as [keyof Meals, string][]
            ).map(([k, label]) => (
              <View key={k} style={{ flexBasis: "47%", flexGrow: 1 }}>
                <TimeField label={label} value={meals[k]} onChange={(v) => setMeal(k, v)} />
              </View>
            ))}
          </View>
          <AppText style={atom.faint}>Before food is 30 minutes before the meal, after food 30 minutes after, empty stomach 45 minutes before breakfast.</AppText>
        </View>
      ) : null}

      {plan.length > 0 ? (
        <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: ink[7], paddingTop: 16 }}>
          <Pressable onPress={() => setShowLedger((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: showLedger }} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <AppText style={atom.strong}>Intake ledger, last 14 days</AppText>
              <AppText style={atom.small}>
                {book.onTime} on time · {book.late} late · {book.missed} missed. On time means within {ON_TIME_MIN} minutes.
              </AppText>
            </View>
            <CaretDown size={16} color={ink[50]} style={{ transform: [{ rotate: showLedger ? "180deg" : "0deg" }] }} />
          </Pressable>
          {showLedger ? (
            <View style={{ marginTop: 12 }}>
              {book.rows.map((r) => {
                const shown = r.doses.filter((d) => d.status !== "not_started");
                if (!shown.length) return null;
                return (
                  <View key={r.day} style={{ paddingVertical: 10, gap: 6, borderBottomWidth: 1, borderBottomColor: "rgba(42,21,47,0.06)" }}>
                    <AppText style={{ fontSize: 12, fontWeight: "600", color: ink[70] }}>{dayLabel(r.day, today)}</AppText>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      {shown.map((d) => (
                        <View key={d.key} style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: CHIP[d.status].bg }}>
                          <AppText style={{ fontSize: 11, fontWeight: "500", color: CHIP[d.status].fg }}>
                            {d.tablet.name.split(" (")[0]} ({SLOT_LABEL[d.slot].toLowerCase()}):{" "}
                            {d.status === "on_time"
                              ? `${fmtHm(d.at) || "taken"}, on time`
                              : d.status === "late"
                                ? `${fmtHm(d.at)}, ${fmtLate(d.lateBy)}`
                                : d.status === "missed"
                                  ? "missed"
                                  : d.status === "overdue"
                                    ? "not taken yet"
                                    : `due ${fmtHm(d.time)}`}
                          </AppText>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}
      <AppText style={[atom.faint, { marginTop: 12 }]}>
        You can also tell Sakhi “took my iron tablet after dinner”.{mode === "pregnancy" ? " Follow your doctor if they prescribed a different dose." : ""}
      </AppText>
    </Panel>
  );
}
