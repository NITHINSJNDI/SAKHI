/**
 * Lightweight SVG charts (stand-ins for the web's Recharts): line with an optional
 * shaded range band, bars, and stacked dots. Width follows the container.
 */
import { useState, type ReactNode } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from "react-native-svg";

import { AppText } from "@/components/AppText";
import { selectHaptic } from "@/lib/haptics";
import { fonts } from "@/theme";

const AXIS = "rgba(45,27,54,0.5)";
const GRID = "rgba(45,27,54,0.06)";

function useWidth() {
  const [w, setW] = useState(0);
  return { w, onLayout: (e: LayoutChangeEvent) => setW(Math.round(e.nativeEvent.layout.width)) };
}

const niceTicks = (min: number, max: number, count = 4) => {
  if (min === max) return [min];
  // Round step: 1, 2, 2.5, 5 or 10 × 10^n, so axes read 60 / 90 / 120, not 82.5
  const raw = (max - min) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((st) => st >= raw) ?? raw;
  const start = Math.ceil(min / step) * step;
  const out: number[] = [];
  for (let v = start; v <= max + 1e-9; v += step) out.push(Math.round(v * 100) / 100);
  return out;
};

export interface LinePoint {
  label: string;
  value: number | null;
  /** optional shaded range for this point, e.g. healthy weight band */
  band?: [number, number];
}

export interface LineSeries {
  key: string;
  color: string;
  points: (number | null)[];
  dashed?: boolean;
  /** draw a soft gradient fill under the line */
  fill?: boolean;
}

