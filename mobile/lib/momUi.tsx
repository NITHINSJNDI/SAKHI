/** Mom Mode screen-level UI shared across the tabs: header + reminder center. */
import { createContext, useContext, useState, type ReactNode } from "react";

import { RedFlagBanner } from "@/components/shared/FamilyAlert";
import ModeHeader from "@/components/shared/ModeHeader";
import NotificationCenter from "@/components/shared/NotificationCenter";
import { useT } from "@/lib/i18n";
import { useMom } from "@/lib/momData";
import type { MomPrefs, Reminder } from "@/lib/useHerReminders";

const Ctx = createContext<{ openReminders: () => void; upcoming: number }>({ openReminders: () => {}, upcoming: 0 });

export function MomUiProvider({ children }: { children: ReactNode }) {
  const { t } = useT();
  const { reminders: store } = useMom();
  const [open, setOpen] = useState(false);
  const upcoming = store.reminders.filter((r: Reminder) => r.status === "upcoming").length;
  return (
    <Ctx.Provider value={{ openReminders: () => setOpen(true), upcoming }}>
      {children}
      <NotificationCenter<MomPrefs>
        open={open}
        onClose={() => setOpen(false)}
        title={t("notifications.maternalNotifications")}
        disabledHint={t("notifications.disabledHintMom")}
        preferences={store.preferences}
        prefKeys={["water", "meal", "vitamins", "exercise", "bp", "sugar"]}
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

export function MomTop() {
  const ui = useContext(Ctx);
  const { displayName } = useMom();
  return (
    <>
      <ModeHeader mode="pregnancy" displayName={displayName} reminderCount={ui.upcoming} onOpenReminders={ui.openReminders} />
      <RedFlagBanner mode="pregnancy" />
    </>
  );
}
