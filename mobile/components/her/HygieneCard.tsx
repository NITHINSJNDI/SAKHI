/** Port of frontend/components/her/HygieneCard.tsx: products, change timer, blood-loss score, supplies, myths, access, warning signs. */
import { CaretDown, Drop, Lightbulb, MapPin, Package, Timer, Trash, Warning, type Icon } from "phosphor-react-native";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Pressable, TextInput, View } from "react-native";

import AramCard from "@/components/her/AramCard";
import { AppText } from "@/components/AppText";
import { atom, CheckRow, InfoBox, PillButton, StatusBadge, ToggleChip } from "@/components/web/Atoms";
import { ink, Panel, PanelTitle } from "@/components/web/Panel";
import type { HygieneCycle } from "@/lib/herData";
import { successHaptic } from "@/lib/haptics";
import { useT } from "@/lib/i18n";
import { call, mapsSearch, openUrl, whatsapp } from "@/lib/links";
import { todayNum } from "@/lib/shared/cyclePhase";
import {
  addPad,
  changesToday,
  changeState,
  EMPTY_HYGIENE,
  hoursSinceChange,
  LOW_COST,
  mythForDay,
  PBAC_HEAVY,
  pbacScore,
  PRODUCT_ORDER,
  recordChange,
  PRODUCTS,
  supplyCheck,
  WARNING_SIGNS,
  type ChangeState,
  type HygieneDoc,
  type Product,
  type Soak,
  type SupplyLevel,
} from "@/lib/shared/hygiene";
import { TW } from "@/lib/tw";
import { useUserDoc } from "@/lib/useUserDoc";
import { fonts, palette } from "@/theme";