/** Multi-series line chart over shared x labels. */
export function LineChart({
  labels,
  series,
  bands,
  height = 200,
  yMin,
  yMax,
  unit = "",
  refLines = [],
  empty,
}: {
  labels: string[];
  series: LineSeries[];
  bands?: ([number, number] | null)[];
  height?: number;
  yMin?: number;
  yMax?: number;
  unit?: string;
  refLines?: { y: number; color: string; label?: string }[];
  empty?: ReactNode;
}) {
  const { w, onLayout } = useWidth();
  const [active, setActive] = useState<number | null>(null);
  const all = [
    ...series.flatMap((s) => s.points.filter((v): v is number => v !== null && Number.isFinite(v))),
    ...(bands || []).flatMap((b) => (b ? b : [])),
    ...refLines.map((r) => r.y),
  ];
  const hasData = series.some((s) => s.points.filter((v) => v !== null).length >= 1);
  if (!hasData && empty) return <>{empty}</>;

  const lo = yMin ?? (all.length ? Math.floor(Math.min(...all) - 1) : 0);
  const hi = yMax ?? (all.length ? Math.ceil(Math.max(...all) + 1) : 1);
  const left = 40, right = 8, top = 8, bottom = 22;
  const iw = Math.max(1, w - left - right), ih = height - top - bottom;
  const n = labels.length;
  const x = (i: number) => left + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => top + ih - ((v - lo) / (hi - lo || 1)) * ih;
  const ticks = niceTicks(lo, hi);
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(iw / 56))));

  const pathFor = (pts: (number | null)[]) => {
    let d = "";
    let pen = false;
    pts.forEach((v, i) => {
      if (v === null || !Number.isFinite(v)) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      pen = true;
    });
    return d.trim();
  };
  const bandPath = (() => {
    if (!bands?.some(Boolean)) return "";
    const idx = bands.map((b, i) => (b ? i : -1)).filter((i) => i >= 0);
    const upper = idx.map((i, k) => `${k ? "L" : "M"}${x(i)},${y(bands[i]![1])}`).join(" ");
    const lower = [...idx].reverse().map((i) => `L${x(i)},${y(bands[i]![0])}`).join(" ");
    return `${upper} ${lower} Z`;
  })();

  const pick = (px: number) => {
    if (n < 1 || w <= 0) return;
    const i = n <= 1 ? 0 : Math.round(((px - left) / iw) * (n - 1));
    const next = Math.max(0, Math.min(n - 1, i));
    if (next !== active) {
      selectHaptic();
      setActive(next);
    }
  };
  const tip = active !== null && active < n ? series.map((s) => ({ color: s.color, v: s.points[active] })).filter((p) => p.v !== null && Number.isFinite(p.v as number)) : [];
  const tipX = active !== null ? x(active) : 0;
  const tipW = 92;

  return (
    <View
      onLayout={onLayout}
      style={{ width: "100%", height }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => false}
      onResponderTerminationRequest={() => true}
      onResponderGrant={(e) => pick(e.nativeEvent.locationX)}
      onResponderMove={(e) => pick(e.nativeEvent.locationX)}
      onResponderRelease={() => setTimeout(() => setActive(null), 1600)}
      accessibilityHint="Touch and drag to read values"
    >
      {w > 0 ? (
        <Svg width={w} height={height}>
          <Defs>
            {series.map((s) => (
              <LinearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={s.color} stopOpacity={0.22} />
                <Stop offset="1" stopColor={s.color} stopOpacity={0} />
              </LinearGradient>
            ))}
          </Defs>
          {ticks.map((tk) => (
            <G key={tk}>
              <Line x1={left} x2={w - right} y1={y(tk)} y2={y(tk)} stroke={GRID} strokeDasharray="3 3" />
              <SvgText x={left - 6} y={y(tk) + 3} fontSize={10} fill={AXIS} textAnchor="end" fontFamily={fonts.regular}>
                {`${tk}${unit}`}
              </SvgText>
            </G>
          ))}
          {bandPath ? <Path d={bandPath} fill="rgba(16,185,129,0.14)" /> : null}
          {refLines.map((r) => (
            <G key={`${r.y}-${r.color}`}>
              <Line x1={left} x2={w - right} y1={y(r.y)} y2={y(r.y)} stroke={r.color} strokeDasharray="4 4" strokeWidth={1} />
              {r.label ? (
                <G>
                  <Rect x={left + 4} y={y(r.y) - 15} width={r.label.length * 5.2 + 10} height={13} rx={6.5} fill="rgba(255,255,255,0.92)" stroke={r.color} strokeOpacity={0.35} />
                  <SvgText x={left + 9} y={y(r.y) - 5.5} fontSize={9} fill={r.color} fontFamily={fonts.medium}>
                    {r.label}
                  </SvgText>
                </G>
              ) : null}
            </G>
          ))}
          {series.map((s) => {
            const d = pathFor(s.points);
            if (!d) return null;
            const firstI = s.points.findIndex((v) => v !== null);
            const lastI = s.points.length - 1 - [...s.points].reverse().findIndex((v) => v !== null);
            const area = s.fill && firstI >= 0 ? `${d} L${x(lastI)},${top + ih} L${x(firstI)},${top + ih} Z` : "";
            return (
              <G key={s.key}>
                {area ? <Path d={area} fill={`url(#fill-${s.key})`} /> : null}
                <Path d={d} stroke={s.color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? "5 4" : undefined} />
                {s.points.map((v, i) => (v !== null && Number.isFinite(v) ? <Circle key={i} cx={x(i)} cy={y(v)} r={2.5} fill={s.color} /> : null))}
              </G>
            );
          })}
          {active !== null && tip.length ? (
            <G>
              <Line x1={tipX} x2={tipX} y1={top} y2={top + ih} stroke="rgba(42,21,47,0.25)" strokeDasharray="2 3" />
              {tip.map((p, k) => (
                <Circle key={k} cx={tipX} cy={y(p.v as number)} r={5} fill="#fff" stroke={p.color} strokeWidth={2.5} />
              ))}
              <G x={Math.min(Math.max(tipX - tipW / 2, left), w - right - tipW)} y={top}>
                <Rect width={tipW} height={16 + tip.length * 13} rx={8} fill="rgba(42,21,47,0.92)" />
                <SvgText x={8} y={12} fontSize={9} fill="rgba(255,255,255,0.7)" fontFamily={fonts.medium}>
                  {labels[active]}
                </SvgText>
                {tip.map((p, k) => (
                  <G key={k}>
                    <Circle cx={11} cy={22 + k * 13} r={3} fill={p.color} />
                    <SvgText x={19} y={25.5 + k * 13} fontSize={10.5} fill="#fff" fontFamily={fonts.semibold}>
                      {`${Math.round((p.v as number) * 10) / 10}${unit}`}
                    </SvgText>
                  </G>
                ))}
              </G>
            </G>
          ) : null}
          {labels.map((l, i) =>
            i === n - 1 || (i % labelEvery === 0 && n - 1 - i >= Math.max(1, labelEvery * 0.6)) ? (
              <SvgText key={`${l}-${i}`} x={x(i)} y={height - 6} fontSize={10} fill={AXIS} textAnchor="middle" fontFamily={fonts.regular}>
                {l}
              </SvgText>
            ) : null,
          )}
        </Svg>
      ) : null}
    </View>
  );
}

