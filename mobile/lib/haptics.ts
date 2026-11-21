import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const enabled = Platform.OS === "ios" || Platform.OS === "android";

/** Light tick for taps on buttons, rows and chips. */
export function tapHaptic() {
  if (enabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Selection change: segmented controls, pickers, toggles. */
export function selectHaptic() {
  if (enabled) void Haptics.selectionAsync().catch(() => {});
}

/** Something was saved. */
export function successHaptic() {
  if (enabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function errorHaptic() {
  if (enabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}
