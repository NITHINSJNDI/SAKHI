/**
 * Port of frontend/components/ConsentGate.tsx: first-use privacy consent over
 * Her Mode / Mom Mode until the current consent version is accepted.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DownloadSimple, Lock, Robot, ShieldCheck, Stethoscope, Trash } from "phosphor-react-native";
import { useState } from "react";
import { Modal, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/ui";
import { CheckRow, PillButton } from "@/components/web/Atoms";
import { ink } from "@/components/web/Panel";
import { apiFetch } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { queryKeys } from "@/lib/queryKeys";
import { palette } from "@/theme";

export default function ConsentGate() {
  const { t } = useT();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const [ai, setAi] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const q = useQuery({ queryKey: queryKeys.consent, queryFn: () => apiFetch<{ required?: boolean }>("/api/consent").catch(() => ({ required: false })) });
  const required = Boolean(q.data?.required) && !dismissed;

  const accept = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/consent", { method: "POST", body: JSON.stringify({ accepted: true, aiProcessing: ai }) });
      qc.setQueryData(queryKeys.consent, { required: false });
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
    <Modal visible={required} transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={{ flex: 1, backgroundColor: "rgba(42,21,47,0.4)", justifyContent: "center", padding: 16, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}>
        <View style={{ maxHeight: "100%", borderRadius: 28, backgroundColor: palette.cream, borderWidth: 1, borderColor: "rgba(255,255,255,0.6)", overflow: "hidden" }} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={{ padding: 24 }}>
            <View style={{ alignSelf: "center", width: 56, height: 56, borderRadius: 28, backgroundColor: palette.pink100, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <ShieldCheck size={28} color={palette.pink600} weight="duotone" />
            </View>
            <AppText style={{ fontSize: 20, fontWeight: "600", textAlign: "center", color: palette.plum900 }} accessibilityRole="header">{t("consent.title")}</AppText>
            <AppText style={{ marginTop: 4, fontSize: 14, textAlign: "center", color: ink[60] }}>{t("consent.subtitle")}</AppText>
            <View style={{ marginTop: 20, gap: 12 }}>
              {points.map(({ icon: I, text }) => (
                <View key={text} style={{ flexDirection: "row", gap: 12 }}>
                  <I size={20} color={palette.pink500} weight="duotone" style={{ marginTop: 1 }} />
                  <AppText style={{ flex: 1, fontSize: 14, lineHeight: 20, color: ink[80] }}>{text}</AppText>
                </View>
              ))}
            </View>
            <View style={{ marginTop: 20, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.7)", borderWidth: 1, borderColor: ink[10], paddingHorizontal: 8 }}>
              <CheckRow label={t("consent.checkbox")} checked={ai} onChange={setAi} />
            </View>
            <View style={{ marginTop: 24, gap: 8 }}>
              <PillButton label={saving ? t("common.saving") : t("consent.agreeBtn")} onPress={() => void accept()} busy={saving} full />
              <PressableScale
                onPress={() => setDismissed(true)}
                style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}
              >
                <AppText style={{ fontSize: 14, color: ink[60] }}>{t("consent.notNow")}</AppText>
              </PressableScale>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
