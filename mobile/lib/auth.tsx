import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { apiFetch, setUnauthorizedHandler } from "./api";
import { signOutOfGoogle } from "./google-auth";
import { registerForPush, unregisterPush } from "./push";
import { clearAccessToken, getAccessToken, setAccessToken } from "./secure-store";
import type { MeResponse } from "@/types/api";
import type { AuthContextValue, AuthState } from "@/types/auth";

const AuthContext = createContext<AuthContextValue | null>(null);

const INITIAL_STATE: AuthState = {
  status: "loading",
  user: null,
  hasToken: false,
};

function isAuthenticated(me: MeResponse): boolean {
  return Boolean(me.authenticated || me.email);
}

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [state, setState] = useState<AuthState>(INITIAL_STATE);
  const mounted = useRef(true);

  const setSession = useCallback(async (token: string, user: MeResponse | null) => {
    await setAccessToken(token);
    if (!mounted.current) return;
    setState({ status: "authenticated", user, hasToken: true });
  }, []);

  const signOut = useCallback(async () => {
    await unregisterPush();
    await signOutOfGoogle();
    await clearAccessToken();
    if (!mounted.current) return;
    setState({ status: "unauthenticated", user: null, hasToken: false });
  }, []);

  const refreshSession = useCallback(async () => {
    if (!mounted.current) return;

    const token = await getAccessToken();
    if (!token) {
      if (mounted.current) setState({ status: "unauthenticated", user: null, hasToken: false });
      return;
    }

    if (mounted.current) {
      setState((current) => (current.status === "loading" ? current : { ...current, status: "loading" }));
    }

    try {
      const me = await apiFetch<MeResponse>("/api/me");
      if (!mounted.current) return;
      const authed = isAuthenticated(me);
      setState({
        status: authed ? "authenticated" : "unauthenticated",
        user: me,
        hasToken: true,
      });
      if (authed) void registerForPush();
    } catch {
      if (!mounted.current) return;
      setState({ status: "unauthenticated", user: null, hasToken: false });
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshSession();
    return () => {
      mounted.current = false;
    };
  }, [refreshSession]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut();
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signOut,
      refreshSession,
      setSession,
    }),
    [refreshSession, setSession, signOut, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
