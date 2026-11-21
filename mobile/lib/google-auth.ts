/**
 * Native Google Sign-In (@react-native-google-signin/google-signin).
 *
 * Needs a development or store build: Expo Go doesn't include this native
 * module, so there the button shows a friendly message instead of crashing.
 *
 * Client IDs come from Google Cloud Console -> APIs & Services -> Credentials:
 * - EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: the web client the website already uses
 *   (GOOGLE_CLIENT_ID on Vercel). The ID token is issued for this audience.
 * - EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: an iOS OAuth client for this bundle id.
 * - Android needs an Android OAuth client (package + SHA-1) to exist in the same
 *   project, but its ID isn't passed in code.
 */
type GoogleModule = typeof import("@react-native-google-signin/google-signin");

let cached: GoogleModule | null | undefined;
function loadModule(): GoogleModule | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require("@react-native-google-signin/google-signin") as GoogleModule;
    cached.GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    });
  } catch {
    cached = null; // Expo Go / web: native module not present
  }
  return cached;
}

export const googleConfigured = Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);

export type GoogleResult =
  | { type: "success"; idToken: string }
  | { type: "cancelled" }
  | { type: "unavailable"; message: string };

/** Opens the Google account picker and returns its ID token for /api/auth/native/google. */
export async function signInWithGoogle(): Promise<GoogleResult> {
  if (!googleConfigured) {
    return { type: "unavailable", message: "Google sign-in isn't set up in this build yet. Please use email for now." };
  }
  const mod = loadModule();
  if (!mod) {
    return { type: "unavailable", message: "Google sign-in needs the installed app (it doesn't work in Expo Go). Please use email for now." };
  }
  const { GoogleSignin, isErrorWithCode, statusCodes } = mod;
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    if (res.type !== "success") return { type: "cancelled" };
    const idToken = res.data.idToken;
    if (!idToken) return { type: "unavailable", message: "Google didn't return a sign-in token. Please try again." };
    return { type: "success", idToken };
  } catch (e) {
    if (isErrorWithCode(e) && (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS)) {
      return { type: "cancelled" };
    }
    if (isErrorWithCode(e) && e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return { type: "unavailable", message: "Google Play services aren't available on this phone." };
    }
    return { type: "unavailable", message: "Google sign-in failed. Please try again." };
  }
}

/** Forget the Google account choice so the next sign-in shows the picker again. */
export async function signOutOfGoogle(): Promise<void> {
  try {
    await loadModule()?.GoogleSignin.signOut();
  } catch {
    // not signed in with Google, or module unavailable
  }
}
