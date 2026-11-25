import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CaretLeft,
  ShieldCheck,
  LockSimple,
  Sparkle,
  CheckCircle,
  Info,
} from "phosphor-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ErrorState, LoadingState } from "@/components/StateView";
import { apiFetch } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { queryKeys } from "@/lib/queryKeys";
import { palette, radii, spacing, useAppTheme } from "@/theme";
import type { ConsentResponse } from "@/types/api";

export default function ConsentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { t } = useT();
  const queryClient = useQueryClient();

  const [aiProcessing, setAiProcessing] = useState(true);
  const [privateMode, setPrivateMode] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  // Load current consent settings
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.consent,
    queryFn: async () => {
      const res = await apiFetch<ConsentResponse>("/api/consent");
      if (res.consent) {
        setAiProcessing(res.consent.aiProcessing !== false);
        setPrivateMode(res.consent.privateMode === true);
      }
      return res;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiFetch("/api/consent", {
        method: "POST",
        body: JSON.stringify({
          accepted: true,
          aiProcessing,
          privateMode,
        }),
      });
    },
    onSuccess: () => {
      setSuccessNotice(true);
      void queryClient.invalidateQueries({ queryKey: queryKeys.consent });
      void queryClient.invalidateQueries({ queryKey: queryKeys.me });
      setTimeout(() => setSuccessNotice(false), 3000);
    },
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, spacing.md),
            backgroundColor: theme.surface,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <CaretLeft size={24} color={theme.text} />
        </Pressable>

        <View style={styles.headerCenter}>
          <AppText variant="title">{t("consent.title")}</AppText>
          <AppText variant="caption" tone="soft">
            {t("consent.subtitle")}
          </AppText>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <LoadingState message={t("common.loading")} style={{ flex: 1 }} />
      ) : isError ? (
        <ErrorState
          title={t("common.couldNotLoad")}
          message={t("common.somethingWrong")}
          onRetry={() => void refetch()}
          style={{ flex: 1, margin: spacing.md }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, spacing.xxl) + spacing.xl },
          ]}
        >
          {successNotice ? (
            <View style={[styles.successBanner, { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" }]}>
              <CheckCircle size={18} color="#14532D" weight="fill" />
              <AppText variant="caption" style={{ color: "#14532D", fontWeight: "600" }}>
                {t("settings.savedSuccess")}
              </AppText>
            </View>
          ) : null}

          {/* Core Principles Card */}
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.iconTitleRow}>
              <ShieldCheck size={26} color={theme.primary} weight="duotone" />
              <AppText variant="section">{t("consent.title")}</AppText>
            </View>
            <AppText variant="body" tone="soft" style={styles.principleText}>
              {t("consent.point3")}
            </AppText>
            <View style={styles.bullets}>
              <AppText variant="caption" tone="soft">• {t("consent.point1")}</AppText>
              <AppText variant="caption" tone="soft">• {t("consent.point4")}</AppText>
              <AppText variant="caption" tone="soft">• {t("consent.point5")}</AppText>
            </View>
          </View>

          {/* AI Processing Toggle */}
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <View style={styles.iconTitleRow}>
                  <Sparkle size={20} color={theme.accent} weight="fill" />
                  <AppText variant="bodyStrong">{t("consent.point2")}</AppText>
                </View>
                <AppText variant="caption" tone="soft" style={{ marginTop: 2 }}>
                  {t("consent.checkbox")}
                </AppText>
              </View>
              <Switch
                value={aiProcessing}
                onValueChange={(val) => {
                  setAiProcessing(val);
                  if (!val) setPrivateMode(true);
                }}
                trackColor={{ false: theme.border, true: theme.primary }}
              />
            </View>
          </View>

          {/* Private Mode Toggle */}
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <View style={styles.iconTitleRow}>
                  <LockSimple size={20} color={theme.primary} weight="fill" />
                  <AppText variant="bodyStrong">{t("settings.privateMode")}</AppText>
                </View>
                <AppText variant="caption" tone="soft" style={{ marginTop: 2 }}>
                  {t("settings.privateModeHint")}
                </AppText>
              </View>
              <Switch
                value={privateMode}
                onValueChange={(val) => {
                  setPrivateMode(val);
                  if (val) setAiProcessing(false);
                }}
                trackColor={{ false: theme.border, true: theme.primary }}
              />
            </View>
          </View>

          {/* Consent Status Card */}
          <View style={[styles.infoCard, { backgroundColor: palette.lavender50, borderColor: palette.lavender200 }]}>
            <Info size={18} color={palette.plum900} />
            <AppText variant="caption" style={{ color: palette.plum900, flex: 1, lineHeight: 18 }}>
              {t("consent.subtitle")}
            </AppText>
          </View>

          <PrimaryButton
            label={t("consent.agreeBtn")}
            loading={saveMutation.isPending}
            onPress={() => saveMutation.mutate()}
            style={{ marginTop: spacing.md }}
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerCenter: {
    alignItems: "center",
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.soft,
    borderWidth: 1,
  },
  card: {
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
  },
  iconTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  principleText: {
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  bullets: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  toggleLeft: {
    flex: 1,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.soft,
    borderWidth: 1,
  },
});
