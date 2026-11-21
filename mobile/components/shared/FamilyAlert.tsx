/**
 * Port of frontend/components/FamilyAlert.tsx: family contacts card, ready-made
 * WhatsApp / SMS / call alerts (optionally with her location), and the red-flag
 * banner shown when the chat or a check-in flags an emergency.
 */
import * as Location from "expo-location";
import { ChatText, MapPin, Phone, Plus, Trash, UsersThree, WarningCircle, WhatsappLogo } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeInUp, FadeOut } from "react-native-reanimated";

import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/ui";
import { atom, Field, PillButton } from "@/components/web/Atoms";
import { Panel, PanelTitle } from "@/components/web/Panel";
import { emergencyBus } from "@/lib/events";
import { errorHaptic } from "@/lib/haptics";
import { useT } from "@/lib/i18n";
import { call, mapsSearch, openUrl, sms, whatsapp } from "@/lib/links";
import { getString } from "@/lib/storage";
import { TW } from "@/lib/tw";
import { useUserDoc } from "@/lib/useUserDoc";
import { palette } from "@/theme";

export interface Contact { name: string; relation: string; phone: string }
interface FamilyDoc { contacts: Contact[] }
const EMPTY: FamilyDoc = { contacts: [] };

const REASON: Record<string, string> = {
  "severe-bp": "very high blood pressure",
  bleeding: "bleeding",
  "reduced-movement": "the baby moving less than usual",
  membranes: "that my waters may have broken",
  "preeclampsia-signs": "vision changes and a bad headache",
  "severe-pain": "severe pain or trouble breathing",
  fainting: "fainting",
  "heavy-bleeding": "very heavy bleeding",
  "possible-ectopic": "sharp pain on one side",
  "infection-signs": "fever with pain",
  "clot-signs": "pain and swelling in one leg, or trouble breathing",
  "newborn-danger": "danger signs in our baby",
};

const digits = (p: string) => p.replace(/[^\d]/g, "");
const waNumber = (p: string) => {
  const d = digits(p).replace(/^0+/, "");
  return d.length === 10 ? `91${d}` : d;
};
export const validPhone = (p: string) => {
  const d = digits(p);
  return d.length >= 10 && d.length <= 13;
};

export function alertText(contact: Contact, reason: string | null, mapLink: string | null, me: string) {
  const hi = `Hi ${contact.name}${me ? `, this is ${me}` : ""}.`;
  const body =
    reason === "self-harm"
      ? " I'm not feeling okay right now and I need someone with me. Please call me."
      : reason && REASON[reason]
        ? ` I told my health app about ${REASON[reason]} and it says I should get medical help now. Please call me, or come if you can.`
        : " I need some help. Please call me as soon as you can.";
  return `${hi}${body}${mapLink ? ` I'm here: ${mapLink}` : ""}`;
}

