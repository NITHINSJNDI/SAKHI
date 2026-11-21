import { CheckCircle, WarningCircle } from "phosphor-react-native";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { radii, spacing, useAppTheme } from "@/theme";

export interface AlertMessageProps {
  kind: "error" | "success";
  message: string;
}

export function AlertMessage({ kind, message }: AlertMessageProps) {
  const theme = useAppTheme();
  const isError = kind === "error";
  const backgroundColor = isError ? theme.errorBg : theme.successBg;
  const borderColor = isError ? theme.errorBorder : theme.successBorder;
  const textColor = isError ? theme.errorText : theme.successText;
  const Icon = isError ? WarningCircle : CheckCircle;

  return (
    <View
      accessibilityRole="alert"
      style={[styles.container, { backgroundColor, borderColor }]}
    >
      <Icon size={19} color={textColor} weight="fill" />
      <AppText variant="caption" style={[styles.message, { color: textColor }]}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: radii.soft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  message: {
    flex: 1,
  },
});
