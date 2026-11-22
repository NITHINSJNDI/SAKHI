/**
 * Settings Screen: Language, voice replies, profile name, discreet mode,
 * mode switcher (Her <-> Mom), private mode, data export, and account sign-out.
 */
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowsLeftRight,
  Baby,
  CaretLeft,
  Check,
  CheckCircle,
  DownloadSimple,
  EyeSlash,
  Globe,
  ShieldCheck,
  SignOut,
  SpeakerHigh,
  Trash,
  User,
  type Icon,
} from "phosphor-react-native";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/ui";
import { Field, PillButton } from "@/components/web/Atoms";
import { Panel } from "@/components/web/Panel";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  checkPin,
  disableDiscreet,
  enableDiscreet,
  isDiscreet,
  loadDiscreet,
  validPin,
} from "@/lib/discreet";
import { successHaptic } from "@/lib/haptics";
import { useT } from "@/lib/i18n";
import { clearAllLocalReminders } from "@/lib/localReminders";
import { useMode, type AppMode } from "@/lib/mode";
import { queryKeys } from "@/lib/queryKeys";
import { clearSakhiStorage } from "@/lib/storage";
import {
  VOICE_STYLES,
  getVoiceEnabled,
  getVoiceStyle,
  setVoiceEnabled,
  setVoiceStyle,
  speak,
  type VoiceStyle,
} from "@/lib/voice";
import { palette, radii } from "@/theme";

function SectionTitle({ icon: I, children }: { icon: Icon; children: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconBubble}>
        <I size={18} color={palette.pink600} weight="duotone" />
      </View>
      <AppText style={styles.sectionTitleText} accessibilityRole="header">
        {children}
      </AppText>
    </View>
  );
}

