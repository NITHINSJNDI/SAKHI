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
import { queryKeys } from "@/lib/queryKeys";
import { palette, radii, spacing, useAppTheme } from "@/theme";
import type { ConsentResponse } from "@/types/api";

export default function ConsentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
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
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <CaretLeft size={24} color={theme.text} />
        </Pressable>

        <View style={styles.headerCenter}>
          <AppText variant="title">Privacy & Consent</AppText>
          <AppText variant="caption" tone="soft">
            Your Data, Your Control
          </AppText>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <LoadingState message="Loading privacy settings..." style={{ flex: 1 }} />
      ) : isError ? (
        <ErrorState
          title="Could not load settings"
          message="Please check your connection and try again."
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
                Privacy preferences saved successfully!
              </AppText>
            </View>
          ) : null}

          {/* Core Principles Card */}
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.iconTitleRow}>
              <ShieldCheck size={26} color={theme.primary} weight="duotone" />
              <AppText variant="section">Data Protection Promise</AppText>
            </View>
            <AppText variant="body" tone="soft" style={styles.principleText}>
              Sakhi is designed with privacy-by-design under India&apos;s Digital Personal Data Protection (DPDP) Act and international privacy frameworks.
            </AppText>
            <View style={styles.bullets}>
              <AppText variant="caption" tone="soft">• Your reproductive and health logs belong solely to you.</AppText>
              <AppText variant="caption" tone="soft">• We never sell, rent, or share personal health records with third-party advertisers or insurance companies.</AppText>
              <AppText variant="caption" tone="soft">• You can export or permanently delete your entire record at any time.</AppText>
            </View>
          </View>

          {/* AI Processing Toggle */}
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <View style={styles.iconTitleRow}>
                  <Sparkle size={20} color={theme.accent} weight="fill" />
                  <AppText variant="bodyStrong">AI Health Insights</AppText>
                </View>
                <AppText variant="caption" tone="soft" style={{ marginTop: 2 }}>
                  Uses Google Gemini to analyze lab photos, explain test results, and answer health questions in Ask Sakhi.
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
                  <AppText variant="bodyStrong">Private Mode (Offline AI)</AppText>
                </View>
                <AppText variant="caption" tone="soft" style={{ marginTop: 2 }}>
                  When enabled, your chat messages and logs are never sent to external AI services. Sakhi operates in local simple mode.
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
              {data?.consent?.accepted
                ? `Consent accepted on ${data.consent.at ? new Date(data.consent.at).toLocaleDateString() : "file"}. You can update your choices whenever you wish.`
                : "Please confirm your consent choices to enable personalized AI companion features."}
            </AppText>
          </View>

          <PrimaryButton
            label="Save Privacy Choices"
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
