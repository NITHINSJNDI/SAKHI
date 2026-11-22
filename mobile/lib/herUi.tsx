/**
 * Her Mode screen-level UI shared across the tabs: the notification center
 * (reminder plan) and the header that opens it.
 */
import { createContext, useContext, useState, type ReactNode } from "react";

import { RedFlagBanner } from "@/components/shared/FamilyAlert";
import ModeHeader from "@/components/shared/ModeHeader";
import NotificationCenter from "@/components/shared/NotificationCenter";
import { useHer } from "@/lib/herData";
import { useT } from "@/lib/i18n";
import { useHerReminders, type HerPrefs, type Reminder } from "@/lib/useHerReminders";

const Ctx = createContext<{ openReminders: () => void; upcoming: number }>({ openReminders: () => {}, upcoming: 0 });

export function HerUiProvider({ children }: { children: ReactNode }) {
  const { t } = useT();
  const { profile, logs, cycleHistory } = useHer();
  const store = useHerReminders(profile, logs, cycleHistory);
  const [open, setOpen] = useState(false);
  const upcoming = store.reminders.filter((r: Reminder) => r.status === "upcoming").length;
  return (
    <Ctx.Provider value={{ openReminders: () => setOpen(true), upcoming }}>
      {children}
      <NotificationCenter<HerPrefs>
        open={open}
        onClose={() => setOpen(false)}
        title={t("notifications.cycleNotifications")}
        disabledHint={t("notifications.disabledHintHer")}
        preferences={store.preferences}
        prefKeys={["period_alerts", "fertile_alerts", "daily_checkins", "health_tips"]}
        reminders={store.reminders}
        onToggleMaster={() => void store.toggleMaster()}
        onUpdatePref={store.updatePreference}
        onMarkCompleted={store.markCompleted}
        onSnooze={store.snoozeReminder}
        onDelete={store.deleteReminder}
      />
    </Ctx.Provider>
  );
}

/** Header + red-flag banner at the top of every Her tab. */
export function HerTop() {
  const ui = useContext(Ctx);
  const { displayName } = useHer();
  return (
    <>
      <ModeHeader mode="her" displayName={displayName} reminderCount={ui.upcoming} onOpenReminders={ui.openReminders} />
      <RedFlagBanner mode="her" />
    </>
  );
}
