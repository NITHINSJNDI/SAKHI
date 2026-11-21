import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "./auth";
import { getString, setString } from "./storage";

export type AppMode = "her" | "pregnancy";
const KEY = "sakhi_active_mode";

interface ModeValue {
  /** null until the saved mode has been read */
  mode: AppMode | null;
  setMode: (m: AppMode) => Promise<void>;
}

const ModeContext = createContext<ModeValue | null>(null);

/**
 * Which mode the app is in. Like the web (sakhi_active_mode), the app is in one
 * mode at a time. Default: the last mode used; otherwise Mom Mode if only a
 * pregnancy profile exists, else Her Mode.
 */
export function ModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [mode, setModeState] = useState<AppMode | null>(null);

  useEffect(() => {
    void (async () => {
      const saved = await getString(KEY);
      if (saved === "her" || saved === "pregnancy") {
        // A saved mode whose profile no longer exists falls back to the one that does
        if (saved === "pregnancy" && user && !user.hasMomProfile && user.hasHerProfile) return setModeState("her");
        if (saved === "her" && user && !user.hasHerProfile && user.hasMomProfile) return setModeState("pregnancy");
        return setModeState(saved);
      }
      setModeState(user?.hasMomProfile && !user?.hasHerProfile ? "pregnancy" : "her");
    })();
  }, [user]);

  const setMode = useCallback(async (m: AppMode) => {
    setModeState(m);
    await setString(KEY, m);
  }, []);

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);
  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useMode(): ModeValue {
  const v = useContext(ModeContext);
  if (!v) throw new Error("useMode must be used inside ModeProvider");
  return v;
}
