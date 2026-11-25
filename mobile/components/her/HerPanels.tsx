/**
 * Port of frontend/components/her/HerPanels.tsx: PhaseCard (with the cycle dial),
 * TodayTipsCard, PainNowCard, PmsForecastCard, PhaseInsightsCard, PatternsCard,
 * CareLinksCard.
 */
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import {
  Barbell,
  CalendarCheck,
  CaretRight,
  ChartLineUp,
  CheckCircle,
  Drop,
  FileText,
  FirstAidKit,
  ForkKnife,
  Info,
  Leaf,
  Lightning,
  ShieldCheck,
  Sparkle,
  Stethoscope,
} from "phosphor-react-native";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, G, LinearGradient, Mask, Rect, Stop, Text as SvgText } from "react-native-svg";

import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/ui";
import { Chip, IconBubble, ink, Panel, PanelTitle } from "@/components/web/Panel";
import { localIso } from "@/lib/date";
import { useT } from "@/lib/i18n";
import { PHASE_META, PHASES, phaseBounds, type Phase, type PhaseInfo } from "@/lib/shared/cyclePhase";
import { PHASE_GUIDE, type Tip } from "@/lib/shared/phaseTips";
import type { Pattern, PhaseStat } from "@/lib/shared/herInsights";
import { TW, twColor, twSoft } from "@/lib/tw";
import { palette } from "@/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const CONF_LABEL = { high: "High confidence", medium: "Medium confidence", low: "Rough estimate" } as const;
const CONF_STYLE = {
  high: { bg: TW.emerald[50], fg: TW.emerald[700], border: TW.emerald[200] },
  medium: { bg: TW.amber[50], fg: TW.amber[700], border: TW.amber[200] },
  low: { bg: TW.slate[100], fg: TW.slate[600], border: TW.slate[200] },
} as const;

/** Soft two-tone gradients per phase, kept close to the brand's rose and lavender. */
const RING_GRAD: Record<Phase, [string, string]> = {
  menstrual: ["#fb7f9c", "#e2486e"],
  follicular: ["#7fd8c3", "#2fb393"],
  ovulatory: ["#ffd27a", "#f4a53c"],
  luteal: ["#c9b2f2", "#8f63c2"],
};
const PHASE_WORD: Record<Phase, string> = { menstrual: "Period", follicular: "Follicular", ovulatory: "Ovulation", luteal: "Luteal" };

/**
 * Cycle dial: four gradient arcs (one per phase), days already lived in full
 * colour and days ahead faded, a dot for every day with ovulation marked, and a
 * glowing marker on today. Draws itself in once; still for reduced motion.
 */
