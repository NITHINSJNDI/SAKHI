/** Port of frontend/components/MealsCard.tsx: food log in servings, turned into nutrients. */
import { BowlFood, Drop, Minus, Plus } from "phosphor-react-native";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";

import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/ui";
import { Panel, PanelTitle, ink } from "@/components/web/Panel";
import { chartBus } from "@/lib/events";
import { useT } from "@/lib/i18n";
import { EMPTY_MEALS, FOODS, FOOD_BY_ID, GROUP_LABEL, NUTRIENT_LABEL, TARGETS, WATER_GLASSES, addItems, groupsEaten, suggestions, totals, type FoodGroup, type MealsDoc, type Nutrient, type Stage } from "@/lib/shared/meals";
import { TW } from "@/lib/tw";
import { dayKey, useUserDoc } from "@/lib/useUserDoc";
import { palette } from "@/theme";

const ORDER: Nutrient[] = ["protein", "iron", "calcium", "folate", "kcal"];
const ALL_GROUPS = Object.keys(GROUP_LABEL) as FoodGroup[];
const STAGE_NOTE: Record<Stage, string> = {
  not_pregnant: "Targets for an active woman",
  trimester1: "Targets for the first trimester",
  trimester2: "Targets for the second trimester",
  trimester3: "Targets for the third trimester",
  lactating: "Targets while breastfeeding",
};
const daysAgo = (i: number) => dayKey(new Date(Date.now() - i * 86_400_000));
const QUICK = ["roti", "rice", "dal", "greens", "sabzi", "milk", "curd", "egg", "fruit", "nuts", "ragi", "chana"];

function Round({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} scaleTo={0.9} style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.9)", borderWidth: 1, borderColor: ink[10] }}>
      {children}
    </PressableScale>
  );
}

