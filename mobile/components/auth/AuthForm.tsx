import { useRouter } from "expo-router";
import { ArrowLeft, ArrowRight, Globe, GoogleLogo } from "phosphor-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AlertMessage } from "@/components/AlertMessage";
import { AppText } from "@/components/AppText";
import { AuthTabs } from "@/components/AuthTabs";
import { DemoPanel } from "@/components/DemoPanel";
import { LanguageGrid } from "@/components/LanguageGrid";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TextField } from "@/components/TextField";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AUTH_COPY } from "@/lib/auth-copy";
import { signInWithGoogle } from "@/lib/google-auth";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "@/lib/languages";
import { spacing, useAppTheme } from "@/theme";
import type { MeResponse, RegisterResponse } from "@/types/api";
import type { AuthMode, DemoMode, SignupStep } from "@/types/auth-ui";

interface NativeLoginResponse {
  token: string;
  expiresAt: string;
  user: { id: string; email: string; name: string; image: string | null };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEMO_TODO =
  "Sample workspaces are cookie-based on the web. A token-aware demo endpoint is needed before this can open natively. See mobile/TODO.md.";

export interface AuthFormProps {
  mode: AuthMode;
}

export function AuthForm({ mode }: AuthFormProps) {
  const theme = useAppTheme();
  const router = useRouter();
  const { setSession, refreshSession } = useAuth();

  const [tab, setTab] = useState<AuthMode>(mode);
  const [signupStep, setSignupStep] = useState<SignupStep>(1);
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE.code);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedLanguage =
    SUPPORTED_LANGUAGES.find((item) => item.code === language) ?? DEFAULT_LANGUAGE;

  const switchTab = (next: AuthMode) => {
    if (next === tab) return;
    setTab(next);
    setError(null);
    setSuccess(null);
    if (next === "signup") setSignupStep(1);
    router.replace(next === "signin" ? "/login" : "/signup");
  };

  const finishSignIn = async (token: string) => {
    await setSession(token, null);
    await refreshSession();

    try {
      const me = await apiFetch<MeResponse>("/api/me");
      if (!me.hasHerProfile && !me.hasMomProfile) {
        router.replace("/onboarding");
        return;
      }
    } catch {
      // If /api/me fails, the entry screen decides
    }
    // The entry screen opens the last-used mode (Her Mode or Mom Mode)
    router.replace("/");
  };

