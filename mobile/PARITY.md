# Web → mobile feature parity

Goal: every feature of the web app (`frontend/app/her-mode`, `frontend/app/pregnancy-mode`) exists in the mobile app, **before** the UI redesign.

Legend: ✅ done · 🟡 partial · ❌ missing

## App structure (matches the web)

The web is in **one mode at a time**. Each mode has its own bottom tabs. There is no Her/Mom toggle on a dashboard; switching mode happens from settings / the pregnancy-test card / postpartum.

| Mode | Tabs |
|---|---|
| Her Mode | Today · Cycle · Insights · Care |
| Mom Mode | Today · Vitals · Plan · Care (Plan is renamed after birth) |

Shared chrome on both: `DashboardHeader` (date + mode, greeting, reminders bell with count, account menu), `RedFlagBanner`, `ConsentGate`, `SettingsModal`, notification center, floating Sakhi chat.

| Item | Status |
|---|---|
| Mode-based tabs (replace Dashboard + Her/Pregnancy tabs + toggle) | ❌ |
| DashboardHeader (date · mode, greeting, bell, account) | ❌ |
| RedFlagBanner | ❌ |
| ConsentGate (blocks until consent) | 🟡 consent screen exists, no gate |
| SettingsModal (profile, mode switch, language, voice, discreet, consent, data) | 🟡 Profile tab |
| Notification center: Her reminders (master toggle, prefs, complete, snooze, delete) | ❌ |
| Notification center: Pregnancy reminders | ❌ |
| Discreet mode / lock (`lib/discreet`) | ❌ |
| Language selector (8 languages, translations) | 🟡 picker on signup only |

## Her Mode

### Today
| Component | Web file | API | Status |
|---|---|---|---|
| PhaseCard (phase, cycle day, "period started" button) | her/HerPanels | /api/period-start | 🟡 |
| PainNowCard → ReliefSheet | her/HerPanels, her/ReliefSheet | /api/relief | ❌ |
| Sakhi avatar chat + daily check-in mode | SakhiAvatar, DailyCheckInChat | /api/ask-sakhi, /api/daily-log | 🟡 chat exists, no check-in mode |
| TodayTipsCard (adapted to pain/sleep/energy) | her/HerPanels | — | 🟡 |
| PregnancyTestCard (late period → Mom Mode) | her/PregnancyTestCard | /api/update-profile, user-doc | ❌ |
| HygieneCard (period near) | her/HygieneCard | user-doc hygiene | ❌ |
| PainTodayCard (log pain, list, delete) | her/PainTodayCard | /api/pain-log | 🟡 quick log only |
| PmsForecastCard | her/HerPanels | — | ❌ |
| GoalCard (track / TTC / avoid; intimacy log) | her/GoalCard | user-doc her_goal | ❌ |

### Cycle
| FertilityCalendar | her/FertilityCalendar | — | ❌ |
| NextPeriodCard | her/NextPeriodCard | — | ❌ |
| Cycle length trend chart | charts/DashboardCharts | — | ❌ |
| Period duration trend chart | charts/DashboardCharts | — | ❌ |
| Flow intensity chart | charts/DashboardCharts | — | 🟡 simple bar |

### Insights
| PhaseInsightsCard (stats, highlights) | her/HerPanels | — | ❌ |
| Common symptoms chart | charts | — | ❌ |
| Mood across cycle chart | charts | — | ❌ |
| Pain trend chart | charts | — | ❌ |
| Sleep hours chart | charts | — | ❌ |
| WeightTracker (her) | WeightTracker | /api/weight | ❌ (only in pregnancy) |

### Care
| PatternsCard | her/HerPanels | — | ❌ |
| CareLinksCard (relief, settings, favourites) | her/HerPanels | — | ❌ |
| HygieneCard | her/HygieneCard | user-doc | ❌ |
| AnaemiaCard | her/AnaemiaCard | /api/lab-report, user-doc | ❌ |
| PcosCheckCard | her/PcosCheckCard | /api/predict/pcos | 🟡 result shown, no check flow |
| TabletsCard (her) | TabletsCard | user-doc tablets | ❌ |
| LabResultsCard | LabReport | /api/lab-report(/read) | 🟡 lab-report screen |
| MoodCheckCard | MoodCheckCard | user-doc mood_checks | ❌ |
| FamilyContactsCard / FamilyAlert | FamilyAlert | user-doc family | ❌ |
| NearbyHelpCard | NearbyHelpCard | — | ❌ |

## Mom Mode

### Today
| PregnancyAvatar chat + check-in | PregnancyAvatar, PregnancyDailyCheckIn | /api/ask-sakhi-pregnancy, /api/pregnancy-log | 🟡 |
| BabyHeader / BabyArrivedCard (after birth) | Postpartum | user-doc postpartum | ❌ |
| ContractionTimer | ContractionTimer | — | ❌ |
| PregnancyWeekProgress | pregnancy-mode page | — | 🟡 |
| BabyGrowthTimeline | pregnancy-mode page | — | 🟡 |
| LatestVitalsCard | pregnancy-mode page | — | ❌ |
| TabletsCard (pregnancy) | TabletsCard | user-doc tablets | ❌ |

### Vitals
| Blood pressure chart | charts/PregnancyCharts | — | ❌ |
| Blood sugar chart | charts/PregnancyCharts | — | ❌ |
| Baby movement chart | charts/PregnancyCharts | — | ❌ |
| Mood tracker chart | charts/PregnancyCharts | — | ❌ |
| Sleep graph | charts/PregnancyCharts | — | ❌ |
| WeightTracker (pregnancy) | WeightTracker | /api/weight | 🟡 |
| Risk tiles (GDM, preeclampsia, thyroid) | pregnancy-mode page | /api/predict/* | ❌ |

### Plan
| BabyGrowthCard (after birth) | BabyGrowthCard | user-doc | ❌ |
| MilestonesCard | MilestonesCard | user-doc | ❌ |
| VaccineCard | Postpartum | user-doc postpartum | ❌ |
| AppointmentTimeline | pregnancy-mode page | /api/pregnancy-appointments | 🟡 |
| MealsCard | MealsCard | user-doc meals | ❌ |
| SchemesCard (govt schemes) | SchemesCard | — | ❌ |
| HospitalBagCard | HospitalBagCard | user-doc checklists | ❌ |

### Care
| MoodCheckCard (pregnant) | MoodCheckCard | user-doc | ❌ |
| FamilyContactsCard | FamilyAlert | user-doc | ❌ |
| NearbyHelpCard | NearbyHelpCard | — | ❌ |
| LabResultsCard (pregnancy) + LabReportSheet | LabReport | /api/lab-report | 🟡 |
| Postpartum (recovery, feeds, diapers) | Postpartum | user-doc postpartum | ❌ |

## Other screens
| Ask Sakhi chat (both modes) | ✅ (Phase 3) |
| Symptom triage | 🟡 (Phase 3, type errors) |
| Doctor summary + share | ✅ (Phase 3) |
| Export / delete data | ✅ (Phase 3) |
| Demo mode (sample data) | ❌ |
