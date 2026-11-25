/** Port of frontend/components/MilestonesCard.tsx. */
import { CaretDown, CaretUp, Check, Footprints } from "phosphor-react-native";
import { useState } from "react";
import { View } from "react-native";

import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/ui";
import { Panel, PanelTitle, ink } from "@/components/web/Panel";
import { useT } from "@/lib/i18n";
import { monthsOld } from "@/lib/shared/babyGrowth";
import { AREA_LABEL, milestoneView, type MilestoneView } from "@/lib/shared/milestones";
import { effectiveAgeStart } from "@/lib/shared/postpartum";
import { TW } from "@/lib/tw";
import { dayKey } from "@/lib/useUserDoc";
import { palette } from "@/theme";

import type { PP } from "./Postpartum";

const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const ageText = (m: number) => (m < 1 ? "the first month" : m < 2 ? "about 6 weeks" : `about ${Math.round(m)} months`);

export default function MilestonesCard({ pp, dueDate }: { pp: PP; dueDate?: string | null }) {
  const { t } = useT();
  const [showDone, setShowDone] = useState(false);
  const { doc, save } = pp;
  if (!doc.birth_date) return null;
  const today = dayKey();
  const age = effectiveAgeStart(doc.birth_date, dueDate);
  const view = milestoneView(monthsOld(age.from, today), doc.milestones || {});
  const late = view.filter((v) => v.state === "late");
  const current = view.filter((v) => v.state === "now" || v.state === "soon");
  const done = view.filter((v) => v.state === "done");
  const mark = (id: string, on: boolean) =>
    void save((d) => {
      const next = { ...(d.milestones || {}) };
      if (on) next[id] = today;
      else delete next[id];
      return { ...d, milestones: next };
    });

  const Row = ({ m }: { m: MilestoneView }) => (
    <PressableScale
      onPress={() => mark(m.id, !m.done)}
      scaleTo={0.98}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: Boolean(m.done) }}
      accessibilityLabel={m.text}
      style={{ flexDirection: "row", gap: 12, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: ink[7], backgroundColor: "rgba(255,255,255,0.8)" }}
    >
      <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: m.done ? TW.emerald[500] : "rgba(42,21,47,0.25)", backgroundColor: m.done ? TW.emerald[500] : "#fff" }}>
        {m.done ? <Check size={13} color="#fff" weight="bold" /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={{ fontSize: 14, color: m.done ? ink[60] : palette.plum900 }}>{m.text}</AppText>
        <AppText style={{ fontSize: 11, color: ink[45] }}>
          {AREA_LABEL[m.area]} · {m.done ? `since ${fmt(m.done)}` : `most babies by ${ageText(m.typical)}`}
        </AppText>
      </View>
    </PressableScale>
  );

  return (
    <Panel>
      <PanelTitle
        title={t("mom.milestonesTitle")}
        icon={Footprints}
        iconColor={palette.lavender500}
        subtitle={`Tick each one the first time you see it. Every baby goes at their own pace.${age.corrected ? " Sakhi counts age from the due date because baby was born early." : ""}`}
      />
      {late.length ? (
        <View style={{ marginTop: 14, padding: 14, borderRadius: 16, backgroundColor: TW.amber[50], gap: 8 }} accessibilityRole="alert">
          <AppText style={{ fontSize: 14, fontWeight: "600", color: "#78350F" }}>{t("pregnancy.worthAskingDoctor")}</AppText>
          <AppText style={{ fontSize: 14, lineHeight: 20, color: "#78350F" }}>Most babies do these by now. It may be nothing, but checking early helps: ask your doctor, or the RBSK team about the free District Early Intervention Centre.</AppText>
          {late.map((m) => (
            <Row key={m.id} m={m} />
          ))}
        </View>
      ) : null}
      {current.length ? (
        <View style={{ marginTop: 14, gap: 8 }}>
          <AppText style={{ fontSize: 14, fontWeight: "500", color: palette.plum900 }}>{t("pregnancy.nowAndComingUp")}</AppText>
          {current.map((m) => (
            <Row key={m.id} m={m} />
          ))}
        </View>
      ) : late.length === 0 ? (
        <AppText style={{ marginTop: 14, fontSize: 14, color: ink[60] }}>{t("pregnancy.nothingNewNow")}</AppText>
      ) : null}
      {done.length ? (
        <View style={{ marginTop: 12 }}>
          <PressableScale onPress={() => setShowDone((v) => !v)} style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40 }} accessibilityRole="button" accessibilityState={{ expanded: showDone }}>
            <AppText style={{ fontSize: 14, color: ink[60] }}>Done ({done.length})</AppText>
            {showDone ? <CaretUp size={14} color={ink[60]} /> : <CaretDown size={14} color={ink[60]} />}
          </PressableScale>
          {showDone ? (
            <View style={{ gap: 8 }}>
              {done.map((m) => (
                <Row key={m.id} m={m} />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
      <AppText style={{ marginTop: 12, fontSize: 12, lineHeight: 17, color: ink[45] }}>
        See a doctor soon, at any age, if baby stops doing something they could do before, doesn&apos;t respond to sounds, or one side of the body seems weaker than the other.
      </AppText>
    </Panel>
  );
}
