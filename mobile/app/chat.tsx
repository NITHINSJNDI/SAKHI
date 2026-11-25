/**
 * Ask Sakhi: port of frontend/hooks/useSakhiChat.ts + components/chat/SakhiChatPanel.tsx.
 * History that survives restarts (server, or the phone when the server can't
 * store it), quick replies for where she is, every chart update the server
 * sends (logs, tablets, meals, emergencies), spoken replies, and tappable
 * helpline numbers.
 */
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CaretLeft, ChatsCircle, LockSimple, NotePencil, PaperPlaneRight, ShieldCheck, SpeakerHigh, SpeakerSlash, Trash, WifiSlash, type Icon } from "phosphor-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, FlatList, Image, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import Animated, { FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/ui";
import { ink } from "@/components/web/Panel";
import { Sheet } from "@/components/web/Sheet";
import { apiFetch } from "@/lib/api";
import { chartBus, emitEmergency } from "@/lib/events";
import { useT } from "@/lib/i18n";
import { call } from "@/lib/links";
import { queryKeys } from "@/lib/queryKeys";
import { getJSON, setJSON } from "@/lib/storage";
import { TW } from "@/lib/tw";
import { getVoiceEnabled, setVoiceEnabled, speak, stopSpeaking } from "@/lib/voice";
import { palette } from "@/theme";
import type { AskSakhiResponse, ChatHistoryResponse } from "@/types/api";

 
type Mode = "her" | "pregnancy";
interface Msg {
  id: string;
  role: "user" | "assistant";
  text: string;
  engine?: string;
  at?: string;
}
interface Quick {
  label: string;
  text: string;
  send?: boolean;
}