const CHANGE_CHIP: Record<ChangeState, { text: string; bg: string; fg: string }> = {
  fresh: { text: "All good", bg: TW.emerald[100], fg: TW.emerald[800] },
  soon: { text: "Change soon", bg: TW.amber[100], fg: TW.amber[800] },
  due: { text: "Time to change", bg: TW.rose[100], fg: TW.rose[700] },
  overdue: { text: "Overdue", bg: TW.rose[600], fg: "#fff" },
  unknown: { text: "", bg: "transparent", fg: "transparent" },
};
const SUPPLY: Record<SupplyLevel, { bg: string; fg: string }> = {
  ok: { bg: TW.emerald[50], fg: "#064E3B" },
  low: { bg: TW.amber[50], fg: "#78350F" },
  out: { bg: TW.rose[50], fg: TW.rose[800] },
  untracked: { bg: palette.lavender50, fg: palette.plum900 },
  reusable: { bg: palette.lavender50, fg: palette.plum900 },
};
const fmtHours = (h: number) => {
  const m = Math.round(h * 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;
};

export default function HygieneCard({ cycle }: { cycle: HygieneCycle }) {
  const { t } = useT();
  const { doc, save } = useUserDoc<HygieneDoc>("hygiene", EMPTY_HYGIENE);
  const [now, setNow] = useState(() => new Date());
  const [open, setOpen] = useState<"care" | "access" | "signs" | null>(null);
  const [askSoak, setAskSoak] = useState<string | null>(null);
  const [clots, setClots] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const guide = doc.product ? PRODUCTS[doc.product] : null;
  const hours = hoursSinceChange(doc.changes, now);
  const state = changeState(doc.product, hours);
  const todayCount = changesToday(doc.changes, now);
  const supply = useMemo(
    () => supplyCheck(doc, cycle.periodLength, cycle.heavyFlow, cycle.daysUntilPeriod, cycle.bleeding),
    [doc, cycle.periodLength, cycle.heavyFlow, cycle.daysUntilPeriod, cycle.bleeding],
  );
  const myth = mythForDay(todayNum());
  const pbac = useMemo(() => pbacScore(doc.pads, cycle.periodStart, doc.product), [doc.pads, cycle.periodStart, doc.product]);
  const scoresSoak = doc.product !== null && doc.product !== "cup" && doc.product !== "period_underwear";

  const setProduct = (p: Product) => void save((prev) => ({ ...prev, product: p }));
  const markChanged = async () => {
    const at = new Date();
    setNow(at);
    await save((prev) => recordChange(prev, at));
    successHaptic();
    if (scoresSoak) {
      setAskSoak(at.toISOString());
      setClots(false);
    }
  };
  const recordSoak = (soak: Soak) => {
    const at = askSoak || new Date().toISOString();
    setAskSoak(null);
    void save((prev) => ({ ...prev, pads: addPad(prev.pads, { at, soak, clots, product: prev.product || undefined }) }));
  };
  const setStock = (n: number | null) => void save((prev) => ({ ...prev, stock: n === null ? null : Math.max(0, Math.min(200, n)) }));
  const toggle = (k: "care" | "access" | "signs") => setOpen((o) => (o === k ? null : k));

  // Every product has its own label (period underwear used to fall through to "Cloth pad")
  const productLabel = (p: Product) => t(`hygiene.${p}`, PRODUCTS[p].label);

  return (
    <Panel>
      <PanelTitle
        icon={Drop}
        iconColor={palette.blush500}
        title={t("hygiene.title")}
        right={
          cycle.bleeding ? (
            <StatusBadge text={t("cycle.period")} bg={TW.rose[100]} fg={TW.rose[700]} />
          ) : cycle.daysUntilPeriod <= 5 ? (
            <StatusBadge text={t("landing.periodInAbout", { days: cycle.daysUntilPeriod })} bg={TW.amber[100]} fg={TW.amber[800]} />
          ) : undefined
        }
      />

      <AppText style={{ marginTop: 16, fontSize: 12, fontWeight: "600", color: ink[65] }}>{t("hygiene.whatDoYouUse")}</AppText>
      <View style={[atom.wrap, { marginTop: 8 }]} accessibilityLabel="Period product">
        {PRODUCT_ORDER.map((p) => (
          <ToggleChip key={p} label={productLabel(p)} on={doc.product === p} onPress={() => setProduct(p)} />
        ))}
      </View>
      <AramCard />

      {/* Change timer */}
      <View style={[box, { marginTop: 16 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Timer size={16} color={palette.plum900} weight="duotone" />
            <AppText style={atom.strong}>{t("hygiene.changeTimer")}</AppText>
          </View>
          {state !== "unknown" ? <StatusBadge text={CHANGE_CHIP[state].text} bg={CHANGE_CHIP[state].bg} fg={CHANGE_CHIP[state].fg} /> : null}
        </View>
        {guide ? (
          <>
            <AppText style={[atom.soft, { marginTop: 8 }]}>
              {hours === null ? t("hygiene.tapWhenChange") : t("hygiene.lastChanged", { time: fmtHours(hours) })}{" "}
              <AppText style={{ fontSize: 14, color: palette.plum900 }}>
                {guide.label}: {guide.window}.
              </AppText>
            </AppText>
            <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <PillButton label={t("common.confirm", "I changed just now")} onPress={() => void markChanged()} />
              {todayCount > 0 ? (
                <AppText style={atom.faint}>{t("hygiene.changesToday", { count: todayCount })}</AppText>
              ) : null}
            </View>
            {askSoak ? (
              <InfoBox style={{ marginTop: 12, gap: 8 }}>
                <AppText style={{ fontSize: 12, fontWeight: "600", color: palette.plum900 }}>{t("hygiene.howFull")}</AppText>
                <View style={atom.wrap}>
                  {(
                    [
                      ["light", t("hygiene.soakLight")],
                      ["half", t("hygiene.soakHalf")],
                      ["full", t("hygiene.soakFull")],
                    ] as [Soak, string][]
                  ).map(([k, label]) => (
                    <ToggleChip key={k} label={label} on={false} onPress={() => recordSoak(k)} />
                  ))}
                  <Pressable onPress={() => setAskSoak(null)} hitSlop={8}>
                    <AppText style={[atom.faint, { textDecorationLine: "underline" }]}>{t("hygiene.skip")}</AppText>
                  </Pressable>
                </View>
                <CheckRow label={t("hygiene.clotCheck")} checked={clots} onChange={setClots} />
              </InfoBox>
            ) : null}
            {scoresSoak && cycle.periodStart ? (
              <View style={{ marginTop: 12, borderRadius: 12, padding: 10, backgroundColor: pbac.heavy ? TW.rose[50] : "#fff", borderWidth: pbac.heavy ? 0 : 1, borderColor: ink[7] }}>
                <AppText style={{ fontSize: 12, fontWeight: "600", color: palette.plum900 }}>
                  Blood-loss score{pbac.items ? `: ${pbac.score} / ${PBAC_HEAVY}` : ""}
                </AppText>
                {pbac.items > 0 ? (
                  <View style={{ marginTop: 6, height: 6, borderRadius: 3, backgroundColor: ink[10], overflow: "hidden" }}>
                    <View
                      style={{
                        height: "100%",
                        borderRadius: 3,
                        width: `${Math.min(100, (pbac.score / PBAC_HEAVY) * 100)}%`,
                        backgroundColor: pbac.heavy ? TW.rose[600] : pbac.score > 75 ? TW.amber[500] : TW.emerald[500],
                      }}
                    />
                  </View>
                ) : null}
                <AppText style={{ marginTop: 6, fontSize: 12, lineHeight: 17, color: pbac.heavy ? TW.rose[800] : "rgba(42,21,47,0.68)" }}>{pbac.message}</AppText>
                {pbac.validFor === "rough" && pbac.items > 0 ? <AppText style={[atom.faint, { marginTop: 4 }]}>{t("hygiene.clothRough")}</AppText> : null}
              </View>
            ) : null}
            {cycle.bleeding && todayCount >= 8 && guide.disposable ? (
              <AppText style={{ marginTop: 8, fontSize: 12, color: TW.rose[700] }}>{t("hygiene.tooMany")}</AppText>
            ) : null}
          </>
        ) : (
          <AppText style={[atom.soft, { marginTop: 8 }]}>{t("hygiene.choosePrompt")}</AppText>
        )}
      </View>

      {/* Supplies */}
      <View style={[box, { marginTop: 12 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Package size={16} color={palette.plum900} weight="duotone" />
          <AppText style={atom.strong}>{t("hygiene.supplies")}</AppText>
        </View>
        <View style={{ marginTop: 8, borderRadius: 12, padding: 10, backgroundColor: SUPPLY[supply.level].bg }}>
          <AppText style={{ fontSize: 14, lineHeight: 20, color: SUPPLY[supply.level].fg }}>{supply.message}</AppText>
        </View>
        {!doc.product || PRODUCTS[doc.product].disposable ? (
          <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <AppText style={atom.small}>{t("hygiene.atHome")}</AppText>
            <PillButton label="−" variant="secondary" onPress={() => setStock((doc.stock ?? 0) - 1)} style={{ minWidth: 44, paddingHorizontal: 0 }} />
            <TextInput
              keyboardType="number-pad"
              accessibilityLabel={t("relief.padsAtHome")}
              value={doc.stock === null || doc.stock === undefined ? "" : String(doc.stock)}
              placeholder="?"
              placeholderTextColor={ink[40]}
              onChangeText={(v) => setStock(v === "" ? null : Number(v.replace(/\D/g, "")))}
              style={{ width: 64, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: "rgba(42,21,47,0.15)", backgroundColor: "#fff", textAlign: "center", fontSize: 16, color: palette.plum900, fontFamily: fonts.regular }}
            />
            <PillButton label="+" variant="secondary" onPress={() => setStock((doc.stock ?? 0) + 1)} style={{ minWidth: 44, paddingHorizontal: 0 }} />
          </View>
        ) : null}
      </View>

      {/* Myth of the day */}
      <InfoBox style={{ marginTop: 12, padding: 16, flexDirection: "row", gap: 12 }}>
        <Lightbulb size={20} color={palette.plum900} weight="duotone" />
        <View style={{ flex: 1 }}>
          <AppText style={{ fontSize: 14, lineHeight: 20, color: "rgba(42,21,47,0.68)", textDecorationLine: "line-through" }}>{myth.myth}</AppText>
          <AppText style={{ fontSize: 14, lineHeight: 20, color: palette.plum900 }}>
            <AppText style={{ fontSize: 14, fontWeight: "500" }}>{t("hygiene.fact")}</AppText> {myth.fact}
          </AppText>
        </View>
      </InfoBox>

      {/* Expandable sections */}
      <View style={{ marginTop: 12, borderRadius: 16, borderWidth: 1, borderColor: ink[7], backgroundColor: "rgba(255,255,255,0.6)" }}>
        {guide ? (
          <Section icon={Trash} title={t("hygiene.careFor", { item: productLabel(doc.product!).toLowerCase() })} open={open === "care"} onToggle={() => toggle("care")}>
            <View style={{ gap: 6 }}>
              {guide.care.map((c) => (
                <AppText key={c} style={atom.soft}>
                  • {c}
                </AppText>
              ))}
            </View>
            <InfoBox style={{ marginTop: 8 }}>
              <AppText style={{ fontSize: 14, lineHeight: 20, color: palette.plum900 }}>
                <AppText style={{ fontSize: 14, fontWeight: "500" }}>{t("hygiene.disposal")}</AppText> {guide.disposal}
              </AppText>
            </InfoBox>
          </Section>
        ) : null}
        <Section icon={MapPin} title={t("hygiene.lowCostPads")} open={open === "access"} onToggle={() => toggle("access")} divider={Boolean(guide)}>
          <View style={{ gap: 12 }}>
            {LOW_COST.map((o) => (
              <View key={o.title}>
                <AppText style={{ fontSize: 14, fontWeight: "500", color: palette.plum900 }}>{o.title}</AppText>
                <AppText style={atom.soft}>{o.detail}</AppText>
                {o.phone ? (
                  <View style={{ marginTop: 4, flexDirection: "row", gap: 16 }}>
                    <AppText onPress={() => void whatsapp(o.phone!)} style={link}>
                      WhatsApp
                    </AppText>
                    <AppText onPress={() => void call(`+${o.phone}`)} style={link}>
                      {t("hygiene.call")}
                    </AppText>
                  </View>
                ) : o.mapsQuery ? (
                  <AppText onPress={() => void openUrl(mapsSearch(o.mapsQuery!))} style={[link, { marginTop: 4 }]}>
                    {t("hygiene.findNearest")}
                  </AppText>
                ) : null}
              </View>
            ))}
          </View>
        </Section>
        <Section icon={Warning} title={t("hygiene.whenToSeeDoctor")} open={open === "signs"} onToggle={() => toggle("signs")} divider>
          <View style={{ gap: 6 }}>
            {WARNING_SIGNS.map((sg) => (
              <AppText key={sg.text} style={{ fontSize: 14, lineHeight: 20, color: sg.urgent ? TW.rose[700] : "rgba(42,21,47,0.68)", fontWeight: sg.urgent ? "500" : "400" }}>
                • {sg.text}
              </AppText>
            ))}
          </View>
          <AppText style={[atom.faint, { marginTop: 8 }]}>{t("hygiene.emergency")}</AppText>
        </Section>
      </View>
      <AppText style={[atom.faint, { marginTop: 12 }]}>{t("hygiene.disclaimer")}</AppText>
    </Panel>
  );
}

function Section({ icon: I, title, open, onToggle, children, divider }: { icon: Icon; title: string; open: boolean; onToggle: () => void; children: ReactNode; divider?: boolean }) {
  return (
    <View style={divider ? { borderTopWidth: 1, borderTopColor: ink[7] } : null}>
      <Pressable onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded: open }} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingHorizontal: 16, minHeight: 52 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
          <I size={16} color={palette.plum900} weight="duotone" />
          <AppText style={{ fontSize: 14, fontWeight: "500", color: palette.plum900, flex: 1 }}>{title}</AppText>
        </View>
        <CaretDown size={16} color={palette.plum900} style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }} />
      </Pressable>
      {open ? <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>{children}</View> : null}
    </View>
  );
}

const box = { borderRadius: 16, borderWidth: 1, borderColor: ink[7], backgroundColor: "rgba(255,255,255,0.75)", padding: 16 } as const;
const link = { fontSize: 12, fontWeight: "600", color: palette.plum900, textDecorationLine: "underline" } as const;
