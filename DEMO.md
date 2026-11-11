# Sakhi: 2-minute demo script

Works with no Gemini key, no ML service and no database. Each of those makes it richer when present, but none of them is required.

## Before you start (once)

```bash
cd frontend
npm install
npm run dev
```

Optional, for the "real model server" path:

```bash
cd ai-health-app/ml-service
pip install -r requirements.txt
uvicorn main:app --port 8000
```

Then set `ML_SERVICE_URL=http://127.0.0.1:8000` in `frontend/.env.local`. Without it, predictions run on the identical TypeScript copy of the models (`engine: "local-fallback"`).

Open a **private window** at http://localhost:3000/onboarding so you start as a clean guest.

---

## 0:00 – 0:15 · The problem
> "PCOS affects about 1 in 10 women, and up to 70% of them are undiagnosed (WHO). Preeclampsia and gestational diabetes are caught late because readings live on paper. Sakhi is a companion that turns everyday check-ins into screening signals a doctor can act on."

## 0:15 – 0:50 · Her Mode (Priya, 24)
1. On onboarding, click **Her Mode demo**. This loads 3 months of realistic check-ins.
2. Point at the **cycle chart**: cycles of 31–38 days, flagged as irregular.
3. Point at the **PCOS card**: "High: 2 of 3 Rotterdam criteria", showing the exact criteria met (irregular cycles + hirsutism/acne). Say: *rule-based on the clinical standard, not a black box.*
4. In chat, type: `cramps 7/10 today, slept 5 hours, some acne`. Sakhi logs it and the chart updates.

## 0:50 – 1:30 · Mom Mode (Meera, 32 weeks)
1. Go back to `/onboarding` and choose **Mom Mode demo**.
2. Point at the BP trend creeping into the 130s and the single glucose reading of 148.
3. In chat, type: `BP 142/92 today, sugar 150, felt 8 kicks`.
   Sakhi immediately escalates: *rest, recheck in 15 minutes, contact your doctor today.*
4. Open the **preeclampsia card**. It shows the model card (UCI Maternal Health Risk, n=452, ROC-AUC 0.84, sensitivity 0.87 at the screening cutoff) and the top drivers (systolic BP, diastolic BP). Say: *trained on public data, explainable, tuned for sensitivity because missing a case is worse than a false alarm.*

## 1:30 – 1:50 · Doctor summary
1. Click **Doctor summary** (file icon in the header).
2. Show the one-page A4 summary: vitals trend, screening results, flags, and "questions to ask your doctor".
3. Click **Print / Save as PDF**. *This is what she hands her ASHA worker or OB.*

## 1:50 – 2:00 · Trust
- Open **Settings**: **Download my data** (full JSON export) and **Delete all my data**.
- *Consent-first. Chat works fully offline when AI processing is declined. Data stays per-user in Postgres. Sakhi screens, it never diagnoses.*

---

## If something goes wrong on stage
| Symptom | What's happening | Say / do |
|---|---|---|
| Gemini quota hit or no internet | Chat falls back to the offline engine automatically (`offline: true`) | Keep going, it still logs and escalates |
| ML service down | Predictions use the TypeScript mirror (`engine: local-fallback`) | Same numbers, parity-tested on 200 cases |
| No database | Data is saved to `frontend/.data/sakhi-store.json` | Nothing to do |
| Consent popup appears | New guest without a demo seed | Click "I understand and agree" |

Reset between runs: Settings → **Delete all my data**, or just open a new private window.