const ENDPOINT: Record<Mode, string> = { her: "/api/ask-sakhi", pregnancy: "/api/ask-sakhi-pregnancy" };
const localKey = (m: Mode) => `sakhi_chat_${m}`;
// shortcut: past chats live on this phone only (the server keeps just the open one); move to the API to sync across devices
interface Past {
  id: string;
  title: string;
  at: string;
  messages: Msg[];
}
const pastKey = (m: Mode) => `sakhi_chats_${m}`;
const MAX_PAST = 30;
function toPast(msgs: Msg[]): Past | null {
  if (!msgs.length) return null;
  const first = msgs.find((m) => m.role === "user") ?? msgs[0];
  return { id: newId(), title: first.text.replace(/\s+/g, " ").slice(0, 70), at: msgs[msgs.length - 1].at || nowIso(), messages: msgs };
}
let seq = 0;
const newId = () => `m${++seq}-${Math.random().toString(36).slice(2, 7)}`;
const nowIso = () => new Date().toISOString();
const ENGINE_TAG: Record<string, { label: string; icon: Icon }> = {
  offline: { label: "Simple mode", icon: WifiSlash },
  local: { label: "Private AI", icon: LockSimple },
  safety: { label: "Safety guidance", icon: ShieldCheck },
  guard: { label: "Health topics only", icon: ShieldCheck },
};
const NOTICE: Record<string, string> = {
  "daily-limit": "You've used today's AI replies, so Sakhi is in simple mode until tomorrow. Logging still works.",
  private: "Private mode is on: your chats aren't sent to Google.",
  "no-consent": "AI processing is off in your privacy choices, so Sakhi uses simple mode.",
  unavailable: "Sakhi's AI is busy right now, so she's answering in simple mode. Logging still works.",
  "no-key": "Sakhi is in simple mode: she can log what you tell her and give basic guidance.",
  "english-only": "Sakhi is in simple mode, which replies in English for now. Your readings are still saved.",
};

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { t, meta, language } = useT();
  const p = useLocalSearchParams<{ mode?: string; name?: string; phase?: string; bleeding?: string; late?: string; daysLate?: string; afterBirth?: string; baby?: string }>();
  const mode: Mode = p.mode === "pregnancy" ? "pregnancy" : "her";
  const name = p.name || undefined;

  const [messages, setMessages] = useState<Msg[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [serverStores, setServerStores] = useState(true);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [past, setPast] = useState<Past[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    void getVoiceEnabled().then(setVoiceOn);
    return () => void stopSpeaking();
  }, []);

  useEffect(() => {
    void getJSON<Past[]>(pastKey(mode), []).then(setPast);
  }, [mode]);

  // History: from the server, or the phone when the server can't store it
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiFetch<ChatHistoryResponse>(`/api/chat-history?mode=${mode}`);
        if (cancelled) return;
        if (data.stored) {
          setServerStores(true);
          setMessages((data.messages || []).map((m) => ({ id: newId(), role: m.role === "model" ? "assistant" : (m.role as Msg["role"]), text: m.text, engine: m.engine, at: m.at })));
        } else {
          setServerStores(false);
          const saved = await getJSON<Msg[]>(localKey(mode), []);
          setMessages(saved.filter((m) => m?.text && (m.role === "user" || m.role === "assistant")));
        }
      } catch {
        const saved = await getJSON<Msg[]>(localKey(mode), []);
        if (!cancelled) setMessages(saved);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    if (loaded && !serverStores) void setJSON(localKey(mode), messages.slice(-100));
  }, [messages, serverStores, mode, loaded]);

  const say = useCallback(
    async (text: string) => {
      if (!(await getVoiceEnabled())) return;
      setSpeaking(true);
      await speak(text, meta.bcp47 || "en-IN", undefined, () => setSpeaking(false));
    },
    [meta.bcp47],
  );

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || loading) return;
      const prior = messagesRef.current;
      setMessages((prev) => [...prev, { id: newId(), role: "user", text, at: nowIso() }]);
      setInput("");
      setLoading(true);
      try {
        const data = await apiFetch<AskSakhiResponse>(ENDPOINT[mode], {
          method: "POST",
          body: JSON.stringify({
            message: text,
            prompt: text,
            userName: name,
            lang: meta.bcp47 || language,
            // The server uses this only when it holds no history of its own (a reopened past chat)
            history: prior.slice(-10).map((m) => ({ role: m.role, text: m.text })),
          }),
        });
        const reply = data.reply || "I'm having trouble connecting right now. Please try again in a moment.";
        setMessages((prev) => [...prev, { id: newId(), role: "assistant", text: reply, engine: data.engine, at: nowIso() }]);
        setNotice(data.notice || null);
        const updates: any[] = Array.isArray(data.chartUpdates) ? data.chartUpdates : data.updatedChartData ? [data.updatedChartData] : [];
        updates.forEach((u) => {
          if (u?.type === "emergency") emitEmergency(u.reason ?? null, u.level === "crisis" ? "crisis" : "emergency");
          chartBus.emit(u);
        });
        if (updates.length) {
          void qc.invalidateQueries({ queryKey: mode === "her" ? queryKeys.dashboard : queryKeys.pregnancyData });
          void qc.invalidateQueries({ queryKey: ["user-doc"] });
        }
        void say(reply);
      } catch (e: any) {
        const reply = e?.status === 429 ? "You are sending messages very quickly. Please pause a moment before asking again." : "I'm having trouble connecting right now. Please check your internet and try again.";
        setMessages((prev) => [...prev, { id: newId(), role: "assistant", text: reply, engine: "offline", at: nowIso() }]);
      } finally {
        setLoading(false);
      }
    },
    [loading, mode, name, meta.bcp47, language, qc, say],
  );

  const savePast = (list: Past[]) => {
    const next = list.slice(0, MAX_PAST);
    setPast(next);
    void setJSON(pastKey(mode), next);
  };
  // Swap what's open: the server forgets the current thread, the phone shows `next`
  const openThread = async (next: Msg[]) => {
    void stopSpeaking();
    setSpeaking(false);
    setNotice(null);
    setMessages(next);
    setHistoryOpen(false);
    await setJSON(localKey(mode), next);
    await apiFetch(`/api/chat-history?mode=${mode}`, { method: "DELETE" }).catch(() => null);
  };
  const newChat = () => {
    const cur = toPast(messagesRef.current);
    if (cur) savePast([cur, ...past]);
    void openThread([]);
  };
  const reopen = (c: Past) => {
    const cur = toPast(messagesRef.current);
    savePast([...(cur ? [cur] : []), ...past.filter((x) => x.id !== c.id)]);
    void openThread(c.messages);
  };
  const removePast = (c: Past) =>
    Alert.alert(t("chat.deleteChat", "Delete this chat?"), c.title, [
      { text: t("common.cancel", "Cancel"), style: "cancel" },
      { text: t("common.delete", "Delete"), style: "destructive", onPress: () => savePast(past.filter((x) => x.id !== c.id)) },
    ]);

  const toggleVoice = async () => {
    const next = !voiceOn;
    setVoiceOn(next);
    await setVoiceEnabled(next);
    if (!next) setSpeaking(false);
  };

  // Suggestions that fit where she is
  const quick: Quick[] = (() => {
    if (mode === "pregnancy") {
      return p.afterBirth === "1"
        ? [
            { label: t("chat.quickMomBP"), text: t("chat.quickMomBPMsg") },
            { label: t("chat.quickPostnatalFeed"), text: t("chat.quickPostnatalFeedMsg") },
            { label: t("chat.quickPostnatalBaby"), text: t("chat.quickPostnatalBabyMsg") },
            { label: t("chat.quickPostnatalFood"), text: t("chat.quickPostnatalFoodMsg"), send: true },
          ]
        : [
            { label: t("chat.quickMomBP"), text: t("chat.quickMomBPMsg") },
            { label: t("chat.quickMomKicks"), text: t("chat.quickMomKicksMsg") },
            { label: t("chat.quickMomFood"), text: t("chat.quickMomFoodMsg"), send: true },
            { label: t("chat.quickMomNormal"), text: t("chat.quickMomNormalMsg") },
          ];
    }
    const out: Quick[] = [];
    if (p.bleeding === "1") out.push({ label: t("chat.quickCramps"), text: t("chat.quickCrampsMsg"), send: true });
    if (p.late === "1") out.push({ label: t("chat.quickPeriodLate"), text: t("chat.quickPeriodLateMsg", { days: p.daysLate || "" }), send: true });
    out.push({ label: t("chat.quickLogFeel"), text: t("chat.quickLogFeelMsg") });
    out.push({ label: t("chat.quickNextPeriod"), text: t("chat.quickNextPeriod"), send: true });
    if (p.phase === "luteal" && p.late !== "1") out.push({ label: t("chat.quickPmsTips"), text: t("chat.quickPmsTipsMsg"), send: true });
    else out.push({ label: t("chat.quickTired"), text: t("chat.quickTiredMsg"), send: true });
    return out.slice(0, 4);
  })();

  const dayLabel = (iso?: string) => {
    if (!iso) return undefined;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return undefined;
    const key = (x: Date) => x.toDateString();
    const now = new Date();
    const y = new Date(now.getTime() - 86_400_000);
    if (key(d) === key(now)) return t("common.today");
    if (key(d) === key(y)) return t("common.yesterday");
    return d.toLocaleDateString(meta.bcp47 || "en-IN", { day: "numeric", month: "short" });
  };

  const accent = mode === "pregnancy" ? palette.lavender600 : palette.pink500;
  const emptyPrompt = mode === "pregnancy" ? (p.afterBirth === "1" ? t("chat.emptyPostnatalPrompt", { name: name || t("common.friend"), babyName: p.baby || "baby" }) : t("chat.emptyMomPrompt", { name: name || t("common.friend") })) : t("chat.askHerMobile", "Tell me how you feel, or ask anything about your cycle.");

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: palette.cream }} keyboardVerticalOffset={0}>
      <View style={{ paddingTop: insets.top + 4, paddingHorizontal: 8, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 4, borderBottomWidth: 1, borderBottomColor: "rgba(251,207,232,0.6)", backgroundColor: "rgba(255,255,255,0.7)" }}>
        <PressableScale onPress={() => router.back()} accessibilityLabel={t("common.back")} style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }}>
          <CaretLeft size={22} color={palette.plum900} />
        </PressableScale>
        <SakhiFace speaking={speaking || loading} accent={accent} />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <AppText style={{ fontSize: 17, fontWeight: "600", color: palette.plum900 }}>Sakhi</AppText>
          <AppText numberOfLines={1} style={{ fontSize: 12, color: ink[55] }} accessibilityLiveRegion="polite">
            {loading ? t("chat.thinking") : speaking ? t("chat.speaking") : mode === "her" ? t("chat.herSubtitle", "Your cycle companion") : t("chat.askSakhiAnything")}
          </AppText>
        </View>
        {speaking ? (
          <PressableScale onPress={() => { void stopSpeaking(); setSpeaking(false); }} accessibilityLabel={t("chat.interrupt")} style={{ minHeight: 44, paddingHorizontal: 10, justifyContent: "center" }}>
            <AppText style={{ fontSize: 12, fontWeight: "600", color: TW.pink[600] }}>{t("chat.interrupt")}</AppText>
          </PressableScale>
        ) : null}
        <PressableScale onPress={() => void toggleVoice()} accessibilityLabel={voiceOn ? t("chat.voiceRepliesOn") : t("chat.voiceRepliesOff")} style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }}>
          {voiceOn ? <SpeakerHigh size={20} color={accent} weight="duotone" /> : <SpeakerSlash size={20} color={ink[50]} />}
        </PressableScale>
        <PressableScale onPress={() => setHistoryOpen(true)} accessibilityLabel={t("chat.pastChats", "Past chats")} style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }}>
          <ChatsCircle size={21} color={ink[60]} />
        </PressableScale>
        {messages.length ? (
          <PressableScale onPress={newChat} accessibilityLabel={t("chat.newChat", "New chat")} style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }}>
            <NotePencil size={21} color={ink[60]} />
          </PressableScale>
        ) : null}
      </View>

      {notice && NOTICE[notice] ? (
        <View style={{ marginHorizontal: 12, marginTop: 8, borderRadius: 12, backgroundColor: "rgba(255,251,235,0.95)", borderWidth: 1, borderColor: "rgba(253,230,138,0.7)", paddingHorizontal: 12, paddingVertical: 8 }}>
          <AppText style={{ fontSize: 12, lineHeight: 17, color: "#78350F" }}>{NOTICE[notice]}</AppText>
        </View>
      ) : null}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 14, gap: 10, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          loaded ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 12 }}>
              <View style={{ borderRadius: 50, borderWidth: 3, borderColor: accent }}>
                <SakhiAvatar size={88} />
              </View>
              <AppText style={{ fontSize: 22, fontWeight: "500", textAlign: "center", color: palette.plum900 }}>{t("chat.emptyGreeting", { name: name || t("common.friend") })}</AppText>
              <AppText style={{ fontSize: 14, lineHeight: 20, textAlign: "center", color: ink[60] }}>{emptyPrompt}</AppText>
            </View>
          ) : (
            <View style={{ gap: 12, paddingTop: 8 }}>
              <SkeletonBubble w="62%" />
              <SkeletonBubble w="48%" mine />
              <SkeletonBubble w="70%" />
            </View>
          )
        }
        renderItem={({ item: m, index }) => {
          const day = dayLabel(m.at);
          const showDay = day && day !== dayLabel(messages[index - 1]?.at);
          const tag = m.role === "assistant" && m.engine ? ENGINE_TAG[m.engine] : undefined;
          const mine = m.role === "user";
          return (
            <Animated.View entering={FadeInUp.duration(220)} style={{ gap: 8 }}>
              {showDay ? (
                <View style={{ alignSelf: "center", paddingHorizontal: 12, paddingVertical: 3, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.7)", borderWidth: 1, borderColor: TW.pink[100] }}>
                  <AppText style={{ fontSize: 11, color: ink[50] }}>{day}</AppText>
                </View>
              ) : null}
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, alignSelf: mine ? "flex-end" : "flex-start", maxWidth: mine ? "88%" : "92%" }}>
              {mine ? null : <SakhiAvatar size={30} />}
              <View
                style={{
                  flexShrink: 1,
                  padding: 12,
                  borderRadius: 18,
                  borderTopRightRadius: mine ? 4 : 18,
                  borderTopLeftRadius: mine ? 18 : 4,
                  borderWidth: 1,
                  borderColor: m.engine === "safety" ? TW.rose[200] : "rgba(255,255,255,0.5)",
                  backgroundColor: mine ? "rgba(252,231,243,0.95)" : m.engine === "safety" ? TW.rose[50] : "rgba(255,255,255,0.92)",
                }}
              >
                {mine ? <AppText style={{ fontSize: 15, lineHeight: 21, color: TW.pink[900] }}>{m.text}</AppText> : <ChatMarkdown text={m.text} />}
                {tag ? (
                  <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <tag.icon size={11} color={ink[45]} />
                    <AppText style={{ fontSize: 10, color: ink[45] }}>{tag.label}</AppText>
                  </View>
                ) : null}
              </View>
              </View>
            </Animated.View>
          );
        }}
        ListFooterComponent={loading ? <TypingDots /> : undefined}
      />

      {!loading && quick.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingBottom: 8 }}>
          {quick.map((q) => (
            <PressableScale key={q.label} onPress={() => (q.send ? void send(q.text) : setInput(q.text))} scaleTo={0.95} style={{ minHeight: 36, paddingHorizontal: 12, borderRadius: 18, justifyContent: "center", backgroundColor: "rgba(255,255,255,0.85)", borderWidth: 1, borderColor: TW.pink[200] }}>
              <AppText style={{ fontSize: 13, fontWeight: "500", color: TW.pink[700] }}>{q.label}</AppText>
            </PressableScale>
          ))}
        </ScrollView>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 10), borderTopWidth: 1, borderTopColor: "rgba(251,207,232,0.5)", backgroundColor: "rgba(255,255,255,0.85)" }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={t("chat.placeholderMobile", "Message Sakhi…")}
          placeholderTextColor={ink[40]}
          multiline
          maxLength={2000}
          style={{ flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 15, color: palette.plum900, backgroundColor: "rgba(251,246,243,0.9)", borderWidth: 1, borderColor: ink[10] }}
          accessibilityLabel={t("chat.placeholderMobile", "Message Sakhi…")}
        />
        <PressableScale onPress={() => void send(input)} disabled={!input.trim() || loading} accessibilityLabel={t("chat.send")} style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: input.trim() && !loading ? palette.plum900 : ink[10] }}>
          <PaperPlaneRight size={20} color="#fff" weight="fill" />
        </PressableScale>
      </View>
      <Sheet open={historyOpen} onClose={() => setHistoryOpen(false)} title={t("chat.pastChats", "Past chats")}>
        <PressableScale onPress={newChat} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, paddingHorizontal: 16, borderRadius: 16, backgroundColor: palette.plum900 }}>
          <NotePencil size={20} color={palette.cream} />
          <AppText style={{ fontSize: 15, fontWeight: "600", color: palette.cream }}>{t("chat.newChat", "New chat")}</AppText>
        </PressableScale>
        {past.length ? (
          <View style={{ marginTop: 12, gap: 6 }}>
            {past.map((c) => (
              <View key={c.id} style={{ flexDirection: "row", alignItems: "center", borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: ink[7] }}>
                <PressableScale onPress={() => reopen(c)} accessibilityRole="button" accessibilityLabel={c.title} style={{ flex: 1, minHeight: 56, paddingHorizontal: 14, paddingVertical: 10, justifyContent: "center" }}>
                  <AppText numberOfLines={1} style={{ fontSize: 15, fontWeight: "500", color: palette.plum900 }}>
                    {c.title}
                  </AppText>
                  <AppText style={{ marginTop: 2, fontSize: 12, color: ink[50] }}>
                    {dayLabel(c.at)} · {t("chat.messagesCount", { count: c.messages.length })}
                  </AppText>
                </PressableScale>
                <PressableScale onPress={() => removePast(c)} accessibilityLabel={t("chat.deleteChat", "Delete this chat?")} style={{ width: 48, height: 56, alignItems: "center", justifyContent: "center" }}>
                  <Trash size={18} color={ink[45]} />
                </PressableScale>
              </View>
            ))}
          </View>
        ) : (
          <AppText style={{ marginTop: 16, fontSize: 14, lineHeight: 20, color: ink[55], textAlign: "center" }}>{t("chat.noPastChats", "Your earlier chats will appear here when you start a new one.")}</AppText>
        )}
      </Sheet>
    </KeyboardAvoidingView>
  );
}

