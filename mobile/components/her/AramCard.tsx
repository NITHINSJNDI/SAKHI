/**
 * Sakhi's partner listing: Aram Cotton Napkins (Pallipalayam, Tamil Nadu).
 * Facts only from what the partner supplied: their Google rating and links.
 * No health claims; it is labelled as a partner so the listing is honest.
 */
import { Leaf, PlayCircle, Star, Storefront } from "phosphor-react-native";
import { View } from "react-native";

import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/ui";
import { StatusBadge } from "@/components/web/Atoms";
import { ink } from "@/components/web/Panel";
import { useT } from "@/lib/i18n";
import { openUrl } from "@/lib/links";
import { TW } from "@/lib/tw";
import { palette } from "@/theme";

const ARAM = {
  shop: "https://share.google/wfcPOQmzq7PoVwEtY",
  video: "https://youtu.be/OISwYOADrAw",
};

export default function AramCard() {
  const { t } = useT();
  return (
    <View style={{ marginTop: 12, borderRadius: 18, padding: 16, backgroundColor: TW.rose[50], borderWidth: 1, borderColor: TW.rose[100], gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
          <Leaf size={22} color={TW.emerald[600]} weight="duotone" />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText style={{ fontSize: 16, fontWeight: "600", color: palette.plum900 }}>Aram Cotton Napkins</AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 8, rowGap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Star size={13} color={TW.amber[500]} weight="fill" />
              <AppText style={{ fontSize: 12, color: ink[60] }}>{t("aram.rating", "4.9 on Google · 293 reviews")}</AppText>
            </View>
            <StatusBadge text={t("aram.partner", "Sakhi partner")} bg="#FFFFFF" fg={TW.rose[700]} />
          </View>
        </View>
      </View>
      <AppText style={{ fontSize: 14, lineHeight: 20, color: ink[75] }}>
        {t("aram.pitch", "Soft cotton napkins made in Pallipalayam, Tamil Nadu. Women who use them talk about comfort and no itching or rashes.")}
      </AppText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <PressableScale onPress={() => void openUrl(ARAM.shop)} accessibilityRole="link" style={btn(true)}>
          <Storefront size={17} color={palette.cream} weight="fill" />
          <AppText style={{ fontSize: 14, fontWeight: "600", color: palette.cream }}>
            {t("aram.find", "Find Aram")}
          </AppText>
        </PressableScale>
        <PressableScale onPress={() => void openUrl(ARAM.video)} accessibilityRole="link" style={btn(false)}>
          <PlayCircle size={17} color={palette.plum900} weight="fill" />
          <AppText style={{ fontSize: 14, fontWeight: "600", color: palette.plum900 }}>
            {t("aram.watch", "Watch video")}
          </AppText>
        </PressableScale>
      </View>
    </View>
  );
}

const btn = (primary: boolean) =>
  ({
    flexGrow: 1,
    minWidth: 132,
    minHeight: 44,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    backgroundColor: primary ? palette.plum900 : "#FFFFFF",
    borderWidth: primary ? 0 : 1,
    borderColor: ink[10],
  }) as const;