/** Vertical bar chart (one value per label). */
export function BarChart({
  data,
  height = 180,
  color = "#EC4899",
  colorFor,
  max,
  unit = "",
  empty,
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  colorFor?: (v: number, i: number) => string;
  max?: number;
  unit?: string;
  empty?: ReactNode;
}) {
  const { w, onLayout } = useWidth();
  if (!data.length && empty) return <>{empty}</>;
  const top = 14, bottom = 22, left = 4, right = 4;
  const iw = Math.max(1, w - left - right), ih = height - top - bottom;
  const hi = max ?? Math.max(1, ...data.map((d) => d.value));
  const slot = iw / Math.max(1, data.length);
  const bw = Math.min(28, slot * 0.6);
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(iw / 44))));
  return (
    <View onLayout={onLayout} style={{ width: "100%", height }}>
      {w > 0 ? (
        <Svg width={w} height={height}>
          <Line x1={left} x2={w - right} y1={top + ih} y2={top + ih} stroke={GRID} />
          {data.map((d, i) => {
            const h = Math.max(d.value > 0 ? 3 : 0, (d.value / hi) * ih);
            const cx = left + slot * i + slot / 2;
            return (
              <G key={`${d.label}-${i}`}>
                <Rect x={cx - bw / 2} y={top + ih - h} width={bw} height={h} rx={Math.min(6, bw / 2)} fill={colorFor ? colorFor(d.value, i) : color} />
                {data.length <= 12 && d.value > 0 ? (
                  <SvgText x={cx} y={top + ih - h - 3} fontSize={9} fill={AXIS} textAnchor="middle" fontFamily={fonts.medium}>
                    {`${Math.round(d.value * 10) / 10}${unit}`}
                  </SvgText>
                ) : null}
                {i % labelEvery === 0 ? (
                  <SvgText x={cx} y={height - 6} fontSize={10} fill={AXIS} textAnchor="middle" fontFamily={fonts.regular}>
                    {d.label}
                  </SvgText>
                ) : null}
              </G>
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}

/** Horizontal bars with labels (e.g. "most common symptoms"). */
export function HBarList({ data, color = "#A855F7", unit = "" }: { data: { label: string; value: number }[]; color?: string; unit?: string }) {
  const hi = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={{ gap: 10 }}>
      {data.map((d) => (
        <View key={d.label} style={{ gap: 4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText style={{ fontSize: 13, color: "rgba(42,21,47,0.8)" }}>{d.label}</AppText>
            <AppText style={{ fontSize: 12, fontWeight: "600", color: "rgba(42,21,47,0.7)" }}>
              {d.value}
              {unit}
            </AppText>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: "rgba(42,21,47,0.06)", overflow: "hidden" }}>
            <View style={{ height: "100%", width: `${(d.value / hi) * 100}%`, borderRadius: 4, backgroundColor: color }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Dashed empty-state box used when a chart has nothing to show yet. */
export function ChartEmpty({ text, height = 112 }: { text: string; height?: number }) {
  return (
    <View style={{ height, borderRadius: 16, borderWidth: 1, borderStyle: "dashed", borderColor: "#FBCFE8", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 }}>
      <AppText style={{ fontSize: 14, textAlign: "center", color: "rgba(42,21,47,0.55)" }}>{text}</AppText>
    </View>
  );
}

/** Small legend row. */
export function Legend({ items }: { items: { color: string; label: string; dashed?: boolean }[] }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
      {items.map((it) => (
        <View key={it.label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 14, height: 3, borderRadius: 2, backgroundColor: it.color, opacity: it.dashed ? 0.6 : 1 }} />
          <AppText style={{ fontSize: 11, color: "rgba(42,21,47,0.6)" }}>{it.label}</AppText>
        </View>
      ))}
    </View>
  );
}
