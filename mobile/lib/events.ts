/**
 * Tiny app-wide event bus (the web uses window "sakhi-chart-update" events).
 * Used for the emergency banner and for live updates from the chat.
 */
type Listener<T> = (payload: T) => void;

function channel<T>() {
  const listeners = new Set<Listener<T>>();
  return {
    emit: (p: T) => listeners.forEach((l) => l(p)),
    on: (l: Listener<T>) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
}

export interface EmergencyEvent {
  reason: string | null;
  level: "emergency" | "crisis";
}

export const emergencyBus = channel<EmergencyEvent>();
export const emitEmergency = (reason: string | null = null, level: EmergencyEvent["level"] = reason === "self-harm" ? "crisis" : "emergency") =>
  emergencyBus.emit({ reason, level });

export interface ChartUpdateEvent {
  type?: string;
  [key: string]: unknown;
}

/** Chart/data updates coming back from the chat (daily_log, tablets_update, ...). */
export const chartBus = channel<ChartUpdateEvent>();
