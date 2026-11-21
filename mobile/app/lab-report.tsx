import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import {
  CaretLeft,
  Plus,
  Camera,
  Images,
  Trash,
  WarningCircle,
  Flask,
  Calendar,
  X,
  Info,
} from "phosphor-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateView";
import { apiFetch } from "@/lib/api";
import { MEASURED_BY, isMeasuredBy, type MeasuredBy } from "@/lib/shared/readings";
import { localIso } from "@/lib/date";
import {
  LAB_TESTS,
  checkLab,
  cleanValue,
  labTest,
  type LabKey,
  type LabStatus,
} from "@/lib/labs";
import { queryKeys } from "@/lib/queryKeys";
import { palette, radii, spacing, useAppTheme } from "@/theme";
import type {
  LabReadResponse,
  LabReportsResponse,
  LabResultRecord,
} from "@/types/api";

const STATUS_COLORS: Record<LabStatus, { bg: string; text: string; label: string }> = {
  ok: { bg: "#DCFCE7", text: "#166534", label: "Healthy" },
  mild: { bg: "#FEF3C7", text: "#92400E", label: "Keep an eye" },
  attention: { bg: "#FEE2E2", text: "#991B1B", label: "See doctor" },
  urgent: { bg: "#DC2626", text: "#FFFFFF", label: "Urgent" },
};

