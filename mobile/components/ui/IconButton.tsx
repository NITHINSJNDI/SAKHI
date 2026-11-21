import type { Icon } from "phosphor-react-native";

import { useAppTheme } from "@/theme";

import { PressableScale } from "./PressableScale";

export interface IconButtonProps {
  icon: Icon;
  label: string;
  onPress: () => void;
  variant?: "soft" | "primary";
}

/** 44pt round icon-only button with an accessible label. */
export function IconButton({ icon: IconCmp, label, onPress, variant = "soft" }: IconButtonProps) {
  const theme = useAppTheme();
  const primary = variant === "primary";
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      scaleTo={0.92}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: primary ? theme.primary : theme.surfaceMuted,
      }}
    >
      <IconCmp size={20} color={primary ? theme.primaryContrast : theme.text} weight="bold" />
    </PressableScale>
  );
}
