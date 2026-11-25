import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import {
  CaretLeft,
  ShareNetwork,
  WarningCircle,
  ChatCircleText,
  FirstAid,
} from "phosphor-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { ErrorState, LoadingState } from "@/components/StateView";
import { apiFetch } from "@/lib/api";
import { apiDateToLocal } from "@/lib/date";
import { queryKeys } from "@/lib/queryKeys";
import { palette, radii, spacing, useAppTheme } from "@/theme";
import type {
  DoctorSummaryHer,
  DoctorSummaryPregnancy,
  DoctorSummaryResponse,
} from "@/types/api";

function fmtDate(d?: string | null): string {
  if (!d) return "—";
  const localStr = apiDateToLocal(d);
  const parts = localStr.split("-");
  if (parts.length === 3) {
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return `${day} ${months[monthIdx] || ""} ${year}`;
  }
  return d;
}

export default function DoctorSummaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const params = useLocalSearchParams<{ mode?: "her" | "pregnancy"; days?: string }>();

  const [mode, setMode] = useState<"her" | "pregnancy">(
    params.mode === "pregnancy" ? "pregnancy" : "her"
  );
  const [days, setDays] = useState<number>(
    parseInt(params.days || "90", 10) || 90
  );
  const [sharing, setSharing] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery<DoctorSummaryResponse>({
    queryKey: queryKeys.doctorSummary(mode, days),
    queryFn: () =>
      apiFetch<DoctorSummaryResponse>(`/api/doctor-summary?mode=${mode}&days=${days}`),
  });

  const generateAndSharePdf = async () => {
    if (!data) return;
    try {
      setSharing(true);

      const isHer = data.kind === "her";
      const herData = isHer ? (data as DoctorSummaryHer) : null;
      const momData = !isHer ? (data as DoctorSummaryPregnancy) : null;

      const title = isHer
        ? "Menstrual & Gynecological Health Brief"
        : momData?.postnatal
        ? "Postnatal Health Brief"
        : "Antenatal Health Brief";

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 28px; color: #1e1124; line-height: 1.5; background: #ffffff; }
            h1 { font-size: 22px; margin: 4px 0 2px 0; color: #3b194d; }
            h2 { font-size: 14px; font-weight: 700; color: #3b194d; border-bottom: 1.5px solid #f1e9f4; padding-bottom: 4px; margin: 18px 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px; }
            .sub { font-size: 12px; color: #695672; margin-bottom: 16px; }
            .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin-bottom: 12px; }
            .stat { border: 1px solid #e7dfec; border-radius: 8px; padding: 8px 12px; background: #faf8fb; }
            .stat-lbl { font-size: 10px; color: #695672; font-weight: 600; text-transform: uppercase; }
            .stat-val { font-size: 15px; font-weight: 700; color: #3b194d; margin-top: 2px; }
            .card { border: 1px solid #e7dfec; border-radius: 8px; padding: 12px; margin-bottom: 12px; background: #ffffff; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; }
            .badge-urgent { background: #fee2e2; color: #991b1b; }
            .badge-warn { background: #fef3c7; color: #92400e; }
            .badge-ok { background: #dcfce7; color: #166534; }
            .badge-neutral { background: #f3e8f7; color: #4a285d; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 6px; }
            th { text-align: left; padding: 6px 8px; color: #695672; border-bottom: 1px solid #e7dfec; font-size: 10px; text-transform: uppercase; }
            td { padding: 6px 8px; border-bottom: 1px solid #f6f0f8; }
            .flag-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 14px; margin-bottom: 10px; }
            .question-box { background: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 8px; padding: 10px 14px; margin-bottom: 10px; }
            ul { margin: 4px 0; padding-left: 18px; font-size: 12px; }
            li { margin-bottom: 4px; }
            .disclaimer { font-size: 10px; color: #8c7b94; margin-top: 24px; border-top: 1px solid #e7dfec; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div style="color: #db2777; font-size: 12px; font-weight: 700;">Sakhi · Clinical Summary Brief</div>
          <h1>${title}</h1>
          <div class="sub">
            <strong>${data.patient.name}</strong> · ${data.stats.checkIns} logged check-ins · Period: ${fmtDate(data.period.from)} to ${fmtDate(data.period.to)}
            <br />Generated: ${fmtDate(data.generatedAt)} · Patient-reported data with clinical AI screening
          </div>

          ${
            herData
              ? `
            <h2>Menstrual Cycle & Bleeding</h2>
            <div class="grid">
              <div class="stat">
                <div class="stat-lbl">Last Period Start</div>
                <div class="stat-val">${fmtDate(herData.cycle.lastPeriodStart)}</div>
              </div>
              <div class="stat">
                <div class="stat-lbl">Avg Cycle Length</div>
                <div class="stat-val">${herData.cycle.prediction?.average_cycle_length ?? herData.cycle.reportedCycleLength ? `${herData.cycle.prediction?.average_cycle_length ?? herData.cycle.reportedCycleLength} days` : "—"}</div>
              </div>
              <div class="stat">
                <div class="stat-lbl">Period Duration</div>
                <div class="stat-val">${herData.cycle.reportedPeriodDuration ? `${herData.cycle.reportedPeriodDuration} days` : "—"}</div>
              </div>
              <div class="stat">
                <div class="stat-lbl">Next Period Est.</div>
                <div class="stat-val">${fmtDate(herData.cycle.prediction?.next_period_date)}</div>
              </div>
            </div>
            <div style="font-size: 11px; color: #523b5d; margin-bottom: 8px;">
              Regularity: <strong>${herData.cycle.regularity || "Not specified"}</strong> · Diagnosed Conditions: <strong>${herData.patient.diagnosedConditions.length ? herData.patient.diagnosedConditions.join(", ") : "None reported"}</strong>
            </div>

            <h2>Symptoms & Bleeding Severity</h2>
            <div class="grid">
              <div class="stat">
                <div class="stat-lbl">Avg Cramps</div>
                <div class="stat-val">${herData.stats.avgCramps !== null ? `${herData.stats.avgCramps}/10` : "—"}</div>
              </div>
              <div class="stat">
                <div class="stat-lbl">Worst Cramps</div>
                <div class="stat-val">${herData.stats.maxCramps !== null ? `${herData.stats.maxCramps}/10` : "—"}</div>
              </div>
              <div class="stat">
                <div class="stat-lbl">Heavy Flow Days</div>
                <div class="stat-val">${herData.stats.heavyDays}</div>
              </div>
              <div class="stat">
                <div class="stat-lbl">Blood Loss (PBAC)</div>
                <div class="stat-val">${herData.stats.bloodLoss.length ? herData.stats.bloodLoss.map(p => p.score).join(", ") : "—"}</div>
              </div>
              <div class="stat">
                <div class="stat-lbl">Avg Sleep</div>
                <div class="stat-val">${herData.stats.avgSleep !== null ? `${herData.stats.avgSleep} hrs` : "—"}</div>
              </div>
            </div>
            <div style="font-size: 11px; color: #523b5d; margin-bottom: 8px;">
              Most frequent symptoms: ${herData.stats.symptoms.length ? herData.stats.symptoms.map(s => `${s.label} (${s.count})`).join(" · ") : "None recorded"}
            </div>
          `
              : ""
          }

          ${
            momData
              ? momData.postnatal
                ? `
              <h2>Postnatal Overview</h2>
              <div class="grid">
                <div class="stat">
                  <div class="stat-lbl">Baby</div>
                  <div class="stat-val">${[momData.postnatal.babyName, momData.postnatal.sex].filter(Boolean).join(", ") || "Baby"}</div>
                </div>
                <div class="stat">
                  <div class="stat-lbl">Born Date</div>
                  <div class="stat-val">${fmtDate(momData.postnatal.birthDate)} (${momData.postnatal.age})</div>
                </div>
                <div class="stat">
                  <div class="stat-lbl">Delivery Method</div>
                  <div class="stat-val">${momData.postnatal.delivery || "—"}</div>
                </div>
                <div class="stat">
                  <div class="stat-lbl">Latest Weight</div>
                  <div class="stat-val">${momData.postnatal.latestWeight ? `${momData.postnatal.latestWeight.weight} kg` : "—"}</div>
                </div>
                <div class="stat">
                  <div class="stat-lbl">Vaccine Visits</div>
                  <div class="stat-val">${momData.postnatal.vaccines.done} of ${momData.postnatal.vaccines.total}</div>
                </div>
              </div>
            `
                : `
              <h2>Antenatal Care Overview</h2>
              <div class="grid">
                <div class="stat">
                  <div class="stat-lbl">Gestation</div>
                  <div class="stat-val">${momData.patient.weeksPregnant ? `Week ${momData.patient.weeksPregnant}` : "—"}</div>
                </div>
                <div class="stat">
                  <div class="stat-lbl">Due Date</div>
                  <div class="stat-val">${fmtDate(momData.patient.dueDate)}</div>
                </div>
                <div class="stat">
                  <div class="stat-lbl">Weight Change</div>
                  <div class="stat-val">${momData.vitals.weightChange !== null ? `${momData.vitals.weightChange > 0 ? "+" : ""}${momData.vitals.weightChange} kg` : "—"}</div>
                </div>
                <div class="stat">
                  <div class="stat-lbl">Baby Kicks (Avg/Min)</div>
                  <div class="stat-val">${momData.vitals.avgKicks !== null ? `${momData.vitals.avgKicks} / ${momData.vitals.minKicks}` : "—"}</div>
                </div>
              </div>
            `
              : ""
          }

          ${
            momData && (momData.vitals.bp.length > 0 || momData.vitals.sugar.length > 0)
              ? `
            <h2>Blood Pressure & Glucose Log</h2>
            <table>
              <thead>
                <tr><th>Date</th><th>Blood Pressure</th><th>Blood Glucose</th></tr>
              </thead>
              <tbody>
                ${Array.from(new Set([...momData.vitals.bp.map(b => b.date), ...momData.vitals.sugar.map(s => s.date)]))
                  .sort()
                  .slice(-10)
                  .map(d => {
                    const b = momData.vitals.bp.find(x => x.date === d);
                    const s = momData.vitals.sugar.find(x => x.date === d);
                    const highBp = b && (b.systolic >= 140 || b.diastolic >= 90);
                    const highSugar = s && s.value >= 140;
                    return `
                      <tr>
                        <td>${fmtDate(d)}</td>
                        <td style="${highBp ? "color: #dc2626; font-weight: 700;" : ""}">${b ? `${b.systolic}/${b.diastolic}` : "—"}</td>
                        <td style="${highSugar ? "color: #dc2626; font-weight: 700;" : ""}">${s ? `${s.value} mg/dL` : "—"}</td>
                      </tr>
                    `;
                  })
                  .join("")}
              </tbody>
            </table>
          `
              : ""
          }

          ${
            herData?.screens
              ? `
            <h2>Screening Results</h2>
            <div class="grid">
              ${
                herData.screens.pcos
                  ? `
                <div class="card">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <strong>PCOS Criteria Screening</strong>
                    <span class="badge ${herData.screens.pcos.risk_level === "High" ? "badge-urgent" : herData.screens.pcos.risk_level === "Moderate" ? "badge-warn" : "badge-ok"}">
                      ${herData.screens.pcos.risk_level || "Not Scored"}
                    </span>
                  </div>
                  <div style="font-size: 11px; color: #695672;">${herData.screens.pcos.next_step || ""}</div>
                  ${herData.screens.pcos.clinical_flags ? `<ul>${herData.screens.pcos.clinical_flags.map(f => `<li>${f}</li>`).join("")}</ul>` : ""}
                </div>
              `
                  : ""
              }
              ${
                herData.screens.thyroid
                  ? `
                <div class="card">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <strong>Thyroid Risk Screen</strong>
                    <span class="badge ${herData.screens.thyroid.risk_level === "High" ? "badge-urgent" : herData.screens.thyroid.risk_level === "Moderate" ? "badge-warn" : "badge-ok"}">
                      ${herData.screens.thyroid.risk_level || "Not Scored"}
                    </span>
                  </div>
                  <div style="font-size: 11px; color: #695672;">${herData.screens.thyroid.next_step || ""}</div>
                  ${herData.screens.thyroid.clinical_flags ? `<ul>${herData.screens.thyroid.clinical_flags.map(f => `<li>${f}</li>`).join("")}</ul>` : ""}
                </div>
              `
                  : ""
              }
            </div>
          `
              : ""
          }

          ${
            momData?.screens && !momData.postnatal
              ? `
            <h2>Antenatal Screening Results</h2>
            <div class="grid">
              ${
                momData.screens.preeclampsia
                  ? `
                <div class="card">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <strong>Preeclampsia Risk Screen</strong>
                    <span class="badge ${momData.screens.preeclampsia.risk_level === "High" ? "badge-urgent" : momData.screens.preeclampsia.risk_level === "Moderate" ? "badge-warn" : "badge-ok"}">
                      ${momData.screens.preeclampsia.risk_level || (momData.screens.preeclampsia.not_scored ? "Not Scored" : "Low")}
                    </span>
                  </div>
                  <div style="font-size: 11px; color: #695672;">${momData.screens.preeclampsia.reason || ""}</div>
                </div>
              `
                  : ""
              }
              ${
                momData.screens.gdm
                  ? `
                <div class="card">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <strong>Blood Sugar / GDM Screen</strong>
                    <span class="badge ${momData.screens.gdm.risk_level === "High" ? "badge-urgent" : momData.screens.gdm.risk_level === "Moderate" ? "badge-warn" : "badge-ok"}">
                      ${momData.screens.gdm.risk_level || (momData.screens.gdm.not_scored ? "Not Scored" : "Low")}
                    </span>
                  </div>
                  <div style="font-size: 11px; color: #695672;">${momData.screens.gdm.reason || ""}</div>
                </div>
              `
                  : ""
              }
            </div>
          `
              : ""
          }

          ${
            data.labs && data.labs.length > 0
              ? `
            <h2>Recent Lab Results</h2>
            <table>
              <thead><tr><th>Test Name</th><th>Result</th><th>Date</th><th>Clinical Note</th></tr></thead>
              <tbody>
                ${data.labs.map(l => `
                  <tr>
                    <td><strong>${l.label}</strong></td>
                    <td style="${l.status === "attention" || l.status === "urgent" ? "color: #dc2626; font-weight: 700;" : ""}">${l.value}</td>
                    <td>${fmtDate(l.date)}</td>
                    <td style="color: #695672;">${l.note}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          `
              : ""
          }

          ${
            data.tablets && data.tablets.rows.length > 0
              ? `
            <h2>Medication & Tablets Adherence (Past ${data.tablets.days} Days)</h2>
            <table>
              <thead><tr><th>Tablet</th><th>Schedule</th><th>On Time</th><th>Late</th><th>Missed</th></tr></thead>
              <tbody>
                ${data.tablets.rows.map(tRow => `
                  <tr>
                    <td><strong>${tRow.name}</strong></td>
                    <td>${tRow.schedule}</td>
                    <td>${tRow.onTime}</td>
                    <td>${tRow.late}</td>
                    <td style="${tRow.missed > 3 ? "color: #dc2626; font-weight: 700;" : ""}">${tRow.missed}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          `
              : ""
          }

          <h2>Points to Discuss With Doctor</h2>
          ${
            data.flags.length > 0
              ? `
            <div class="flag-box">
              <strong style="color: #92400e; font-size: 12px;">Identified Clinical Flags:</strong>
              <ul style="color: #78350f;">
                ${data.flags.map(f => `<li>${f}</li>`).join("")}
              </ul>
            </div>
          `
              : ""
          }

          <div class="question-box">
            <strong style="color: #831843; font-size: 12px;">Suggested Questions for Consultation:</strong>
            <ul style="color: #701a75;">
              ${data.questions.map(q => `<li>${q}</li>`).join("")}
            </ul>
          </div>

          <div class="disclaimer">
            This health brief is generated from self-reported tracking data and algorithm screening aids. It does not replace professional medical advice, clinical diagnosis, or consultation with a licensed practitioner.
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
    } catch (err: any) {
      Alert.alert("Share Brief", err?.message || "Could not generate PDF.");
    } finally {
      setSharing(false);
    }
  };

  const isHer = data?.kind === "her";
  const herData = isHer ? (data as DoctorSummaryHer) : null;
  const momData = !isHer && data ? (data as DoctorSummaryPregnancy) : null;

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
          <CaretLeft size={22} color={theme.text} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <AppText variant="title">Doctor Visit Brief</AppText>
          <AppText variant="caption" tone="soft">
            1-Page Clinical Consultation Summary
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share PDF"
          onPress={() => void generateAndSharePdf()}
          disabled={!data || sharing}
          style={[styles.shareButton, { opacity: !data || sharing ? 0.4 : 1 }]}
        >
          {sharing ? (
            <ActivityIndicator size="small" color={palette.plum900} />
          ) : (
            <ShareNetwork size={22} color={palette.plum900} />
          )}
        </Pressable>
      </View>

      {/* Mode & Days Filter Row (Fully responsive, never cuts off) */}
      <View style={[styles.filterBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        {/* Mode Selector */}
        <View style={styles.modeToggleRow}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === "her" }}
            onPress={() => setMode("her")}
            style={[
              styles.modeTab,
              mode === "her" && { backgroundColor: palette.pink100, borderColor: palette.pink300 },
            ]}
          >
            <AppText
              variant="caption"
              style={{
                color: mode === "her" ? palette.pink600 : theme.textSoft,
                fontWeight: mode === "her" ? "700" : "500",
              }}
            >
              Her Mode
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === "pregnancy" }}
            onPress={() => setMode("pregnancy")}
            style={[
              styles.modeTab,
              mode === "pregnancy" && { backgroundColor: palette.lavender100, borderColor: palette.lavender300 },
            ]}
          >
            <AppText
              variant="caption"
              style={{
                color: mode === "pregnancy" ? palette.lavender600 : theme.textSoft,
                fontWeight: mode === "pregnancy" ? "700" : "500",
              }}
            >
              Mom Mode
            </AppText>
          </Pressable>
        </View>

        {/* Days Filter Pills */}
        <View style={styles.daysFilterRow}>
          {[30, 90, 180].map((d) => (
            <Pressable
              key={d}
              accessibilityRole="button"
              onPress={() => setDays(d)}
              style={[
                styles.dayPill,
                days === d && {
                  backgroundColor: palette.plum900,
                  borderColor: palette.plum900,
                },
              ]}
            >
              <AppText
                variant="caption"
                style={{
                  color: days === d ? "#FFFFFF" : theme.textSoft,
                  fontWeight: days === d ? "700" : "500",
                }}
              >
                {d === 30 ? "30 days" : d === 90 ? "90 days" : "6 months"}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Main Content */}
      {isLoading ? (
        <LoadingState message="Compiling clinical summary..." style={{ flex: 1 }} />
      ) : isError || !data ? (
        <ErrorState
          title="Could not generate summary"
          message="Please ensure your profile is set up and try again."
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
          {/* Patient Overview Card */}
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.patientRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.badgeRow}>
                  <FirstAid size={16} color={palette.pink500} />
                  <AppText variant="caption" style={{ color: palette.pink500, fontWeight: "700" }}>
                    Clinical Consultation Brief
                  </AppText>
                </View>
                <AppText variant="title" style={{ marginTop: 2 }}>
                  {data.patient.name}
                </AppText>
                <AppText variant="caption" tone="soft" style={{ marginTop: 2 }}>
                  {data.stats.checkIns} check-ins · {fmtDate(data.period.from)} to {fmtDate(data.period.to)}
                </AppText>
              </View>
              <View style={[styles.modeBadge, { backgroundColor: isHer ? palette.pink100 : palette.lavender100 }]}>
                <AppText
                  variant="caption"
                  style={{
                    color: isHer ? palette.pink600 : palette.lavender600,
                    fontWeight: "700",
                  }}
                >
                  {isHer ? "Her Mode" : "Mom Mode"}
                </AppText>
              </View>
            </View>
          </View>

          {/* Menstrual Overview (Her Mode) */}
          {herData ? (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <AppText variant="section" style={styles.sectionTitle}>
                Cycle & Bleeding Pattern
              </AppText>
              <View style={styles.statsGrid}>
                <View style={[styles.statBox, { borderColor: theme.border }]}>
                  <AppText variant="caption" tone="faint">Last Period</AppText>
                  <AppText variant="bodyStrong">{fmtDate(herData.cycle.lastPeriodStart)}</AppText>
                </View>
                <View style={[styles.statBox, { borderColor: theme.border }]}>
                  <AppText variant="caption" tone="faint">Avg Cycle</AppText>
                  <AppText variant="bodyStrong">
                    {herData.cycle.prediction?.average_cycle_length ?? herData.cycle.reportedCycleLength
                      ? `${herData.cycle.prediction?.average_cycle_length ?? herData.cycle.reportedCycleLength} d`
                      : "—"}
                  </AppText>
                </View>
                <View style={[styles.statBox, { borderColor: theme.border }]}>
                  <AppText variant="caption" tone="faint">Bleed Duration</AppText>
                  <AppText variant="bodyStrong">
                    {herData.cycle.reportedPeriodDuration
                      ? `${herData.cycle.reportedPeriodDuration} d`
                      : "—"}
                  </AppText>
                </View>
                <View style={[styles.statBox, { borderColor: theme.border }]}>
                  <AppText variant="caption" tone="faint">Next Est.</AppText>
                  <AppText variant="bodyStrong">{fmtDate(herData.cycle.prediction?.next_period_date)}</AppText>
                </View>
              </View>

              <AppText variant="caption" tone="soft" style={{ marginTop: spacing.xs }}>
                Regularity: {herData.cycle.regularity || "Not specified"} · Conditions:{" "}
                {herData.patient.diagnosedConditions.length
                  ? herData.patient.diagnosedConditions.join(", ")
                  : "None reported"}
              </AppText>
            </View>
          ) : null}

          {/* Symptoms & Severity (Her Mode) */}
          {herData ? (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <AppText variant="section" style={styles.sectionTitle}>
                Symptoms & Flow Severity
              </AppText>
              <View style={styles.statsGrid}>
                <View style={[styles.statBox, { borderColor: theme.border }]}>
                  <AppText variant="caption" tone="faint">Avg Cramps</AppText>
                  <AppText variant="bodyStrong">
                    {herData.stats.avgCramps !== null ? `${herData.stats.avgCramps}/10` : "—"}
                  </AppText>
                </View>
                <View style={[styles.statBox, { borderColor: theme.border }]}>
                  <AppText variant="caption" tone="faint">Worst Cramps</AppText>
                  <AppText variant="bodyStrong">
                    {herData.stats.maxCramps !== null ? `${herData.stats.maxCramps}/10` : "—"}
                  </AppText>
                </View>
                <View style={[styles.statBox, { borderColor: theme.border }]}>
                  <AppText variant="caption" tone="faint">Heavy Days</AppText>
                  <AppText variant="bodyStrong">{herData.stats.heavyDays}</AppText>
                </View>
                <View style={[styles.statBox, { borderColor: theme.border }]}>
                  <AppText variant="caption" tone="faint">Avg Sleep</AppText>
                  <AppText variant="bodyStrong">
                    {herData.stats.avgSleep !== null ? `${herData.stats.avgSleep} h` : "—"}
                  </AppText>
                </View>
              </View>

              <AppText variant="caption" style={{ fontWeight: "600", marginTop: spacing.xs }}>
                Most Frequent Symptoms:
              </AppText>
              <AppText variant="caption" tone="soft">
                {herData.stats.symptoms.length
                  ? herData.stats.symptoms.map((s) => `${s.label} (${s.count})`).join(" · ")
                  : "None recorded"}
              </AppText>
            </View>
          ) : null}

          {/* Month by Month PCOS Pattern (Her Mode) */}
          {herData?.pcosPattern && herData.pcosPattern.rows.some((r) => r.checkIns > 0) ? (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <AppText variant="section" style={styles.sectionTitle}>
                Month-by-Month Menstrual Pattern
              </AppText>
              {herData.pcosPattern.rows.map((r) => {
                const isIrregular = r.cycleLength && (r.cycleLength > 35 || r.cycleLength < 21);
                return (
                  <View key={r.label} style={[styles.tableRow, { borderColor: theme.border }]}>
                    <View style={{ width: 60 }}>
                      <AppText variant="caption" style={{ fontWeight: "700" }}>{r.label}</AppText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="caption">
                        Period: {r.periodStarted ? "Yes" : r.checkIns ? "No" : "—"}
                        {r.cycleLength ? ` · ${r.cycleLength}d cycle` : ""}
                        {r.checkIns ? ` · ${r.bleedDays}d bleed` : ""}
                      </AppText>
                      {r.acneDays > 0 || r.hairGrowthDays > 0 ? (
                        <AppText variant="caption" tone="soft">
                          Acne: {r.acneDays}d · Hair growth: {r.hairGrowthDays}d
                        </AppText>
                      ) : null}
                    </View>
                    {isIrregular ? (
                      <View style={[styles.miniBadge, { backgroundColor: "#FEE2E2" }]}>
                        <AppText variant="caption" style={{ color: "#991B1B", fontSize: 10, fontWeight: "700" }}>
                          Irregular
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}

          {/* PCOS & Thyroid Screening (Her Mode) */}
          {herData?.screens ? (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <AppText variant="section" style={styles.sectionTitle}>
                Clinical Screening Aids
              </AppText>
              {herData.screens.pcos ? (
                <View style={[styles.screenBox, { borderColor: theme.border }]}>
                  <View style={styles.screenHeader}>
                    <AppText variant="bodyStrong">PCOS Screening</AppText>
                    <View
                      style={[
                        styles.miniBadge,
                        {
                          backgroundColor:
                            herData.screens.pcos.risk_level === "High"
                              ? "#FEE2E2"
                              : herData.screens.pcos.risk_level === "Moderate"
                              ? "#FEF3C7"
                              : "#DCFCE7",
                        },
                      ]}
                    >
                      <AppText
                        variant="caption"
                        style={{
                          color:
                            herData.screens.pcos.risk_level === "High"
                              ? "#991B1B"
                              : herData.screens.pcos.risk_level === "Moderate"
                              ? "#92400E"
                              : "#166534",
                          fontWeight: "700",
                        }}
                      >
                        {herData.screens.pcos.risk_level || "Not Scored"}
                      </AppText>
                    </View>
                  </View>
                  {herData.screens.pcos.next_step ? (
                    <AppText variant="caption" tone="soft" style={{ marginTop: 2 }}>
                      {herData.screens.pcos.next_step}
                    </AppText>
                  ) : null}
                </View>
              ) : null}

              {herData.screens.thyroid ? (
                <View style={[styles.screenBox, { borderColor: theme.border, marginTop: spacing.xs }]}>
                  <View style={styles.screenHeader}>
                    <AppText variant="bodyStrong">Thyroid Screening</AppText>
                    <View
                      style={[
                        styles.miniBadge,
                        {
                          backgroundColor:
                            herData.screens.thyroid.risk_level === "High"
                              ? "#FEE2E2"
                              : herData.screens.thyroid.risk_level === "Moderate"
                              ? "#FEF3C7"
                              : "#DCFCE7",
                        },
                      ]}
                    >
                      <AppText
                        variant="caption"
                        style={{
                          color:
                            herData.screens.thyroid.risk_level === "High"
                              ? "#991B1B"
                              : herData.screens.thyroid.risk_level === "Moderate"
                              ? "#92400E"
                              : "#166534",
                          fontWeight: "700",
                        }}
                      >
                        {herData.screens.thyroid.risk_level || "Not Scored"}
                      </AppText>
                    </View>
                  </View>
                  {herData.screens.thyroid.next_step ? (
                    <AppText variant="caption" tone="soft" style={{ marginTop: 2 }}>
                      {herData.screens.thyroid.next_step}
                    </AppText>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Pregnancy Antenatal / Postnatal (Mom Mode) */}
          {momData ? (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <AppText variant="section" style={styles.sectionTitle}>
                {momData.postnatal ? "Postnatal Health Overview" : "Antenatal Health Overview"}
              </AppText>
              {momData.postnatal ? (
                <View style={styles.statsGrid}>
                  <View style={[styles.statBox, { borderColor: theme.border }]}>
                    <AppText variant="caption" tone="faint">Baby</AppText>
                    <AppText variant="bodyStrong">
                      {[momData.postnatal.babyName, momData.postnatal.sex].filter(Boolean).join(", ") || "Baby"}
                    </AppText>
                  </View>
                  <View style={[styles.statBox, { borderColor: theme.border }]}>
                    <AppText variant="caption" tone="faint">Born Date</AppText>
                    <AppText variant="bodyStrong">{fmtDate(momData.postnatal.birthDate)}</AppText>
                  </View>
                  <View style={[styles.statBox, { borderColor: theme.border }]}>
                    <AppText variant="caption" tone="faint">Delivery</AppText>
                    <AppText variant="bodyStrong">{momData.postnatal.delivery || "—"}</AppText>
                  </View>
                  <View style={[styles.statBox, { borderColor: theme.border }]}>
                    <AppText variant="caption" tone="faint">Vaccines</AppText>
                    <AppText variant="bodyStrong">
                      {momData.postnatal.vaccines.done}/{momData.postnatal.vaccines.total}
                    </AppText>
                  </View>
                </View>
              ) : (
                <View style={styles.statsGrid}>
                  <View style={[styles.statBox, { borderColor: theme.border }]}>
                    <AppText variant="caption" tone="faint">Gestation</AppText>
                    <AppText variant="bodyStrong">
                      {momData.patient.weeksPregnant ? `Week ${momData.patient.weeksPregnant}` : "—"}
                    </AppText>
                  </View>
                  <View style={[styles.statBox, { borderColor: theme.border }]}>
                    <AppText variant="caption" tone="faint">Due Date</AppText>
                    <AppText variant="bodyStrong">{fmtDate(momData.patient.dueDate)}</AppText>
                  </View>
                  <View style={[styles.statBox, { borderColor: theme.border }]}>
                    <AppText variant="caption" tone="faint">Weight Change</AppText>
                    <AppText variant="bodyStrong">
                      {momData.vitals.weightChange !== null
                        ? `${momData.vitals.weightChange > 0 ? "+" : ""}${momData.vitals.weightChange} kg`
                        : "—"}
                    </AppText>
                  </View>
                  <View style={[styles.statBox, { borderColor: theme.border }]}>
                    <AppText variant="caption" tone="faint">Baby Kicks</AppText>
                    <AppText variant="bodyStrong">
                      {momData.vitals.avgKicks !== null ? `${momData.vitals.avgKicks} avg` : "—"}
                    </AppText>
                  </View>
                </View>
              )}

              {/* BP & Sugar Logs in Pregnancy */}
              {momData.vitals.bp.length > 0 || momData.vitals.sugar.length > 0 ? (
                <View style={{ marginTop: spacing.xs }}>
                  <AppText variant="caption" style={{ fontWeight: "700", marginBottom: 4 }}>
                    Recent Blood Pressure & Glucose Readings:
                  </AppText>
                  {Array.from(new Set([...momData.vitals.bp.map((b) => b.date), ...momData.vitals.sugar.map((s) => s.date)]))
                    .sort()
                    .slice(-6)
                    .map((d) => {
                      const b = momData.vitals.bp.find((x) => x.date === d);
                      const s = momData.vitals.sugar.find((x) => x.date === d);
                      const highBp = b && (b.systolic >= 140 || b.diastolic >= 90);
                      const highSugar = s && s.value >= 140;
                      return (
                        <View key={d} style={[styles.tableRow, { borderColor: theme.border }]}>
                          <AppText variant="caption" style={{ width: 80 }}>{fmtDate(d)}</AppText>
                          <AppText
                            variant="caption"
                            style={{
                              flex: 1,
                              color: highBp ? "#DC2626" : theme.text,
                              fontWeight: highBp ? "700" : "500",
                            }}
                          >
                            BP: {b ? `${b.systolic}/${b.diastolic}` : "—"}
                          </AppText>
                          <AppText
                            variant="caption"
                            style={{
                              color: highSugar ? "#DC2626" : theme.text,
                              fontWeight: highSugar ? "700" : "500",
                            }}
                          >
                            Sugar: {s ? `${s.value} mg/dL` : "—"}
                          </AppText>
                        </View>
                      );
                    })}
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Lab Results (Both Modes) */}
          {data.labs && data.labs.length > 0 ? (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <AppText variant="section" style={styles.sectionTitle}>
                Recent Lab Results & Biomarkers
              </AppText>
              {data.labs.map((l) => (
                <View key={l.key} style={[styles.tableRow, { borderColor: theme.border }]}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong">{l.label}</AppText>
                    <AppText variant="caption" tone="soft">{l.note} · {fmtDate(l.date)}</AppText>
                  </View>
                  <View
                    style={[
                      styles.miniBadge,
                      {
                        backgroundColor:
                          l.status === "urgent"
                            ? "#FEE2E2"
                            : l.status === "attention"
                            ? "#FEF3C7"
                            : "#DCFCE7",
                      },
                    ]}
                  >
                    <AppText
                      variant="caption"
                      style={{
                        color:
                          l.status === "urgent"
                            ? "#991B1B"
                            : l.status === "attention"
                            ? "#92400E"
                            : "#166534",
                        fontWeight: "700",
                      }}
                    >
                      {l.value}
                    </AppText>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {/* Tablets / Medication Adherence */}
          {data.tablets && data.tablets.rows.length > 0 ? (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <AppText variant="section" style={styles.sectionTitle}>
                Medication Adherence (Last {data.tablets.days} Days)
              </AppText>
              {data.tablets.rows.map((tRow) => (
                <View key={tRow.name} style={[styles.tableRow, { borderColor: theme.border }]}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong">{tRow.name}</AppText>
                    <AppText variant="caption" tone="soft">{tRow.schedule}</AppText>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <AppText variant="caption">
                      On Time: {tRow.onTime} · Late: {tRow.late}
                    </AppText>
                    <AppText
                      variant="caption"
                      style={{
                        color: tRow.missed > 3 ? "#DC2626" : theme.textSoft,
                        fontWeight: tRow.missed > 3 ? "700" : "500",
                      }}
                    >
                      Missed: {tRow.missed}
                    </AppText>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {/* Points to Discuss With Doctor */}
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <AppText variant="section" style={styles.sectionTitle}>
              Points to Discuss with Doctor
            </AppText>

            {data.flags.length > 0 ? (
              <View style={styles.flagsBox}>
                <View style={styles.calloutHeader}>
                  <WarningCircle size={16} color="#B45309" weight="fill" />
                  <AppText variant="caption" style={{ color: "#92400E", fontWeight: "700" }}>
                    Identified Clinical Flags
                  </AppText>
                </View>
                {data.flags.map((f, idx) => (
                  <View key={idx} style={styles.bulletRow}>
                    <AppText variant="caption" style={{ color: "#78350F" }}>• {f}</AppText>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.questionsBox}>
              <View style={styles.calloutHeader}>
                <ChatCircleText size={16} color={palette.pink600} weight="fill" />
                <AppText variant="caption" style={{ color: palette.pink600, fontWeight: "700" }}>
                  Suggested Questions for Consultation
                </AppText>
              </View>
              {data.questions.map((q, idx) => (
                <View key={idx} style={styles.bulletRow}>
                  <AppText variant="caption" style={{ color: palette.plum900 }}>• {q}</AppText>
                </View>
              ))}
            </View>
          </View>

          {/* Medical Disclaimer */}
          <View style={styles.disclaimerBox}>
            <AppText variant="caption" tone="faint" style={{ textAlign: "center", fontSize: 11 }}>
              Sakhi compiles this brief from self-logged entries and algorithmic risk screening. It is designed to assist consultation with a qualified doctor and does not provide an official diagnosis or prescription.
            </AppText>
          </View>
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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  modeToggleRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  daysFilterRow: {
    flexDirection: "row",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  dayPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.lavender200,
    backgroundColor: palette.cream,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  card: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.xs,
  },
  patientRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  modeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  statBox: {
    flex: 1,
    minWidth: 70,
    padding: spacing.xs,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  miniBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  screenBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.xs,
  },
  screenHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  flagsBox: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.xs,
    marginBottom: spacing.xs,
  },
  questionsBox: {
    backgroundColor: "#FDF2F8",
    borderColor: "#FBCFE8",
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.xs,
  },
  calloutHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  bulletRow: {
    marginVertical: 2,
  },
  disclaimerBox: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
  },
});
