/** Small controls the web cards share: toggle chips, check rows, steppers, inset inputs, pill buttons. */
import { Check, Minus, Plus, type Icon } from "phosphor-react-native";
import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";

import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/ui";
import { selectHaptic } from "@/lib/haptics";
import { fonts, palette } from "@/theme";

import { ink } from "./Panel";

/** Web `chip(on)`: plum when on, white with a whisper border when off. */
export function ToggleChip({ label, on, onPress, icon: IconCmp }: { label: string; on: boolean; onPress: () => void; icon?: Icon }) {
  return (
    <PressableScale
      onPress={() => {
        selectHaptic();
        onPress();
      }}
      haptic={false}
      scaleTo={0.95}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={[s.chip, on ? s.chipOn : s.chipOff]}
    >
      {on && !IconCmp ? <Check size={13} color={palette.cream} weight="bold" /> : null}
      {IconCmp ? <IconCmp size={14} color={on ? palette.cream : palette.plum900} weight={on ? "fill" : "regular"} /> : null}
      <AppText style={{ fontSize: 14, fontWeight: "500", color: on ? palette.cream : palette.plum900 }}>{label}</AppText>
    </PressableScale>
  );
}

/** Big selectable option card (radio-like), e.g. goal choice. */
export function OptionCard({ title, hint, on, onPress }: { title: string; hint?: string; on: boolean; onPress: () => void }) {
  return (
    <PressableScale
      onPress={() => {
        selectHaptic();
        onPress();
      }}
      haptic={false}
      scaleTo={0.98}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      style={[s.option, on ? { backgroundColor: palette.plum900, borderColor: palette.plum900 } : null]}
    >
      <AppText style={{ fontSize: 14, fontWeight: "600", color: on ? palette.cream : palette.plum900 }}>{title}</AppText>
      {hint ? <AppText style={{ fontSize: 12, color: on ? "rgba(251,246,243,0.75)" : "rgba(42,21,47,0.68)" }}>{hint}</AppText> : null}
    </PressableScale>
  );
}

/** Checkbox row (web: label + input[type=checkbox]). */
export function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <PressableScale
      onPress={() => {
        selectHaptic();
        onChange(!checked);
      }}
      haptic={false}
      scaleTo={0.98}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={s.checkRow}
    >
      <View style={[s.box, checked ? { backgroundColor: palette.plum900, borderColor: palette.plum900 } : null]}>
        {checked ? <Check size={14} color="#fff" weight="bold" /> : null}
      </View>
      <AppText style={{ flex: 1, fontSize: 14, lineHeight: 20, color: palette.plum900 }}>{label}</AppText>
    </PressableScale>
  );
}

/** − n + counter. */
export function Stepper({ value, onChange, min = 0, max = 99, label, icon: IconCmp }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string; icon?: Icon }) {
  return (
    <View style={s.stepper}>
      {IconCmp ? <IconCmp size={16} color={palette.blush500} /> : null}
      <AppText style={{ fontSize: 14, color: palette.plum900 }}>{label}</AppText>
      <PressableScale accessibilityLabel={`One fewer: ${label}`} onPress={() => onChange(Math.max(min, value - 1))} scaleTo={0.9} style={s.stepBtn}>
        <Minus size={14} color={palette.plum900} weight="bold" />
      </PressableScale>
      <AppText style={{ width: 22, textAlign: "center", fontSize: 14, fontWeight: "600", color: palette.plum900 }} accessibilityLiveRegion="polite">
        {value}
      </AppText>
      <PressableScale accessibilityLabel={`One more: ${label}`} onPress={() => onChange(Math.min(max, value + 1))} scaleTo={0.9} style={s.stepBtn}>
        <Plus size={14} color={palette.plum900} weight="bold" />
      </PressableScale>
    </View>
  );
}

