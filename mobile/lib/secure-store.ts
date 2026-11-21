import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ACCESS_TOKEN_KEY = "sakhi_access_token";

// SecureStore (Keychain / Keystore) only exists on iOS and Android. The web
// build (used for previews) falls back to localStorage.
const isWeb = Platform.OS === "web";

export async function getAccessToken(): Promise<string | null> {
  try {
    if (isWeb) return globalThis.localStorage?.getItem(ACCESS_TOKEN_KEY) ?? null;
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setAccessToken(token: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.setItem(ACCESS_TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function clearAccessToken(): Promise<void> {
  try {
    if (isWeb) globalThis.localStorage?.removeItem(ACCESS_TOKEN_KEY);
    else await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    // Clearing a missing token must never block sign-out.
  }
}
