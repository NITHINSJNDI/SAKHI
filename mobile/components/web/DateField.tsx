import DateTimePicker from "@react-native-community/datetimepicker";
import { CalendarBlank } from "phosphor-react-native";
import { useState } from "react";
import { Platform, Pressable, View } from "react-native";

import { AppText } from "@/components/AppText";
import { localIso } from "@/lib/date";
import { useT } from "@/lib/i18n";
import { palette } from "@/theme";

/** Native date picker behind a field-looking button. Value is a local YYYY-MM-DD. */
export function DateField({
  label,
  value,
  onChange,
  max,
  min,
  placeholder = "Choose date",
}: {
  label?: string;
  value: string | null;
  onChange: (iso: string) => void;
  max?: string;
  min?: string;
  placeholder?: string;
}) {
  const { fmtDate } = useT();
  const [open, setOpen] = useState(false);
  const toDate = (iso?: string) => (iso ? new Date(`${iso}T12:00:00`) : undefined);

  return (
    <View style={{ gap: 4 }}>
      {label ? <AppText style={{ fontSize: 14, fontWeight: "500", color: palette.plum900 }}>{label}</AppText> : null}
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "rgba(42,21,47,0.12)",
          backgroundColor: "#FFFFFF",
          paddingHorizontal: 12,
          minHeight: 44,
        }}
      >
        <CalendarBlank size={18} color="rgba(42,21,47,0.55)" />
        <AppText style={{ fontSize: 16, color: value ? palette.plum900 : "rgba(42,21,47,0.4)" }}>
          {value ? fmtDate(value, { day: "numeric", month: "long", year: "numeric" }) : placeholder}
        </AppText>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={toDate(value ?? undefined) ?? new Date()}
          mode="date"
          maximumDate={toDate(max)}
          minimumDate={toDate(min)}
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={(e, d) => {
            if (Platform.OS === "android") setOpen(false);
            if (e.type === "set" && d) {
              onChange(localIso(d));
              if (Platform.OS !== "android") setOpen(false);
            } else if (e.type === "dismissed") setOpen(false);
          }}
        />
      ) : null}
    </View>
  );
}
