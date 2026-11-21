/**
 * Port of frontend/components/SettingsModal.tsx (+ DiscreetSettings) as a
 * screen: language, voice replies, profile name, discreet mode, switching
 * mode, private mode, and download / delete all data.
 */
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowsLeftRight, Baby, CaretLeft, Check, CheckCircle, DownloadSimple, EyeSlash, Globe, ShieldCheck, SpeakerHigh, Trash, User } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Share, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/ui";
import { Field, PillButton } from "@/components/web/Atoms";
import { Panel, ink } from "@/components/web/Panel";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { disableDiscreet, enableDiscreet, checkPin, isDiscreet, loadDiscreet, validPin } from "@/lib/discreet";
import { successHaptic } from "@/lib/haptics";
import { useT } from "@/lib/i18n";
import { clearAllLocalReminders } from "@/lib/localReminders";
import { useMode, type AppMode } from "@/lib/mode";
import { queryKeys } from "@/lib/queryKeys";
import { clearSakhiStorage } from "@/lib/storage";
import { VOICE_STYLES, getVoiceEnabled, getVoiceStyle, setVoiceEnabled, setVoiceStyle, speak, type VoiceStyle } from "@/lib/voice";
import { palette } from "@/theme";

 
function SectionTitle({ icon: I, children }: { icon: typeof User; children: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <I size={20} color={palette.pink500} weight="duotone" />
      <AppText style={{ fontSize: 17, fontWeight: "600", color: palette.plum900 }} accessibilityRole="header">{children}</AppText>
    </View>
  );
}
function Row({ title, hint, value, onChange, label }: { title: string; hint?: string; value: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 14, borderRadius: 16, backgroundColor: "rgba(249,250,251,0.9)", borderWidth: 1, borderColor: "rgba(0,0,0,0.05)" }}>
      <View style={{ flex: 1 }}>
        <AppText style={{ fontSize: 15, fontWeight: "500", color: palette.plum900 }}>{title}</AppText>
        {hint ? <AppText style={{ marginTop: 2, fontSize: 13, lineHeight: 18, color: ink[60] }}>{hint}</AppText> : null}
      </View>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={label || title} trackColor={{ true: palette.pink500, false: "#E5E7EB" }} thumbColor="#fff" />
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
  const mode: AppMode = params.mode === "pregnancy" || params.mode === "her" ? params.mode : activeMode || "her";

  const [name, setName] = useState<string>(() => qc.getQueryData<any>(params.mode === "pregnancy" ? queryKeys.pregnancyData : queryKeys.dashboard)?.profile?.preferred_name || "");
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
    apiFetch<any>("/api/consent").then((d) => setPrivateMode(d?.consent?.privateMode === true)).catch(() => {});
    const key = mode === "her" ? queryKeys.dashboard : queryKeys.pregnancyData;
    if (!qc.getQueryData<any>(key)?.profile?.preferred_name)
      apiFetch<any>(mode === "her" ? "/api/dashboard-data" : "/api/pregnancy-data")
        .then((d) => setName(d?.profile?.preferred_name || user?.name || ""))
        .catch(() => setName(user?.name || ""));
  }, [mode, qc, user?.name]);

  const togglePrivate = async () => {
    const next = !privateMode;
    setPrivateMode(next);
    try {
      await apiFetch("/api/consent", { method: "PATCH", body: JSON.stringify({ privateMode: next }) });
      setPrivacyMsg(next ? "Private mode on. Chats stay off Google." : "Private mode off.");
    } catch {
      setPrivateMode(!next);
      setPrivacyMsg("Could not change private mode. Please try again.");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await setVoiceEnabled(voiceOn);
      await apiFetch("/api/preferences", { method: "PATCH", body: JSON.stringify({ voiceEnabled: voiceOn, voiceName: style === "girl" ? "Kore" : "Aoede" }) }).catch(() => null);
      const trimmed = name.trim();
      if (trimmed) await apiFetch("/api/update-profile", { method: "POST", body: JSON.stringify({ mode, profile: { preferred_name: trimmed } }) });
      await qc.invalidateQueries({ queryKey: mode === "her" ? queryKeys.dashboard : queryKeys.pregnancyData });
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
    if (!has) router.replace({ pathname: "/onboarding", params: { mode: other } });
    else router.replace(other === "her" ? "/her/today" : "/mom/today");
  };

  const download = async () => {
    try {
      const data = await apiFetch<unknown>("/api/export-data");
      await Share.share({ title: "Sakhi data export", message: JSON.stringify(data, null, 2) });
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
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: palette.cream }}>
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 12, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 6 }}>
        <PressableScale onPress={() => router.back()} accessibilityLabel="Back" style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }}>
          <CaretLeft size={22} color={palette.plum900} />
        </PressableScale>
        <AppText style={{ fontSize: 22, fontWeight: "600", letterSpacing: -0.4, color: palette.plum900 }} accessibilityRole="header">{t("settings.title")}</AppText>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 110, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Panel>
          <SectionTitle icon={Globe}>{t("settings.language", "Language")}</SectionTitle>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {languages.map((l) => {
              const on = l.code === language;
              return (
                <PressableScale key={l.code} onPress={() => void setLanguage(l.code)} accessibilityRole="radio" accessibilityState={{ checked: on }} style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: on ? palette.plum900 : ink[10], backgroundColor: on ? palette.plum900 : "#fff" }}>
                  {on ? <Check size={14} color={palette.cream} weight="bold" /> : null}
                  <AppText style={{ fontSize: 14, fontWeight: "500", color: on ? palette.cream : palette.plum900 }}>{l.nativeName}</AppText>
                </PressableScale>
              );
            })}
          </View>
        </Panel>

        <Panel>
          <SectionTitle icon={SpeakerHigh}>{t("settings.voiceSection")}</SectionTitle>
          <Row title={t("settings.voiceReplies")} hint={t("settings.voiceAloudHint")} value={voiceOn} onChange={setVoiceOn} />
          <View style={{ marginTop: 10, padding: 14, borderRadius: 16, backgroundColor: "rgba(249,250,251,0.9)", borderWidth: 1, borderColor: "rgba(0,0,0,0.05)", gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <AppText style={{ fontSize: 15, fontWeight: "500", color: palette.plum900 }}>{t("settings.voiceStyle")}</AppText>
                <AppText style={{ fontSize: 13, color: ink[60] }}>{t("settings.tapTestHint")}</AppText>
              </View>
              <View style={{ flexDirection: "row", padding: 4, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: ink[10] }} accessibilityRole="radiogroup">
                {VOICE_STYLES.map((s) => (
                  <PressableScale key={s.code} onPress={() => { setStyle(s.code); void setVoiceStyle(s.code); void speak(t("settings.testVoiceGreeting", { name: name || t("common.friend") }), meta.bcp47, s.code); }} accessibilityRole="radio" accessibilityState={{ checked: style === s.code }} style={{ minHeight: 36, paddingHorizontal: 12, borderRadius: 9, justifyContent: "center", backgroundColor: style === s.code ? palette.plum900 : "transparent" }}>
                    <AppText style={{ fontSize: 13, fontWeight: "500", color: style === s.code ? "#fff" : palette.plum900 }}>{s.label}</AppText>
                  </PressableScale>
                ))}
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)" }}>
              <AppText style={{ fontSize: 13, color: ink[60] }}>{t("settings.previewVoiceGreeting")}</AppText>
              <PressableScale onPress={() => void speak(t("settings.testVoiceGreeting", { name: name || t("common.friend") }), meta.bcp47, style)} style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 12, justifyContent: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: palette.pink200 }}>
                <AppText style={{ fontSize: 13, fontWeight: "500", color: palette.pink600 }}>{t("settings.testVoice")}</AppText>
              </PressableScale>
            </View>
          </View>
        </Panel>

        <Panel>
          <SectionTitle icon={User}>{t("settings.personalProfile")}</SectionTitle>
          <Field label={t("settings.preferredName")} value={name} onChangeText={setName} placeholder={t("auth.fullNamePlaceholder")} autoCapitalize="words" maxLength={40} />
          <AppText style={{ marginTop: 6, fontSize: 12, color: ink[55] }}>{t("settings.preferredNameHint")}</AppText>
        </Panel>

        <Panel>
          <SectionTitle icon={EyeSlash}>{t("settings.discreetTitle")}</SectionTitle>
          <Row
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
            <View style={{ marginTop: 12, gap: 10 }}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Field label={pinStep === "set" ? t("settings.pinNew") : t("settings.pinCurrent", "Your PIN")} value={pin} onChangeText={(v) => setPin(pinDigits(v))} keyboardType="number-pad" secureTextEntry maxLength={4} style={{ flex: 1 }} />
                {pinStep === "set" ? <Field label={t("settings.pinConfirm")} value={pin2} onChangeText={(v) => setPin2(pinDigits(v))} keyboardType="number-pad" secureTextEntry maxLength={4} style={{ flex: 1 }} /> : null}
              </View>
              {pinStep === "set" ? <AppText style={{ fontSize: 12, color: ink[55] }}>{t("settings.pinNote")}</AppText> : null}
              {pinError ? <AppText style={{ fontSize: 14, color: "#E11D48" }} accessibilityRole="alert">{pinError}</AppText> : null}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <PillButton label={t("common.cancel")} variant="ghost" onPress={closePin} />
                <PillButton label={pinStep === "set" ? t("settings.pinTurnOn") : t("settings.pinTurnOff", "Turn off")} variant="rose" onPress={() => void (pinStep === "set" ? turnOn() : turnOff())} />
              </View>
            </View>
          ) : null}
        </Panel>

        <View style={{ padding: 18, borderRadius: 22, borderWidth: 2, borderColor: "rgba(251,207,232,0.9)", backgroundColor: "rgba(253,242,248,0.6)" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <ArrowsLeftRight size={20} color={palette.pink600} weight="bold" />
            <AppText style={{ fontSize: 15, fontWeight: "600", color: palette.plum900 }}>{mode === "her" ? t("settings.switchMomTitle") : t("settings.switchHerTitle")}</AppText>
          </View>
          <AppText style={{ fontSize: 13, lineHeight: 19, color: ink[70], marginBottom: 14 }}>{mode === "her" ? t("settings.switchMomDesc") : t("settings.switchHerDesc")}</AppText>
          <PressableScale onPress={() => void switchMode()} style={{ flexDirection: "row", gap: 10, alignItems: "center", justifyContent: "center", minHeight: 50, borderRadius: 14, backgroundColor: "#EC4899" }}>
            <Baby size={20} color="#fff" weight="bold" />
            <AppText style={{ fontSize: 15, fontWeight: "600", color: "#fff" }}>{mode === "her" ? t("settings.switchMomTitle") : t("settings.switchHerTitle")}</AppText>
          </PressableScale>
        </View>

        <Panel>
          <SectionTitle icon={ShieldCheck}>{t("settings.privacySection")}</SectionTitle>
          <Row title={t("settings.privateMode")} hint={t("settings.privateModeHint")} value={privateMode} onChange={() => void togglePrivate()} label="Private mode" />
          {privacyMsg ? <AppText style={{ marginTop: 8, fontSize: 12, color: ink[70] }} accessibilityLiveRegion="polite">{privacyMsg}</AppText> : null}
          <AppText style={{ marginTop: 12, fontSize: 13, lineHeight: 19, color: ink[60] }}>{t("settings.downloadDeleteHint")}</AppText>
          <View style={{ marginTop: 12, gap: 8 }}>
            <PressableScale onPress={() => void download()} style={{ flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: "rgba(42,21,47,0.15)" }}>
              <DownloadSimple size={16} color={palette.plum900} weight="bold" />
              <AppText style={{ fontSize: 14, fontWeight: "500", color: palette.plum900 }}>{t("settings.downloadData")}</AppText>
            </PressableScale>
            <PressableScale onPress={deleteAll} style={{ flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: "#FECACA" }}>
              <Trash size={16} color="#B91C1C" weight="bold" />
              <AppText style={{ fontSize: 14, fontWeight: "500", color: "#B91C1C" }}>{t("settings.deleteAllData")}</AppText>
            </PressableScale>
            <PressableScale
              onPress={() =>
                Alert.alert(t("header.signOut"), undefined, [
                  { text: t("common.cancel", "Cancel"), style: "cancel" },
                  {
                    text: t("header.signOut"),
                    style: "destructive",
                    onPress: async () => {
                      await apiFetch("/api/sign-out", { method: "POST", body: JSON.stringify({}) }).catch(() => null);
                      await clearAllLocalReminders();
                      await clearSakhiStorage();
                      qc.clear();
                      await signOut();
                      router.replace("/(auth)/login");
                    },
                  },
                ])
              }
              style={{ minHeight: 48, alignItems: "center", justifyContent: "center" }}
            >
              <AppText style={{ fontSize: 14, fontWeight: "500", color: ink[60] }}>{t("header.signOut")}</AppText>
            </PressableScale>
          </View>
        </Panel>
      </ScrollView>

      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: "rgba(251,246,243,0.96)", borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)", flexDirection: "row", gap: 10 }}>
        <PillButton label={t("common.cancel")} variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} />
        <PillButton label={saved ? t("settings.savedSuccess") : saving ? t("common.saving") : t("settings.saveSettings")} icon={saved ? CheckCircle : undefined} onPress={() => void save()} busy={saving} style={{ flex: 2 }} />
      </View>
    </KeyboardAvoidingView>
  );
}
