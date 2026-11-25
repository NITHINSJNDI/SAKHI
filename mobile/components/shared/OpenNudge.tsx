/**
 * Daily check-in nudge for days she doesn't open the app. Every time the app
 * opens, the next 7 evenings get a 7 pm reminder starting tomorrow, so today's
 * is cancelled (she's here) and she's only nudged on days she stays away.
 */
import { useEffect } from "react";
import { AppState } from "react-native";

import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { setDateReminders } from "@/lib/localReminders";

const NUDGE_HOUR = 19;
const DAYS = 7;

/** The next `DAYS` evenings at NUDGE_HOUR, starting tomorrow. */
export function nudgeTimes(now = new Date()): number[] {
  return Array.from({ length: DAYS }, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1 + i, NUDGE_HOUR).getTime());
}

export default function OpenNudge() {
  const { status } = useAuth();
  const { t } = useT();

  useEffect(() => {
    if (status !== "authenticated") return;
    const plan = () =>
      void setDateReminders(
        "open_nudge",
        nudgeTimes().map((at) => ({ at, title: "Sakhi", body: t("nudge.checkIn", "Your daily check-in is waiting 💜 It takes 30 seconds.") })),
      );
    plan();
    const sub = AppState.addEventListener("change", (s) => s === "active" && plan());
    return () => sub.remove();
  }, [status, t]);

  return null;
}
