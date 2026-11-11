"""
SAKHI ML microservice.

* Maternal risk and diabetes risk: standardized logistic regressions trained on
  public datasets by train_models.py and loaded from models/risk_models.json.
* PCOS, thyroid and cycle: transparent clinical-guideline scoring (no public
  symptom-level dataset matches what the app collects, so we do not pretend).

Every response keeps the fields the frontend already reads (probability,
risk_level, has_pcos, ...) and adds `explanation`, `clinical_flags` and `model`
so the UI can show *why* a score is what it is.

frontend/lib/ml/scoring.ts mirrors this logic so the app still works when this
service is down; keep the two in sync (scripts/check_parity.py verifies it).
"""

import json
import math
import os
from datetime import date, datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, FastAPI, HTTPException
from pydantic import BaseModel, Field

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_PATH = os.path.join(BASE_DIR, "models", "risk_models.json")
MGDL_PER_MMOL = 18.016

app = FastAPI(title="SAKHI ML Microservice")
# Served both at the root (local dev) and under /api/ml (vercel.json rewrite).
router = APIRouter()

REGISTRY: dict = {}


@app.on_event("startup")
def load_models():
    global REGISTRY
    if os.path.exists(MODELS_PATH):
        with open(MODELS_PATH, encoding="utf-8") as f:
            REGISTRY = json.load(f)
        print(f"Loaded models: {', '.join(REGISTRY.get('models', {}).keys())}")
    else:
        print(f"WARNING: {MODELS_PATH} not found. Run `python train_models.py`.")


def get_model(key: str) -> dict:
    model = REGISTRY.get("models", {}).get(key)
    if not model:
        raise HTTPException(status_code=503, detail=f"Model '{key}' not loaded. Run train_models.py.")
    return model


def score_logistic(model: dict, values: List[Optional[float]]):
    """Return (probability, explanation) for a standardized logistic model.

    Missing inputs (None) are imputed with the training median, which makes their
    contribution ~0 so they never push the score either way.
    """
    z = model["intercept"]
    explanation = []
    for i, raw in enumerate(values):
        provided = raw is not None
        x = float(raw) if provided else model["medians"][i]
        contribution = model["coef"][i] * (x - model["mean"][i]) / model["scale"][i]
        z += contribution
        explanation.append({
            "feature": model["features"][i],
            "label": model["labels"][i],
            "value": round(x, 2),
            "unit": model["units"][i],
            "provided": provided,
            "impact": round(contribution, 3),  # log-odds; + raises risk, - lowers it
        })
    explanation.sort(key=lambda e: abs(e["impact"]), reverse=True)
    return 1.0 / (1.0 + math.exp(-z)), explanation


def risk_level_for(model: dict, p: float) -> str:
    m = model["metrics"]
    if p >= m["high_cutoff"]["threshold"]:
        return "High"
    if p >= m["screening_cutoff"]["threshold"]:
        return "Moderate"
    return "Low"


LEVELS = ["Low", "Moderate", "High"]


def at_least(level: str, floor: str) -> str:
    return level if LEVELS.index(level) >= LEVELS.index(floor) else floor


def model_card(model: dict) -> dict:
    return {
        "name": model["name"],
        "dataset": model["dataset"],
        "n": model["n_unique_used"],
        "roc_auc": model["metrics"]["roc_auc"],
        "sensitivity_at_screening": model["metrics"]["screening_cutoff"]["sensitivity"],
        "limitations": model["limitations"],
    }


# ---------------------------------------------------------------- schemas

class CycleRequest(BaseModel):
    last_period_date: str  # YYYY-MM-DD
    cycle_length_avg: int = Field(28, ge=10, le=120)
    cycle_lengths: Optional[List[int]] = None  # past cycle lengths, if known


class PCOSRequest(BaseModel):
    weight: float = 60.0
    cycle_regularity: int = 1  # 0 irregular, 1 regular
    acne_severity: int = Field(0, ge=0, le=10)
    cycle_length: Optional[int] = None
    missed_periods: int = 0
    hair_growth: bool = False      # hirsutism
    skin_darkening: bool = False   # acanthosis nigricans
    weight_gain: bool = False
    bmi: Optional[float] = None


class ThyroidRequest(BaseModel):
    fatigue_severity: int = Field(3, ge=0, le=10)
    heavy_or_prolonged_flow: int = 0
    cycle_regularity: int = 1
    light_or_short_flow: bool = False
    weight_gain: bool = False
    weight_loss: bool = False
    hair_loss: bool = False
    cold_intolerance: bool = False
    palpitations_or_anxiety: bool = False


class PreeclampsiaRequest(BaseModel):
    systolic: int = Field(120, ge=60, le=250)
    diastolic: int = Field(80, ge=30, le=160)
    hypertension_history: int = 0
    blood_sugar: Optional[float] = None  # mg/dL
    age: Optional[float] = None
    heart_rate: Optional[float] = None
    symptoms: List[str] = []


