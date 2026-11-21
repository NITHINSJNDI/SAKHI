import type { MeResponse } from "./api";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthState {
  status: AuthStatus;
  user: MeResponse | null;
  /** True only after a token has been persisted in SecureStore. */
  hasToken: boolean;
}

export interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  setSession: (token: string, user: MeResponse | null) => Promise<void>;
}
