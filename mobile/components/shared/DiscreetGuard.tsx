/**
 * Port of frontend/components/DiscreetGuard.tsx: when discreet mode is on, a
 * PIN screen when the app opens, after a minute in the background, or when the
 * header's hide button is tapped.
 */
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Backspace, LockSimple } from "phosphor-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Modal, View } from "react-native";

import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/ui";
import { ink } from "@/components/web/Panel";
import { useAuth } from "@/lib/auth";
import { checkPin, isDiscreet, loadDiscreet, onDiscreetChange, onLockRequest } from "@/lib/discreet";
import { errorHaptic, successHaptic } from "@/lib/haptics";
import { clearAllLocalReminders } from "@/lib/localReminders";
import { clearSakhiStorage } from "@/lib/storage";
import { palette } from "@/theme";

const AWAY_MS = 60_000;
const MAX_TRIES = 5;
const nowMs = () => Date.now();

function Key({ d, onPress }: { d: string; onPress: (d: string) => void }) {
  return (
    <PressableScale onPress={() => onPress(d)} scaleTo={0.9} accessibilityLabel={d} style={{ width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", shadowColor: "#2A152F", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 }}>
      <AppText style={{ fontSize: 26, fontWeight: "500", color: palette.plum900 }}>{d}</AppText>
    </PressableScale>
  );
}

export default function DiscreetGuard() {
  const router = useRouter();
  const qc = useQueryClient();
  const { signOut } = useAuth();
  const [on, setOn] = useState(false);
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  const [waitUntil, setWaitUntil] = useState(0);
  const [forgot, setForgot] = useState(false);
  const typed = useRef("");
  const awayAt = useRef<number | null>(null);

  const lock = useCallback(() => {
    if (!isDiscreet()) return;
    typed.current = "";
    setPin("");
    setError(null);
    setLocked(true);
  }, []);

  useEffect(() => {
    void loadDiscreet().then((d) => {
      setOn(d);
      if (d) setLocked(true);
    });
    const offChange = onDiscreetChange(() => {
      setOn(isDiscreet());
      if (!isDiscreet()) setLocked(false);
    });
    const offLock = onLockRequest(lock);
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active") awayAt.current = nowMs();
      else if (awayAt.current && nowMs() - awayAt.current > AWAY_MS) lock();
    });
    return () => {
      offChange();
      offLock();
      sub.remove();
    };
  }, [lock]);

  const submit = async (value: string) => {
    const ok = await checkPin(value);
    typed.current = "";
    setPin("");
    if (ok) {
      successHaptic();
      setLocked(false);
      setTries(0);
      setError(null);
      return;
    }
    errorHaptic();
    const n = tries + 1;
    setTries(n);
    if (n >= MAX_TRIES) {
      setWaitUntil(nowMs() + 30_000);
      setTries(0);
      setError("Too many tries. Wait 30 seconds.");
    } else setError("Wrong PIN. Try again.");
  };

  const press = (d: string) => {
    if (nowMs() < waitUntil || typed.current.length >= 4) return;
    setError(null);
    const next = typed.current + d;
    typed.current = next;
    setPin(next);
    if (next.length === 4) void submit(next);
  };
  const back = () => {
    typed.current = typed.current.slice(0, -1);
    setPin(typed.current);
  };

  const resetBySignOut = async () => {
    await clearAllLocalReminders();
    await clearSakhiStorage();
    qc.clear();
    await signOut();
    setLocked(false);
    setOn(false);
    router.replace("/(auth)/login");
  };

  if (!on || !locked) return null;
  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.cream, paddingHorizontal: 24 }} accessibilityViewIsModal accessibilityLabel="Enter PIN">
        <LockSimple size={32} color={ink[50]} weight="duotone" />
        <AppText style={{ marginTop: 16, fontSize: 18, fontWeight: "600", color: palette.plum900 }}>Enter PIN</AppText>
        <View style={{ marginTop: 20, flexDirection: "row", gap: 14 }} accessibilityElementsHidden>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: i < pin.length ? palette.plum900 : ink[40], backgroundColor: i < pin.length ? palette.plum900 : "transparent" }} />
          ))}
        </View>
        <AppText style={{ marginTop: 12, height: 20, fontSize: 14, color: "#E11D48" }} accessibilityLiveRegion="polite">{error || ""}</AppText>
        <View style={{ marginTop: 12, gap: 14 }}>
          {[["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"]].map((row) => (
            <View key={row[0]} style={{ flexDirection: "row", gap: 14 }}>
              {row.map((d) => (
                <Key key={d} d={d} onPress={press} />
              ))}
            </View>
          ))}
          <View style={{ flexDirection: "row", gap: 14 }}>
            <View style={{ width: 72 }} />
            <Key d="0" onPress={press} />
            <PressableScale onPress={back} accessibilityLabel="Delete" style={{ width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" }}>
              <Backspace size={26} color={ink[60]} />
            </PressableScale>
          </View>
        </View>
        {forgot ? (
          <View style={{ marginTop: 28, maxWidth: 300, alignItems: "center", gap: 12 }}>
            <AppText style={{ fontSize: 14, lineHeight: 20, textAlign: "center", color: ink[60] }}>To reset the PIN you need to sign out on this phone. Your data stays in your account.</AppText>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <PressableScale onPress={() => setForgot(false)} style={{ minHeight: 44, paddingHorizontal: 18, borderRadius: 22, justifyContent: "center" }}>
                <AppText style={{ fontSize: 14, fontWeight: "500", color: palette.plum900 }}>Cancel</AppText>
              </PressableScale>
              <PressableScale onPress={() => void resetBySignOut()} style={{ minHeight: 44, paddingHorizontal: 18, borderRadius: 22, justifyContent: "center", backgroundColor: palette.plum900 }}>
                <AppText style={{ fontSize: 14, fontWeight: "600", color: palette.cream }}>Sign out</AppText>
              </PressableScale>
            </View>
          </View>
        ) : (
          <PressableScale onPress={() => setForgot(true)} style={{ marginTop: 28, minHeight: 44, justifyContent: "center" }}>
            <AppText style={{ fontSize: 14, color: ink[60] }}>Forgot PIN?</AppText>
          </PressableScale>
        )}
      </View>
    </Modal>
  );
}