class GDMRequest(BaseModel):
    blood_sugar: float = Field(85.0, ge=20, le=600)  # mg/dL
    diabetes_history: int = 0
    bmi: Optional[float] = None
    age: Optional[float] = None
    previous_pregnancies: Optional[int] = None


# ---------------------------------------------------------------- endpoints

@router.post("/predict/cycle")
def predict_cycle(req: CycleRequest):
    try:
        last = datetime.strptime(req.last_period_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")

    today = date.today()
    lengths = [n for n in (req.cycle_lengths or []) if 10 <= n <= 120]
    avg = sum(lengths) / len(lengths) if lengths else float(req.cycle_length_avg)
    variation = (max(lengths) - min(lengths)) if len(lengths) >= 2 else None

    flags = []
    if avg < 21:
        flags.append("Cycles shorter than 21 days (polymenorrhea)")
    if avg > 35:
        flags.append("Cycles longer than 35 days (oligomenorrhea)")
    if variation is not None and variation > 9:
        flags.append(f"Cycle length varies by {variation} days (>9 days is irregular)")
    is_regular = 1 if not flags else 0

    days_since = (today - last).days
    cycle = max(1, round(avg))
    # Roll forward if one or more cycles have already passed since the logged date
    cycles_passed = max(0, days_since // cycle)
    next_period = last + timedelta(days=cycle * (cycles_passed + 1))
    ovulation = next_period - timedelta(days=14)

    return {
        "status": "success",
        "days_since_last_period": days_since,
        "is_regular": is_regular,
        "probability_regular": 0.9 if is_regular else 0.25,
        "days_until_next_period": max(0, (next_period - today).days),
        "next_period_date": next_period.isoformat(),
        "fertile_window": [(ovulation - timedelta(days=5)).isoformat(), ovulation.isoformat()],
        "average_cycle_length": round(avg, 1),
        "cycles_used": len(lengths),
        "clinical_flags": flags,
        "method": REGISTRY.get("rule_based", {}).get("cycle", "cycle statistics"),
    }


@router.post("/predict/pcos")
def predict_pcos(req: PCOSRequest):
    # Rotterdam: 2 of 3 of (ovulatory dysfunction, hyperandrogenism, PCOM on ultrasound)
    ovulatory, androgen, supportive = [], [], []
    if req.cycle_regularity == 0:
        ovulatory.append("Irregular cycles")
    if req.cycle_length and req.cycle_length > 35:
        ovulatory.append(f"Cycle length {req.cycle_length} days (>35)")
    if req.missed_periods >= 1:
        ovulatory.append(f"{req.missed_periods} missed period(s)")
    if req.hair_growth:
        androgen.append("New coarse hair growth (hirsutism)")
    if req.acne_severity >= 6:
        androgen.append(f"Moderate-severe acne ({req.acne_severity}/10)")
    if req.skin_darkening:
        supportive.append("Skin darkening (insulin-resistance sign)")
    if req.weight_gain:
        supportive.append("Rapid weight gain")
    if req.bmi is not None and req.bmi >= 25:
        supportive.append(f"BMI {req.bmi:.1f} (>=25)")

    criteria_met = int(bool(ovulatory)) + int(bool(androgen))
    p = {0: 0.06, 1: 0.28, 2: 0.70}[criteria_met] + 0.06 * len(supportive)
    p = min(0.95, p)

    return {
        "status": "success",
        "has_pcos": 1 if criteria_met == 2 else 0,
        "probability_pcos": round(p, 3),
        "risk_level": "High" if criteria_met == 2 else ("Moderate" if criteria_met == 1 or len(supportive) >= 2 else "Low"),
        "criteria_met": criteria_met,
        "explanation": {
            "ovulatory_dysfunction": ovulatory,
            "hyperandrogenism": androgen,
            "supportive_signs": supportive,
        },
        "clinical_flags": ovulatory + androgen + supportive,
        "next_step": "A pelvic ultrasound and hormone panel (testosterone, LH/FSH) are needed to diagnose PCOS."
                     if criteria_met else "No PCOS criteria met from logged symptoms.",
        "method": REGISTRY.get("rule_based", {}).get("pcos", "Rotterdam criteria"),
    }


@router.post("/predict/thyroid")
def predict_thyroid(req: ThyroidRequest):
    hypo, hyper = [], []
    if req.fatigue_severity >= 6:
        hypo.append(f"Significant fatigue ({req.fatigue_severity}/10)")
    if req.heavy_or_prolonged_flow:
        hypo.append("Heavy or prolonged periods")
    if req.weight_gain:
        hypo.append("Unexplained weight gain")
    if req.cold_intolerance:
        hypo.append("Feeling cold")
    if req.hair_loss:
        hypo.append("Hair thinning")
    if req.light_or_short_flow:
        hyper.append("Very light or short periods")
    if req.weight_loss:
        hyper.append("Unexplained weight loss")
    if req.palpitations_or_anxiety:
        hyper.append("Palpitations / anxiety")
    if req.cycle_regularity == 0:
        (hyper if hyper else hypo).append("Irregular cycles")

    signs = max(len(hypo), len(hyper))
    p = min(0.85, 0.05 + 0.15 * signs)
    return {
        "status": "success",
        "has_thyroid_risk": 1 if signs >= 3 else 0,
        "probability_thyroid": round(p, 3),
        "risk_level": "High" if signs >= 3 else ("Moderate" if signs == 2 else "Low"),
        "pattern": "hypothyroid" if len(hypo) >= len(hyper) else "hyperthyroid",
        "explanation": {"hypothyroid_signs": hypo, "hyperthyroid_signs": hyper},
        "clinical_flags": hypo + hyper,
        "next_step": "A TSH blood test confirms or rules out thyroid disease." if signs >= 2 else "No action needed.",
        "method": REGISTRY.get("rule_based", {}).get("thyroid", "symptom screen"),
    }


@router.post("/predict/preeclampsia")
def predict_preeclampsia(req: PreeclampsiaRequest):
    model = get_model("maternal_risk")
    bs_mmol = req.blood_sugar / MGDL_PER_MMOL if req.blood_sugar is not None else None
    p, explanation = score_logistic(model, [req.systolic, req.diastolic, bs_mmol, req.age, req.heart_rate])
    level = risk_level_for(model, p)

    # ACOG blood-pressure thresholds override the model when they are stricter
    flags = []
    danger = {"severe headache", "headache", "vision changes", "blurred vision", "swelling", "upper abdominal pain"}
    has_danger_symptom = any(s.lower() in danger for s in req.symptoms)
    if req.systolic >= 160 or req.diastolic >= 110:
        flags.append("Severe-range BP (>=160/110): seek care today")
        level = "High"
    elif req.systolic >= 140 or req.diastolic >= 90:
        flags.append("BP >=140/90: hypertension in pregnancy")
        level = "High"
    elif req.systolic >= 130 or req.diastolic >= 80:
        flags.append("BP 130-139/80-89: elevated, recheck within a week")
        level = at_least(level, "Moderate")
    if req.hypertension_history:
        flags.append("History of high blood pressure")
        level = at_least(level, "Moderate")
    if has_danger_symptom and (req.systolic >= 130 or req.diastolic >= 80):
        flags.append("Raised BP with headache/vision/swelling symptoms")
        level = "High"

    return {
        "status": "success",
        "risk_level": level,
        "is_high_risk": 1 if level == "High" else 0,
        "probability": round(p, 3),
        "factors": {
            "systolic": req.systolic,
            "diastolic": req.diastolic,
            "hypertension_history": bool(req.hypertension_history),
        },
        "explanation": explanation,
        "clinical_flags": flags,
        "model": model_card(model),
    }


@router.post("/predict/gdm")
def predict_gdm(req: GDMRequest):
    model = get_model("diabetes_risk")
    p, explanation = score_logistic(model, [req.blood_sugar, req.bmi, req.age, req.previous_pregnancies])
    level = risk_level_for(model, p)

    # DIPSI (India) 2-h >= 140 mg/dL and overt-diabetes thresholds
    flags = []
    if req.blood_sugar >= 200:
        flags.append("Glucose >=200 mg/dL: possible overt diabetes, see a doctor promptly")
        level = "High"
    elif req.blood_sugar >= 140:
        flags.append("Glucose >=140 mg/dL (DIPSI GDM threshold)")
        level = "High"
    if req.diabetes_history:
        flags.append("Personal or family history of diabetes")
        level = at_least(level, "Moderate")

    return {
        "status": "success",
        "risk_level": level,
        "is_high_risk": 1 if level == "High" else 0,
        "probability": round(p, 3),
        "factors": {"blood_sugar": req.blood_sugar, "diabetes_history": bool(req.diabetes_history)},
        "explanation": explanation,
        "clinical_flags": flags,
        "model": model_card(model),
    }


@router.get("/model-info")
def model_info():
    return {
        "version": REGISTRY.get("version"),
        "models": {k: {**model_card(m), "metrics": m["metrics"], "dataset_url": m["dataset_url"]}
                   for k, m in REGISTRY.get("models", {}).items()},
        "rule_based": REGISTRY.get("rule_based", {}),
    }


@router.get("/health")
def health():
    loaded = REGISTRY.get("models", {})
    return {
        "status": "healthy" if loaded else "degraded",
        "models_loaded": {
            "maternal_risk": "maternal_risk" in loaded,
            "diabetes_risk": "diabetes_risk" in loaded,
            "pcos": True,      # rule-based
            "thyroid": True,   # rule-based
            "cycle": True,     # rule-based
        },
    }


app.include_router(router)
app.include_router(router, prefix="/api/ml")
