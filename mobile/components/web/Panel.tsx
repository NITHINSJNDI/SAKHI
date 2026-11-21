import type { Icon } from "phosphor-react-native";
import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { AppText } from "@/components/AppText";
import { palette } from "@/theme";

/**
 * The web dashboard's card surface (HerPanels `panelCard`): soft white,
 * whisper plum border, plum-tinted shadow, 24pt corners.
 */
export function Panel({ children, style, tint }: { children: ReactNode; style?: StyleProp<ViewStyle>; tint?: string }) {
  return <View style={[styles.panel, tint ? { backgroundColor: tint } : null, style]}>{children}</View>;
}

/** Card title row: optional coloured icon, title, optional eyebrow and right slot. */
export function PanelTitle({
  title,
  eyebrow,
  icon: IconCmp,
  iconColor = palette.pink500,
  right,
  subtitle,
}: {
  title: string;
  eyebrow?: string;
  icon?: Icon;
  iconColor?: string;
  right?: ReactNode;
  subtitle?: string;
}) {
  return (
    <View style={styles.titleWrap}>
      <View style={styles.titleRow}>
        <View style={{ flex: 1, gap: 2 }}>
          {eyebrow ? <AppText style={styles.eyebrow}>{eyebrow}</AppText> : null}
          <View style={styles.titleInner}>
            {IconCmp ? <IconCmp size={20} color={iconColor} weight="duotone" /> : null}
            <AppText style={styles.title} accessibilityRole="header">
              {title}
            </AppText>
          </View>
        </View>
        {right}
      </View>
      {subtitle ? <AppText style={styles.subtitle}>{subtitle}</AppText> : null}
    </View>
  );
}

/** Round tinted icon bubble used across the web cards. */
export function IconBubble({ icon: IconCmp, bg, color, size = 44 }: { icon: Icon; bg: string; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
      <IconCmp size={size * 0.52} color={color} weight="duotone" />
    </View>
  );
}

/** Pill chip (web: rounded-full px-3 py-1.5 text-xs border). */
export function Chip({ label, bg = "rgba(255,255,255,0.8)", border = "rgba(42,21,47,0.10)", color = "rgba(42,21,47,0.75)" }: { label: string; bg?: string; border?: string; color?: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: bg, borderColor: border }]}>
      <AppText style={[styles.chipText, { color }]}>{label}</AppText>
    </View>
  );
}

export const ink = {
  900: palette.plum900,
  80: "rgba(42,21,47,0.80)",
  75: "rgba(42,21,47,0.75)",
  70: "rgba(42,21,47,0.70)",
  65: "rgba(42,21,47,0.65)",
  60: "rgba(42,21,47,0.60)",
  55: "rgba(42,21,47,0.55)",
  50: "rgba(42,21,47,0.50)",
  45: "rgba(42,21,47,0.45)",
  40: "rgba(42,21,47,0.40)",
  10: "rgba(42,21,47,0.10)",
  7: "rgba(42,21,47,0.07)",
  5: "rgba(42,21,47,0.05)",
};

export const styles = StyleSheet.create({
  panel: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(42,21,47,0.07)",
    padding: 20,
    overflow: "hidden",
    shadowColor: "#4A2A52",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  titleWrap: { gap: 4 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  titleInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  eyebrow: { fontSize: 12, fontWeight: "500", color: ink[55] },
  title: { fontSize: 20, lineHeight: 26, fontWeight: "600", letterSpacing: -0.3, color: palette.plum900, flexShrink: 1 },
  subtitle: { fontSize: 12, lineHeight: 17, color: ink[55] },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, alignSelf: "flex-start" },
  chipText: { fontSize: 12, lineHeight: 16 },
});
