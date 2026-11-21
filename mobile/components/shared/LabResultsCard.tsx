/** Port of LabResultsCard (frontend/components/LabReport.tsx): latest results ranked by concern; "Add report" opens the lab-report screen. */
import { useFocusEffect, useRouter } from "expo-router";
import { Camera } from "phosphor-react-native";
import { useCallback } from "react";
import { View } from "react-native";

import { AppText } from "@/components/AppText";
import { useLabResults } from "@/components/her/AnaemiaCard";
import { atom, InfoBox, PillButton, StatusBadge } from "@/components/web/Atoms";
import { ink, Panel, PanelTitle } from "@/components/web/Panel";
import { useT } from "@/lib/i18n";
import { checkLab, formatLab, labTest, latestLabs, type LabResult, type LabStatus } from "@/lib/shared/labs";
import { TW } from "@/lib/tw";
import { palette } from "@/theme";

export const STATUS_STYLE: Record<LabStatus, { bg: string; fg: string; word: string }> = {
  ok: { bg: TW.emerald[100], fg: TW.emerald[800], word: "Healthy" },
  mild: { bg: TW.amber[100], fg: TW.amber[800], word: "Keep an eye" },
  attention: { bg: TW.rose[100], fg: TW.rose[700], word: "See doctor" },
  urgent: { bg: TW.rose[600], fg: "#fff", word: "Urgent" },
};
const shortDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function LabResultsCard({ mode, pregnant }: { mode: "her" | "pregnancy"; pregnant: boolean }) {
  const { t } = useT();
  const router = useRouter();
  const q = useLabResults();
  // Results added on the lab-report screen show up when she comes back
  useFocusEffect(
    useCallback(() => {
      void q.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );
  const results = q.data?.results ?? null;
  const latest = Object.values(latestLabs(results || [])) as LabResult[];
  const order: LabStatus[] = ["urgent", "attention", "mild", "ok"];
  const ranked = latest.map((r) => ({ r, c: checkLab(r.key, r.value, pregnant) })).sort((a, b) => order.indexOf(a.c.status) - order.indexOf(b.c.status));

  return (
    <Panel>
      <PanelTitle title={t("labs.title")} subtitle={t("labs.subtitle")} />
      <PillButton label={t("labs.addReport")} icon={Camera} onPress={() => router.push({ pathname: "/lab-report", params: { mode } })} style={{ marginTop: 12 }} />
      <View style={{ marginTop: 16 }}>
        {results === null ? (
          <AppText style={atom.soft}>{t("common.loading")}</AppText>
        ) : ranked.length === 0 ? (
          <InfoBox style={{ padding: 16 }}>
            <AppText style={atom.soft}>{t("labs.noResults")}</AppText>
          </InfoBox>
        ) : (
          <View style={{ gap: 10 }}>
            {ranked.map(({ r, c }) => (
              <View key={r.key} style={{ borderRadius: 16, borderWidth: 1, borderColor: ink[7], backgroundColor: "rgba(255,255,255,0.8)", padding: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <AppText style={{ flex: 1, fontSize: 12, fontWeight: "600", color: ink[65] }}>{labTest(r.key)?.label}</AppText>
                  <StatusBadge text={STATUS_STYLE[c.status].word} bg={STATUS_STYLE[c.status].bg} fg={STATUS_STYLE[c.status].fg} />
                </View>
                <AppText style={{ marginTop: 4, fontSize: 18, fontWeight: "600", color: palette.plum900 }}>{formatLab(r.key, r.value)}</AppText>
                <AppText style={atom.small}>{c.note}</AppText>
                <AppText style={[atom.faint, { marginTop: 4 }]}>{shortDate(r.date)}</AppText>
              </View>
            ))}
          </View>
        )}
      </View>
    </Panel>
  );
}
