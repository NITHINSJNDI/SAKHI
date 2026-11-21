/**
 * Port of frontend/components/her/PcosCheckCard.tsx: cycle pattern from her logs
 * plus five yes/no questions, scored by the PCOS symptom model. Never a diagnosis.
 */
import { Flower } from "phosphor-react-native";
import { useState } from "react";
import { View } from "react-native";

import { AppText } from "@/components/AppText";
import { atom, CheckRow, InfoBox, PillButton, StatusBadge } from "@/components/web/Atoms";
import { Panel, PanelTitle } from "@/components/web/Panel";
import { apiFetch } from "@/lib/api";
import { useT } from "@/lib/i18n";
import type { PhaseInfo } from "@/lib/shared/cyclePhase";
import { TW } from "@/lib/tw";
import { palette } from "@/theme";

 
const SIGNS = [
  { key: "hair_growth", label: "Extra hair on face, chest or belly" },
  { key: "pimples", label: "Pimples or acne that keep coming back" },
  { key: "skin_darkening", label: "Dark, velvety skin on the neck or underarms" },
  { key: "hair_loss", label: "Hair thinning on the head" },
  { key: "weight_gain", label: "Weight gain that is hard to explain" },
] as const;
type SignKey = (typeof SIGNS)[number]["key"];

const LEVEL = {
  High: { text: "Worth seeing a doctor", bg: TW.rose[100], fg: TW.rose[700] },
  Moderate: { text: "Keep an eye", bg: TW.amber[100], fg: TW.amber[800] },
  Low: { text: "Low chance", bg: TW.emerald[100], fg: TW.emerald[800] },
} as const;

export default function PcosCheckCard({ phase, profile }: { phase: PhaseInfo; profile: any }) {
  const { t } = useT();
  const [answers, setAnswers] = useState<Record<SignKey, boolean>>({ hair_growth: false, pimples: false, skin_darkening: false, hair_loss: false, weight_gain: false });
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const irregular =
    (phase.variability ?? 0) > 9 || phase.cycleLength > 35 || phase.cycleLength < 21 || profile?.cycle_regularity === "No" || profile?.cycle_regularity === "Irregular";
  const age = Number(profile?.age) || null;
  const bmi = Number(profile?.bmi) || null;
  const signLabels: Record<SignKey, string> = {
    hair_growth: t("pcos.facialHair"),
    pimples: t("pcos.acne"),
    skin_darkening: t("pcos.moodSwings"),
    hair_loss: t("pcos.hairThinning"),
    weight_gain: t("pcos.weightGain"),
  };

  const check = async () => {
    setBusy(true);
    try {
      const r = await apiFetch<any>("/api/predict/pcos", {
        method: "POST",
        body: JSON.stringify({
          cycle_regularity: irregular ? 0 : 1,
          cycle_length: phase.learned ? Math.round(phase.cycleLength) : null,
          period_days: phase.usualPeriodLength,
          acne_severity: answers.pimples ? 5 : 0,
          hair_growth: answers.hair_growth,
          skin_darkening: answers.skin_darkening,
          hair_loss: answers.hair_loss,
          weight_gain: answers.weight_gain,
          ...(age ? { age } : {}),
          ...(bmi ? { bmi } : {}),
        }),
      });
      setResult(r);
    } catch {
      setResult({ error: true });
    } finally {
      setBusy(false);
    }
  };

  const level = result?.risk_level as keyof typeof LEVEL | undefined;
  const drivers: any[] = (result?.ml?.explanation || []).filter((e: any) => e.impact > 0.15).slice(0, 3);

  return (
    <Panel>
      <PanelTitle icon={Flower} iconColor={palette.blush500} title={t("pcos.title")} />
      <AppText style={[atom.soft, { marginTop: 8 }]}>
        {irregular ? t("pcos.fromLogsIrregular") : t("pcos.fromLogsRegular")}, {t("pcos.periodsLastAbout", { days: phase.usualPeriodLength })}
      </AppText>
      <View style={{ marginTop: 12, gap: 8 }}>
        {SIGNS.map((sg) => (
          <CheckRow
            key={sg.key}
            label={signLabels[sg.key] || sg.label}
            checked={answers[sg.key]}
            onChange={(v) => {
              setAnswers((a) => ({ ...a, [sg.key]: v }));
              setResult(null);
            }}
          />
        ))}
      </View>
      <PillButton label={busy ? t("pcos.checking") : t("pcos.checkButton")} onPress={() => void check()} busy={busy} style={{ marginTop: 16 }} />
      {result?.error ? <AppText style={{ marginTop: 12, fontSize: 14, color: TW.rose[700] }}>Couldn&apos;t check right now. Please try again.</AppText> : null}
      {level && LEVEL[level] ? (
        <InfoBox style={{ marginTop: 16, padding: 16, gap: 8 }}>
          <StatusBadge text={LEVEL[level].text} bg={LEVEL[level].bg} fg={LEVEL[level].fg} />
          {drivers.length > 0 ? <AppText style={{ fontSize: 14, color: palette.plum900 }}>Mostly because of: {drivers.map((d) => String(d.label).toLowerCase()).join(", ")}.</AppText> : null}
          <AppText style={{ fontSize: 14, lineHeight: 20, color: palette.plum900 }}>{level === "Low" ? t("pcos.negative") : t("pcos.positive")}</AppText>
        </InfoBox>
      ) : null}
      <AppText style={[atom.faint, { marginTop: 12 }]}>{t("pcos.disclaimer")}</AppText>
    </Panel>
  );
}
