import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CaretLeft,
  FirstAid,
  WarningCircle,
  ShieldCheck,
  CheckCircle,
  Timer,
  ThumbsUp,
  ThumbsDown,
  ArrowsClockwise,
  Play,
  Pause,
  Heart,
  Info,
} from "phosphor-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { apiFetch } from "@/lib/api";
import { useCountdown } from "@/lib/useCountdown";
import { queryKeys } from "@/lib/queryKeys";
import { palette, radii, spacing, useAppTheme } from "@/theme";
import type {
  ReliefResponse,
  ReliefTip,
  TriageResponse,
  TriageResult,
  TriageSymptomInput,
} from "@/types/api";

const FLOW_OPTIONS = [
  { key: "spotting", label: "Spotting" },
  { key: "light", label: "Light" },
  { key: "normal", label: "Normal" },
  { key: "heavy", label: "Heavy" },
  { key: "very_heavy", label: "Very heavy" },
];

function TipTimer({ seconds }: { seconds: number }) {
  const theme = useAppTheme();
  const { left, running, toggle } = useCountdown(seconds);

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <Pressable
      onPress={toggle}
      style={({ pressed }) => [
        styles.timerButton,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      {running ? (
        <Pause size={14} color={theme.accent} weight="fill" />
      ) : left === 0 ? (
        <ArrowsClockwise size={14} color={theme.accent} />
      ) : (
        <Play size={14} color={theme.accent} weight="fill" />
      )}
      <Timer size={14} color={theme.accent} />
      <AppText variant="caption" style={{ color: theme.accent, fontWeight: "600" }}>
        {left === 0 ? "Done! Again?" : fmt(left)}
      </AppText>
    </Pressable>
  );
}

export default function TriageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  // Mode: "symptom" or "relief"
  const [activeTab, setActiveTab] = useState<"triage" | "relief">("triage");

  // Form State
  const [crampSeverity, setCrampSeverity] = useState(5);
  const [flowIntensity, setFlowIntensity] = useState("normal");
  const [headacheSeverity, setHeadacheSeverity] = useState(0);
  const [bloatingSeverity, setBloatingSeverity] = useState(0);
  const [headacheWithVisionChanges, setHeadacheWithVisionChanges] = useState(false);
  const [soakingPadHourly, setSoakingPadHourly] = useState(false);
  const [faintingOrDizziness, setFaintingOrDizziness] = useState(false);
  const [severeAbdominalPain, setSevereAbdominalPain] = useState(false);
  const [feverHigh, setFeverHigh] = useState(false);
  const [tirednessSevere, setTirednessSevere] = useState(false);
  const [hairGrowthNew, setHairGrowthNew] = useState(false);
  const [skinDarkening, setSkinDarkening] = useState(false);
  const [weightGainRapid, setWeightGainRapid] = useState(false);

  // Results State
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [wellnessAdvice, setWellnessAdvice] = useState<any[]>([]);
  const [ratedTips, setRatedTips] = useState<Record<string, boolean>>({});

  // Query for relief tips
  const { data: reliefData, refetch: refetchRelief, isFetching: reliefLoading } = useQuery({
    queryKey: queryKeys.relief(crampSeverity),
    queryFn: () => apiFetch<ReliefResponse>(`/api/relief?severity=${crampSeverity}`),
    enabled: activeTab === "relief" || crampSeverity > 0,
  });

  // Triage mutation
  const triageMutation = useMutation({
    mutationFn: async () => {
      const payload: TriageSymptomInput = {
        crampSeverity,
        flowIntensity,
        headacheSeverity,
        bloatingSeverity,
        headacheWithVisionChanges,
        soakingPadHourly,
        faintingOrDizziness,
        severeAbdominalPain,
        feverC: feverHigh ? 39.5 : 37.0,
        tirednessSevere,
        hairGrowthNew,
        skinDarkening,
        weightGainRapid,
      };
      return apiFetch<TriageResponse>("/api/triage", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (res) => {
      if (res.triageResult) {
        setTriageResult(res.triageResult);
        setWellnessAdvice(res.wellnessAdvice || []);
      }
    },
  });

  const rateTip = async (tipId: string, helped: boolean) => {
    setRatedTips((prev) => ({ ...prev, [tipId]: helped }));
    try {
      await apiFetch("/api/relief", {
        method: "POST",
        body: JSON.stringify({ tipId, helped }),
      });
    } catch {
      // Best effort feedback
    }
  };

  const getUrgencyTone = (urgency: string) => {
    switch (urgency) {
      case "EMERGENCY":
        return {
          bg: "#FEE2E2",
          border: "#FCA5A5",
          text: "#991B1B",
          label: "Emergency Care Recommended",
        };
      case "SEE_DOCTOR":
        return {
          bg: "#FEF3C7",
          border: "#F59E0B",
          text: "#78350F",
          label: "Consult Doctor Soon",
        };
      case "MONITOR":
        return {
          bg: palette.lavender100,
          border: palette.lavender400,
          text: palette.plum900,
          label: "Monitor Over Next Cycles",
        };
      default:
        return {
          bg: "#DCFCE7",
          border: "#86EFAC",
          text: "#14532D",
          label: "Within Typical Range",
        };
    }
  };

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
          <AppText variant="title">Symptom Checker</AppText>
          <AppText variant="caption" tone="soft">
            Triage & Quick Relief Guidance
          </AppText>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Mode Tabs */}
      <View style={[styles.tabsRow, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable
          onPress={() => setActiveTab("triage")}
          style={[
            styles.tabItem,
            activeTab === "triage" && [styles.activeTabItem, { borderBottomColor: theme.primary }],
          ]}
        >
          <FirstAid
            size={18}
            color={activeTab === "triage" ? theme.primary : theme.textSoft}
            weight={activeTab === "triage" ? "fill" : "regular"}
          />
          <AppText
            variant="label"
            style={{
              color: activeTab === "triage" ? theme.primary : theme.textSoft,
              fontWeight: activeTab === "triage" ? "600" : "500",
            }}
          >
            Symptom Triage
          </AppText>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab("relief")}
          style={[
            styles.tabItem,
            activeTab === "relief" && [styles.activeTabItem, { borderBottomColor: theme.primary }],
          ]}
        >
          <Heart
            size={18}
            color={activeTab === "relief" ? theme.primary : theme.textSoft}
            weight={activeTab === "relief" ? "fill" : "regular"}
          />
          <AppText
            variant="label"
            style={{
              color: activeTab === "relief" ? theme.primary : theme.textSoft,
              fontWeight: activeTab === "relief" ? "600" : "500",
            }}
          >
            Pain Relief Toolkit
          </AppText>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, spacing.xxl) + spacing.xl },
        ]}
      >
        {/* Medical Disclaimer Banner */}
        <View
          style={[
            styles.disclaimerCard,
            { backgroundColor: palette.lavender50, borderColor: palette.lavender200 },
          ]}
        >
          <Info size={20} color={palette.plum900} weight="duotone" />
          <AppText variant="caption" style={styles.disclaimerText}>
            Sakhi gives general guidance, not medical advice. In an emergency, call 112. Feeling low? Tele-MANAS: 14416.
          </AppText>
        </View>

        {activeTab === "triage" ? (
          <>
            {/* Triage Results Display if available */}
            {triageResult ? (
              <View style={styles.resultContainer}>
                {(() => {
                  const tone = getUrgencyTone(triageResult.urgency);
                  return (
                    <View
                      style={[
                        styles.urgencyCard,
                        { backgroundColor: tone.bg, borderColor: tone.border },
                      ]}
                    >
                      <View style={styles.urgencyHeader}>
                        {triageResult.urgency === "EMERGENCY" ? (
                          <WarningCircle size={26} color={tone.text} weight="fill" />
                        ) : (
                          <ShieldCheck size={26} color={tone.text} weight="fill" />
                        )}
                        <View style={{ flex: 1 }}>
                          <AppText variant="section" style={{ color: tone.text, fontWeight: "700" }}>
                            {tone.label}
                          </AppText>
                          <AppText variant="caption" style={{ color: tone.text, opacity: 0.9 }}>
                            {triageResult.urgency === "NORMAL" ? "Low risk indicator" : "Clinical recommendation"}
                          </AppText>
                        </View>
                      </View>

                      <AppText variant="body" style={[styles.adviceText, { color: tone.text }]}>
                        {triageResult.advice}
                      </AppText>

                      {triageResult.reasons && triageResult.reasons.length > 0 ? (
                        <View style={styles.reasonsBox}>
                          <AppText variant="label" style={{ color: tone.text, marginBottom: spacing.xxs }}>
                            Key Observations:
                          </AppText>
                          {triageResult.reasons.map((r, i) => (
                            <View key={i} style={styles.bulletRow}>
                              <AppText variant="caption" style={{ color: tone.text }}>•</AppText>
                              <AppText variant="caption" style={{ color: tone.text, flex: 1 }}>
                                {r}
                              </AppText>
                            </View>
                          ))}
                        </View>
                      ) : null}

                      {triageResult.suspectedProfiles && triageResult.suspectedProfiles.length > 0 ? (
                        <View style={styles.profilesBox}>
                          <AppText variant="label" style={{ color: tone.text }}>
                            Patterns Identified:
                          </AppText>
                          <View style={styles.chipRow}>
                            {triageResult.suspectedProfiles.map((p) => (
                              <View key={p} style={[styles.profileBadge, { borderColor: tone.border }]}>
                                <AppText variant="caption" style={{ color: tone.text, fontWeight: "600" }}>
                                  {p.replace(/_/g, " ")}
                                </AppText>
                              </View>
                            ))}
                          </View>
                        </View>
                      ) : null}
                    </View>
                  );
                })()}

                {/* Wellness advice recommendations */}
                {wellnessAdvice.length > 0 ? (
                  <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <AppText variant="title" style={styles.cardTitle}>
                      Personalized Wellness Guidance
                    </AppText>
                    {wellnessAdvice.map((w, idx) => (
                      <View key={idx} style={styles.wellnessItem}>
                        <AppText variant="label" tone="accent">
                          {w.title || w.category}
                        </AppText>
                        <AppText variant="body" tone="soft" style={{ marginTop: 2 }}>
                          {w.advice}
                        </AppText>
                      </View>
                    ))}
                  </View>
                ) : null}

                <PrimaryButton
                  label="Check Again / Adjust Symptoms"
                  variant="secondary"
                  onPress={() => setTriageResult(null)}
                  style={{ marginTop: spacing.md }}
                />
              </View>
            ) : (
              /* Symptom Form */
              <View style={styles.formContainer}>
                {/* Cramps Severity */}
                <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.cardHeaderRow}>
                    <AppText variant="section">Cramps / Pelvic Pain</AppText>
                    <View style={[styles.scoreBadge, { backgroundColor: theme.primary }]}>
                      <AppText variant="label" style={{ color: theme.primaryContrast }}>
                        {crampSeverity} / 10
                      </AppText>
                    </View>
                  </View>
                  <AppText variant="caption" tone="soft" style={styles.cardSub}>
                    Rate the intensity of pain today (0 is none, 10 is unbearable).
                  </AppText>
                  <View style={styles.stepperRow}>
                    {[0, 2, 4, 6, 8, 10].map((val) => (
                      <Pressable
                        key={val}
                        onPress={() => setCrampSeverity(val)}
                        style={[
                          styles.stepperBtn,
                          {
                            backgroundColor: crampSeverity === val ? theme.primary : theme.background,
                            borderColor: theme.border,
                          },
                        ]}
                      >
                        <AppText
                          variant="caption"
                          style={{
                            color: crampSeverity === val ? theme.primaryContrast : theme.text,
                            fontWeight: "600",
                          }}
                        >
                          {val}
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Flow Intensity */}
                <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <AppText variant="section">Flow Intensity</AppText>
                  <AppText variant="caption" tone="soft" style={styles.cardSub}>
                    Bleeding volume experienced today.
                  </AppText>
                  <View style={styles.chipRow}>
                    {FLOW_OPTIONS.map((opt) => (
                      <Pressable
                        key={opt.key}
                        onPress={() => setFlowIntensity(opt.key)}
                        style={[
                          styles.optionChip,
                          {
                            backgroundColor: flowIntensity === opt.key ? theme.primary : theme.background,
                            borderColor: theme.border,
                          },
                        ]}
                      >
                        <AppText
                          variant="caption"
                          style={{
                            color: flowIntensity === opt.key ? theme.primaryContrast : theme.text,
                            fontWeight: flowIntensity === opt.key ? "600" : "400",
                          }}
                        >
                          {opt.label}
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Headache & Bloating */}
                <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <AppText variant="section">Headache & Bloating</AppText>
                  <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
                    <View style={styles.sliderRow}>
                      <AppText variant="body">Headache (0–10):</AppText>
                      <View style={styles.miniStepper}>
                        {[0, 3, 6, 9].map((val) => (
                          <Pressable
                            key={val}
                            onPress={() => setHeadacheSeverity(val)}
                            style={[
                              styles.miniBtn,
                              {
                                backgroundColor: headacheSeverity === val ? theme.primary : theme.background,
                                borderColor: theme.border,
                              },
                            ]}
                          >
                            <AppText
                              variant="caption"
                              style={{ color: headacheSeverity === val ? theme.primaryContrast : theme.text }}
                            >
                              {val}
                            </AppText>
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    <View style={styles.sliderRow}>
                      <AppText variant="body">Bloating (0–10):</AppText>
                      <View style={styles.miniStepper}>
                        {[0, 3, 6, 9].map((val) => (
                          <Pressable
                            key={val}
                            onPress={() => setBloatingSeverity(val)}
                            style={[
                              styles.miniBtn,
                              {
                                backgroundColor: bloatingSeverity === val ? theme.primary : theme.background,
                                borderColor: theme.border,
                              },
                            ]}
                          >
                            <AppText
                              variant="caption"
                              style={{ color: bloatingSeverity === val ? theme.primaryContrast : theme.text }}
                            >
                              {val}
                            </AppText>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  </View>
                </View>

                {/* Red Flag Symptoms */}
                <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <AppText variant="section" style={{ color: "#9F1239" }}>
                    Urgent Signs (Check if any apply)
                  </AppText>
                  <AppText variant="caption" tone="soft" style={styles.cardSub}>
                    These signals help evaluate if immediate medical assessment is advised.
                  </AppText>

                  <View style={styles.toggleList}>
                    {[
                      {
                        label: "Soaking through pad/tampon every hour for 2+ hours",
                        value: soakingPadHourly,
                        toggle: () => setSoakingPadHourly((v) => !v),
                      },
                      {
                        label: "Dizziness, fainting or lightheadedness",
                        value: faintingOrDizziness,
                        toggle: () => setFaintingOrDizziness((v) => !v),
                      },
                      {
                        label: "Sudden, severe sharp abdominal pain",
                        value: severeAbdominalPain,
                        toggle: () => setSevereAbdominalPain((v) => !v),
                      },
                      {
                        label: "Headache accompanied by vision changes",
                        value: headacheWithVisionChanges,
                        toggle: () => setHeadacheWithVisionChanges((v) => !v),
                      },
                      {
                        label: "High fever (>39°C / 102°F) or chills",
                        value: feverHigh,
                        toggle: () => setFeverHigh((v) => !v),
                      },
                    ].map((item, idx) => (
                      <Pressable
                        key={idx}
                        onPress={item.toggle}
                        style={[
                          styles.toggleItem,
                          item.value && { backgroundColor: "#FFF1F2" },
                        ]}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            {
                              borderColor: item.value ? "#B91C1C" : theme.border,
                              backgroundColor: item.value ? "#B91C1C" : "transparent",
                            },
                          ]}
                        >
                          {item.value ? <CheckCircle size={14} color="#fff" weight="bold" /> : null}
                        </View>
                        <AppText variant="caption" style={{ flex: 1, color: theme.text }}>
                          {item.label}
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Other Signs (PCOS / Thyroid) */}
                <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <AppText variant="section">Additional Indicators</AppText>
                  <View style={styles.toggleList}>
                    {[
                      {
                        label: "Extreme exhaustion or severe tiredness",
                        value: tirednessSevere,
                        toggle: () => setTirednessSevere((v) => !v),
                      },
                      {
                        label: "New unusual facial or body hair growth",
                        value: hairGrowthNew,
                        toggle: () => setHairGrowthNew((v) => !v),
                      },
                      {
                        label: "Velvety skin darkening on neck or folds",
                        value: skinDarkening,
                        toggle: () => setSkinDarkening((v) => !v),
                      },
                      {
                        label: "Unexplained or rapid weight change",
                        value: weightGainRapid,
                        toggle: () => setWeightGainRapid((v) => !v),
                      },
                    ].map((item, idx) => (
                      <Pressable
                        key={idx}
                        onPress={item.toggle}
                        style={[
                          styles.toggleItem,
                          item.value && { backgroundColor: palette.lavender50 },
                        ]}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            {
                              borderColor: item.value ? theme.primary : theme.border,
                              backgroundColor: item.value ? theme.primary : "transparent",
                            },
                          ]}
                        >
                          {item.value ? <CheckCircle size={14} color="#fff" weight="bold" /> : null}
                        </View>
                        <AppText variant="caption" style={{ flex: 1, color: theme.text }}>
                          {item.label}
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <PrimaryButton
                  label="Run Triage Check"
                  loading={triageMutation.isPending}
                  onPress={() => triageMutation.mutate()}
                  style={{ marginTop: spacing.sm }}
                />
              </View>
            )}
          </>
        ) : (
          /* Relief Toolkit */
          <View style={styles.reliefContainer}>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <AppText variant="section">Select Current Pain Level</AppText>
              <AppText variant="caption" tone="soft" style={styles.cardSub}>
                We personalize rotating relief steps based on your pain intensity.
              </AppText>
              <View style={styles.stepperRow}>
                {[2, 5, 7, 9].map((lvl) => (
                  <Pressable
                    key={lvl}
                    onPress={() => {
                      setCrampSeverity(lvl);
                      void refetchRelief();
                    }}
                    style={[
                      styles.stepperBtn,
                      {
                        backgroundColor: crampSeverity === lvl ? theme.primary : theme.background,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <AppText
                      variant="caption"
                      style={{
                        color: crampSeverity === lvl ? theme.primaryContrast : theme.text,
                        fontWeight: "600",
                      }}
                    >
                      {lvl <= 3 ? "Mild (1–3)" : lvl <= 6 ? "Moderate (4–6)" : lvl <= 8 ? "Bad (7–8)" : "Severe (9–10)"}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            </View>

            {reliefLoading ? (
              <ActivityIndicator size="large" color={theme.accent} style={{ marginVertical: spacing.xl }} />
            ) : reliefData?.tips && reliefData.tips.length > 0 ? (
              <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
                {reliefData.tips.map((tip: ReliefTip) => (
                  <View
                    key={tip.id}
                    style={[styles.tipCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  >
                    <View style={styles.tipHeader}>
                      <View style={{ flex: 1 }}>
                        <AppText variant="section">{tip.title}</AppText>
                        {tip.why ? (
                          <AppText variant="caption" tone="soft" style={{ marginTop: 2 }}>
                            {tip.why}
                          </AppText>
                        ) : null}
                      </View>
                      {tip.seconds ? <TipTimer seconds={tip.seconds} /> : null}
                    </View>

                    <View style={styles.stepsList}>
                      {tip.steps.map((step, idx) => (
                        <View key={idx} style={styles.stepRow}>
                          <View style={[styles.stepNum, { backgroundColor: palette.lavender100 }]}>
                            <AppText variant="caption" style={{ color: palette.plum900, fontWeight: "700" }}>
                              {idx + 1}
                            </AppText>
                          </View>
                          <AppText variant="body" tone="soft" style={{ flex: 1 }}>
                            {step}
                          </AppText>
                        </View>
                      ))}
                    </View>

                    {/* Feedback row */}
                    <View style={[styles.feedbackRow, { borderTopColor: theme.border }]}>
                      <AppText variant="caption" tone="faint">
                        Did this help ease your pain?
                      </AppText>
                      <View style={styles.feedbackButtons}>
                        <Pressable
                          onPress={() => rateTip(tip.id, true)}
                          style={[
                            styles.rateBtn,
                            ratedTips[tip.id] === true && { backgroundColor: "#DCFCE7" },
                          ]}
                        >
                          <ThumbsUp
                            size={16}
                            color={ratedTips[tip.id] === true ? "#14532D" : theme.textSoft}
                            weight={ratedTips[tip.id] === true ? "fill" : "regular"}
                          />
                        </Pressable>
                        <Pressable
                          onPress={() => rateTip(tip.id, false)}
                          style={[
                            styles.rateBtn,
                            ratedTips[tip.id] === false && { backgroundColor: "#FEE2E2" },
                          ]}
                        >
                          <ThumbsDown
                            size={16}
                            color={ratedTips[tip.id] === false ? "#991B1B" : theme.textSoft}
                            weight={ratedTips[tip.id] === false ? "fill" : "regular"}
                          />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Red flags warning card */}
            {reliefData?.redFlags ? (
              <View style={[styles.card, { backgroundColor: "#FFF1F2", borderColor: "#FECDD3", marginTop: spacing.md }]}>
                <AppText variant="section" style={{ color: "#991B1B" }}>
                  When to Seek Immediate Care
                </AppText>
                <View style={{ marginTop: spacing.xs, gap: spacing.xs }}>
                  {reliefData.redFlags.map((flag, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <WarningCircle size={14} color="#9F1239" weight="fill" />
                      <AppText variant="caption" style={{ color: "#991B1B", flex: 1 }}>
                        {flag}
                      </AppText>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
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
  tabsRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTabItem: {
    borderBottomWidth: 2,
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
  formContainer: {
    gap: spacing.md,
  },
  card: {
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardSub: {
    marginTop: spacing.xxs,
    marginBottom: spacing.sm,
  },
  scoreBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  stepperRow: {
    flexDirection: "row",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  stepperBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  optionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  miniStepper: {
    flexDirection: "row",
    gap: 4,
  },
  miniBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleList: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  toggleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  resultContainer: {
    gap: spacing.md,
  },
  urgencyCard: {
    padding: spacing.lg,
    borderRadius: radii.card,
    borderWidth: 1.5,
  },
  urgencyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  adviceText: {
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  reasonsBox: {
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    marginTop: 2,
  },
  profilesBox: {
    marginTop: spacing.sm,
  },
  profileBadge: {
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    marginTop: 4,
  },
  cardTitle: {
    marginBottom: spacing.sm,
  },
  wellnessItem: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  reliefContainer: {
    gap: spacing.md,
  },
  tipCard: {
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  timerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  stepsList: {
    gap: spacing.xs,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
  },
  stepNum: {
    width: 20,
    height: 20,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  feedbackButtons: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  rateBtn: {
    padding: spacing.xs,
    borderRadius: 8,
  },
});