/** Sakhi's face: a soft orb that breathes while she thinks or speaks. */
function SakhiFace({ speaking, accent }: { speaking: boolean; accent: string }) {
  const s = useSharedValue(1);
  useEffect(() => {
    s.set(speaking ? withRepeat(withTiming(1.12, { duration: 450 }), -1, true) : withTiming(1));
  }, [speaking, s]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.get() }] }));
  return (
    <Animated.View style={[{ borderRadius: 20, borderWidth: 2, borderColor: accent }, style]}>
      <SakhiAvatar size={36} />
    </Animated.View>
  );
}

const SAKHI_DOLL = require("@/assets/images/sakhi-doll.png");
// The doll picture is 1473x720; this box (in its pixels) frames her face
const FACE = { x: 540, y: 70, w: 410 };

/** Sakhi's face in a circle, beside each of her replies. */
function SakhiAvatar({ size }: { size: number }) {
  const k = size / FACE.w;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", backgroundColor: "#F7F1EC", borderWidth: 1, borderColor: TW.pink[100] }}>
      <Image
        source={SAKHI_DOLL}
        style={{ position: "absolute", width: 1473 * k, height: 720 * k, left: -FACE.x * k, top: -FACE.y * k }}
        accessibilityLabel="Sakhi"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

function SkeletonBubble({ w, mine }: { w: `${number}%`; mine?: boolean }) {
  const o = useSharedValue(0.5);
  useEffect(() => {
    o.set(withRepeat(withTiming(1, { duration: 700 }), -1, true));
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.get() }));
  return <Animated.View style={[{ alignSelf: mine ? "flex-end" : "flex-start", width: w, height: 44, borderRadius: 18, backgroundColor: mine ? "rgba(252,231,243,0.8)" : "rgba(255,255,255,0.8)" }, style]} />;
}

