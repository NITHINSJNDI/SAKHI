/** Port of frontend/components/SchemesCard.tsx: which government schemes she can claim. */
import { Bank, CaretDown, CaretUp } from "phosphor-react-native";
import { useState } from "react";
import { View } from "react-native";

import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/ui";
import { ToggleChip } from "@/components/web/Atoms";
import { Panel, PanelTitle, ink } from "@/components/web/Panel";
import { useT } from "@/lib/i18n";
import { openUrl } from "@/lib/links";
import { TW } from "@/lib/tw";
import { palette } from "@/theme";

type Answer = "yes" | "no" | null;
interface Answers {
  first: Answer;
  girl2: Answer;
  govt: Answer;
  card: Answer;
}
interface Scheme {
  id: string;
  name: string;
  what: string;
  who: string;
  how: string[];
  link?: { href: string; label: string };
  fits: (a: Answers) => boolean | null;
}

const SCHEMES: Scheme[] = [
  {
    id: "pmmvy",
    name: "PM Matru Vandana Yojana (PMMVY)",
    what: "₹5,000 into your bank account for your first child, in two parts. ₹6,000 more if your second child is a girl.",
    who: "Pregnant women and new mothers, except government employees who already get paid maternity leave.",
    how: [
      "Register with your ASHA or Anganwadi worker, or on the PMMVY portal, as early as you can",
      "Part 1 (₹3,000): after registering and at least one antenatal check-up",
      "Part 2 (₹2,000): after the birth is registered and baby has the first round of vaccines",
      "Keep ready: Aadhaar, MCP card, bank or post office account linked to Aadhaar",
    ],
    link: { href: "https://pmmvy.wcd.gov.in", label: "PMMVY portal" },
    fits: (a) => (a.first === "yes" || a.girl2 === "yes" ? true : a.first === "no" && a.girl2 === "no" ? false : null),
  },
  {
    id: "jsy",
    name: "Janani Suraksha Yojana (JSY)",
    what: "Cash after you give birth in a government hospital (or an accredited private one). The amount depends on your state and whether you live in a village or town.",
    who: "Mainly families with a BPL card, or SC/ST families. In UP, Bihar, Jharkhand, MP, Chhattisgarh, Rajasthan, Odisha, Assam, Uttarakhand and J&K, every woman delivering in a government hospital.",
    how: ["Tell your ASHA you want JSY when you register the pregnancy", "Deliver in a government or accredited hospital", "The money comes to your bank account after the birth"],
    fits: (a) => (a.govt === "no" ? false : a.card === "yes" ? true : null),
  },
  {
    id: "jssk",
    name: "Janani Shishu Suraksha Karyakram (JSSK)",
    what: "Everything free in a government hospital: normal delivery or C-section, medicines, tests, blood, food during your stay, and the ambulance there and back home. Also free treatment for a sick baby up to 1 year.",
    who: "Every pregnant woman who delivers in a government hospital. No card or income limit.",
    how: ["Nothing to apply for. If anyone asks you to pay for these in a government hospital, you can refuse", "Call 102 or 108 for the free ambulance"],
    fits: (a) => (a.govt === "no" ? false : a.govt === "yes" ? true : null),
  },
  {
    id: "pmsma",
    name: "PM Surakshit Matritva Abhiyan (PMSMA)",
    what: "A free check-up by a doctor on the 9th of every month at government health centres, with tests and an ultrasound when needed.",
    who: "Every pregnant woman in the 4th to 9th month.",
    how: ["Go to your nearest PHC, CHC or district hospital on the 9th", "Take your MCP card and old reports"],
    link: { href: "https://pmsma.mohfw.gov.in", label: "PMSMA site" },
    fits: () => true,
  },
];

const QUESTIONS: { key: keyof Answers; q: string }[] = [
  { key: "first", q: "Is this your first baby?" },
  { key: "girl2", q: "Is it your second baby, and a girl?" },
  { key: "govt", q: "Will you deliver in a government hospital?" },
  { key: "card", q: "Does your family have a BPL ration card, or are you SC/ST?" },
];