export default function LabReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ mode?: string; measuredBy?: string; add?: string }>();

  // Modal State (the risk card's "Add from MCP card / ASHA" opens it straight away)
  const [modalVisible, setModalVisible] = useState(params.add === "1");
  const [readingAi, setReadingAi] = useState(false);
  const [reportDate, setReportDate] = useState(localIso());
  const [measuredBy, setMeasuredBy] = useState<MeasuredBy>(isMeasuredBy(params.measuredBy) ? params.measuredBy : "lab");
  const [rows, setRows] = useState<{ key: LabKey; value: string }[]>([]);
  const [modalError, setModalError] = useState<string | null>(null);

  // Load saved lab reports
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.labReports,
    queryFn: () => apiFetch<LabReportsResponse>("/api/lab-report"),
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const values: Record<string, string> = {};
      for (const r of rows) {
        if (r.value.trim()) values[r.key] = r.value.trim();
      }
      return apiFetch("/api/lab-report", {
        method: "POST",
        body: JSON.stringify({
          date: reportDate,
          values,
          source: rows.length > 0 ? "manual" : "photo",
          measured_by: measuredBy,
        }),
      });
    },
    onSuccess: () => {
      setModalVisible(false);
      setRows([]);
      setModalError(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.labReports });
      void queryClient.invalidateQueries({ queryKey: ["doctor-summary"] });
    },
    onError: (err: any) => {
      setModalError(err?.message || "Could not save results. Please check entries.");
    },
  });

  // Delete single result
  const deleteMutation = useMutation({
    mutationFn: async ({ date, key }: { date: string; key: string }) => {
      return apiFetch("/api/lab-report", {
        method: "DELETE",
        body: JSON.stringify({ date, key }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.labReports });
      void queryClient.invalidateQueries({ queryKey: ["doctor-summary"] });
    },
  });

  const pickImage = async (useCamera = false) => {
    try {
      setModalError(null);
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Camera Permission", "Camera access is needed to capture lab reports.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          base64: true,
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Photos Permission", "Photo library access is needed to choose a report.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          base64: true,
          quality: 0.8,
        });
      }

      if (result.canceled || !result.assets[0]?.base64) return;

      const asset = result.assets[0];
      const mimeType = asset.mimeType || "image/jpeg";
      const dataUrl = `data:${mimeType};base64,${asset.base64}`;

      setReadingAi(true);
      setModalVisible(true);

      const aiRes = await apiFetch<LabReadResponse>("/api/lab-report/read", {
        method: "POST",
        body: JSON.stringify({ image: dataUrl }),
      }).catch(() => null);

      setReadingAi(false);

      if (aiRes?.values && aiRes.values.length > 0) {
        setRows(
          aiRes.values.map((v) => ({
            key: v.key as LabKey,
            value: String(v.value),
          }))
        );
        if (aiRes.reportDate) {
          setReportDate(aiRes.reportDate);
        }
      } else {
        setModalError(
          "Could not detect test values automatically. You can add or type them below."
        );
        if (rows.length === 0) {
          setRows([{ key: "hb", value: "" }]);
        }
      }
    } catch {
      setReadingAi(false);
      setModalError("Failed to process photo. You can type the values manually.");
    }
  };

  const addRow = (key: LabKey) => {
    if (!rows.some((r) => r.key === key)) {
      setRows((prev) => [...prev, { key, value: "" }]);
    }
  };

  const removeRow = (key: LabKey) => {
    setRows((prev) => prev.filter((r) => r.key !== key));
  };

  const updateRowValue = (key: LabKey, text: string) => {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, value: text } : r))
    );
  };

  const unusedTests = LAB_TESTS.filter((t) => !rows.some((r) => r.key === t.key));

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
          <AppText variant="title">Lab Reports</AppText>
          <AppText variant="caption" tone="soft">
            Biomarkers & Test Records
          </AppText>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add Report"
          onPress={() => {
            setModalError(null);
            setRows([{ key: "hb", value: "" }]);
            setReportDate(localIso());
            setModalVisible(true);
          }}
          style={styles.backButton}
        >
          <Plus size={22} color={theme.primary} />
        </Pressable>
      </View>

      {/* Main Body */}
      {isLoading ? (
        <LoadingState message="Loading your lab reports..." style={{ flex: 1 }} />
      ) : isError ? (
        <ErrorState
          title="Could not load reports"
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
          {/* Awareness Disclaimer */}
          <View
            style={[
              styles.disclaimerCard,
              { backgroundColor: palette.lavender50, borderColor: palette.lavender200 },
            ]}
          >
            <Info size={20} color={palette.plum900} weight="duotone" />
            <AppText variant="caption" style={styles.disclaimerText}>
              Sakhi explains lab reference ranges for awareness only. Always confirm clinical findings with your doctor.
            </AppText>
          </View>

          {/* Quick Action Buttons */}
          <View style={styles.actionGrid}>
            <Pressable
              onPress={() => void pickImage(true)}
              style={({ pressed }) => [
                styles.actionCard,
                { backgroundColor: theme.primary, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <Camera size={26} color={theme.primaryContrast} weight="duotone" />
              <AppText variant="label" style={{ color: theme.primaryContrast }}>
                Take Photo
              </AppText>
            </Pressable>

            <Pressable
              onPress={() => void pickImage(false)}
              style={({ pressed }) => [
                styles.actionCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  borderWidth: 1,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Images size={26} color={theme.primary} weight="duotone" />
              <AppText variant="label" style={{ color: theme.text }}>
                Choose Photo
              </AppText>
            </Pressable>
          </View>

          {/* Results List */}
          {data?.results && data.results.length > 0 ? (
            <View style={{ gap: spacing.md, marginTop: spacing.md }}>
              <AppText variant="section">Your Recorded Tests ({data.results.length})</AppText>
              {data.results.map((r: LabResultRecord, idx: number) => {
                const t = labTest(r.key);
                const check = checkLab(r.key as LabKey, r.value, false);
                const badge = STATUS_COLORS[check.status];

                return (
                  <View
                    key={`${r.date}-${r.key}-${idx}`}
                    style={[styles.resultCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  >
                    <View style={styles.resultHeader}>
                      <View style={{ flex: 1 }}>
                        <AppText variant="bodyStrong">{t?.label || r.key}</AppText>
                        <View style={styles.dateRow}>
                          <Calendar size={13} color={theme.textFaint} />
                          <AppText variant="caption" tone="faint">
                            {r.date}
                          </AppText>
                          {r.measured_by ? (
                            <AppText variant="caption" tone="faint">
                              · {r.measured_by}
                            </AppText>
                          ) : null}
                        </View>
                      </View>

                      <View style={styles.rightGroup}>
                        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                          <AppText variant="caption" style={{ color: badge.text, fontWeight: "700" }}>
                            {badge.label}
                          </AppText>
                        </View>
                        <Pressable
                          onPress={() =>
                            deleteMutation.mutate({ date: r.date, key: r.key })
                          }
                          style={styles.deleteBtn}
                        >
                          <Trash size={16} color={theme.textFaint} />
                        </Pressable>
                      </View>
                    </View>

                    <View style={styles.valRow}>
                      <AppText variant="display" tone="accent">
                        {r.value}
                      </AppText>
                      {t?.unit ? (
                        <AppText variant="caption" tone="soft" style={{ marginLeft: 4 }}>
                          {t.unit}
                        </AppText>
                      ) : null}
                    </View>

                    <AppText variant="caption" tone="soft" style={styles.noteText}>
                      {check.note}
                    </AppText>
                  </View>
                );
              })}
            </View>
          ) : (
            <EmptyState
              icon={<Flask size={36} color={theme.primary} weight="duotone" />}
              title="No lab reports yet"
              message="Snap a photo of your blood test or antenatal card to track hemoglobin, sugar, thyroid, and other vitals."
              actionLabel="Add First Test"
              onAction={() => {
                setRows([{ key: "hb", value: "" }]);
                setReportDate(localIso());
                setModalVisible(true);
              }}
              style={{ marginTop: spacing.md }}
            />
          )}
        </ScrollView>
      )}

      {/* Add / Review Report Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: theme.surface,
                paddingBottom: Math.max(insets.bottom, spacing.lg),
              },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <View>
                <AppText variant="title">Record Lab Values</AppText>
                <AppText variant="caption" tone="soft">
                  Verify extracted numbers before saving
                </AppText>
              </View>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {readingAi ? (
                <View style={styles.readingAiBox}>
                  <ActivityIndicator size="large" color={theme.accent} />
                  <AppText variant="body" style={{ marginTop: spacing.sm }}>
                    Reading photo with AI...
                  </AppText>
                </View>
              ) : null}

              {modalError ? (
                <View
                  style={[
                    styles.modalAlert,
                    { backgroundColor: theme.errorBg, borderColor: theme.errorBorder },
                  ]}
                >
                  <WarningCircle size={18} color={theme.errorText} />
                  <AppText variant="caption" style={{ color: theme.errorText, flex: 1 }}>
                    {modalError}
                  </AppText>
                </View>
              ) : null}

              {/* Date Input */}
              <View style={styles.formField}>
                <AppText variant="label">Report Date (YYYY-MM-DD)</AppText>
                <TextInput
                  value={reportDate}
                  onChangeText={setReportDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.textFaint}
                  style={[
                    styles.inputBox,
                    { backgroundColor: theme.background, borderColor: theme.border, color: theme.text },
                  ]}
                />
              </View>

              {/* Measured By */}
              <View style={styles.formField}>
                <AppText variant="label">Measured By</AppText>
                <View style={styles.chipRow}>
                  {MEASURED_BY.map(({ key: m, label }) => (
                    <Pressable
                      key={m}
                      onPress={() => setMeasuredBy(m)}
                      style={[
                        styles.chipBtn,
                        {
                          backgroundColor: measuredBy === m ? theme.primary : theme.background,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <AppText
                        variant="caption"
                        style={{
                          color: measuredBy === m ? theme.primaryContrast : theme.text,
                          fontWeight: measuredBy === m ? "700" : "400",
                        }}
                      >
                        {label}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Test Rows */}
              <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
                <AppText variant="label">Test Values to Save</AppText>
                {rows.map((row) => {
                  const t = labTest(row.key);
                  const valid = cleanValue(row.key, row.value) !== null;

                  return (
                    <View
                      key={row.key}
                      style={[
                        styles.rowCard,
                        { backgroundColor: theme.background, borderColor: theme.border },
                      ]}
                    >
                      <View style={styles.rowTop}>
                        <AppText variant="bodyStrong">{t?.label || row.key}</AppText>
                        <Pressable onPress={() => removeRow(row.key)} style={{ padding: 4 }}>
                          <Trash size={16} color="#B91C1C" />
                        </Pressable>
                      </View>

                      <View style={styles.rowBottom}>
                        <TextInput
                          value={row.value}
                          onChangeText={(v) => updateRowValue(row.key, v)}
                          placeholder={t?.text ? "e.g. 120/80 or nil" : "e.g. 12.5"}
                          placeholderTextColor={theme.textFaint}
                          style={[
                            styles.rowInput,
                            {
                              backgroundColor: theme.surface,
                              borderColor: row.value && !valid ? theme.errorBorder : theme.border,
                              color: theme.text,
                            },
                          ]}
                        />
                        {t?.unit ? (
                          <AppText variant="caption" tone="soft">
                            {t.unit}
                          </AppText>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Add more tests dropdown/chips */}
              {unusedTests.length > 0 ? (
                <View style={{ marginTop: spacing.md }}>
                  <AppText variant="caption" tone="soft" style={{ marginBottom: spacing.xs }}>
                    Add another test:
                  </AppText>
                  <View style={styles.chipRow}>
                    {unusedTests.slice(0, 6).map((t) => (
                      <Pressable
                        key={t.key}
                        onPress={() => addRow(t.key)}
                        style={[
                          styles.addTestChip,
                          { backgroundColor: theme.surface, borderColor: theme.border },
                        ]}
                      >
                        <Plus size={12} color={theme.accent} />
                        <AppText variant="caption">{t.label}</AppText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}

              <PrimaryButton
                label="Save to My Health Record"
                loading={saveMutation.isPending}
                disabled={rows.length === 0}
                onPress={() => saveMutation.mutate()}
                style={{ marginTop: spacing.xl }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  },
  disclaimerCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.soft,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  disclaimerText: {
    flex: 1,
    lineHeight: 18,
    color: palette.plum900,
  },
  actionGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  actionCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
    gap: spacing.xs,
    borderRadius: radii.card,
  },
  resultCard: {
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.xs,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  rightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  deleteBtn: {
    padding: 4,
  },
  valRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: spacing.xxs,
  },
  noteText: {
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "90%",
    borderTopLeftRadius: radii.panel,
    borderTopRightRadius: radii.panel,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  modalScroll: {
    padding: spacing.md,
  },
  readingAiBox: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  modalAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  formField: {
    marginBottom: spacing.md,
  },
  inputBox: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xxs,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  chipBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  rowCard: {
    padding: spacing.sm,
    borderRadius: radii.soft,
    borderWidth: 1,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  rowInput: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
  },
  addTestChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
});