export function AlertButtons({ contacts, reason, tone = "light" }: { contacts: Contact[]; reason: string | null; tone?: "light" | "onRed" }) {
  const [map, setMap] = useState<string | null>(null);
  const [locState, setLocState] = useState<"idle" | "busy" | "denied">("idle");
  const [me, setMe] = useState("");
  useEffect(() => {
    void getString("sakhi_preferred_name").then((v) => setMe(v || ""));
  }, []);

  const addLocation = async () => {
    setLocState("busy");
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) return setLocState("denied");
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setMap(`https://maps.google.com/?q=${p.coords.latitude.toFixed(5)},${p.coords.longitude.toFixed(5)}`);
      setLocState("idle");
    } catch {
      setLocState("denied");
    }
  };

  if (!contacts.length) return null;
  const onRed = tone === "onRed";
  const solid = { bg: onRed ? "#fff" : palette.plum900, fg: onRed ? TW.rose[700] : palette.cream };
  const ghost = { bg: onRed ? "rgba(255,255,255,0.15)" : "#fff", fg: onRed ? "#fff" : palette.plum900, border: onRed ? "transparent" : "rgba(42,21,47,0.15)" };
  const Btn = ({ label, icon: I, onPress, variant }: { label: string; icon: typeof Phone; onPress: () => void; variant: "solid" | "ghost" }) => {
    const c = variant === "solid" ? { bg: solid.bg, fg: solid.fg, border: "transparent" } : ghost;
    return (
      <PressableScale onPress={onPress} scaleTo={0.95} accessibilityRole="link" style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.bg, paddingHorizontal: 12, minHeight: 40 }}>
        <I size={16} color={c.fg} weight={variant === "solid" ? "fill" : "regular"} />
        <AppText style={{ fontSize: 12, fontWeight: "600", color: c.fg }}>{label}</AppText>
      </PressableScale>
    );
  };

  return (
    <View style={{ gap: 10 }}>
      {contacts.map((c) => {
        const text = alertText(c, reason, map, me);
        return (
          <View key={c.phone} style={{ gap: 6 }}>
            <AppText style={{ fontSize: 14, fontWeight: "500", color: onRed ? "#fff" : palette.plum900 }}>
              {c.name}
              {c.relation ? ` (${c.relation})` : ""}
            </AppText>
            <View style={atom.wrap}>
              <Btn label="WhatsApp" icon={WhatsappLogo} variant="solid" onPress={() => void whatsapp(waNumber(c.phone), text)} />
              <Btn label="SMS" icon={ChatText} variant="ghost" onPress={() => void sms(digits(c.phone), text)} />
              <Btn label="Call" icon={Phone} variant="ghost" onPress={() => void call(digits(c.phone))} />
            </View>
          </View>
        );
      })}
      <Pressable onPress={() => void addLocation()} disabled={locState === "busy" || Boolean(map)} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36 }}>
        <MapPin size={16} color={onRed ? "rgba(255,255,255,0.9)" : palette.lavender600} />
        <AppText style={{ fontSize: 12, fontWeight: "500", color: onRed ? "rgba(255,255,255,0.9)" : palette.lavender600 }}>
          {map
            ? "Your location is added to the message"
            : locState === "busy"
              ? "Finding your location…"
              : locState === "denied"
                ? "Location is blocked; the message will go without it"
                : "Add my location to the message"}
        </AppText>
      </Pressable>
    </View>
  );
}

/** Red-flag banner for both modes; listens on the emergency bus. */
export function RedFlagBanner({ mode }: { mode: "her" | "pregnancy" }) {
  const [hit, setHit] = useState<{ reason: string | null; level: string; afterBirth?: boolean } | null>(null);
  const { doc } = useUserDoc<FamilyDoc>("family", EMPTY);
  useEffect(
    () =>
      emergencyBus.on((e) => {
        errorHaptic();
        setHit({ reason: e.reason, level: e.level });
      }),
    [],
  );
  if (!hit) return null;
  const crisis = hit.reason === "self-harm";
  return (
    <Animated.View entering={FadeInUp.springify().damping(18)} exiting={FadeOut} accessibilityRole="alert" style={{ borderRadius: 24, padding: 20, backgroundColor: crisis ? palette.plum800 : TW.rose[600], gap: 12 }}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <WarningCircle size={32} color="#fff" weight="fill" />
        <View style={{ flex: 1 }}>
          <AppText style={{ fontSize: 18, fontWeight: "600", color: "#fff" }}>
            {crisis ? "You don't have to face this alone" : mode === "pregnancy" ? "This needs a doctor now, mama" : "This needs a doctor now"}
          </AppText>
          <AppText style={{ marginTop: 4, fontSize: 14, lineHeight: 20, color: "rgba(255,255,255,0.9)" }}>
            {crisis
              ? "Talk to someone now. Tele-MANAS is free, 24 hours, in your language."
              : mode === "pregnancy"
                ? `What you shared can be a sign of a serious problem ${hit.afterBirth ? "after birth" : "in pregnancy"}. Please call your doctor or go to the nearest hospital now.`
                : "What you shared should be checked by a doctor today. Go to hospital now if you feel faint or the bleeding is very heavy."}
          </AppText>
        </View>
      </View>
      {doc.contacts.length > 0 ? (
        <View style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.1)", padding: 12, gap: 8 }}>
          <AppText style={{ fontSize: 14, fontWeight: "600", color: "#fff" }}>Let your family know</AppText>
          <AlertButtons contacts={doc.contacts} reason={hit.reason} tone="onRed" />
        </View>
      ) : (
        <AppText style={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }}>Tip: add a family contact in the Care tab so you can alert them in one tap.</AppText>
      )}
      <View style={atom.wrap}>
        {crisis ? <BannerBtn label="Call 14416" solid fg={palette.plum800} onPress={() => void call("14416")} /> : null}
        <BannerBtn label="Call 112" solid fg={TW.rose[700]} onPress={() => void call("112")} />
        {!crisis ? <BannerBtn label="Nearest hospital" onPress={() => void openUrl(mapsSearch(mode === "pregnancy" ? "government maternity hospital near me" : "government hospital near me"))} /> : null}
        <BannerBtn label="Dismiss" onPress={() => setHit(null)} />
      </View>
    </Animated.View>
  );
}

