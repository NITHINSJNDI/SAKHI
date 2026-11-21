/**
 * Port of frontend/components/DashboardHeader.tsx + AccountMenu + LanguageSelector:
 * mode and date on one quiet line, a warm greeting, then language, reminders and
 * the account menu (switch mode, doctor summary, settings, download data, sign out).
 */
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ArrowsLeftRight, Bell, Check, DownloadSimple, EyeSlash, FileText, GearSix, Globe, SignOut, User } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { Alert, Share, View } from "react-native";

import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/ui";
import { ink } from "@/components/web/Panel";
import { Sheet } from "@/components/web/Sheet";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isDiscreet, lockNow, onDiscreetChange } from "@/lib/discreet";
import { useT } from "@/lib/i18n";
import { clearAllLocalReminders } from "@/lib/localReminders";
import { useMode, type AppMode } from "@/lib/mode";
import { clearSakhiStorage } from "@/lib/storage";
import { fonts, palette } from "@/theme";

export default function ModeHeader({
  mode,
  displayName,
  reminderCount,
  onOpenReminders,
}: {
  mode: AppMode;
  displayName: string;
  reminderCount: number;
  onOpenReminders: () => void;
}) {
  const { t, meta } = useT();
  const [account, setAccount] = useState(false);
  const [lang, setLang] = useState(false);
  const [discreet, setDiscreet] = useState(isDiscreet());
  useEffect(() => onDiscreetChange(() => setDiscreet(isDiscreet())), []);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("header.goodMorning", "Good morning") : hour < 17 ? t("header.goodAfternoon", "Good afternoon") : t("header.goodEvening", "Good evening");
  const date = new Date().toLocaleDateString(meta.bcp47 || "en-IN", { weekday: "long", day: "numeric", month: "long" });
  const modeLabel = t(mode === "her" ? "header.herMode" : "header.momMode", mode === "her" ? "Her Mode" : "Mom Mode");

  return (
    <View style={{ paddingTop: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7, flexShrink: 1, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.7)", borderWidth: 1, borderColor: ink[7] }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: mode === "her" ? palette.lavender500 : palette.blush500 }} />
          <AppText numberOfLines={1} style={{ fontSize: 12, fontWeight: "600", color: palette.plum900, flexShrink: 1 }}>
            {modeLabel}
          </AppText>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {discreet ? (
            <RoundBtn label="Hide Sakhi now" onPress={lockNow}>
              <EyeSlash size={20} color={ink[70]} weight="duotone" />
            </RoundBtn>
          ) : null}
          <RoundBtn label={`Language: ${meta.name}`} onPress={() => setLang(true)}>
            <Globe size={20} color={ink[70]} weight="duotone" />
          </RoundBtn>
          <RoundBtn label={reminderCount > 0 ? `${t("header.reminders")}, ${reminderCount} upcoming` : t("header.reminders")} onPress={onOpenReminders}>
            <Bell size={20} color={ink[70]} weight="duotone" />
            {reminderCount > 0 ? (
              <View style={{ position: "absolute", top: -2, right: -2, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: palette.blush500, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: palette.cream }}>
                <AppText style={{ fontSize: 9, fontWeight: "700", color: "#fff" }}>{reminderCount > 9 ? "9+" : reminderCount}</AppText>
              </View>
            ) : null}
          </RoundBtn>
          <RoundBtn label="Account menu" onPress={() => setAccount(true)} solid>
            <AppText style={{ fontSize: 16, fontWeight: "600", color: palette.cream }}>{(displayName || "S").slice(0, 1).toUpperCase()}</AppText>
          </RoundBtn>
        </View>
      </View>
      <AppText style={{ marginTop: 14, fontSize: 13, color: ink[60] }}>{date}</AppText>
      <AppText numberOfLines={2} style={{ marginTop: 2, fontSize: 28, lineHeight: 34, fontWeight: "600", letterSpacing: -0.6, color: palette.plum900 }} accessibilityRole="header">
        {greeting},{" "}
        <AppText style={{ fontFamily: fonts.serifItalic, fontSize: 31, color: mode === "her" ? palette.lavender600 : palette.blush500 }}>{displayName}</AppText>
      </AppText>
      <AccountSheet open={account} onClose={() => setAccount(false)} mode={mode} />
      <LanguageSheet open={lang} onClose={() => setLang(false)} />
    </View>
  );
}

function RoundBtn({ children, label, onPress, solid }: { children: React.ReactNode; label: string; onPress: () => void; solid?: boolean }) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.92}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: solid ? palette.plum900 : "rgba(255,255,255,0.7)", borderWidth: solid ? 0 : 1, borderColor: ink[10] }}
    >
      {children}
    </PressableScale>
  );
}