export default function SchemesCard() {
  const { t } = useT();
  const [a, setA] = useState<Answers>({ first: null, girl2: null, govt: null, card: null });
  const [open, setOpen] = useState<string | null>(null);
  const shown = QUESTIONS.filter((q) => !(q.key === "girl2" && a.first !== "no"));
  const ranked = [...SCHEMES].sort((x, y) => Number(y.fits(a) === true) - Number(x.fits(a) === true));

  return (
    <Panel>
      <PanelTitle title={t("mom.schemesTitle")} icon={Bank} iconColor={palette.lavender500} subtitle={t("pregnancy.schemesIntro")} />
      <View style={{ marginTop: 14, gap: 12 }}>
        {shown.map(({ key, q }) => (
          <View key={key} style={{ gap: 6 }}>
            <AppText style={{ fontSize: 14, fontWeight: "500", color: palette.plum900 }}>{q}</AppText>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["yes", "no"] as const).map((v) => (
                <ToggleChip key={v} label={v === "yes" ? "Yes" : "No"} on={a[key] === v} onPress={() => setA((p) => ({ ...p, [key]: p[key] === v ? null : v }))} />
              ))}
            </View>
          </View>
        ))}
      </View>
      <View style={{ marginTop: 16, gap: 8 }}>
        {ranked.map((s) => {
          const fit = s.fits(a);
          const isOpen = open === s.id;
          return (
            <View key={s.id} style={{ borderRadius: 16, borderWidth: 1, borderColor: fit === false ? ink[5] : "rgba(42,21,47,0.08)", backgroundColor: fit === false ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.8)", opacity: fit === false ? 0.7 : 1 }}>
              <PressableScale onPress={() => setOpen(isOpen ? null : s.id)} scaleTo={0.99} accessibilityRole="button" accessibilityState={{ expanded: isOpen }} style={{ flexDirection: "row", gap: 10, padding: 14 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                    <AppText style={{ fontSize: 14, fontWeight: "600", color: palette.plum900 }}>{s.name}</AppText>
                    {fit === true ? (
                      <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: TW.emerald[100] }}>
                        <AppText style={{ fontSize: 11, fontWeight: "600", color: TW.emerald[700] }}>{t("pregnancy.likelyForYou")}</AppText>
                      </View>
                    ) : fit === false ? (
                      <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: ink[5] }}>
                        <AppText style={{ fontSize: 11, fontWeight: "600", color: ink[55] }}>{t("pregnancy.mayNotApply")}</AppText>
                      </View>
                    ) : null}
                  </View>
                  <AppText style={{ marginTop: 4, fontSize: 14, lineHeight: 20, color: ink[60] }}>{s.what}</AppText>
                </View>
                {isOpen ? <CaretUp size={16} color={ink[50]} /> : <CaretDown size={16} color={ink[50]} />}
              </PressableScale>
              {isOpen ? (
                <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 6 }}>
                  <AppText style={{ fontSize: 14, lineHeight: 20, color: ink[60] }}>
                    <AppText style={{ fontSize: 14, fontWeight: "500", color: palette.plum900 }}>Who: </AppText>
                    {s.who}
                  </AppText>
                  {s.how.map((h, i) => (
                    <AppText key={h} style={{ fontSize: 14, lineHeight: 20, color: palette.plum900 }}>{`${i + 1}. ${h}`}</AppText>
                  ))}
                  {s.link ? (
                    <PressableScale onPress={() => openUrl(s.link!.href)} accessibilityRole="link" style={{ minHeight: 40, justifyContent: "center", alignSelf: "flex-start" }}>
                      <AppText style={{ fontSize: 14, fontWeight: "500", color: palette.lavender600, textDecorationLine: "underline" }}>{s.link.label}</AppText>
                    </PressableScale>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
      <AppText style={{ marginTop: 14, fontSize: 12, lineHeight: 17, color: ink[45] }}>
        Amounts and rules differ by state and change over time. Your ASHA, Anganwadi worker or the 104 health helpline can confirm what you&apos;ll get and help you apply.
      </AppText>
    </Panel>
  );
}
