/**
 * Central TanStack React Query keys for the SAKHI mobile app.
 */
export const queryKeys = {
  me: ["me"] as const,
  dashboard: ["dashboard-data"] as const,
  cycleLogs: ["cycle-logs"] as const,
  predictCycle: (params?: Record<string, unknown>) =>
    params ? (["predict", "cycle", params] as const) : (["predict", "cycle"] as const),
  predictPcos: (params?: Record<string, unknown>) =>
    params ? (["predict", "pcos", params] as const) : (["predict", "pcos"] as const),
  pregnancyData: ["pregnancy-data"] as const,
  weight: ["weight"] as const,
  profile: ["profile"] as const,
  preferences: ["preferences"] as const,
  // Phase 3 keys
  chatHistory: (mode: "her" | "pregnancy") => ["chat-history", mode] as const,
  triage: ["triage"] as const,
  relief: (severity?: number) => ["relief", severity] as const,
  labReports: ["lab-report"] as const,
  doctorSummary: (mode: "her" | "pregnancy", days: number) => ["doctor-summary", mode, days] as const,
  consent: ["consent"] as const,
};