export default function MealsCard({ stage }: { stage: Stage }) {
  const { t: tr } = useT();
  const { doc, save, reload } = useUserDoc<MealsDoc>("meals", EMPTY_MEALS);
  const [showAll, setShowAll] = useState(false);
  const today = dayKey();
  const day = doc.days?.[today];
  const t = totals(day);
  const target = TARGETS[stage];
  const groups = groupsEaten(day);
  const tip = suggestions(day, stage, 3);
  const waterGoal = WATER_GLASSES[stage];
  const pregnant = stage.startsWith("trimester");

  // Food mentioned in chat appears here straight away
  useEffect(() => chartBus.on((d) => d?.type === "meals_update" && reload()), [reload]);

  const week = useMemo(() => {
    const out: { date: string; groups: number; logged: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = daysAgo(i);
      const dd = doc.days?.[d];
      out.push({ date: d, groups: groupsEaten(dd).length, logged: Boolean(dd?.items.length) });
    }
    return out;
  }, [doc]);

  const change = (id: string, qty: number) => void save((d) => addItems(d.days ? d : EMPTY_MEALS, today, [{ id, qty }]));
  const water = (n: number) => void save((d) => addItems(d.days ? d : EMPTY_MEALS, today, [], n));
  const quick = showAll ? FOODS : FOODS.filter((f) => QUICK.includes(f.id));

  return (
    <Panel>
      <PanelTitle title={tr("mom.mealsTitle")} icon={BowlFood} iconColor={palette.blush500} subtitle={`${STAGE_NOTE[stage]} (ICMR-NIN). Tap a food each time you eat a serving, or tell Sakhi “had 2 roti, dal and curd for lunch”.`} />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }} accessibilityLabel="Add a serving">
        {quick.map((f) => (
          <PressableScale key={f.id} onPress={() => change(f.id, 1)} scaleTo={0.95} accessibilityLabel={`Add ${f.name}, ${f.serving}`} style={{ flexDirection: "row", alignItems: "center", gap: 4, minHeight: 40, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: "rgba(42,21,47,0.12)", backgroundColor: "#fff" }}>
            <Plus size={13} color={ink[50]} />
            <AppText style={{ fontSize: 14, color: palette.plum900 }}>{f.name}</AppText>
          </PressableScale>
        ))}
        <PressableScale onPress={() => setShowAll((s) => !s)} style={{ minHeight: 40, justifyContent: "center", paddingHorizontal: 6 }}>
          <AppText style={{ fontSize: 13, fontWeight: "500", color: palette.lavender600, textDecorationLine: "underline" }}>{showAll ? "Fewer foods" : "More foods"}</AppText>
        </PressableScale>
      </View>

      {day?.items.length ? (
        <View style={{ marginTop: 14, borderRadius: 16, borderWidth: 1, borderColor: ink[7], backgroundColor: "rgba(255,255,255,0.8)" }}>
          {day.items.map((it, i) => {
            const f = FOOD_BY_ID[it.id];
            if (!f) return null;
            return (
              <View key={it.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderTopWidth: i ? 1 : 0, borderTopColor: ink[5] }}>
                <View style={{ flex: 1 }}>
                  <AppText style={{ fontSize: 14, color: palette.plum900 }}>{f.name}</AppText>
                  <AppText style={{ fontSize: 11, color: ink[45] }}>{f.serving}</AppText>
                </View>
                <Round label={`One less ${f.name}`} onPress={() => change(it.id, -1)}><Minus size={14} color={palette.plum900} /></Round>
                <AppText style={{ width: 24, textAlign: "center", fontSize: 14, fontWeight: "600", color: palette.plum900 }}>{it.qty}</AppText>
                <Round label={`One more ${f.name}`} onPress={() => change(it.id, 1)}><Plus size={14} color={palette.plum900} /></Round>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={{ marginTop: 14, borderRadius: 16, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(42,21,47,0.15)", padding: 14 }}>
          <AppText style={{ fontSize: 14, color: ink[60] }}>Nothing logged yet today.</AppText>
        </View>
      )}

      <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 16, backgroundColor: "rgba(245,240,255,0.7)", paddingHorizontal: 14, paddingVertical: 6 }}>
        <Drop size={16} color={TW.sky[500]} weight="fill" />
        <AppText style={{ flex: 1, fontSize: 14, color: palette.plum900 }}>
          Water <AppText style={{ fontSize: 14, color: ink[60] }}>· aim {waterGoal} glasses</AppText>
        </AppText>
        <Round label="One glass less" onPress={() => water(-1)}><Minus size={14} color={palette.plum900} /></Round>
        <AppText style={{ width: 24, textAlign: "center", fontSize: 14, fontWeight: "600", color: palette.plum900 }} accessibilityLiveRegion="polite">{day?.water || 0}</AppText>
        <Round label="One more glass" onPress={() => water(1)}><Plus size={14} color={palette.plum900} /></Round>
      </View>

      <View style={{ marginTop: 18, gap: 12 }}>
        {ORDER.map((k) => {
          const pct = Math.min(100, Math.round((t[k] / target[k]) * 100));
          const amount = k === "iron" ? t[k].toFixed(1) : Math.round(t[k]);
          return (
            <View key={k}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <AppText style={{ fontSize: 14, fontWeight: "500", color: palette.plum900 }}>{NUTRIENT_LABEL[k].name}</AppText>
                <AppText style={{ fontSize: 13, color: ink[60] }}>{amount} / {target[k]} {NUTRIENT_LABEL[k].unit}</AppText>
              </View>
              <View style={{ height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: ink[7] }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }} accessibilityLabel={`${NUTRIENT_LABEL[k].name} ${pct}% of today's target`}>
                <View style={{ width: `${pct}%`, height: 8, borderRadius: 4, backgroundColor: pct >= 90 ? TW.emerald[500] : pct >= 50 ? TW.amber[400] : TW.rose[400] }} />
              </View>
            </View>
          );
        })}
      </View>

      <View style={{ marginTop: 18 }}>
        <AppText style={{ fontSize: 14, fontWeight: "500", color: palette.plum900, marginBottom: 8 }}>
          Food groups today: {groups.length} of 10 <AppText style={{ fontSize: 14, color: ink[60] }}>· {groups.length >= 5 ? "a varied day" : "aim for 5 or more"}</AppText>
        </AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {ALL_GROUPS.map((g) => {
            const on = groups.includes(g);
            return (
              <View key={g} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: on ? TW.emerald[100] : ink[5] }}>
                <AppText style={{ fontSize: 11, fontWeight: "500", color: on ? TW.emerald[800] : ink[45] }}>{GROUP_LABEL[g]}</AppText>
              </View>
            );
          })}
        </View>
      </View>

      {tip && day?.items.length ? (
        <View style={{ marginTop: 14, borderRadius: 16, backgroundColor: TW.amber[50], padding: 14 }}>
          <AppText style={{ fontSize: 14, lineHeight: 20, color: "#78350F" }}>
            Low on {NUTRIENT_LABEL[tip.nutrient].name.toLowerCase()} today. Try {tip.foods.map((f) => f.name.toLowerCase()).join(", ")}.
          </AppText>
        </View>
      ) : null}

      <View style={{ marginTop: 18 }}>
        <AppText style={{ fontSize: 12, fontWeight: "500", color: ink[60], marginBottom: 8 }}>Last 7 days: food groups per day</AppText>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, height: 60 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {week.map((w) => (
            <View key={w.date} style={{ flex: 1, alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
              <View style={{ width: "100%", height: Math.max(4, w.groups * 4), borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: w.groups >= 5 ? TW.emerald[400] : w.logged ? TW.amber[300] : ink[7] }} />
              <AppText style={{ fontSize: 10, color: ink[45] }}>{new Date(w.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "narrow" })}</AppText>
            </View>
          ))}
        </View>
      </View>

      <AppText style={{ marginTop: 16, fontSize: 12, lineHeight: 17, color: ink[45] }}>
        Amounts are estimates from typical Indian servings (IFCT 2017).
        {pregnant || stage === "lactating" ? " Food alone rarely gives enough iron and calcium now, so keep taking the IFA and calcium tablets your doctor gave you." : ""}
      </AppText>
    </Panel>
  );
}
