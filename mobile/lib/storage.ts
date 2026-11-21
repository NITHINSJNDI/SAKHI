import AsyncStorage from "@react-native-async-storage/async-storage";

/** Small JSON helpers over AsyncStorage (the mobile stand-in for the web's localStorage). */
export async function getJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function setJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable: the app still works from memory
  }
}

export async function getString(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setString(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

/** Remove every key Sakhi stored on this phone (sign-out / reset). */
export async function clearSakhiStorage(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith("sakhi_") || k.startsWith("her_") || k.startsWith("preg_")));
  } catch {
    // ignore
  }
}