function PhaseRing({ info }: { info: PhaseInfo }) {
  const { t } = useT();
  const reduce = useReducedMotion();
  const phaseWord: Record<Phase, string> = {
    menstrual: t("cycle.period"),
    follicular: t("cycle.follicular"),
    ovulatory: t("cycle.ovulation"),
    luteal: t("cycle.luteal"),
  };
  const size = 200, stroke = 15, cx = size / 2, r = cx - stroke / 2 - 6, c = 2 * Math.PI * r;
  const { ranges, ovulationDay } = phaseBounds(info.cycleLength, info.periodLength);
  const len = info.cycleLength;
  const day = Math.min(info.cycleDay, len);
  const gap = 4;
  const at = (d: number, radius: number) => {
    const a = ((d - 0.5) / len) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + radius * Math.cos(a), y: cx + radius * Math.sin(a) };
  };
  const dueToday = !info.late && !info.bleedingDay && info.daysUntilPeriod === 0;
  const waiting = info.late || dueToday;
  const marker = at(waiting ? len + 0.5 : day, r);
  const elapsed = (day / len) * c;
  const color = waiting ? RING_GRAD.menstrual[1] : RING_GRAD[info.phase][1];
  const phaseWordTranslated = t(`cycle.${info.phase}`, PHASE_WORD[info.phase]);
  const label = info.late
    ? `${info.daysLate} ${info.daysLate === 1 ? t("cycle.dayLate", "day late") : t("cycle.daysLate", "days late")}`
    : dueToday
      ? t("cycle.dueToday", "Due today")
      : phaseWordTranslated;
  const sub = waiting ? t("cycle.dueOnDay", { day: len + 1 }) : `${t("cycle.ofAbout", "of about")} ${len}`;

  const arcs = PHASES.map((p) => {
    const [a, b] = ranges[p];
    if (b < a) return null;
    const trim = gap + stroke;
    return { p, dash: Math.max(0.5, ((b - a + 1) / len) * c - trim), offset: -(((a - 1) / len) * c + trim / 2) };
  }).filter(Boolean) as { p: Phase; dash: number; offset: number }[];

  // Lived-days mask sweeps in
  const sweep = useSharedValue(reduce ? c - elapsed : c);
  useEffect(() => {
    sweep.value = reduce ? c - elapsed : withTiming(c - elapsed, { duration: 1100, easing: Easing.bezier(0.22, 1, 0.36, 1) });
  }, [c, elapsed, reduce, sweep]);
  const maskProps = useAnimatedProps(() => ({ strokeDashoffset: sweep.value }));


  const labelW = label.length * 6.8 + 24;

  return (
    <View style={{ alignItems: "center", gap: 12 }}>
      <Svg
        width={196}
        height={196}
        viewBox={`0 0 ${size} ${size}`}
        accessibilityLabel={`Cycle day ${info.cycleDay} of about ${len}. ${PHASE_META[info.phase].label}${info.late ? `, ${info.daysLate} days late` : ""}.`}
      >
        <Defs>
          {arcs.map(({ p }) => (
            <LinearGradient key={p} id={`grad-${p}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={RING_GRAD[p][0]} />
              <Stop offset="1" stopColor={RING_GRAD[p][1]} />
            </LinearGradient>
          ))}
          <Mask id="lived">
            <AnimatedCircle
              cx={cx}
              cy={cx}
              r={r}
              fill="none"
              stroke="#fff"
              strokeWidth={stroke + 6}
              strokeDasharray={`${c} ${c}`}
              transform={`rotate(-90 ${cx} ${cx})`}
              animatedProps={maskProps}
            />
          </Mask>
        </Defs>

        <Circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(42,21,47,0.05)" strokeWidth={stroke} />
        {arcs.map(({ p, dash, offset }) => (
          <Circle
            key={`ahead-${p}`}
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke={`url(#grad-${p})`}
            strokeOpacity={0.28}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${cx} ${cx})`}
          />
        ))}
        <G mask="url(#lived)">
          {arcs.map(({ p, dash, offset }) => (
            <Circle
              key={`lived-${p}`}
              cx={cx}
              cy={cx}
              r={r}
              fill="none"
              stroke={`url(#grad-${p})`}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c}`}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${cx} ${cx})`}
            />
          ))}
        </G>

        {Array.from({ length: len }, (_, i) => i + 1).map((d) => {
          const pt = at(d, r - stroke / 2 - 7);
          const isOv = d === ovulationDay;
          return (
            <Circle
              key={d}
              cx={pt.x}
              cy={pt.y}
              r={isOv ? 2.6 : d === day ? 2 : 1.1}
              fill={isOv ? RING_GRAD.ovulatory[1] : d <= day ? "rgba(42,21,47,0.45)" : "rgba(42,21,47,0.16)"}
            />
          );
        })}

        {/* Static halo: an endless SVG pulse redraws the masked ring every frame and janks scrolling on Android */}
        <Circle cx={marker.x} cy={marker.y} r={13} fill={color} opacity={0.18} />
        <Circle cx={marker.x} cy={marker.y} r={9.5} fill="#fff" stroke={color} strokeOpacity={0.35} strokeWidth={3} />
        <Circle cx={marker.x} cy={marker.y} r={4.5} fill={color} />

        <SvgText x={cx} y={cx - 22} textAnchor="middle" fill="rgba(42,21,47,0.55)" fontSize={11.5} fontWeight="500">
          {t("cycle.day")}
        </SvgText>
        <SvgText x={cx} y={cx + 13} textAnchor="middle" fill={palette.plum900} fontSize={44} fontWeight="700" letterSpacing={-1.3}>
          {String(info.cycleDay)}
        </SvgText>
        <SvgText x={cx} y={cx + 31} textAnchor="middle" fill="rgba(42,21,47,0.5)" fontSize={11}>
          {sub}
        </SvgText>
        <G transform={`translate(${cx} ${cx + 49})`}>
          <Rect x={-labelW / 2} y={-10} width={labelW} height={19} rx={9.5} fill={color} fillOpacity={0.14} />
          <SvgText x={0} y={3.5} textAnchor="middle" fontSize={10.5} fontWeight="600" fill={color}>
            {label}
          </SvgText>
        </G>
      </Svg>

      {/* Phase legend with this cycle's day ranges */}
      <View style={s.legend} accessibilityLabel="Phases this cycle">
        {arcs.map(({ p }) => {
          const [a, b] = ranges[p];
          const current = p === info.phase;
          return (
            <View key={p} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: RING_GRAD[p][1] }]} />
              <AppText style={[s.legendText, current ? { color: palette.plum900, fontWeight: "600" } : null]}>
                {phaseWord[p]}{" "}
                <AppText style={[s.legendText, { color: ink[45] }]}>{a === b ? `${t("cycle.day")} ${a}` : `${a}–${b}`}</AppText>
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Plain-language line for unusual cycle situations (long period, early end, late). */
function statusNote(info: PhaseInfo, t: ReturnType<typeof useT>["t"]): { text: string; tone: "info" | "watch" } | null {
  if (info.status === "long-period" && info.bleedingDay) {
    const d = info.bleedingDay;
    if (d >= 10) return { tone: "watch", text: t("cycle.statusNoteLongPeriod10", { day: d }) };
    if (d >= 8) return { tone: "watch", text: t("cycle.statusNoteLongPeriod8", { day: d, usual: info.usualPeriodLength }) };
    return { tone: "info", text: t("cycle.statusNoteLongPeriod", { day: d, usual: info.usualPeriodLength }) };
  }
  if (info.status === "period-ended-early") return { tone: "info", text: t("cycle.statusNoteEarlyEnd") };
  if (info.status === "very-late") return { tone: "watch", text: t("cycle.statusNoteVeryLate", { days: info.daysLate }) };
  if (info.status === "late") {
    return {
      tone: "info",
      text:
        info.daysLate >= 7
          ? t("cycle.statusNoteVeryLate", { days: info.daysLate })
          : t("cycle.statusNoteLongPeriod", { day: info.daysLate, usual: info.usualPeriodLength }),
    };
  }
  return null;
}

export function PhaseCard({ info, onPeriodStarted, saving }: { info: PhaseInfo; onPeriodStarted: (date?: string) => void; saving?: boolean }) {
  const { t } = useT();
  const meta = PHASE_META[info.phase];
  const guide = PHASE_GUIDE[info.phase];
  const next = PHASE_META[info.nextPhase];
  const note = statusNote(info, t);
  const [pickDate, setPickDate] = useState(false);
  const [date, setDate] = useState(new Date());

  const phaseLabelMap: Record<Phase, string> = {
    menstrual: t("cycle.menstrualPhase"),
    follicular: t("cycle.follicularPhase"),
    ovulatory: t("cycle.ovulatoryPhase"),
    luteal: t("cycle.lutealPhase"),
  };
  const phaseShortMap: Record<Phase, string> = {
    menstrual: t("cycle.period"),
    follicular: t("cycle.follicular"),
    ovulatory: t("cycle.ovulation"),
    luteal: t("cycle.luteal"),
  };
  const confLabelMap = { high: t("cycle.confidenceHigh"), medium: t("cycle.confidenceMedium"), low: t("cycle.confidenceLow") };
  const hormoneDescMap: Record<Phase, string> = {
    menstrual: t("cycle.hormoneMenstrual"),
    follicular: t("cycle.hormoneFollicular"),
    ovulatory: t("cycle.hormoneOvulatory"),
    luteal: t("cycle.hormoneLuteal"),
  };

  const title =
    info.status === "very-late"
      ? t("cycle.waitingForPeriod")
      : info.late
        ? t("cycle.periodRunningLate")
        : info.status === "long-period"
          ? `${t("cycle.period")}, ${t("cycle.day")} ${info.bleedingDay}`
          : phaseLabelMap[info.phase] || meta.label;
  const showStart = info.late || info.phase === "luteal" || info.bleedingMismatch;
  const conf = CONF_STYLE[info.confidence];

  return (
    <Panel>
      <PhaseRing info={info} />
      <View style={{ marginTop: 20 }}>
        <View style={s.rowWrap}>
          <AppText style={{ fontSize: 12, fontWeight: "500", color: ink[55] }}>{t("common.today")}</AppText>
          <View style={[s.confPill, { backgroundColor: conf.bg, borderColor: conf.border }]}>
            <AppText style={{ fontSize: 11, fontWeight: "600", color: conf.fg }}>{confLabelMap[info.confidence] || CONF_LABEL[info.confidence]}</AppText>
          </View>
          {info.learned ? <AppText style={{ fontSize: 11, color: ink[50] }}>{t("cycle.learnedFromLogs")}</AppText> : null}
        </View>
        <AppText style={[s.phaseTitle, { color: twColor(meta.color) ?? palette.plum900 }]} accessibilityRole="header">
          {title}
        </AppText>
        <AppText style={s.body}>{hormoneDescMap[info.phase] || `${guide.hormones} ${guide.feel}`}</AppText>

        <View style={[s.rowWrap, { marginTop: 16 }]}>
          {info.late ? (
            <Chip label={t("cycle.expectedAgo", { count: info.daysLate })} bg={TW.violet[50]} border={TW.violet[200]} color={TW.violet[700]} />
          ) : !info.bleedingDay && info.daysUntilPeriod === 0 ? (
            <Chip label={t("cycle.dueToday")} bg={TW.rose[50]} border={TW.rose[200]} color={TW.rose[700]} />
          ) : info.status === "long-period" ? (
            <Chip label={t("cycle.follicularStartsAfterBleeding")} />
          ) : (
            <>
              <Chip label={`${phaseShortMap[info.nextPhase] || next.short} ~${info.daysToNextPhase} ${t("common.days")}`} />
              <Chip label={`${t("cycle.nextPeriodIn")} ~${info.daysUntilPeriod} ${t("common.days")}`} bg={TW.rose[50]} border={TW.rose[200]} color={TW.rose[700]} />
            </>
          )}
        </View>

        {note ? (
          <View style={[s.note, note.tone === "watch" ? { backgroundColor: TW.amber[50], borderColor: TW.amber[200] } : null]}>
            <AppText style={{ fontSize: 12, lineHeight: 17, color: note.tone === "watch" ? TW.amber[800] : ink[70] }}>{note.text}</AppText>
          </View>
        ) : null}

        <View style={[s.row, { marginTop: 12, alignItems: "flex-start", gap: 6 }]}>
          <Info size={14} color={ink[50]} style={{ marginTop: 2 }} />
          <AppText style={{ flex: 1, fontSize: 12, lineHeight: 17, color: ink[50] }}>
            {info.confidenceReason.includes("average cycle") ? t("cycle.basedOnAverage") : info.confidenceReason}
          </AppText>
        </View>

        <View style={[s.rowWrap, { marginTop: 16 }]}>
          {showStart ? (
            <PressableScale
              onPress={() => onPeriodStarted()}
              disabled={saving}
              accessibilityRole="button"
              style={[s.pillBtn, { backgroundColor: TW.rose[500] }]}
            >
              <Drop size={16} color="#fff" weight="fill" />
              <AppText style={{ color: "#fff", fontSize: 14, fontWeight: "500" }}>{saving ? t("common.saving") : t("cycle.periodStartedToday")}</AppText>
            </PressableScale>
          ) : null}
          {!pickDate ? (
            <Pressable onPress={() => setPickDate(true)} hitSlop={10} accessibilityRole="button">
              <AppText style={{ fontSize: 12, fontWeight: "500", color: ink[60], textDecorationLine: "underline" }}>{t("cycle.startedOnAnotherDay")}</AppText>
            </Pressable>
          ) : (
            <View style={[s.rowWrap, { alignItems: "center" }]}>
              <DateTimePicker
                value={date}
                mode="date"
                maximumDate={new Date()}
                display={Platform.OS === "ios" ? "compact" : "default"}
                onChange={(e, d) => {
                  if (Platform.OS === "android") {
                    if (e.type === "set" && d) {
                      onPeriodStarted(localIso(d));
                    }
                    setPickDate(false);
                  } else if (d) setDate(d);
                }}
              />
              {Platform.OS !== "android" ? (
                <PressableScale
                  onPress={() => {
                    onPeriodStarted(localIso(date));
                    setPickDate(false);
                  }}
                  disabled={saving}
                  style={[s.pillBtnSm, { backgroundColor: palette.plum900 }]}
                >
                  <AppText style={{ color: "#fff", fontSize: 12, fontWeight: "500" }}>{t("common.save")}</AppText>
                </PressableScale>
              ) : null}
            </View>
          )}
        </View>
      </View>
    </Panel>
  );
}

const KIND_META = {
  move: { icon: Barbell, label: "Move", bg: TW.emerald[50], fg: TW.emerald[600] },
  nourish: { icon: ForkKnife, label: "Nourish", bg: TW.amber[50], fg: TW.amber[600] },
  mind: { icon: Leaf, label: "Mind", bg: TW.violet[50], fg: TW.violet[600] },
} as const;

export function TodayTipsCard({ tips, adapted }: { tips: Tip[]; adapted: boolean }) {
  const { t } = useT();
  return (
    <Panel>
      <PanelTitle
        eyebrow={t("cycle.forYouToday")}
        title={t("cycle.smallThingsFitPhase")}
      />
      {adapted ? (
        <View style={[s.row, { gap: 4, marginTop: 6 }]}>
          <Lightning size={14} color={ink[60]} />
          <AppText style={{ fontSize: 12, color: ink[60] }}>{t("cycle.adjustedFeel")}</AppText>
        </View>
      ) : null}
      <View style={{ gap: 12, marginTop: 16 }}>
        {tips.map((tip) => {
          const k = KIND_META[tip.kind];
          const kindLabel = tip.kind === "move" ? t("cycle.move") : tip.kind === "nourish" ? t("cycle.nourish") : t("cycle.mind");
          return (
            <View key={tip.id} style={s.inner}>
              <View style={[s.row, { gap: 8 }]}>
                <IconBubble icon={k.icon} bg={k.bg} color={k.fg} size={32} />
                <AppText style={{ fontSize: 12, fontWeight: "600", color: ink[60] }}>{kindLabel || k.label}</AppText>
              </View>
              <AppText style={{ marginTop: 12, fontSize: 16, fontWeight: "600", color: palette.plum900 }}>{t(`tips.${tip.id}.title`, tip.title)}</AppText>
              <AppText style={[s.body, { marginTop: 4 }]}>{t(`tips.${tip.id}.text`, tip.text)}</AppText>
            </View>
          );
        })}
      </View>
      <AppText style={{ marginTop: 12, fontSize: 11, color: ink[45] }}>{t("cycle.tipsNote")}</AppText>
    </Panel>
  );
}

export function PainNowCard({ onOpen, todayPain }: { onOpen: () => void; todayPain: number }) {
  const { t } = useT();
  return (
    <Panel tint="#FFF2F3">
      <IconBubble icon={FirstAidKit} bg={TW.rose[100]} color={TW.rose[600]} />
      <AppText style={[s.h2, { marginTop: 16 }]}>{t("cycle.crampsOrPainNow")}</AppText>
      <AppText style={[s.body, { marginTop: 4, color: ink[65] }]}>
        {todayPain >= 5 ? `You logged pain at ${todayPain}/10 today. ` : ""}
        {t("cycle.crampsDesc")}
      </AppText>
      <PressableScale onPress={onOpen} accessibilityRole="button" style={s.fullBtn}>
        <AppText style={{ color: "#fff", fontSize: 16, fontWeight: "500" }}>{t("cycle.helpMeFeelBetter")}</AppText>
      </PressableScale>
    </Panel>
  );
}

export function PmsForecastCard({ forecast }: { forecast: { symptoms: string[]; inDays: number } | null }) {
  const { t } = useT();
  if (!forecast) return null;
  const windowStr = forecast.inDays > 0 ? t("cycle.pmsWindowDays", { days: forecast.inDays }) : t("cycle.pmsWindowNow");
  return (
    <Panel>
      <View style={[s.row, { alignItems: "flex-start", gap: 16 }]}>
        <IconBubble icon={CalendarCheck} bg={TW.violet[100]} color={TW.violet[600]} size={40} />
        <View style={{ flex: 1 }}>
          <AppText style={{ fontSize: 16, fontWeight: "600", color: palette.plum900 }}>{t("cycle.pmsHeadsUp")}</AppText>
          <AppText style={[s.body, { marginTop: 4 }]}>{t("cycle.pmsPrep", { symptoms: forecast.symptoms.join(", "), window: windowStr })}</AppText>
        </View>
      </View>
    </Panel>
  );
}

export function PhaseInsightsCard({ stats, highlights }: { stats: PhaseStat[]; highlights: string[] }) {
  const { t } = useT();
  const has = stats.some((x) => x.days > 0);
  return (
    <Panel>
      <PanelTitle icon={ChartLineUp} iconColor={TW.violet[500]} title={t("cycle.howYouFeelCycle")} />
      {highlights.length > 0 ? (
        <View style={{ marginTop: 12, gap: 6 }}>
          {highlights.map((h) => (
            <View key={h} style={[s.row, { alignItems: "flex-start", gap: 8 }]}>
              <Sparkle size={16} color={palette.pink400} weight="fill" style={{ marginTop: 2 }} />
              <AppText style={{ flex: 1, fontSize: 14, lineHeight: 20, color: ink[80] }}>{h}</AppText>
            </View>
          ))}
        </View>
      ) : (
        <AppText style={[s.body, { marginTop: 8, color: ink[60] }]}>{t("cycle.keepCheckingInInsights")}</AppText>
      )}
      {has ? (
        <View style={s.grid2}>
          {stats.map((st) => {
            const m = PHASE_META[st.phase];
            const soft = twSoft(m.soft);
            return (
              <View key={st.phase} style={[s.statBox, { backgroundColor: soft.bg, borderColor: soft.border }]}>
                <AppText style={{ fontSize: 14, fontWeight: "600", color: twColor(m.color) }}>{m.short}</AppText>
                <AppText style={{ fontSize: 11, color: ink[50] }}>{t("cycle.loggedDays", { count: st.days })}</AppText>
                <View style={{ marginTop: 12, gap: 4 }}>
                  <StatRow k={t("cycle.sleep")} v={`${st.avgSleep ?? "—"}${st.avgSleep ? " h" : ""}`} />
                  <StatRow k={t("cycle.pain")} v={`${st.avgPain ?? "—"}${st.avgPain !== null ? "/10" : ""}`} />
                  <StatRow k={t("cycle.mood")} v={st.topMood ?? "—"} />
                </View>
                {st.topSymptoms.length > 0 ? (
                  <AppText numberOfLines={1} style={{ marginTop: 8, fontSize: 11, color: ink[55] }}>
                    {st.topSymptoms.join(", ")}
                  </AppText>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </Panel>
  );
}

function StatRow({ k, v }: { k: string; v: string }) {
  return (
    <View style={[s.row, { justifyContent: "space-between", gap: 8 }]}>
      <AppText style={{ fontSize: 12, color: ink[75] }}>{k}</AppText>
      <AppText numberOfLines={1} style={{ fontSize: 12, fontWeight: "500", color: ink[75], flexShrink: 1 }}>
        {v}
      </AppText>
    </View>
  );
}

export function PatternsCard({ patterns, logCount }: { patterns: Pattern[]; logCount: number }) {
  const { t } = useT();
  const [open, setOpen] = useState<string | null>(patterns[0]?.id ?? null);
  return (
    <Panel>
      <PanelTitle icon={Stethoscope} iconColor={palette.pink500} title={t("cycle.worthMentioningDoctor")} subtitle={t("cycle.worthMentioningDoctorDesc")} />
      {patterns.length === 0 ? (
        <View style={[s.row, s.okBox]}>
          <CheckCircle size={20} color={TW.emerald[800]} weight="fill" />
          <AppText style={{ flex: 1, fontSize: 14, lineHeight: 20, color: TW.emerald[800] }}>
            {logCount < 20 ? t("cycle.nothingStandsOutEarly") : t("cycle.nothingStandsOut")}
          </AppText>
        </View>
      ) : (
        <View style={{ marginTop: 16, gap: 8 }}>
          {patterns.map((p) => {
            const isOpen = open === p.id;
            return (
              <View key={p.id} style={s.innerTight}>
                <Pressable
                  onPress={() => setOpen((o) => (o === p.id ? null : p.id))}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  style={[s.row, { justifyContent: "space-between", gap: 12, padding: 16, minHeight: 48 }]}
                >
                  <View style={[s.row, { gap: 10, flex: 1 }]}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: p.tone === "watch" ? TW.amber[400] : TW.sky[400] }} />
                    <AppText style={{ flex: 1, fontSize: 14, fontWeight: "500", color: palette.plum900 }}>{p.title}</AppText>
                  </View>
                  <CaretRight size={16} color={ink[40]} style={{ transform: [{ rotate: isOpen ? "90deg" : "0deg" }] }} />
                </Pressable>
                {isOpen ? (
                  <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 6 }}>
                    <AppText style={{ fontSize: 14, lineHeight: 20, color: ink[75] }}>{p.detail}</AppText>
                    <AppText style={{ fontSize: 12, color: ink[50] }}>{p.evidence}</AppText>
                    <AppText style={{ fontSize: 14, lineHeight: 20, color: palette.plum900 }}>
                      <AppText style={{ fontWeight: "500", fontSize: 14 }}>{t("cycle.youCouldAsk")} </AppText>
                      {p.ask}
                    </AppText>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </Panel>
  );
}

function LinkRow({ icon: I, color, bg, title, sub, onPress }: { icon: typeof FileText; color: string; bg: string; title: string; sub: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" style={[s.linkRow, { backgroundColor: bg }]}>
      <I size={28} color={color} weight="duotone" />
      <View style={{ flex: 1 }}>
        <AppText style={{ fontSize: 16, fontWeight: "500", color: palette.plum900 }}>{title}</AppText>
        <AppText style={{ fontSize: 12, color: ink[60] }}>{sub}</AppText>
      </View>
    </PressableScale>
  );
}

export function CareLinksCard({ onOpenRelief, onOpenSettings, favourites }: { onOpenRelief: () => void; onOpenSettings: () => void; favourites: string[] }) {
  const { t } = useT();
  const router = useRouter();
  return (
    <Panel style={{ gap: 12 }}>
      <LinkRow icon={FirstAidKit} color={TW.rose[500]} bg="rgba(255,241,242,0.8)" title={t("cycle.painReliefToolkit")} sub={favourites.length ? favourites.join(", ") : t("cycle.crampsRotatingIdeas")} onPress={onOpenRelief} />
      <LinkRow icon={FileText} color={palette.plum900} bg="rgba(255,255,255,0.75)" title={t("cycle.doctorVisitSummary")} sub={t("cycle.doctorVisitSummaryDesc")} onPress={() => router.push({ pathname: "/doctor-summary", params: { mode: "her" } })} />
      <LinkRow icon={ShieldCheck} color={TW.emerald[600]} bg="rgba(255,255,255,0.75)" title={t("header.settings")} sub={t("settings.preferredNameHint")} onPress={onOpenSettings} />
    </Panel>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  legend: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", columnGap: 16, rowGap: 4, maxWidth: 260 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6, width: 112 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: ink[60] },
  confPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  phaseTitle: { fontSize: 30, lineHeight: 36, fontWeight: "600", letterSpacing: -0.6, marginTop: 4 },
  h2: { fontSize: 20, lineHeight: 26, fontWeight: "600", letterSpacing: -0.3, color: palette.plum900 },
  body: { fontSize: 14, lineHeight: 21, color: ink[75], marginTop: 8 },
  note: { marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: ink[10], backgroundColor: "rgba(255,255,255,0.7)", paddingHorizontal: 12, paddingVertical: 8 },
  pillBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 999, paddingHorizontal: 16, minHeight: 44 },
  pillBtnSm: { borderRadius: 999, paddingHorizontal: 14, minHeight: 36, justifyContent: "center" },
  inner: { borderRadius: 16, backgroundColor: "rgba(255,255,255,0.75)", borderWidth: 1, borderColor: palette.pink100, padding: 16 },
  innerTight: { borderRadius: 16, backgroundColor: "rgba(255,255,255,0.75)", borderWidth: 1, borderColor: palette.pink100 },
  fullBtn: { marginTop: 20, backgroundColor: palette.plum900, borderRadius: 999, minHeight: 50, alignItems: "center", justifyContent: "center" },
  grid2: { marginTop: 20, flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statBox: { flexBasis: "47%", flexGrow: 1, borderRadius: 16, borderWidth: 1, padding: 16 },
  okBox: { marginTop: 16, gap: 8, alignItems: "flex-start", borderRadius: 16, backgroundColor: "rgba(236,253,245,0.7)", borderWidth: 1, borderColor: TW.emerald[100], padding: 16 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 16, borderRadius: 16, borderWidth: 1, borderColor: palette.pink100, padding: 16, minHeight: 64 },
});
