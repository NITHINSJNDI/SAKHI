# SAKHI: Ideas to Raise Each Evaluation Score

Current estimate: **about 52 / 100**. Ideas are ordered by impact within each section. **(Quick)** means it can be done in a day or two.

**Status (18 Nov 2026):** ✅ done · 🟡 drafted, still needs team input or fact-checking · no mark = not started. Details are in [SUBMISSION.md](SUBMISSION.md); the hygiene module is in `frontend/lib/hygiene.ts` and `frontend/components/her/HygieneCard.tsx`.

| # | Criterion | Now | Target |
|---|---|---|---|
| 1 | Problem & Target Beneficiaries | 60 | 80 |
| 2 | Solution & Value Proposition | 80 | 88 |
| 3 | Innovation & Differentiation | 65 | 80 |
| 4 | Prototype, Validation & Evidence | 45 | 75 |
| 5 | Market, Adoption & Scalability | 50 | 75 |
| 6 | Business Model & Sustainability | 20 | 65 |
| 7 | Impact, Roadmap & Support Required | 30 | 75 |

---

## 1. Problem & Target Beneficiaries (60 → 80)

- ✅ **Lead with menstrual health.** Open with periods, menstrual pain, heavy bleeding, anaemia and PCOS. Present pregnancy care as the next stage of the same story, not the headline. **(Quick)**
- 🟡 **Add Indian statistics with sources.** Use NFHS-5 (2019–21) for anaemia in women and the share using hygienic period products, and cite published Indian studies for PCOS rates and school absence during periods. Look up and check every number before using it. **(Quick)**
- ✅ **Write 3 beneficiary profiles.** For example: a college student in a city with irregular cycles; a rural woman sharing her husband's phone; a first-time pregnant woman supported by an ASHA worker. Give each her problem, current workaround and what SAKHI changes. **(Quick)**
- **Collect field evidence.** Interview 10–20 women and 3–5 ASHA workers or ANMs. Record quotes, the 5 most common problems and the current ways they get help. Take photos only with consent.
- ✅ **Name the gaps clearly.** Stigma and silence, no record of cycles, anaemia found late, doctors seeing patients without history, and no Indian-language tools.
- 🟡 **Define the geography.** Pick a first region, for example one district in Tamil Nadu or Telangana, so the languages and the ASHA network match.
- **Address the phone gap.** Say how women without their own phone are reached: ASHA-assisted mode, a shared family phone with discreet mode, or a future SMS or IVR channel.

## 2. Solution & Value Proposition (80 → 88)

- ✅ **One-line value statement.** For example: "SAKHI turns a woman's everyday check-ins into early warnings and a doctor-ready history, in her own language, even offline." **(Quick)**
- ✅ **Draw one workflow diagram.** Log or chat → safety check → patterns and risk flags → advice, doctor summary or emergency help. **(Quick)**
- **Record a 2-minute demo video** following `DEMO.md`. **(Quick)**
- ✅ **Group the features into 3–4 benefits** (Know your body, Catch problems early, Get help fast, Private and safe) instead of a long list.
- ✅ **Add a menstrual hygiene module.** Product guidance (pads, cups, cloth and how to wash cloth safely), period reminders to keep supplies ready, finding low-cost pads (for example Jan Aushadhi Suvidha pads), disposal advice, and short myth-busting cards.
- **Add an ASHA-worker view.** A simple screen where an ASHA worker can see the women in her area who have red flags (with their consent).
- ✅ **Show the value for each stakeholder:** the woman, the ASHA worker, the doctor and the health department.

## 3. Innovation & Differentiation (65 → 80)

- ✅ **Fix overclaims.** Make `SAKHI_NOVELTY_AND_RESEARCH_COMPARISON.txt` match the code: PCOS and thyroid screening are rule-based, not ML. Remove "first platform" unless it is proven, and check every patent number cited. **(Quick, important)**
- ✅ **Build a comparison table** of SAKHI against Flo, Clue, Maya, MyAva, Kilkari, ANMOL and paper records. Columns: Indian languages, offline use, period-to-pregnancy record, safety escalation, schemes, tablet schedule, discreet mode, doctor summary, cost. **(Quick)**
- ✅ **List innovations by type:**
  - *Technical:* safety check before any AI reply; keeps working without AI, the ML service or a connection; risk scores only from readings she entered; reads lab report photos with a review step.
  - *Social:* discreet mode for shared phones; works through ASHA workers; matching to government schemes.
  - *India-specific:* `1-0-1` tablet patterns tied to meal times; the UIP vaccine schedule; reference ranges for Indian clinical practice (DIPSI).
- **Explore IP.** Consider registering the SAKHI trademark and checking whether the safety-first chat design or the period-to-pregnancy risk model can be protected. Even "trademark application filed" helps.
- **Show explainability.** Add screenshots of risk results that show the main factors behind each score.

## 4. Prototype, Validation & Evidence (45 → 75)

