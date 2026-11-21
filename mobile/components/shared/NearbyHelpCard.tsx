/** Port of frontend/components/NearbyHelpCard.tsx: Google Maps searches near her and helplines. */
import { MapPin, Phone } from "phosphor-react-native";
import { View } from "react-native";

import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/ui";
import { atom } from "@/components/web/Atoms";
import { ink, Panel, PanelTitle } from "@/components/web/Panel";
import { useT } from "@/lib/i18n";
import { call, mapsSearch, openUrl } from "@/lib/links";
import { palette } from "@/theme";

export default function NearbyHelpCard({ mode }: { mode: "her" | "pregnancy" }) {
  const { t } = useT();
  const places = [
    { q: "government hospital near me", label: t("nearby.govHospital") },
    { q: "primary health centre near me", label: t("nearby.phc") },
    { q: "Jan Aushadhi Kendra near me", label: t("nearby.janAushadhi") },
    { q: "blood bank near me", label: t("nearby.bloodBank") },
    ...(mode === "pregnancy" ? [{ q: "maternity hospital near me", label: t("mom.hospitalBagTitle", "Maternity hospital") }] : []),
  ];
  const lines = [
    { n: "108", label: t("nearby.call108") },
    ...(mode === "pregnancy" ? [{ n: "102", label: "Free ambulance for pregnancy" }] : []),
    { n: "104", label: t("nearby.call104") },
    { n: "181", label: "Women's helpline" },
  ];
  return (
    <Panel>
      <PanelTitle icon={MapPin} iconColor={palette.blush500} title={t("nearby.title")} subtitle="Opens Google Maps with places near you. Sakhi doesn't see or keep your location." />
      <View style={[atom.wrap, { marginTop: 16 }]}>
        {places.map((p) => (
          <PressableScale
            key={p.q}
            onPress={() => void openUrl(mapsSearch(p.q))}
            accessibilityRole="link"
            scaleTo={0.95}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, borderWidth: 1, borderColor: "rgba(42,21,47,0.12)", backgroundColor: "#fff", paddingHorizontal: 14, minHeight: 44 }}
          >
            <MapPin size={16} color={palette.blush500} />
            <AppText style={{ fontSize: 14, fontWeight: "500", color: palette.plum900 }}>{p.label}</AppText>
          </PressableScale>
        ))}
      </View>
      <View style={{ marginTop: 20, gap: 8 }}>
        {lines.map((l) => (
          <PressableScale
            key={l.n}
            onPress={() => void call(l.n)}
            accessibilityRole="link"
            accessibilityLabel={`Call ${l.n}, ${l.label}`}
            scaleTo={0.98}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1, borderColor: ink[7], backgroundColor: "rgba(255,255,255,0.8)", paddingHorizontal: 12, minHeight: 52 }}
          >
            <Phone size={16} color={ink[60]} weight="fill" />
            <AppText style={{ fontSize: 16, fontWeight: "600", color: palette.plum900 }}>{l.n}</AppText>
            <AppText style={[atom.small, { flex: 1 }]}>{l.label}</AppText>
          </PressableScale>
        ))}
      </View>
    </Panel>
  );
}
