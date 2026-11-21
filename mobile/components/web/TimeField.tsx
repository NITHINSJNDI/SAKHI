import DateTimePicker from "@react-native-community/datetimepicker";
import { Clock } from "phosphor-react-native";
import { useState } from "react";
import { Platform, Pressable, View } from "react-native";

import { AppText } from "@/components/AppText";
import { fmtHm } from "@/lib/shared/tablets";
import { palette } from "@/theme";

const toDate = (hm: string) => {
  const [h, m] = hm.split(":").map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
};
const toHm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/** "HH:MM" time picker behind a compact field button. */
export function TimeField({ label, value, onChange, compact }: { label?: string; value: string; onChange: (hm: string) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 4 }}>
      {label ? <AppText style={{ fontSize: 12, fontWeight: "500", color: "rgba(42,21,47,0.7)" }}>{label}</AppText> : null}
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}, ${fmtHm(value)}` : fmtHm(value)}
        style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 12, borderWidth: 1, borderColor: "rgba(42,21,47,0.10)", backgroundColor: "#fff", paddingHorizontal: compact ? 8 : 12, minHeight: 44 }}
      >
        <Clock size={16} color="rgba(42,21,47,0.55)" />
        <AppText style={{ fontSize: 14, color: palette.plum900 }}>{fmtHm(value)}</AppText>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={toDate(value)}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(e, d) => {
            if (Platform.OS === "android") setOpen(false);
            if (e.type === "set" && d) {
              onChange(toHm(d));
              if (Platform.OS !== "android") setOpen(false);
            } else if (e.type === "dismissed") setOpen(false);
          }}
        />
      ) : null}
    </View>
  );
}
