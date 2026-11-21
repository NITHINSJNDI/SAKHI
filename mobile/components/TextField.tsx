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
import { radii, spacing, useAppTheme } from "@/theme";

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
  const theme = useAppTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      <AppText variant="label">{label}</AppText>
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: focused ? theme.surfaceRaised : theme.surfaceMuted,
            borderColor: focused ? theme.accent : theme.border,
            opacity: editable ? 1 : 0.6,
          },
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
          placeholderTextColor={theme.textFaint}
          secureTextEntry={secure && !revealed}
          style={[
            styles.input,
            {
              color: theme.text,
              paddingRight: secure ? 48 : spacing.md,
            },
          ]}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Hide password" : "Show password"}
            accessibilityState={{ selected: revealed }}
            hitSlop={8}
            onPress={() => setRevealed((current) => !current)}
            style={styles.eyeButton}
          >
            {revealed ? (
              <EyeSlash size={20} color={theme.textSoft} />
            ) : (
              <Eye size={20} color={theme.textSoft} />
            )}
          </Pressable>
        ) : null}
      </View>
      {hint ? (
        <AppText variant="caption" tone="soft">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  inputWrap: {
    borderRadius: radii.soft,
    borderWidth: 1,
    minHeight: 50,
    justifyContent: "center",
  },
  input: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    fontSize: 16,
  },
  eyeButton: {
    position: "absolute",
    right: spacing.sm,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
});
