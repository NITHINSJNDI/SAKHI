import os
import pickle
import numpy as np
from datetime import datetime
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="SAKHI ML Microservice")

# Model Paths
CYCLE_MODEL_PATH = "cycle.pkl"
PCOS_MODEL_PATH = "pcos.pkl"
THYROID_MODEL_PATH = "thyroid.pkl"
PREECLAMPSIA_MODEL_PATH = "preeclampsia.pkl"
GDM_MODEL_PATH = "gestational_diabetes.pkl"

# Global references to models
model_cycle = None
model_pcos = None
model_thyroid = None
model_preeclampsia = None
model_gdm = None

@app.on_event("startup")
def load_models():
    global model_cycle, model_pcos, model_thyroid, model_preeclampsia, model_gdm
    if os.path.exists(CYCLE_MODEL_PATH):
        with open(CYCLE_MODEL_PATH, "rb") as f:
            model_cycle = pickle.load(f)
    if os.path.exists(PCOS_MODEL_PATH):
        with open(PCOS_MODEL_PATH, "rb") as f:
            model_pcos = pickle.load(f)
    if os.path.exists(THYROID_MODEL_PATH):
        with open(THYROID_MODEL_PATH, "rb") as f:
            model_thyroid = pickle.load(f)
    if os.path.exists(PREECLAMPSIA_MODEL_PATH):
        with open(PREECLAMPSIA_MODEL_PATH, "rb") as f:
            model_preeclampsia = pickle.load(f)
    if os.path.exists(GDM_MODEL_PATH):
        with open(GDM_MODEL_PATH, "rb") as f:
            model_gdm = pickle.load(f)
    print("Models loaded successfully.")

# Request Schemas
class CycleRequest(BaseModel):
    last_period_date: str  # Format: YYYY-MM-DD
    cycle_length_avg: int

class PCOSRequest(BaseModel):
    weight: float
    cycle_regularity: int  # 0 for irregular, 1 for regular
    acne_severity: int     # 1 to 10

class ThyroidRequest(BaseModel):
    fatigue_severity: int = 3
    heavy_or_prolonged_flow: int = 0
    cycle_regularity: int = 1

class PreeclampsiaRequest(BaseModel):
    systolic: int = 120
    diastolic: int = 80
    hypertension_history: int = 0  # 0 or 1

class GDMRequest(BaseModel):
    blood_sugar: float = 85.0
    diabetes_history: int = 0  # 0 or 1

@app.post("/predict/cycle")
def predict_cycle(req: CycleRequest):
    if model_cycle is None:
        raise HTTPException(status_code=500, detail="Cycle prediction model not loaded.")
    
    try:
        dt = datetime.strptime(req.last_period_date, "%Y-%m-%d")
        days_since_last_period = (datetime.now() - dt).days
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")
    
    # Run prediction
    features = np.array([[req.cycle_length_avg, days_since_last_period]])
    prediction = int(model_cycle.predict(features)[0])
    probabilities = model_cycle.predict_proba(features)[0]
    prob_regular = float(probabilities[1])

    # Simple rule: if days since last period is close to cycle_length_avg, next period is due soon
    days_until_next = max(0, req.cycle_length_avg - days_since_last_period)
    
    return {
        "status": "success",
        "days_since_last_period": days_since_last_period,
        "is_regular": prediction,
        "probability_regular": prob_regular,
        "days_until_next_period": days_until_next
    }

@app.post("/predict/pcos")
def predict_pcos(req: PCOSRequest):
    if model_pcos is None:
        raise HTTPException(status_code=500, detail="PCOS prediction model not loaded.")
    
    # Run prediction
    features = np.array([[req.weight, req.cycle_regularity, req.acne_severity]])
    prediction = int(model_pcos.predict(features)[0])
    probabilities = model_pcos.predict_proba(features)[0]
    prob_pcos = float(probabilities[1])
    
    return {
        "status": "success",
        "has_pcos": prediction,
        "probability_pcos": prob_pcos
    }

@app.post("/predict/thyroid")
def predict_thyroid(req: ThyroidRequest):
    if model_thyroid is None:
        raise HTTPException(status_code=500, detail="Thyroid prediction model not loaded.")
    
    # Run prediction
    features = np.array([[req.fatigue_severity, req.heavy_or_prolonged_flow, req.cycle_regularity]])
    prediction = int(model_thyroid.predict(features)[0])
    probabilities = model_thyroid.predict_proba(features)[0]
    prob_thyroid = float(probabilities[1])
    
    return {
        "status": "success",
        "has_thyroid_risk": prediction,
        "probability_thyroid": prob_thyroid
    }

@app.post("/predict/preeclampsia")
def predict_preeclampsia(req: PreeclampsiaRequest):
    if model_preeclampsia is None:
        raise HTTPException(status_code=500, detail="Preeclampsia prediction model not loaded.")
    
    features = np.array([[req.systolic, req.diastolic, req.hypertension_history]])
    prediction = int(model_preeclampsia.predict(features)[0])
    probabilities = model_preeclampsia.predict_proba(features)[0]
    prob_high = float(probabilities[1])
    risk_level = "High" if prob_high >= 0.55 else "Moderate" if prob_high >= 0.30 else "Low"
    
    return {
        "status": "success",
        "risk_level": risk_level,
        "is_high_risk": prediction,
        "probability": prob_high,
        "factors": {
            "systolic": req.systolic,
            "diastolic": req.diastolic,
            "hypertension_history": bool(req.hypertension_history)
        }
    }

@app.post("/predict/gdm")
def predict_gdm(req: GDMRequest):
    if model_gdm is None:
        raise HTTPException(status_code=500, detail="Gestational diabetes prediction model not loaded.")
    
    features = np.array([[req.blood_sugar, req.diabetes_history]])
    prediction = int(model_gdm.predict(features)[0])
    probabilities = model_gdm.predict_proba(features)[0]
    prob_high = float(probabilities[1])
    risk_level = "High" if prob_high >= 0.55 else "Moderate" if prob_high >= 0.30 else "Low"
    
    return {
        "status": "success",
        "risk_level": risk_level,
        "is_high_risk": prediction,
        "probability": prob_high,
        "factors": {
            "blood_sugar": req.blood_sugar,
            "diabetes_history": bool(req.diabetes_history)
        }
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "models_loaded": {
            "cycle": model_cycle is not None,
            "pcos": model_pcos is not None,
            "thyroid": model_thyroid is not None,
            "preeclampsia": model_preeclampsia is not None,
            "gestational_diabetes": model_gdm is not None
        }
    }