- ✅ **State the development stage honestly.** For example: "Working prototype, technology readiness level 5–6: tested in a lab setting, deployed on Vercel." **(Quick)**
- **Run a usability pilot.** 20–50 women use it for 2–4 weeks. Measure how many keep using it, task completion, a usability score (SUS) and satisfaction. Collect testimonials.
- **Get a clinician to review it.** Ask a gynaecologist or obstetrician to check the red-flag rules, thresholds and advice text, and get a signed or quoted note.
- **Test the safety rules.** Write 100+ realistic messages (emergencies and normal questions, in all 4 languages) and report how many emergencies were caught and how many normal messages were wrongly flagged.
- ✅ **Add automated tests** for the cycle engine, safety check, tablet schedule and risk models, and show the pass count. **(Quick)**
- **Measure lab-reading accuracy.** Test 30+ real or sample lab reports and report the share of values read correctly, with Gemini and with on-device OCR.
- **Validate the models more.** Report sensitivity and specificity with confidence intervals. Add calibration plots. Plan to retrain on Indian data with a hospital partner.
- **Show what changed after testing.** List 3–5 changes made because of user feedback.
- **Collect visual evidence:** app screenshots, photos of users testing the app (with consent) and a screen recording.

## 5. Market, Adoption & Scalability (50 → 75)

- 🟡 **Estimate the market size.** Use census and NFHS figures for women aged 15–49 in India, and narrow it to those who own or share a smartphone, then to the first region. Cite every source. **(Quick)**
- ✅ **Map the stakeholders:** women, ASHA workers and ANMs, PHC and district hospital doctors, state NHM, schools and colleges, NGOs, self-help groups, CSR funders.
- ✅ **Choose adoption channels:**
  - Through ASHA workers during home visits and village health days.
  - Through school and college menstrual-health sessions.
  - Through women's self-help groups and NGOs.
  - Through hospitals: QR codes on antenatal care cards and in OPD waiting areas.
- **Partner with programmes that already exist,** such as state menstrual-hygiene schemes, Jan Aushadhi stores and Tele-MANAS (already linked in the app).
- ✅ **Plan the scale-up in stages.**
  - Phase 1: one district pilot.
  - Phase 2: one state with 2–3 languages.
  - Phase 3: several states with more languages, such as Kannada, Marathi and Bengali.
  - Phase 4: national, through NHM or ABDM integration.
- 🟡 **Plan health-system integration.** Look at linking with ABHA (Ayushman Bharat Health Account) so records can follow her to doctors.
- ✅ **Show that the tech scales.** It is a low-cost web app, works on cheap Android phones, uses little data and has a per-user AI limit.

## 6. Business Model & Sustainability (20 → 65)

- ✅ **Choose a main model:** free for women, paid for by institutions.
  - Government (B2G): licence or annual maintenance contract with state NHM or district health offices.
  - CSR: companies fund deployment in a district.
  - NGOs and hospitals: a white-label version for their programmes.
  - Optional premium features: detailed reports or teleconsultation booking (never ads, never selling data).
- ✅ **Estimate the cost per user.** Work out the cost of Gemini calls per user per month (with the daily limit), hosting, the database, SMS, and support or ASHA training. **(Quick)**
- ✅ **Show the cost of running it** at 1,000, 10,000 and 1,00,000 users.
- ✅ **Explain how costs are controlled.** Most replies come from the offline engine, an optional local model removes AI costs, and the Gemini key pool and daily limit cap spending.
- ✅ **Draw an operations workflow:** who onboards users, who maintains content, who reviews clinical advice, who handles support.
- **List institutional partners,** even early talks: a medical college, an NGO, a CSR team, a startup incubator.
- ✅ **Plan for the long term.** Clinical content gets updated through an advisory board, the code could be open source for government reuse, and the product should not depend on one AI vendor.

## 7. Impact, Roadmap & Support Required (30 → 75)

- 🟡 **Set KPIs with targets:**
  - *Reach:* women onboarded and monthly active users.
  - *Health:* red flags caught and referred; anaemia flags followed by an Hb test; PCOS-pattern users who saw a doctor.
  - *Behaviour:* tablets taken on time; antenatal visits attended; mood checks done.
  - *Hygiene:* use of hygienic products; school days missed because of periods.
  - *Experience:* satisfaction score and trust in the advice.
- ✅ **Use a theory of change:** inputs → activities → outputs → outcomes → impact. **(Quick)**
- ✅ **Add a milestone roadmap with dates:**
  - Next 3 months: pilot of 50 users and clinician review.
  - 6 months: 1,000 users in one district and an ASHA-worker view.
  - 12 months: a state partnership and 10,000+ users.
  - 18–24 months: integration with ABHA and NHM.
- ✅ **Write a risk and mitigation table.** Include wrong medical advice (safety check first, clinician review, emergency numbers); data privacy (consent, export and delete, DPDP Act 2023 compliance); low digital literacy (voice, ASHA-assisted use); AI downtime (offline engine); low uptake (community champions).
- ✅ **State the environmental impact** if a hygiene module is added, for example promoting reusable cups and cloth, and safe disposal.
- 🟡 **Make a specific ask.**
  - Funding: name an amount for the pilot and the first year.
  - A clinical partner hospital for validation.
  - Access to a pilot district, with ASHA workers.
  - Mentoring on regulation, for example whether SAKHI counts as a medical device in India (CDSCO).
  - Cloud or AI credits.

---

## Top 5 actions with the biggest effect on the score

1. **Run a small pilot** with real women and ASHA workers (raises #1, #4 and #7).
2. **Write a one-page business model** with cost per user and who pays (#6).
3. **Correct the novelty claims and add a comparison table** (#3).
4. **Lead with menstrual health and add a hygiene module** (#1, #2 and #7).
5. **Add KPIs, a dated roadmap, a risk table and a specific funding ask** (#7).