function SettingRow({
  title,
  hint,
  value,
  onChange,
  label,
}: {
  title: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText style={styles.rowTitle}>{title}</AppText>
        {hint ? <AppText style={styles.rowHint}>{hint}</AppText> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label || title}
        trackColor={{ true: palette.plum900, false: "rgba(42, 21, 47, 0.12)" }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export default function SettingsScreen() {
  const { t, languages, language, setLanguage, meta } = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string }>();
  const { user, refreshSession, signOut } = useAuth();
  const { mode: activeMode, setMode } = useMode();
  const mode: AppMode =
    params.mode === "pregnancy" || params.mode === "her"
      ? params.mode
      : activeMode || "her";

  const [name, setName] = useState<string>(
    () =>
      qc.getQueryData<any>(
        params.mode === "pregnancy" ? queryKeys.pregnancyData : queryKeys.dashboard,
      )?.profile?.preferred_name || "",
  );
  const [voiceOn, setVoiceOn] = useState(true);
  const [style, setStyle] = useState<VoiceStyle>("girl");
  const [privateMode, setPrivateMode] = useState(false);
  const [privacyMsg, setPrivacyMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Discreet mode
  const [discreet, setDiscreet] = useState(false);
  const [pinStep, setPinStep] = useState<"idle" | "set" | "off">("idle");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  useEffect(() => {
    void getVoiceEnabled().then(setVoiceOn);
    void getVoiceStyle().then(setStyle);
    void loadDiscreet().then(setDiscreet);
    apiFetch<any>("/api/consent")
      .then((d) => setPrivateMode(d?.consent?.privateMode === true))
      .catch(() => {});
    const key = mode === "her" ? queryKeys.dashboard : queryKeys.pregnancyData;
    if (!qc.getQueryData<any>(key)?.profile?.preferred_name) {
      apiFetch<any>(mode === "her" ? "/api/dashboard-data" : "/api/pregnancy-data")
        .then((d) => setName(d?.profile?.preferred_name || user?.name || ""))
        .catch(() => setName(user?.name || ""));
    }
  }, [mode, qc, user?.name]);

  const togglePrivate = async () => {
    const next = !privateMode;
    setPrivateMode(next);
    try {
      await apiFetch("/api/consent", {
        method: "PATCH",
        body: JSON.stringify({ privateMode: next }),
      });
      setPrivacyMsg(
        next
          ? "Private mode on. Chats stay off Google."
          : "Private mode off.",
      );
    } catch {
      setPrivateMode(!next);
      setPrivacyMsg("Could not change private mode. Please try again.");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await setVoiceEnabled(voiceOn);
      await apiFetch("/api/preferences", {
        method: "PATCH",
        body: JSON.stringify({
          voiceEnabled: voiceOn,
          voiceName: style === "girl" ? "Kore" : "Aoede",
        }),
      }).catch(() => null);
      const trimmed = name.trim();
      if (trimmed) {
        await apiFetch("/api/update-profile", {
          method: "POST",
          body: JSON.stringify({ mode, profile: { preferred_name: trimmed } }),
        });
      }
      await qc.invalidateQueries({
        queryKey: mode === "her" ? queryKeys.dashboard : queryKeys.pregnancyData,
      });
      successHaptic();
      setSaved(true);
      setTimeout(() => router.back(), 700);
    } catch (e) {
      Alert.alert("Couldn't save", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const switchMode = async () => {
    const other: AppMode = mode === "her" ? "pregnancy" : "her";
    await setMode(other);
    const has = other === "her" ? user?.hasHerProfile : user?.hasMomProfile;
    if (!has) {
      router.replace({ pathname: "/onboarding", params: { mode: other } });
    } else {
      router.replace(other === "her" ? "/her/today" : "/mom/today");
    }
  };

  const download = async () => {
    try {
      const data = await apiFetch<unknown>("/api/export-data");
      await Share.share({
        title: "Sakhi data export",
        message: JSON.stringify(data, null, 2),
      });
    } catch (e) {
      Alert.alert("Couldn't export", e instanceof Error ? e.message : "Please try again.");
    }
  };

  const deleteAll = () =>
    Alert.alert(t("settings.deleteAllData"), t("settings.confirmDeleteAll"), [
      { text: t("common.cancel", "Cancel"), style: "cancel" },
      {
        text: t("settings.deleteAllData"),
        style: "destructive",
        onPress: async () => {
          try {
            await apiFetch("/api/reset-data", { method: "POST", body: JSON.stringify({}) });
          } catch {
            // continue to a clean phone either way
          }
          await clearAllLocalReminders();
          await clearSakhiStorage();
          qc.clear();
          await refreshSession();
          router.replace({ pathname: "/onboarding", params: { mode } });
        },
      },
    ]);

  const pinDigits = (v: string) => v.replace(/\D/g, "").slice(0, 4);
  const closePin = () => {
    setPinStep("idle");
    setPin("");
    setPin2("");
    setPinError(null);
  };
  const turnOn = async () => {
    if (!validPin(pin)) return setPinError(t("settings.pinDigitsError"));
    if (pin !== pin2) return setPinError(t("settings.pinMismatchError"));
    await enableDiscreet(pin);
    setDiscreet(true);
    closePin();
  };
  const turnOff = async () => {
    if (!(await checkPin(pin))) return setPinError(t("settings.pinWrongError"));
    await disableDiscreet();
    setDiscreet(isDiscreet());
    closePin();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: palette.cream }}
    >
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <PressableScale
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.backButton}
        >
          <CaretLeft size={20} color={palette.plum900} weight="bold" />
        </PressableScale>
        <View style={{ flex: 1 }}>
          <AppText style={styles.headerTitle} accessibilityRole="header">
            {t("settings.title")}
          </AppText>
          <AppText style={styles.headerSubtitle}>
            {"Preferences & account settings"}
          </AppText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 110 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Language Selection */}
        <Panel>
          <SectionTitle icon={Globe}>{t("settings.language", "Language")}</SectionTitle>
          <View style={styles.langGrid}>
            {languages.map((l) => {
              const on = l.code === language;
              return (
                <PressableScale
                  key={l.code}
                  onPress={() => void setLanguage(l.code)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  style={[styles.langChip, on ? styles.langChipActive : styles.langChipInactive]}
                >
                  {on ? <Check size={14} color={palette.cream} weight="bold" /> : null}
                  <AppText
                    style={[
                      styles.langText,
                      { color: on ? palette.cream : palette.plum900 },
                    ]}
                  >
                    {l.nativeName}
                  </AppText>
                </PressableScale>
              );
            })}
          </View>
        </Panel>

        {/* Voice Replies */}
        <Panel>
          <SectionTitle icon={SpeakerHigh}>{t("settings.voiceSection")}</SectionTitle>
          <SettingRow
            title={t("settings.voiceReplies")}
            hint={t("settings.voiceAloudHint")}
            value={voiceOn}
            onChange={setVoiceOn}
          />
          <View style={styles.voiceConfigBox}>
            <View style={styles.voiceStyleRow}>
              <View style={{ flex: 1 }}>
                <AppText style={styles.rowTitle}>{t("settings.voiceStyle")}</AppText>
                <AppText style={styles.rowHint}>{t("settings.tapTestHint")}</AppText>
              </View>
              <View style={styles.voicePillGroup} accessibilityRole="radiogroup">
                {VOICE_STYLES.map((s) => {
                  const on = style === s.code;
                  return (
                    <PressableScale
                      key={s.code}
                      onPress={() => {
                        setStyle(s.code);
                        void setVoiceStyle(s.code);
                        void speak(
                          t("settings.testVoiceGreeting", { name: name || t("common.friend") }),
                          meta.bcp47,
                          s.code,
                        );
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      style={[
                        styles.voiceTab,
                        { backgroundColor: on ? palette.plum900 : "transparent" },
                      ]}
                    >
                      <AppText
                        style={[
                          styles.voiceTabText,
                          { color: on ? palette.cream : palette.plum900 },
                        ]}
                      >
                        {s.label}
                      </AppText>
                    </PressableScale>
                  );
                })}
              </View>
            </View>
            <View style={styles.testVoiceDivider}>
              <AppText style={styles.rowHint}>{t("settings.previewVoiceGreeting")}</AppText>
              <PressableScale
                onPress={() =>
                  void speak(
                    t("settings.testVoiceGreeting", { name: name || t("common.friend") }),
                    meta.bcp47,
                    style,
                  )
                }
                style={styles.testVoiceButton}
              >
                <AppText style={styles.testVoiceText}>{t("settings.testVoice")}</AppText>
              </PressableScale>
            </View>
          </View>
        </Panel>

        {/* Personal Profile */}
        <Panel>
          <SectionTitle icon={User}>{t("settings.personalProfile")}</SectionTitle>
          <Field
            label={t("settings.preferredName")}
            value={name}
            onChangeText={setName}
            placeholder={t("auth.fullNamePlaceholder")}
            autoCapitalize="words"
            maxLength={40}
          />
          <AppText style={styles.fieldHint}>{t("settings.preferredNameHint")}</AppText>
        </Panel>

        {/* Discreet Mode */}
        <Panel>
          <SectionTitle icon={EyeSlash}>{t("settings.discreetTitle")}</SectionTitle>
          <SettingRow
            title={t("settings.discreetMode")}
            hint={t("settings.discreetDesc")}
            value={discreet}
            onChange={() => {
              setPinError(null);
              setPin("");
              setPin2("");
              setPinStep(discreet ? "off" : "set");
            }}
          />
          {pinStep !== "idle" ? (
            <View style={styles.pinContainer}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Field
                  label={pinStep === "set" ? t("settings.pinNew") : t("settings.pinCurrent", "Your PIN")}
                  value={pin}
                  onChangeText={(v) => setPin(pinDigits(v))}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={4}
                  style={{ flex: 1 }}
                />
                {pinStep === "set" ? (
                  <Field
                    label={t("settings.pinConfirm")}
                    value={pin2}
                    onChangeText={(v) => setPin2(pinDigits(v))}
                    keyboardType="number-pad"
                    secureTextEntry
                    maxLength={4}
                    style={{ flex: 1 }}
                  />
                ) : null}
              </View>
              {pinStep === "set" ? (
                <AppText style={styles.fieldHint}>{t("settings.pinNote")}</AppText>
              ) : null}
              {pinError ? (
                <AppText style={styles.errorText} accessibilityRole="alert">
                  {pinError}
                </AppText>
              ) : null}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                <PillButton label={t("common.cancel")} variant="ghost" onPress={closePin} />
                <PillButton
                  label={pinStep === "set" ? t("settings.pinTurnOn") : t("settings.pinTurnOff", "Turn off")}
                  variant="rose"
                  onPress={() => void (pinStep === "set" ? turnOn() : turnOff())}
                />
              </View>
            </View>
          ) : null}
        </Panel>

        {/* Switch Mode Card */}
        <View style={styles.modeSwitchCard}>
          <View style={styles.modeSwitchHeader}>
            <View style={styles.modeSwitchBadge}>
              <ArrowsLeftRight size={18} color={palette.pink600} weight="bold" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={styles.modeSwitchTitle}>
                {mode === "her" ? t("settings.switchMomTitle") : t("settings.switchHerTitle")}
              </AppText>
              <AppText style={styles.modeSwitchDesc}>
                {mode === "her" ? t("settings.switchMomDesc") : t("settings.switchHerDesc")}
              </AppText>
            </View>
          </View>
          <PressableScale
            onPress={() => void switchMode()}
            style={styles.modeSwitchButton}
            accessibilityRole="button"
          >
            <Baby size={18} color={palette.cream} weight="bold" />
            <AppText style={styles.modeSwitchButtonText}>
              {mode === "her" ? t("settings.switchMomTitle") : t("settings.switchHerTitle")}
            </AppText>
          </PressableScale>
        </View>

        {/* Privacy & Account Management */}
        <Panel>
          <SectionTitle icon={ShieldCheck}>{t("settings.privacySection")}</SectionTitle>
          <SettingRow
            title={t("settings.privateMode")}
            hint={t("settings.privateModeHint")}
            value={privateMode}
            onChange={() => void togglePrivate()}
            label="Private mode"
          />
          {privacyMsg ? (
            <AppText style={styles.privacyMsg} accessibilityLiveRegion="polite">
              {privacyMsg}
            </AppText>
          ) : null}
          <AppText style={styles.dataHint}>{t("settings.downloadDeleteHint")}</AppText>
          <View style={{ marginTop: 12, gap: 10 }}>
            <PressableScale
              onPress={() => void download()}
              style={styles.actionButton}
              accessibilityRole="button"
            >
              <DownloadSimple size={16} color={palette.plum900} weight="bold" />
              <AppText style={styles.actionButtonText}>{t("settings.downloadData")}</AppText>
            </PressableScale>

            <PressableScale
              onPress={deleteAll}
              style={[styles.actionButton, styles.dangerButton]}
              accessibilityRole="button"
            >
              <Trash size={16} color="#B91C1C" weight="bold" />
              <AppText style={[styles.actionButtonText, { color: "#B91C1C" }]}>
                {t("settings.deleteAllData")}
              </AppText>
            </PressableScale>

            <PressableScale
              onPress={() =>
                Alert.alert(t("header.signOut"), "Are you sure you want to sign out?", [
                  { text: t("common.cancel", "Cancel"), style: "cancel" },
                  {
                    text: t("header.signOut"),
                    style: "destructive",
                    onPress: async () => {
                      await apiFetch("/api/sign-out", {
                        method: "POST",
                        body: JSON.stringify({}),
                      }).catch(() => null);
                      await clearAllLocalReminders();
                      await clearSakhiStorage();
                      qc.clear();
                      await signOut();
                      router.replace("/(auth)/login");
                    },
                  },
                ])
              }
              style={styles.signOutButton}
              accessibilityRole="button"
            >
              <SignOut size={16} color="rgba(42, 21, 47, 0.65)" weight="bold" />
              <AppText style={styles.signOutText}>{t("header.signOut")}</AppText>
            </PressableScale>
          </View>
        </Panel>
      </ScrollView>

      {/* Floating Action Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 6 }]}>
        <PressableScale
          onPress={() => router.back()}
          style={styles.cancelBtn}
          accessibilityRole="button"
        >
          <AppText style={styles.cancelBtnText}>{t("common.cancel")}</AppText>
        </PressableScale>
        <PressableScale
          onPress={() => void save()}
          disabled={saving}
          style={[styles.saveBtn, { opacity: saving ? 0.7 : 1 }]}
          accessibilityRole="button"
        >
          {saved ? (
            <CheckCircle size={18} color={palette.cream} weight="fill" />
          ) : null}
          <AppText style={styles.saveBtnText}>
            {saved ? t("settings.savedSuccess") : saving ? t("common.saving") : t("settings.saveSettings")}
          </AppText>
        </PressableScale>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: palette.cream,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(42, 21, 47, 0.06)",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(42, 21, 47, 0.08)",
    shadowColor: "rgba(42, 21, 47, 0.06)",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: palette.plum900,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(42, 21, 47, 0.60)",
    marginTop: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  sectionIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(251, 207, 232, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitleText: {
    fontSize: 17,
    fontWeight: "700",
    color: palette.plum900,
    letterSpacing: -0.2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(42, 21, 47, 0.08)",
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: palette.plum900,
  },
  rowHint: {
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(42, 21, 47, 0.62)",
  },
  langGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  langChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  langChipActive: {
    backgroundColor: palette.plum900,
    borderColor: palette.plum900,
    shadowColor: "rgba(42, 21, 47, 0.2)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  langChipInactive: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(42, 21, 47, 0.08)",
  },
  langText: {
    fontSize: 14,
    fontWeight: "600",
  },
  voiceConfigBox: {
    marginTop: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(42, 21, 47, 0.08)",
    gap: 12,
  },
  voiceStyleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  voicePillGroup: {
    flexDirection: "row",
    padding: 3,
    borderRadius: radii.pill,
    backgroundColor: "rgba(246, 236, 233, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(42, 21, 47, 0.06)",
  },
  voiceTab: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceTabText: {
    fontSize: 13,
    fontWeight: "600",
  },
  testVoiceDivider: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(42, 21, 47, 0.06)",
  },
  testVoiceButton: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    justifyContent: "center",
    backgroundColor: "rgba(251, 207, 232, 0.3)",
    borderWidth: 1,
    borderColor: "rgba(251, 207, 232, 0.8)",
  },
  testVoiceText: {
    fontSize: 13,
    fontWeight: "600",
    color: palette.pink600,
  },
  fieldHint: {
    marginTop: 6,
    fontSize: 12,
    color: "rgba(42, 21, 47, 0.55)",
    lineHeight: 16,
  },
  pinContainer: {
    marginTop: 12,
    gap: 10,
  },
  errorText: {
    fontSize: 13,
    color: "#E11D48",
    fontWeight: "500",
  },
  modeSwitchCard: {
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(251, 207, 232, 0.8)",
    backgroundColor: "#FFFFFF",
    gap: 14,
    shadowColor: "rgba(42, 21, 47, 0.06)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  modeSwitchHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  modeSwitchBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(251, 207, 232, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  modeSwitchTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.plum900,
  },
  modeSwitchDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(42, 21, 47, 0.65)",
    marginTop: 2,
  },
  modeSwitchButton: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    borderRadius: radii.pill,
    backgroundColor: palette.plum900,
  },
  modeSwitchButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.cream,
  },
  privacyMsg: {
    marginTop: 8,
    fontSize: 12,
    color: palette.plum900,
  },
  dataHint: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(42, 21, 47, 0.60)",
  },
  actionButton: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    borderRadius: radii.pill,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(42, 21, 47, 0.12)",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.plum900,
  },
  dangerButton: {
    borderColor: "#FECACA",
    backgroundColor: "rgba(254, 242, 242, 0.5)",
  },
  signOutButton: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    marginTop: 4,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(42, 21, 47, 0.65)",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "rgba(251, 246, 243, 0.96)",
    borderTopWidth: 1,
    borderTopColor: "rgba(42, 21, 47, 0.08)",
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(42, 21, 47, 0.12)",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.plum900,
  },
  saveBtn: {
    flex: 2,
    minHeight: 48,
    borderRadius: radii.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: palette.plum900,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.cream,
  },
});
