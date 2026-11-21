import { Eye, EyeSlash } from "phosphor-react-native";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";

import { AppText } from "@/components/AppText";
import { palette, radii, spacing } from "@/theme";

export interface TextFieldProps extends Omit<TextInputProps, "style"> {
  label: string;
  hint?: string;
  secure?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export function TextField({
  label,
  hint,
  secure = false,
  containerStyle,
  editable = true,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      <AppText variant="label" style={styles.label}>
        {label}
      </AppText>
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: "#FFFFFF",
            borderColor: focused ? palette.plum900 : "rgba(42, 21, 47, 0.12)",
            borderWidth: focused ? 1.5 : 1,
            opacity: editable ? 1 : 0.6,
          },
          focused ? styles.inputFocused : styles.inputUnfocused,
        ]}
      >
        <TextInput
          {...inputProps}
          editable={editable}
          onFocus={(event) => {
            setFocused(true);
            inputProps.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            inputProps.onBlur?.(event);
          }}
          placeholderTextColor="rgba(42, 21, 47, 0.38)"
          secureTextEntry={secure && !revealed}
          style={[
            styles.input,
            {
              color: palette.plum900,
              paddingRight: secure ? 46 : spacing.md,
            },
          ]}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Hide password" : "Show password"}
            accessibilityState={{ selected: revealed }}
            hitSlop={12}
            onPress={() => setRevealed((current) => !current)}
            style={styles.eyeButton}
          >
            {revealed ? (
              <EyeSlash size={20} color={palette.plum900} />
            ) : (
              <Eye size={20} color="rgba(42, 21, 47, 0.55)" />
            )}
          </Pressable>
        ) : null}
      </View>
      {hint ? (
        <AppText variant="caption" tone="soft" style={styles.hint}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: palette.plum900,
    letterSpacing: 0.1,
  },
  inputWrap: {
    borderRadius: radii.soft,
    minHeight: 50,
    justifyContent: "center",
  },
  inputFocused: {
    shadowColor: "rgba(42, 21, 47, 0.12)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  inputUnfocused: {
    shadowColor: "rgba(42, 21, 47, 0.04)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    fontSize: 15,
  },
  eyeButton: {
    position: "absolute",
    right: spacing.sm,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  hint: {
    fontSize: 12,
    lineHeight: 16,
    color: "rgba(42, 21, 47, 0.60)",
  },
});