function BannerBtn({ label, onPress, solid, fg = "#fff" }: { label: string; onPress: () => void; solid?: boolean; fg?: string }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.95} accessibilityRole="button" style={{ borderRadius: 999, paddingHorizontal: 16, minHeight: 44, justifyContent: "center", backgroundColor: solid ? "#fff" : "rgba(255,255,255,0.15)" }}>
      <AppText style={{ fontSize: 14, fontWeight: solid ? "600" : "500", color: solid ? fg : "#fff" }}>{label}</AppText>
    </PressableScale>
  );
}

export function FamilyContactsCard() {
  const { t } = useT();
  const { doc, save } = useUserDoc<FamilyDoc>("family", EMPTY);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Contact>({ name: "", relation: "", phone: "" });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    if (!form.name.trim()) return setError("Add a name.");
    if (!validPhone(form.phone)) return setError("Enter a 10-digit mobile number.");
    if (doc.contacts.some((c) => digits(c.phone) === digits(form.phone))) return setError("That number is already added.");
    void save((d) => ({ contacts: [...d.contacts, { name: form.name.trim().slice(0, 40), relation: form.relation.trim().slice(0, 30), phone: form.phone.trim() }].slice(0, 3) }));
    setForm({ name: "", relation: "", phone: "" });
    setAdding(false);
    setError(null);
  };
  const remove = (phone: string) => void save((d) => ({ contacts: d.contacts.filter((c) => c.phone !== phone) }));

  return (
    <Panel>
      <PanelTitle
        icon={UsersThree}
        iconColor={palette.lavender500}
        title={t("family.title")}
        subtitle={t("family.description")}
        right={doc.contacts.length > 0 ? <PillButton label={t("family.iNeedHelp")} variant="rose" onPress={() => setSending((v) => !v)} /> : undefined}
      />
      {sending ? (
        <View style={{ marginTop: 12, borderRadius: 16, backgroundColor: TW.rose[50], padding: 12 }}>
          <AlertButtons contacts={doc.contacts} reason={null} />
        </View>
      ) : null}
      <View style={{ marginTop: 12, gap: 8 }}>
        {doc.contacts.map((c) => (
          <View key={c.phone} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.7)", paddingHorizontal: 12, paddingVertical: 10 }}>
            <View style={{ flex: 1 }}>
              <AppText style={{ fontSize: 14, color: palette.plum900 }}>
                <AppText style={{ fontSize: 14, fontWeight: "500" }}>{c.name}</AppText>
                {c.relation ? <AppText style={atom.soft}> · {c.relation}</AppText> : null}
              </AppText>
              <AppText style={atom.small}>{c.phone}</AppText>
            </View>
            <Pressable onPress={() => remove(c.phone)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${c.name}`} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
              <Trash size={16} color="rgba(42,21,47,0.35)" />
            </Pressable>
          </View>
        ))}
      </View>
      {adding ? (
        <View style={{ marginTop: 12, gap: 8, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.7)", padding: 12 }}>
          <Field label="Name" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} autoComplete="name" />
          <Field label="Relation" value={form.relation} placeholder="Husband, Amma…" onChangeText={(v) => setForm((f) => ({ ...f, relation: v }))} />
          <Field label="Mobile" value={form.phone} placeholder="98765 43210" keyboardType="phone-pad" autoComplete="tel" onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} />
          {error ? (
            <AppText accessibilityRole="alert" style={{ fontSize: 14, color: TW.rose[600] }}>
              {error}
            </AppText>
          ) : null}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <PillButton label={t("common.save")} onPress={add} />
            <PillButton
              label={t("common.cancel")}
              variant="ghost"
              onPress={() => {
                setAdding(false);
                setError(null);
              }}
            />
          </View>
        </View>
      ) : doc.contacts.length < 3 ? (
        <Pressable onPress={() => setAdding(true)} accessibilityRole="button" style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40 }}>
          <Plus size={16} color={palette.lavender600} />
          <AppText style={{ fontSize: 14, fontWeight: "500", color: palette.lavender600 }}>{doc.contacts.length ? t("family.addAnother") : t("family.addPerson")}</AppText>
        </Pressable>
      ) : null}
    </Panel>
  );
}
