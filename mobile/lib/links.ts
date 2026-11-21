import { Alert, Linking } from "react-native";

/** Google Maps search near her. Maps uses the phone's own location; Sakhi never sees it. */
export const mapsSearch = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

export async function openUrl(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert("Couldn't open", url);
  }
}

export const call = (n: string) => openUrl(`tel:${n}`);
export const whatsapp = (n: string, text?: string) => openUrl(`https://wa.me/${n.replace(/\D/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`);
export const sms = (n: string, text?: string) => openUrl(`sms:${n}${text ? `?body=${encodeURIComponent(text)}` : ""}`);