  const signInWithPassword = async (loginEmail: string, loginPassword: string) => {
    const res = await apiFetch<NativeLoginResponse>("/api/auth/native/login", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email: loginEmail, password: loginPassword }),
    });
    await finishSignIn(res.token);
  };

  const handleSignIn = async () => {
    setError(null);
    setSuccess(null);
    if (!email.trim() || !password) {
      setError(AUTH_COPY.invalidCredentials);
      return;
    }
    setBusy(true);
    try {
      await signInWithPassword(email.trim().toLowerCase(), password);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : AUTH_COPY.genericError);
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async () => {
    setError(null);
    setSuccess(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedName.length < 2) {
      setError(AUTH_COPY.nameTooShort);
      return;
    }
    if (trimmedName.length > 80) {
      setError(AUTH_COPY.nameTooLong);
      return;
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError(AUTH_COPY.validEmailRequired);
      return;
    }
    if (password.length < 8) {
      setError(AUTH_COPY.passwordTooShort);
      return;
    }
    if (password.length > 128) {
      setError(AUTH_COPY.passwordTooLong);
      return;
    }
    if (password !== confirmPassword) {
      setError(AUTH_COPY.passwordsDoNotMatch);
      return;
    }

    setBusy(true);
    try {
      const registered = await apiFetch<RegisterResponse>("/api/auth/register", {
        method: "POST",
        auth: false,
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          password,
          language,
        }),
      });

      // New accounts go straight in, like the web flow.
      await signInWithPassword(registered.user.email, password);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : AUTH_COPY.genericError,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const result = await signInWithGoogle();
      if (result.type === "unavailable") setError(result.message);
      if (result.type !== "success") return;
      // Swap Google's ID token for a Sakhi app token
      const res = await apiFetch<NativeLoginResponse>("/api/auth/native/google", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ idToken: result.idToken }),
      });
      await finishSignIn(res.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : AUTH_COPY.genericError);
    } finally {
      setBusy(false);
    }
  };

  const handleDemo = (_mode: DemoMode) => {
    setError(DEMO_TODO);
    setSuccess(null);
    // TODO(demo): POST /api/demo-seed currently sets cookies and returns a
    // browser redirect. Add a token-aware equivalent before enabling this.
  };

  const stepLabel =
    tab === "signup"
      ? signupStep === 1
        ? AUTH_COPY.step1
        : AUTH_COPY.step2
      : AUTH_COPY.appName;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <AppText variant="overline" tone="soft">
          {stepLabel}
        </AppText>
        <View style={[styles.languagePill, { backgroundColor: theme.surfaceMuted }]}>
          <Globe size={14} color={theme.textSoft} />
          <AppText variant="caption" tone="soft">
            {selectedLanguage.nativeName}
          </AppText>
        </View>
      </View>

      <AuthTabs value={tab} onChange={switchTab} />

      {tab === "signup" && signupStep === 1 ? (
        <View style={styles.section}>
          <View style={styles.headerText}>
            <AppText variant="title">{AUTH_COPY.welcome}</AppText>
            <AppText variant="body" tone="soft">
              {AUTH_COPY.selectLanguagePrompt}
            </AppText>
          </View>

          <LanguageGrid value={language} onChange={setLanguage} />

          <PrimaryButton
            label={AUTH_COPY.continue}
            icon={<ArrowRight size={17} color={theme.primaryContrast} weight="bold" />}
            onPress={() => setSignupStep(2)}
            style={styles.submit}
          />
        </View>
      ) : (
        <View style={styles.section}>
          {tab === "signup" ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setSignupStep(1)}
              style={styles.backLink}
            >
              <ArrowLeft size={15} color={theme.accent} weight="bold" />
              <AppText variant="caption" tone="accent">
                {AUTH_COPY.back}
              </AppText>
            </Pressable>
          ) : null}

          <View style={styles.headerText}>
            <AppText variant="title">
              {tab === "signin" ? AUTH_COPY.signInTitle : AUTH_COPY.signUpTitle}
            </AppText>
            <AppText variant="body" tone="soft">
              {tab === "signin" ? AUTH_COPY.signInSubtitle : AUTH_COPY.signUpSubtitle}
            </AppText>
          </View>

          {error ? <AlertMessage kind="error" message={error} /> : null}
          {success ? <AlertMessage kind="success" message={success} /> : null}

          <View style={styles.form}>
            {tab === "signup" ? (
              <TextField
                label={AUTH_COPY.fullName}
                value={name}
                onChangeText={setName}
                placeholder={AUTH_COPY.fullNamePlaceholder}
                autoComplete="name"
                editable={!busy}
              />
            ) : null}

            <TextField
              label={AUTH_COPY.email}
              value={email}
              onChangeText={setEmail}
              placeholder={AUTH_COPY.emailPlaceholder}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              editable={!busy}
            />

            <TextField
              label={AUTH_COPY.password}
              value={password}
              onChangeText={setPassword}
              placeholder={AUTH_COPY.passwordPlaceholder}
              autoCapitalize="none"
              autoComplete={tab === "signup" ? "new-password" : "current-password"}
              secure
              editable={!busy}
              hint={tab === "signup" ? AUTH_COPY.passwordHint : undefined}
            />

            {tab === "signup" ? (
              <TextField
                label={AUTH_COPY.confirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={AUTH_COPY.confirmPasswordPlaceholder}
                autoCapitalize="none"
                autoComplete="new-password"
                secure
                editable={!busy}
              />
            ) : null}
          </View>

          <PrimaryButton
            label={
              busy
                ? AUTH_COPY.saving
                : tab === "signin"
                  ? AUTH_COPY.signInCta
                  : AUTH_COPY.signUpCta
            }
            loading={busy}
            onPress={tab === "signin" ? handleSignIn : handleSignUp}
            icon={
              tab === "signin" ? (
                <ArrowRight size={17} color={theme.primaryContrast} weight="bold" />
              ) : undefined
            }
            style={styles.submit}
          />

          {tab === "signin" ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/reset")}
              style={styles.forgot}
            >
              <AppText variant="caption" tone="accent">
                {AUTH_COPY.forgotPassword}
              </AppText>
            </Pressable>
          ) : null}

          <View style={styles.orRow}>
            <View style={[styles.orRule, { backgroundColor: theme.border }]} />
            <AppText variant="caption" tone="soft">
              {AUTH_COPY.or}
            </AppText>
            <View style={[styles.orRule, { backgroundColor: theme.border }]} />
          </View>

          <PrimaryButton
            label={AUTH_COPY.continueWithGoogle}
            variant="secondary"
            icon={<GoogleLogo size={18} color={theme.text} weight="bold" />}
            onPress={handleGoogle}
            disabled={busy}
          />

          <DemoPanel onSelect={handleDemo} disabled={busy} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  languagePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  section: {
    gap: spacing.md,
  },
  headerText: {
    gap: spacing.xxs,
  },
  form: {
    gap: spacing.sm,
  },
  submit: {
    marginTop: spacing.xs,
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  forgot: {
    alignSelf: "center",
    paddingVertical: spacing.xxs,
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  orRule: {
    flex: 1,
    height: 1,
  },
});