/** Pill button: plum (primary), white (secondary), rose (danger-ish). */
export function PillButton({
  label,
  onPress,
  variant = "primary",
  icon: IconCmp,
  busy,
  disabled,
  full,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "rose" | "ghost";
  icon?: Icon;
  busy?: boolean;
  disabled?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = variant === "primary" ? palette.plum900 : variant === "rose" ? "#F43F5E" : variant === "secondary" ? "#FFFFFF" : "transparent";
  const fg = variant === "primary" || variant === "rose" ? "#FFFFFF" : palette.plum900;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled }}
      style={[
        s.pill,
        { backgroundColor: bg },
        variant === "secondary" ? { borderWidth: 1, borderColor: "rgba(42,21,47,0.12)" } : null,
        full ? { alignSelf: "stretch" } : null,
        style,
      ]}
    >
      {busy ? <ActivityIndicator size="small" color={fg} /> : IconCmp ? <IconCmp size={16} color={fg} weight="bold" /> : null}
      <AppText style={{ fontSize: 14, fontWeight: "500", color: fg }}>{label}</AppText>
    </PressableScale>
  );
}

/** Inset text input (web: rounded-xl border bg-cream/60). */
export function Field({ label, style, ...rest }: TextInputProps & { label?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: 4 }, style]}>
      {label ? <AppText style={{ fontSize: 14, fontWeight: "500", color: palette.plum900 }}>{label}</AppText> : null}
      <TextInput placeholderTextColor={ink[40]} {...rest} style={s.input} />
    </View>
  );
}

/** Coloured status badge with tinted background. */
export function StatusBadge({ text, bg, fg }: { text: string; bg: string; fg: string }) {
  return (
    <View style={{ alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: bg }}>
      <AppText style={{ fontSize: 12, fontWeight: "600", color: fg }}>{text}</AppText>
    </View>
  );
}

/** Tinted info box (web: rounded-2xl bg-lavender-50 p-3). */
export function InfoBox({ children, bg = palette.lavender50, style }: { children: ReactNode; bg?: string; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ borderRadius: 16, backgroundColor: bg, padding: 12 }, style]}>{children}</View>;
}

export function Bullet({ children, color = palette.blush400 }: { children: ReactNode; color?: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <View style={{ marginTop: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <View style={{ flex: 1 }}>{typeof children === "string" || typeof children === "number" ? <AppText style={{ fontSize: 13, lineHeight: 19, color: palette.plum900 }}>{children}</AppText> : children}</View>
    </View>
  );
}

export const atom = StyleSheet.create({
  soft: { fontSize: 14, lineHeight: 20, color: "rgba(42,21,47,0.68)" },
  small: { fontSize: 12, lineHeight: 17, color: "rgba(42,21,47,0.68)" },
  faint: { fontSize: 11, lineHeight: 15, color: ink[45] },
  strong: { fontSize: 14, lineHeight: 20, fontWeight: "600", color: palette.plum900 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
});

const s = StyleSheet.create({
  chip: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, minHeight: 40 },
  chipOn: { backgroundColor: palette.plum900, borderColor: palette.plum900 },
  chipOff: { backgroundColor: "#FFFFFF", borderColor: "rgba(42,21,47,0.12)" },
  option: { borderRadius: 16, borderWidth: 1, borderColor: "rgba(42,21,47,0.10)", backgroundColor: "rgba(255,255,255,0.8)", paddingHorizontal: 16, paddingVertical: 12, gap: 2 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1, borderColor: ink[7], backgroundColor: "rgba(255,255,255,0.75)", paddingHorizontal: 12, minHeight: 48 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: "rgba(42,21,47,0.3)", alignItems: "center", justifyContent: "center" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, borderWidth: 1, borderColor: "rgba(42,21,47,0.12)", backgroundColor: "#fff", paddingLeft: 10, paddingRight: 4, minHeight: 44, alignSelf: "flex-start" },
  stepBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  pill: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 999, paddingHorizontal: 18, minHeight: 44, alignSelf: "flex-start" },
  input: { borderRadius: 12, borderWidth: 1, borderColor: "rgba(42,21,47,0.12)", backgroundColor: "rgba(251,246,243,0.6)", paddingHorizontal: 12, minHeight: 44, fontSize: 16, color: palette.plum900, fontFamily: fonts.regular },
});
