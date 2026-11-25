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
import { signInWithGoogle } from "@/lib/google-auth";
import { useT } from "@/lib/i18n";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "@/lib/languages";
import { palette, spacing, useAppTheme } from "@/theme";
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
  const { t, language: activeLang, setLanguage: setAppLanguage } = useT();
  const router = useRouter();
  const { setSession, refreshSession } = useAuth();

  const [tab, setTab] = useState<AuthMode>(mode);
  const [signupStep, setSignupStep] = useState<SignupStep>(1);
  const [language, setLanguage] = useState(activeLang || DEFAULT_LANGUAGE.code);
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
      setError(t("auth.invalidCredentials"));
      return;
    }
    setBusy(true);
    try {
      await signInWithPassword(email.trim().toLowerCase(), password);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("auth.genericError"));
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
      setError(t("auth.nameTooShort"));
      return;
    }
    if (trimmedName.length > 80) {
      setError(t("auth.nameTooLong"));
      return;
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError(t("auth.validEmailRequired"));
      return;
    }
    if (password.length < 8) {
      setError(t("auth.passwordTooShort"));
      return;
    }
    if (password.length > 128) {
      setError(t("auth.passwordTooLong"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("auth.passwordsDoNotMatch"));
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
        requestError instanceof Error ? requestError.message : t("auth.genericError"),
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
      setError(e instanceof Error ? e.message : t("auth.genericError"));
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
        ? t("auth.step1")
        : t("auth.step2")
      : t("common.appName");

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {/* Sign-up steps carry information; on sign-in the brand header already names the app */}
        {tab === "signup" ? (
          <AppText variant="overline" tone="soft">
            {stepLabel}
          </AppText>
        ) : (
          <View />
        )}
        <View style={styles.languagePill}>
          <Globe size={13} color="rgba(42, 21, 47, 0.65)" />
          <AppText variant="caption" style={styles.languageText}>
            {selectedLanguage.nativeName}
          </AppText>
        </View>
      </View>

      <AuthTabs value={tab} onChange={switchTab} />

      {tab === "signup" && signupStep === 1 ? (
        <View style={styles.section}>
          <View style={styles.headerText}>
            <AppText variant="title">{t("auth.welcome")}</AppText>
            <AppText variant="body" tone="soft">
              {t("auth.selectLanguagePrompt")}
            </AppText>
          </View>

          <LanguageGrid
            value={language}
            onChange={(next) => {
              setLanguage(next as any);
              void setAppLanguage(next as any);
            }}
          />

          <PrimaryButton
            label={t("common.continue")}
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
                {t("common.back")}
              </AppText>
            </Pressable>
          ) : null}

          <View style={styles.headerText}>
            <AppText variant="section">
              {tab === "signin" ? t("auth.signInTitle") : t("auth.signUpTitle")}
            </AppText>
          </View>

          {error ? <AlertMessage kind="error" message={error} /> : null}
          {success ? <AlertMessage kind="success" message={success} /> : null}

          <View style={styles.form}>
            {tab === "signup" ? (
              <TextField
                label={t("auth.fullName")}
                value={name}
                onChangeText={setName}
                placeholder={t("auth.fullNamePlaceholder")}
                autoComplete="name"
                editable={!busy}
              />
            ) : null}

            <TextField
              label={t("auth.email")}
              value={email}
              onChangeText={setEmail}
              placeholder={t("auth.emailPlaceholder")}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              editable={!busy}
            />

            <TextField
              label={t("auth.password")}
              value={password}
              onChangeText={setPassword}
              placeholder={t("auth.passwordPlaceholder")}
              autoCapitalize="none"
              autoComplete={tab === "signup" ? "new-password" : "current-password"}
              secure
              editable={!busy}
              hint={tab === "signup" ? t("auth.passwordHint") : undefined}
            />

            {tab === "signup" ? (
              <TextField
                label={t("auth.confirmPassword")}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t("auth.confirmPasswordPlaceholder")}
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
                ? t("common.saving")
                : tab === "signin"
                  ? t("auth.signIn")
                  : t("auth.createAccount")
            }
            loading={busy}
            onPress={tab === "signin" ? handleSignIn : handleSignUp}
            icon={
              tab === "signin" ? (
                <ArrowRight size={17} color={palette.cream} weight="bold" />
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
                {t("auth.forgotPassword")}
              </AppText>
            </Pressable>
          ) : null}

          <View style={styles.orRow}>
            <View style={styles.orRule} />
            <AppText variant="caption" tone="soft" style={styles.orText}>
              {t("auth.or")}
            </AppText>
            <View style={styles.orRule} />
          </View>

          <PrimaryButton
            label={t("auth.continueWithGoogle")}
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
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(42, 21, 47, 0.08)",
  },
  languageText: {
    fontSize: 12,
    fontWeight: "600",
    color: palette.plum900,
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
    minHeight: 44,
    justifyContent: "center",
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 2,
  },
  orRule: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(42, 21, 47, 0.10)",
  },
  orText: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(42, 21, 47, 0.50)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
