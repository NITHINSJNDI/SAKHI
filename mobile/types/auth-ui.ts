import type { ApiError } from "@/lib/api";

export type AuthMode = "signin" | "signup";
export type SignupStep = 1 | 2;
export type DemoMode = "her" | "pregnancy";

export interface AuthSubmitState {
  busy: boolean;
  error: string | null;
  success: string | null;
}

export type ApiFailure = ApiError;
