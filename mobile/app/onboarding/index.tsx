import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Baby, Calendar, CaretLeft, CaretRight, Check, CheckCircle, FlowerLotus, Sparkle } from "phosphor-react-native";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AlertMessage } from "@/components/AlertMessage";
import { AppText } from "@/components/AppText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TextField } from "@/components/TextField";
import { apiFetch } from "@/lib/api";
import { localIso } from "@/lib/date";
import { useAuth } from "@/lib/auth";
import { useMode } from "@/lib/mode";
import { queryKeys } from "@/lib/queryKeys";
import { palette, radii, spacing, useAppTheme } from "@/theme";
import type { OnboardingHerPayload, UpdateProfileRequest } from "@/types/api";

const HER_CONDITIONS = ["None", "PCOS", "PCOD", "Endometriosis", "Thyroid"];
const HER_GOALS = [
  "Track Period & PMS",
  "Conceive / Fertility",
  "Manage PCOS / Hormones",
  "General Wellness",
];

const MOM_CONDITIONS = [
  "None",
  "Gestational Diabetes (GDM)",
  "High Blood Pressure / Preeclampsia",
  "Thyroid",
];
const MOM_GOALS = [
  "Tracking Baby Growth & Fetal Movement",
  "Nutrition & Weight Monitoring",
  "Labour & Delivery Preparation",
  "General Wellness",
];

const DAY = 86_400_000;
const TODAY_MS = Date.now();
const isoOffset = (daysAgo: number) =>
  localIso(new Date(TODAY_MS - daysAgo * DAY));
const getEstimatedDueDate = (weeks: number) =>
  localIso(new Date(TODAY_MS + Math.max(0, (40 - weeks) * 7) * DAY));