function TypingDots() {
  const o = useSharedValue(0.3);
  useEffect(() => {
    o.set(withRepeat(withTiming(1, { duration: 600 }), -1, true));
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.get() }));
  return (
    <Animated.View style={[{ alignSelf: "flex-start", flexDirection: "row", gap: 5, padding: 14, borderRadius: 18, borderTopLeftRadius: 4, backgroundColor: "rgba(255,255,255,0.92)", marginTop: 4 }, style]} accessibilityLabel="Sakhi is typing">
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: palette.pink400 }} />
      ))}
    </Animated.View>
  );
}

/** Port of components/chat/ChatMarkdown.tsx: **bold**, *italic*, bullets, numbered lists, tappable helplines. */
const PHONE = /\b(112|108|102|14416|1800[- ]?\d{3}[- ]?\d{4})\b/g;
function inline(text: string, key: string) {
  const out: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  const pushText = (s: string) => {
    let pos = 0;
    let n: RegExpExecArray | null;
    PHONE.lastIndex = 0;
    while ((n = PHONE.exec(s))) {
      if (n.index > pos) out.push(s.slice(pos, n.index));
      const num = n[1];
      out.push(
        <AppText key={`${key}-t${i++}`} onPress={() => call(num.replace(/\D/g, ""))} style={{ fontWeight: "600", textDecorationLine: "underline", color: palette.plum900 }} accessibilityRole="link">
          {num}
        </AppText>,
      );
      pos = n.index + num.length;
    }
    if (pos < s.length) out.push(s.slice(pos));
  };
  while ((m = re.exec(text))) {
    if (m.index > last) pushText(text.slice(last, m.index));
    out.push(
      m[1] !== undefined ? (
        <AppText key={`${key}-b${i++}`} style={{ fontWeight: "600" }}>{m[1]}</AppText>
      ) : (
        <AppText key={`${key}-i${i++}`} style={{ fontStyle: "italic" }}>{m[2]}</AppText>
      ),
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) pushText(text.slice(last));
  return out;
}

function ChatMarkdown({ text }: { text: string }) {
  const base = { fontSize: 15, lineHeight: 22, color: palette.plum900 } as const;
  const blocks: React.ReactNode[] = [];
  text
    .replace(/\r/g, "")
    .split("\n")
    .forEach((line, idx) => {
      const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
      const num = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
      if (bullet || num) {
        blocks.push(
          <View key={idx} style={{ flexDirection: "row", gap: 6, paddingLeft: 4 }}>
            <AppText style={{ ...base, color: palette.pink400 }}>{num ? `${num[1]}.` : "•"}</AppText>
            <AppText style={{ ...base, flex: 1 }}>{inline(num ? num[2] : bullet![1], `l${idx}`)}</AppText>
          </View>,
        );
      } else if (line.trim()) {
        blocks.push(
          <AppText key={idx} style={base}>
            {inline(line, `p${idx}`)}
          </AppText>,
        );
      } else blocks.push(<View key={idx} style={{ height: 6 }} />);
    });
  return <View style={{ gap: 2 }}>{blocks}</View>;
}
