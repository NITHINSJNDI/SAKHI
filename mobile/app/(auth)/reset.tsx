import { useRouter } from "expo-router";
import { ArrowLeft, Lock } from "phosphor-react-native";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AlertMessage } from "@/components/AlertMessage";
import { AppText } from "@/components/AppText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TextField } from "@/components/TextField";
import { apiFetch } from "@/lib/api";
import { AUTH_COPY } from "@/lib/auth-copy";
import { radii, spacing, useAppTheme } from "@/theme";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Password reset with a 6-digit emailed code:
 * 1. POST /api/auth/password-reset/request { email }
 * 2. POST /api/auth/password-reset/confirm { email, code, password }
 */
export default function ResetScreen() {
  const theme = useAppTheme();
  const router = useRouter();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(auth)/login"));

  const sendCode = async () => {
    setError(null);
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) {
      setError(AUTH_COPY.validEmailRequired);
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/api/auth/password-reset/request", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ email: clean }),
      });
      setEmail(clean);
      setStep("code");
      setInfo(`If an account exists for ${clean}, we've emailed a 6-digit code. It expires in 15 minutes.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : AUTH_COPY.genericError);
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code from the email.");
      return;
    }
    if (password.length < 8) {
      setError(AUTH_COPY.passwordTooShort);
      return;
    }
    if (password !== confirm) {
      setError(AUTH_COPY.passwordsDoNotMatch);
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/api/auth/password-reset/confirm", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ email, code: code.trim(), password }),
      });
      router.replace("/(auth)/login");
    } catch (e) {
      setError(e instanceof Error ? e.message : AUTH_COPY.genericError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={[styles.safe, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={AUTH_COPY.back}
            onPress={goBack}
            style={styles.backLink}
          >
            <ArrowLeft size={16} color={theme.textSoft} weight="bold" />
            <AppText variant="caption" tone="soft">
              {AUTH_COPY.back}
            </AppText>
          </Pressable>

          <View style={styles.header}>
            <View style={[styles.iconBubble, { backgroundColor: theme.accentSoft }]}>
              <Lock size={26} color={theme.accent} weight="duotone" />
            </View>
            <AppText variant="title">{AUTH_COPY.resetTitle}</AppText>
            <AppText variant="body" tone="soft">
              {step === "email"
                ? "Enter your account email and we'll send you a code."
                : "Enter the code and choose a new password."}
            </AppText>
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {step === "email" ? (
              <TextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
              />
            ) : (
              <>
                {info ? <AlertMessage kind="success" message={info} /> : null}
                <TextField
                  label="6-digit code"
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                />
                <TextField
                  label="New password"
                  value={password}
                  onChangeText={setPassword}
                  secure
                  autoComplete="new-password"
                  textContentType="newPassword"
                />
                <TextField
                  label="Confirm new password"
                  value={confirm}
                  onChangeText={setConfirm}
                  secure
                  autoComplete="new-password"
                  textContentType="newPassword"
                />
              </>
            )}
            {error ? <AlertMessage kind="error" message={error} /> : null}
          </View>

          {step === "email" ? (
            <PrimaryButton label="Send code" loading={busy} disabled={busy} onPress={sendCode} />
          ) : (
            <>
              <PrimaryButton label="Set new password" loading={busy} disabled={busy} onPress={resetPassword} />
              <PrimaryButton
                label="Send a new code"
                variant="secondary"
                disabled={busy}
                onPress={() => {
                  setCode("");
                  void sendCode();
                }}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    padding: spacing.screen,
    gap: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  header: {
    gap: spacing.sm,
  },
  iconBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  card: {
    borderWidth: 1,
    borderRadius: radii.card,
    padding: spacing.lg,
    gap: spacing.md,
  },
});
