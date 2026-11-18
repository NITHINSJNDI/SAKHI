# SAKHI Clinical Review Checklist

**For:** the reviewing gynaecologist.
**Time needed:** about 60–90 minutes.
**How to review:**
- Mark each item ✅ agree, ✏️ change (write the change), or ❌ remove.
- Everything below is copied from what the app does today, with file references for the developers.

SAKHI is a screening and self-care aid for women in India (periods, pregnancy and after birth). It never diagnoses. Every warning points to a doctor, a hospital, or 112 or 108.

**Reviewer:** ______________________ **Qualification and hospital:** ______________________ **Date:** ____________

---

## A. Emergency and urgent red flags

A rule-based check runs before any AI reply (`frontend/lib/chat/safety.ts`).

| # | Situation | App response | Your verdict |
|---|---|---|---|
| A1 | Self-harm or suicidal language | Crisis reply with Tele-MANAS 14416 and 112 | |
| A2 | Pregnancy: BP at or above 160/110 typed in chat | Emergency: go to hospital now | |
| A3 | Pregnancy: any vaginal bleeding | Emergency: contact doctor or go to hospital | |
| A4 | Pregnancy: reduced or changed fetal movement | Emergency: get checked today | |
| A5 | Pregnancy: waters may have broken | Emergency: maternity unit now | |
| A6 | Pregnancy: severe headache with vision changes, or a fit | Emergency (preeclampsia signs) | |
| A7 | Severe pain or trouble breathing | Emergency: 112 or hospital | |
| A8 | Fainting | Emergency: in-person care now | |
| A9 | Not pregnant: soaking a pad every hour | **Urgent** (not emergency): contact a doctor today | |
| A10 | Possibly pregnant: sharp or one-sided pain | Emergency (possible ectopic) | |
| A11 | Fever with pelvic pain or unusual discharge | Urgent (infection) | |
| A12 | After birth: BP at or above 160/110, heavy bleeding, headache with vision changes, chest pain or a swollen leg | Emergency | |
| A13 | After birth: fever with smelly discharge, sore wound or painful breast | Urgent | |
| A14 | Newborn danger signs | Emergency: take the baby to hospital | |

**Missing red flags you would add:** ________________________________________________

---

## B. Lab and vital thresholds

`frontend/lib/labs.ts` and `frontend/lib/readings.ts`.

| # | Test | Thresholds used | Your verdict |
|---|---|---|---|
| B1 | Haemoglobin | Under 7: urgent. Under 10 (pregnant) or under 11 (not pregnant): moderate. Under 11 (pregnant) or under 12 (not pregnant): mild | |
| B2 | Fasting sugar, pregnant | 92 mg/dL or higher: see doctor (IADPSG) | |
| B3 | 2-hour sugar, pregnant | 140 mg/dL or higher: gestational diabetes (DIPSI) | |
| B4 | Fasting sugar, not pregnant | 100 or higher: mild. 126 or higher: diabetes range | |
| B5 | HbA1c | 5.7 or higher (6.0 if pregnant): mild. 6.5 or higher: attention | |
| B6 | Blood pressure | 140/90 or higher: contact doctor today. 160/110 or higher: urgent | |
| B7 | Urine protein, pregnant | 1+ or more: urgent (possible preeclampsia). Trace: mention at visit | |
| B8 | Ferritin | Under 15: empty stores. Under 30: low | |
| B9 | Platelets | Under 100 thousand: urgent. Under 150 thousand: mild | |
| B10 | When a BP reading counts as old | 28 days (before 28 weeks), 14 days (28–36 weeks), 7 days (36 weeks or more) | |
| B11 | Sugar test reminder | "Usually at first visit and again at 24–28 weeks" | |

---

## C. Period care and hygiene advice

`frontend/lib/hygiene.ts`.

| # | Advice | Your verdict |
|---|---|---|
| C1 | Change pads and cloth every 4–6 hours (6 at most); tampons within 8 hours; empty cups within 12 hours | |
| C2 | Cloth: soft cotton; soak in cold water; wash with soap; dry fully in direct sunlight; replace every few months | |
| C3 | Cups: boil for 5–10 minutes at the start and end of each period | |
| C4 | Wash the outer area with plain water from front to back; soap inside is not needed | |
| C5 | Warning signs: fever, vomiting, a sunburn-like rash or fainting with a tampon or cup means remove it and go to hospital (toxic shock) | |
| C6 | Warning signs: itching, burning or a bad smell lasting days; green, grey or thick white discharge; pain passing urine; non-healing rash | |
| C7 | Myth cards: bathing is safe; period blood is not impure; no food spoils; exercise is fine; cups and tampons don't affect virginity; food doesn't change flow | |
| C8 | Disposal: wrap in paper or the pad's cover and put in a closed bin; never flush or throw in drains | |

---

## D. Screening scores

| # | Score | How it works | Your verdict |
|---|---|---|---|
| D1 | **Blood-loss score (PBAC)** | Each pad scores 1 (light), 5 (half soaked) or 20 (fully soaked); +5 for a clot bigger than a ₹5 coin. Over 100 for a period suggests heavy bleeding; Sakhi suggests a doctor visit and an Hb test. Cloth is marked as a rough guide; cups aren't scored | |
| D2 | **PCOS symptom check** | A model trained on 541 Kerala women using: irregular cycles, period length, BMI, age, weight gain, extra hair, dark skin patches, hair thinning, pimples. A high result says "worth seeing a doctor; a hormone test and ultrasound confirm it". AUC 0.88 | |
| D3 | **Iron check** | Heavy flow on 4+ days, 2+ very heavy days, 2+ periods over 7 days, or PBAC over 100, combined with tiredness or dizziness, suggests an Hb and ferritin test. A lab Hb under 12 overrides this | |
| D4 | **Next-period forecast** | Gives a likely date and an 80% range; states clearly it is not for avoiding pregnancy | |
| D5 | **Pregnancy risk tiles** | BP and sugar models plus guideline thresholds; readings can come from the MCP card, ASHA, health centre or lab | |

---

## E. Overall

1. Is anything in the app **unsafe** or likely to delay care? ____________________________________________
2. Is anything **missing** that women in rural Tamil Nadu commonly need? ____________________________________________
3. May we quote you in our submission? If yes, the quote: ____________________________________________

**Signature:** ______________________
