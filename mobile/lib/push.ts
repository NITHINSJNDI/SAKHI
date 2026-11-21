import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { apiFetch } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let registeredToken: string | null = null;

/**
 * Ask for notification permission and register this phone's Expo push token
 * with the backend (POST /api/push-token). Safe to call on every sign-in; it
 * quietly does nothing on simulators, Expo Go without a project id, or when the
 * user says no.
 */
export async function registerForPush(): Promise<void> {
  try {
    if (!Device.isDevice) return;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Reminders",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const current = await Notifications.getPermissionsAsync();
    let granted = current.granted;
    if (!granted && current.canAskAgain) {
      granted = (await Notifications.requestPermissionsAsync()).granted;
    }
    if (!granted) return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return; // set by `eas init`; needed for Expo push tokens

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await apiFetch("/api/push-token", {
      method: "POST",
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
    registeredToken = token;
  } catch {
    // Push is optional; never block sign-in on it.
  }
}

/** Call before clearing the session so this phone stops getting the user's notifications. */
export async function unregisterPush(): Promise<void> {
  if (!registeredToken) return;
  try {
    await apiFetch("/api/push-token", {
      method: "DELETE",
      body: JSON.stringify({ token: registeredToken }),
    });
  } catch {
    // ignore
  }
  registeredToken = null;
}