export default function OnboardingScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, refreshSession } = useAuth();

  const [step, setStep] = useState<number>(1);
  const params = useLocalSearchParams<{ mode?: string }>();
  const { setMode: setAppMode } = useMode();
  const [mode, setMode] = useState<"her" | "mom">(params.mode === "pregnancy" || params.mode === "mom" ? "mom" : "her");

  // Step 1: Name
  const [preferredName, setPreferredName] = useState(user?.name || "");

  // Her Mode fields
  const [lastPeriodStart, setLastPeriodStart] = useState<string>(isoOffset(14));
  const [cycleLength, setCycleLength] = useState<number>(28);
  const [periodDuration, setPeriodDuration] = useState<number>(5);
  const [cycleRegularity, setCycleRegularity] = useState<string>("Regular");
  const [diagnosedConditions, setDiagnosedConditions] = useState<string[]>(["None"]);
  const [primaryGoal, setPrimaryGoal] = useState<string>("Track Period & PMS");

  // Mom Mode fields
  const [weeksPregnant, setWeeksPregnant] = useState<number>(12);
  const [pregnancyExperience, setPregnancyExperience] = useState<string>("First-time Mother");
  const [maternalConditions, setMaternalConditions] = useState<string[]>(["None"]);
  const [maternalGoal, setMaternalGoal] = useState<string>(
    "Tracking Baby Growth & Fetal Movement",
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const estimatedDueDate = getEstimatedDueDate(weeksPregnant);

  const toggleCondition = (
    item: string,
    current: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    if (item === "None") {
      setter(["None"]);
      return;
    }
    const withoutNone = current.filter((c) => c !== "None");
    if (withoutNone.includes(item)) {
      const next = withoutNone.filter((c) => c !== item);
      setter(next.length === 0 ? ["None"] : next);
    } else {
      setter([...withoutNone, item]);
    }
  };

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (!preferredName.trim()) {
        setError("Please enter what you would like Sakhi to call you.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      void handleSubmit();
    }
  };

  const handleBack = () => {
    setError(null);
    if (step > 1) setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const finalName = preferredName.trim() || user?.name || "Friend";

    try {
      if (mode === "her") {
        // Save via /api/onboarding as required
        const onboardingPayload: OnboardingHerPayload = {
          preferredName: finalName,
          lastPeriodStart,
          lastPeriodEnd: isoOffset(14 - periodDuration),
          periodDuration,
          cycleLengthAvg: cycleLength,
          cycleRegularity,
          diagnosedConditions: diagnosedConditions.includes("None") ? [] : diagnosedConditions,
        };
        await apiFetch("/api/onboarding", {
          method: "POST",
          body: JSON.stringify(onboardingPayload),
        });

        // Also update unified profile to ensure resetData initializes logs and cycle_history
        const profilePayload: UpdateProfileRequest = {
          mode: "her",
          resetData: true,
          profile: {
            preferred_name: finalName,
            last_period_start: lastPeriodStart,
            cycle_length: cycleLength,
            period_duration: periodDuration,
            cycle_regularity: cycleRegularity,
            diagnosed_conditions: diagnosedConditions.includes("None") ? [] : diagnosedConditions,
            primary_goal: primaryGoal,
            is_pregnancy_mode: false,
          },
        };
        await apiFetch("/api/update-profile", {
          method: "POST",
          body: JSON.stringify(profilePayload),
        });
      } else {
        // Mom Mode setup
        // Call /api/onboarding first with preferred name
        await apiFetch("/api/onboarding", {
          method: "POST",
          body: JSON.stringify({ preferredName: finalName }),
        }).catch(() => null);

        const profilePayload: UpdateProfileRequest = {
          mode: "pregnancy",
          resetData: true,
          profile: {
            preferred_name: finalName,
            weeks_pregnant: weeksPregnant,
            due_date: estimatedDueDate,
            expected_due_date: estimatedDueDate,
            pregnancy_experience: pregnancyExperience,
            maternal_conditions: maternalConditions.includes("None") ? [] : maternalConditions,
            primary_goal: maternalGoal,
            is_pregnancy_mode: true,
          },
        };
        await apiFetch("/api/update-profile", {
          method: "POST",
          body: JSON.stringify(profilePayload),
        });
      }

      await refreshSession();
      await queryClient.invalidateQueries({ queryKey: queryKeys.me });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      await queryClient.invalidateQueries({ queryKey: queryKeys.pregnancyData });

      await setAppMode(mode === "her" ? "her" : "pregnancy");
      router.replace(mode === "her" ? "/her/today" : "/mom/today");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save profile. Please try again.";
      setError(msg);
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.topBar}>
            {step > 1 ? (
              <Pressable
                onPress={handleBack}
                hitSlop={12}
                style={[styles.backButton, { borderColor: theme.border }]}
              >
                <CaretLeft size={20} color={theme.text} />
              </Pressable>
            ) : (
              <View style={styles.backPlaceholder} />
            )}
            <View style={styles.progressPills}>
              {[1, 2, 3].map((s) => (
                <View
                  key={s}
                  style={[
                    styles.pill,
                    {
                      backgroundColor:
                        s === step
                          ? theme.primary
                          : s < step
                            ? theme.accent
                            : theme.surfaceMuted,
                      width: s === step ? 28 : 12,
                    },
                  ]}
                />
              ))}
            </View>
            <View style={styles.backPlaceholder} />
          </View>

          {/* Screen Title */}
          <View style={styles.headerArea}>
            <View style={[styles.iconWrap, { backgroundColor: theme.surfaceRaised }]}>
              <Sparkle size={26} color={theme.accent} weight="fill" />
            </View>
            <AppText variant="title" style={styles.title}>
              Welcome to <AppText variant="serif" tone="accent">Sakhi</AppText>
            </AppText>
            <AppText variant="body" tone="soft" style={styles.subtitle}>
              {step === 1 && "Let's personalize your companion."}
              {step === 2 && "Choose your health journey."}
              {step === 3 &&
                (mode === "her"
                  ? "Tell us about your menstrual cycle."
                  : "Tell us about your pregnancy.")}
            </AppText>
          </View>

          {error ? (
            <View style={styles.alert}>
              <AlertMessage kind="error" message={error} />
            </View>
          ) : null}

          {/* STEP 1: Name */}
          {step === 1 && (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TextField
                label="What should Sakhi call you?"
                placeholder="Enter your name or nickname"
                value={preferredName}
                onChangeText={setPreferredName}
                autoFocus
              />
              <AppText variant="caption" tone="faint">
                This is how Sakhi will address you in daily tips and wellness check-ins.
              </AppText>
            </View>
          )}

          {/* STEP 2: Mode Choice */}
          {step === 2 && (
            <View style={styles.modeCards}>
              <Pressable
                onPress={() => setMode("her")}
                style={[
                  styles.modeCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: mode === "her" ? theme.accent : theme.border,
                    borderWidth: mode === "her" ? 2 : 1,
                  },
                ]}
              >
                <View style={[styles.modeIconCircle, { backgroundColor: palette.blush100 }]}>
                  <FlowerLotus size={28} color={palette.blush500} weight="duotone" />
                </View>
                <View style={styles.modeContent}>
                  <View style={styles.modeTitleRow}>
                    <AppText variant="section">Her Mode</AppText>
                    {mode === "her" && (
                      <View style={[styles.checkCircle, { backgroundColor: theme.primary }]}>
                        <Check size={14} color={theme.primaryContrast} weight="bold" />
                      </View>
                    )}
                  </View>
                  <AppText variant="caption" tone="soft">
                    Menstrual cycle tracking, PMS insights, PCOS & hormonal health monitoring.
                  </AppText>
                </View>
              </Pressable>

              <Pressable
                onPress={() => setMode("mom")}
                style={[
                  styles.modeCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: mode === "mom" ? theme.accent : theme.border,
                    borderWidth: mode === "mom" ? 2 : 1,
                  },
                ]}
              >
                <View style={[styles.modeIconCircle, { backgroundColor: palette.lavender100 }]}>
                  <Baby size={28} color={palette.lavender500} weight="duotone" />
                </View>
                <View style={styles.modeContent}>
                  <View style={styles.modeTitleRow}>
                    <AppText variant="section">Mom Mode</AppText>
                    {mode === "mom" && (
                      <View style={[styles.checkCircle, { backgroundColor: theme.primary }]}>
                        <Check size={14} color={theme.primaryContrast} weight="bold" />
                      </View>
                    )}
                  </View>
                  <AppText variant="caption" tone="soft">
                    Pregnancy journey, week-by-week baby development, trimester vitals & ANC visits.
                  </AppText>
                </View>
              </Pressable>
            </View>
          )}

          {/* STEP 3: Mode-Specific Details */}
          {step === 3 && mode === "her" && (
            <View style={styles.formSection}>
              {/* Last Period Start */}
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <AppText variant="label">When did your last period start?</AppText>
                <View style={styles.quickDates}>
                  {[
                    { label: "Today", value: isoOffset(0) },
                    { label: "1 wk ago", value: isoOffset(7) },
                    { label: "2 wks ago", value: isoOffset(14) },
                    { label: "3 wks ago", value: isoOffset(21) },
                  ].map((d) => (
                    <Pressable
                      key={d.label}
                      onPress={() => setLastPeriodStart(d.value)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor:
                            lastPeriodStart === d.value ? theme.primary : theme.surfaceMuted,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <AppText
                        variant="caption"
                        style={{
                          color:
                            lastPeriodStart === d.value
                              ? theme.primaryContrast
                              : theme.text,
                          fontWeight: lastPeriodStart === d.value ? "600" : "400",
                        }}
                      >
                        {d.label}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
                <TextField
                  label="Or enter exact date (YYYY-MM-DD)"
                  value={lastPeriodStart}
                  onChangeText={setLastPeriodStart}
                  placeholder="YYYY-MM-DD"
                />
              </View>

              {/* Cycle Length & Period Duration */}
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <AppText variant="label">Average Cycle Length (Days)</AppText>
                <View style={styles.stepperRow}>
                  <Pressable
                    onPress={() => setCycleLength((c) => Math.max(18, c - 1))}
                    style={[styles.stepperBtn, { borderColor: theme.border }]}
                  >
                    <AppText variant="title">-</AppText>
                  </Pressable>
                  <View style={styles.stepperValue}>
                    <AppText variant="title">{cycleLength}</AppText>
                    <AppText variant="caption" tone="soft">
                      days
                    </AppText>
                  </View>
                  <Pressable
                    onPress={() => setCycleLength((c) => Math.min(60, c + 1))}
                    style={[styles.stepperBtn, { borderColor: theme.border }]}
                  >
                    <AppText variant="title">+</AppText>
                  </Pressable>
                </View>

                <View style={styles.divider} />

                <AppText variant="label">Period Duration (Bleeding Days)</AppText>
                <View style={styles.stepperRow}>
                  <Pressable
                    onPress={() => setPeriodDuration((p) => Math.max(2, p - 1))}
                    style={[styles.stepperBtn, { borderColor: theme.border }]}
                  >
                    <AppText variant="title">-</AppText>
                  </Pressable>
                  <View style={styles.stepperValue}>
                    <AppText variant="title">{periodDuration}</AppText>
                    <AppText variant="caption" tone="soft">
                      days
                    </AppText>
                  </View>
                  <Pressable
                    onPress={() => setPeriodDuration((p) => Math.min(12, p + 1))}
                    style={[styles.stepperBtn, { borderColor: theme.border }]}
                  >
                    <AppText variant="title">+</AppText>
                  </Pressable>
                </View>
              </View>

              {/* Regularity */}
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <AppText variant="label">How regular are your cycles?</AppText>
                <View style={styles.chipsWrap}>
                  {["Regular", "Irregular", "Not Sure"].map((reg) => (
                    <Pressable
                      key={reg}
                      onPress={() => setCycleRegularity(reg)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor:
                            cycleRegularity === reg ? theme.primary : theme.surfaceMuted,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <AppText
                        variant="caption"
                        style={{
                          color: cycleRegularity === reg ? theme.primaryContrast : theme.text,
                          fontWeight: cycleRegularity === reg ? "600" : "400",
                        }}
                      >
                        {reg}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Diagnosed Conditions */}
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <AppText variant="label">Any diagnosed conditions? (Select all that apply)</AppText>
                <View style={styles.chipsWrap}>
                  {HER_CONDITIONS.map((cond) => {
                    const selected = diagnosedConditions.includes(cond);
                    return (
                      <Pressable
                        key={cond}
                        onPress={() =>
                          toggleCondition(cond, diagnosedConditions, setDiagnosedConditions)
                        }
                        style={[
                          styles.chip,
                          {
                            backgroundColor: selected ? theme.accent : theme.surfaceMuted,
                            borderColor: theme.border,
                          },
                        ]}
                      >
                        <AppText
                          variant="caption"
                          style={{
                            color: selected ? "#FFFFFF" : theme.text,
                            fontWeight: selected ? "600" : "400",
                          }}
                        >
                          {cond}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Primary Goal */}
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <AppText variant="label">What is your primary goal?</AppText>
                <View style={styles.chipsWrap}>
                  {HER_GOALS.map((g) => (
                    <Pressable
                      key={g}
                      onPress={() => setPrimaryGoal(g)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor:
                            primaryGoal === g ? theme.primary : theme.surfaceMuted,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <AppText
                        variant="caption"
                        style={{
                          color: primaryGoal === g ? theme.primaryContrast : theme.text,
                          fontWeight: primaryGoal === g ? "600" : "400",
                        }}
                      >
                        {g}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* STEP 3: Mom Mode Details */}
          {step === 3 && mode === "mom" && (
            <View style={styles.formSection}>
              {/* Weeks Pregnant */}
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <AppText variant="label">How many weeks pregnant are you?</AppText>
                <View style={styles.stepperRow}>
                  <Pressable
                    onPress={() => setWeeksPregnant((w) => Math.max(1, w - 1))}
                    style={[styles.stepperBtn, { borderColor: theme.border }]}
                  >
                    <AppText variant="title">-</AppText>
                  </Pressable>
                  <View style={styles.stepperValue}>
                    <AppText variant="title">Week {weeksPregnant}</AppText>
                    <AppText variant="caption" tone="soft">
                      Trimester {weeksPregnant <= 13 ? 1 : weeksPregnant <= 27 ? 2 : 3}
                    </AppText>
                  </View>
                  <Pressable
                    onPress={() => setWeeksPregnant((w) => Math.min(42, w + 1))}
                    style={[styles.stepperBtn, { borderColor: theme.border }]}
                  >
                    <AppText variant="title">+</AppText>
                  </Pressable>
                </View>
                <View style={[styles.dueInfoBox, { backgroundColor: theme.surfaceMuted }]}>
                  <Calendar size={18} color={theme.accent} weight="duotone" />
                  <AppText variant="caption" tone="soft">
                    Estimated Due Date: <AppText variant="caption" style={{ fontWeight: "700" }}>{estimatedDueDate}</AppText>
                  </AppText>
                </View>
              </View>

              {/* Experience */}
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <AppText variant="label">Pregnancy experience</AppText>
                <View style={styles.chipsWrap}>
                  {["First-time Mother", "Experienced Mother"].map((exp) => (
                    <Pressable
                      key={exp}
                      onPress={() => setPregnancyExperience(exp)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor:
                            pregnancyExperience === exp ? theme.primary : theme.surfaceMuted,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <AppText
                        variant="caption"
                        style={{
                          color:
                            pregnancyExperience === exp ? theme.primaryContrast : theme.text,
                          fontWeight: pregnancyExperience === exp ? "600" : "400",
                        }}
                      >
                        {exp}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Maternal Conditions */}
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <AppText variant="label">Any maternal conditions? (Select all that apply)</AppText>
                <View style={styles.chipsWrap}>
                  {MOM_CONDITIONS.map((cond) => {
                    const selected = maternalConditions.includes(cond);
                    return (
                      <Pressable
                        key={cond}
                        onPress={() =>
                          toggleCondition(cond, maternalConditions, setMaternalConditions)
                        }
                        style={[
                          styles.chip,
                          {
                            backgroundColor: selected ? theme.accent : theme.surfaceMuted,
                            borderColor: theme.border,
                          },
                        ]}
                      >
                        <AppText
                          variant="caption"
                          style={{
                            color: selected ? "#FFFFFF" : theme.text,
                            fontWeight: selected ? "600" : "400",
                          }}
                        >
                          {cond}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Maternal Goal */}
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <AppText variant="label">What is your primary focus right now?</AppText>
                <View style={styles.chipsWrap}>
                  {MOM_GOALS.map((g) => (
                    <Pressable
                      key={g}
                      onPress={() => setMaternalGoal(g)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor:
                            maternalGoal === g ? theme.primary : theme.surfaceMuted,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <AppText
                        variant="caption"
                        style={{
                          color: maternalGoal === g ? theme.primaryContrast : theme.text,
                          fontWeight: maternalGoal === g ? "600" : "400",
                        }}
                      >
                        {g}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Action Button */}
          <View style={styles.bottomAction}>
            <PrimaryButton
              label={
                submitting
                  ? "Setting up your space..."
                  : step === 3
                    ? "Complete setup"
                    : "Next step"
              }
              loading={submitting}
              onPress={handleNext}
              icon={
                step === 3 ? (
                  <CheckCircle size={20} color={theme.primaryContrast} weight="fill" />
                ) : (
                  <CaretRight size={20} color={theme.primaryContrast} />
                )
              }
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  backPlaceholder: {
    width: 38,
  },
  progressPills: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  pill: {
    height: 6,
    borderRadius: 3,
  },
  headerArea: {
    alignItems: "center",
    marginVertical: spacing.lg,
    gap: spacing.xs,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    maxWidth: 300,
  },
  alert: {
    marginBottom: spacing.md,
  },
  card: {
    borderWidth: 1,
    borderRadius: radii.card,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  modeCards: {
    gap: spacing.md,
  },
  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    borderRadius: radii.card,
    gap: spacing.md,
  },
  modeIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  modeContent: {
    flex: 1,
    gap: spacing.xxs,
  },
  modeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  formSection: {
    gap: spacing.sm,
  },
  quickDates: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    alignItems: "center",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginVertical: spacing.xs,
  },
  dueInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.soft,
    marginTop: spacing.xs,
  },
  bottomAction: {
    marginTop: spacing.lg,
  },
});
