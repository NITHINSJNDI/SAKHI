/** Port of frontend/components/her/AnaemiaCard.tsx: iron check from flow, tiredness and lab results. */
import { useQuery } from "@tanstack/react-query";
import { Drop } from "phosphor-react-native";
import { useMemo } from "react";
import { View } from "react-native";

import { AppText } from "@/components/AppText";
import { ink, Panel, PanelTitle } from "@/components/web/Panel";
import { apiFetch } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { anaemiaWatch, IRON_FOODS } from "@/lib/shared/anaemia";
import { EMPTY_HYGIENE, pbacByPeriod, type HygieneDoc } from "@/lib/shared/hygiene";
import type { LabResult } from "@/lib/shared/labs";
import { EMPTY_TABLETS, type TabletsDoc } from "@/lib/shared/tablets";
import { TW } from "@/lib/tw";
import { useUserDoc } from "@/lib/useUserDoc";
import { palette } from "@/theme";

 

export function useLabResults() {
  return useQuery({
    queryKey: ["lab-results"],
    queryFn: () => apiFetch<{ results?: LabResult[] }>("/api/lab-report"),
  });
}

export default function AnaemiaCard({ logs }: { logs: any[] }) {
  const { t } = useT();
  const labQuery = useLabResults();
  const labs = useMemo(() => labQuery.data?.results ?? [], [labQuery.data?.results]);
  const { doc: tablets } = useUserDoc<TabletsDoc>("tablets", EMPTY_TABLETS);
  const { doc: hygiene } = useUserDoc<HygieneDoc>("hygiene", EMPTY_HYGIENE);

  const takingIron = tablets.list.some((x) => /iron|ifa|ferrous/i.test(x.name));
  const pbac = useMemo(() => {
    const scored = pbacByPeriod(hygiene.pads).slice(-3).filter((p) => p.items >= 5);
    return scored.length ? Math.max(...scored.map((p) => p.score)) : null;
  }, [hygiene.pads]);
  const w = useMemo(() => anaemiaWatch(logs, labs, takingIron, pbac), [logs, labs, takingIron, pbac]);
  const badge =
    w.level === "clear"
      ? { bg: TW.emerald[100], fg: TW.emerald[800], text: t("anaemia.looksFine") }
      : w.level === "watch"
        ? { bg: TW.amber[100], fg: TW.amber[800], text: t("anaemia.watch") }
        : { bg: TW.rose[100], fg: TW.rose[700], text: t("anaemia.seeDoctor") };

  return (
    <Panel>
      <PanelTitle
        icon={Drop}
        iconColor={palette.blush500}
        title={t("anaemia.title")}
        right={
          <View style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: badge.bg }}>
            <AppText style={{ fontSize: 12, fontWeight: "600", color: badge.fg }}>{badge.text}</AppText>
          </View>
        }
      />
      <AppText style={{ marginTop: 12, fontSize: 16, fontWeight: "500", color: palette.plum900 }}>
        {w.level === "clear" && logs.length < 2 ? t("anaemia.notEnoughData") : w.headline}
      </AppText>
      {w.reasons.length > 0 ? (
        <View style={{ marginTop: 8, gap: 4 }}>
          {w.reasons.map((r) => (
            <View key={r} style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ marginTop: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: palette.blush400 }} />
              <AppText style={{ flex: 1, fontSize: 14, lineHeight: 20, color: "rgba(42,21,47,0.68)" }}>{r}</AppText>
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ marginTop: 12, borderRadius: 16, backgroundColor: palette.lavender50, padding: 12 }}>
        <AppText style={{ fontSize: 14, lineHeight: 20, color: palette.plum900 }}>{logs.length < 2 ? t("anaemia.logFlowPrompt") : w.next}</AppText>
      </View>
      {w.level !== "clear" ? (
        <View style={{ marginTop: 16 }}>
          <AppText style={{ fontSize: 12, fontWeight: "600", color: ink[65], marginBottom: 8 }}>Iron-rich food to add</AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {IRON_FOODS.map((f) => (
              <View key={f} style={{ borderRadius: 999, backgroundColor: "rgba(255,255,255,0.8)", borderWidth: 1, borderColor: ink[7], paddingHorizontal: 10, paddingVertical: 4 }}>
                <AppText style={{ fontSize: 12, color: palette.plum900 }}>{f}</AppText>
              </View>
            ))}
          </View>
          <AppText style={{ marginTop: 8, fontSize: 11, color: ink[45] }}>Skip tea or coffee for an hour around meals: it blocks iron.</AppText>
        </View>
      ) : null}
      <AppText style={{ marginTop: 12, fontSize: 11, color: ink[45] }}>{t("anaemia.disclaimer")}</AppText>
    </Panel>
  );
}
