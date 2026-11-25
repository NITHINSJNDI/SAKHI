/** Port of frontend/components/HospitalBagCard.tsx: packing list for the third trimester. */
import { Suitcase } from "phosphor-react-native";
import { View } from "react-native";

import { AppText } from "@/components/AppText";
import { CheckRow } from "@/components/web/Atoms";
import { Panel, PanelTitle, ink } from "@/components/web/Panel";
import { useT } from "@/lib/i18n";
import { useUserDoc } from "@/lib/useUserDoc";
import { TW } from "@/lib/tw";
import { palette } from "@/theme";

const GROUPS: { title: string; items: string[] }[] = [
  { title: "Papers", items: ["Mother and Child Protection (MCP) card", "All scan and blood test reports", "Aadhaar or other photo ID", "Insurance, PM-JAY or JSY papers", "Hospital registration card", "List of family phone numbers"] },
  { title: "For you", items: ["3 or 4 loose, front-opening nighties or kurtas", "Maternity pads (2 packs)", "Old cotton underwear", "Feeding bras", "Slippers and a shawl", "Toothbrush, comb, soap, hair ties", "Phone charger", "Water bottle and light snacks"] },
  { title: "For baby", items: ["4 or 5 sets of soft cotton clothes", "Cloth nappies or newborn diapers", "2 or 3 swaddle cloths", "Cap, mittens and socks", "Soft towel and a baby blanket"] },
];
const TOTAL = GROUPS.reduce((n, g) => n + g.items.length, 0);

export default function HospitalBagCard({ weeks }: { weeks: number }) {
  const { t } = useT();
  const { doc, save } = useUserDoc<{ hospital_bag: string[] }>("checklists", { hospital_bag: [] });
  const packed = doc.hospital_bag || [];
  const toggle = (item: string) =>
    void save((d) => {
      const list = d.hospital_bag || [];
      return { ...d, hospital_bag: list.includes(item) ? list.filter((x) => x !== item) : [...list, item] };
    });
  const pct = Math.round((packed.length / TOTAL) * 100);

  return (
    <Panel>
      <PanelTitle
        title={t("mom.hospitalBagTitle")}
        icon={Suitcase}
        subtitle={weeks >= 36 ? "Keep it by the door now." : `Aim to have it packed by week 36 (${36 - weeks} weeks to go).`}
        right={<AppText style={{ fontSize: 13, fontWeight: "600", color: palette.plum900 }}>{packed.length} of {TOTAL}</AppText>}
      />
      <View style={{ marginTop: 12, height: 8, borderRadius: 4, backgroundColor: ink[10] }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }} accessibilityLabel={t("pregnancy.bagPacked")}>
        <View style={{ width: `${pct}%`, height: 8, borderRadius: 4, backgroundColor: TW.emerald[400] }} />
      </View>
      <View style={{ marginTop: 16, gap: 16 }}>
        {GROUPS.map((g) => (
          <View key={g.title} style={{ gap: 2 }}>
            <AppText style={{ fontSize: 14, fontWeight: "600", color: palette.plum900, marginBottom: 4 }}>{g.title}</AppText>
            {g.items.map((item) => (
              <CheckRow key={item} label={item} checked={packed.includes(item)} onChange={() => toggle(item)} />
            ))}
          </View>
        ))}
      </View>
    </Panel>
  );
}