function MenuRow({ icon: I, label, onPress, danger }: { icon: typeof Bell; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} accessibilityRole="menuitem" style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, paddingHorizontal: 12, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.7)" }}>
      <I size={20} color={danger ? "#E11D48" : palette.plum900} />
      <AppText style={{ fontSize: 15, fontWeight: "500", color: danger ? "#E11D48" : palette.plum900 }}>{label}</AppText>
    </PressableScale>
  );
}

function AccountSheet({ open, onClose, mode }: { open: boolean; onClose: () => void; mode: AppMode }) {
  const { t } = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const { user, signOut } = useAuth();
  const { setMode } = useMode();
  const [busy, setBusy] = useState(false);
  const other: AppMode = mode === "her" ? "pregnancy" : "her";

  const switchMode = async () => {
    onClose();
    await setMode(other);
    const hasProfile = other === "her" ? user?.hasHerProfile : user?.hasMomProfile;
    if (!hasProfile) router.replace({ pathname: "/onboarding", params: { mode: other } });
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

  const doSignOut = async () => {
    setBusy(true);
    try {
      await apiFetch("/api/sign-out", { method: "POST", body: JSON.stringify({}) }).catch(() => null);
      await clearAllLocalReminders();
      await clearSakhiStorage();
      qc.clear();
      await signOut();
      onClose();
      router.replace("/(auth)/login");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={user?.name || t("menu.account", "Account")} subtitle={user?.email || undefined}>
      <View style={{ gap: 8 }}>
        <MenuRow icon={ArrowsLeftRight} label={mode === "her" ? t("menu.switchToMom") : t("menu.switchToHer")} onPress={() => void switchMode()} />
        <MenuRow
          icon={FileText}
          label={t("menu.doctorSummary")}
          onPress={() => {
            onClose();
            router.push({ pathname: "/doctor-summary", params: { mode } });
          }}
        />
        <MenuRow
          icon={GearSix}
          label={t("menu.settingsAndPrivacy")}
          onPress={() => {
            onClose();
            router.push({ pathname: "/settings", params: { mode } });
          }}
        />
        <MenuRow icon={DownloadSimple} label={t("menu.downloadData")} onPress={() => void download()} />
        <MenuRow icon={User} label={t("menu.profile", "Profile")} onPress={() => { onClose(); router.push({ pathname: "/settings", params: { mode, section: "profile" } }); }} />
        <MenuRow icon={SignOut} label={busy ? t("common.loading") : t("header.signOut")} onPress={() => void doSignOut()} danger />
      </View>
    </Sheet>
  );
}

function LanguageSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { languages, language, setLanguage, t } = useT();
  return (
    <Sheet open={open} onClose={onClose} title={t("settings.language", "Language")}>
      <View style={{ gap: 8 }}>
        {languages.map((l) => {
          const on = l.code === language;
          return (
            <PressableScale
              key={l.code}
              onPress={() => {
                void setLanguage(l.code);
                onClose();
              }}
              scaleTo={0.98}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 52, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: on ? palette.plum900 : ink[10], backgroundColor: on ? palette.lavender50 : "rgba(255,255,255,0.7)" }}
            >
              <View>
                <AppText style={{ fontSize: 16, fontWeight: "500", color: palette.plum900 }}>{l.nativeName}</AppText>
                <AppText style={{ fontSize: 12, color: ink[55] }}>{l.name}</AppText>
              </View>
              {on ? <Check size={18} color={palette.plum900} weight="bold" /> : null}
            </PressableScale>
          );
        })}
      </View>
    </Sheet>
  );
}
