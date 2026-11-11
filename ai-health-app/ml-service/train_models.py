"""
Train SAKHI's risk models on real public datasets and export them as plain JSON.

Datasets (in ./data):
  * maternal_health_risk.csv - UCI "Maternal Health Risk" (Ahmed & Kashem, 2020),
    1,014 records from rural Bangladesh hospitals / IoT monitoring.
    Columns: Age, SystolicBP, DiastolicBP, BS (blood sugar, mmol/L), BodyTemp,
    HeartRate, RiskLevel (low/mid/high).
  * pima_diabetes.csv - Pima Indians Diabetes (NIDDK), 768 women aged 21+.
    Columns: Pregnancies, Glucose (2-h OGTT plasma glucose, mg/dL), BloodPressure,
    SkinThickness, Insulin, BMI, DiabetesPedigree, Age, Outcome.

Why JSON instead of pickle: the deployed model is a standardized logistic
regression, so it is fully described by means, scales and coefficients. JSON is
safe to load (unpickling runs arbitrary code), human-readable, and lets the
Next.js app evaluate the *same* model when the Python service is unreachable.

Usage:  python train_models.py
Writes: models/risk_models.json  and  ../../frontend/lib/ml/risk_models.json
"""

import csv
import json
import os
from datetime import date

import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    brier_score_loss,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
OUT_PATHS = [
    os.path.join(BASE_DIR, "models", "risk_models.json"),
    os.path.join(BASE_DIR, "..", "..", "frontend", "lib", "ml", "risk_models.json"),
]
SEED = 42
MGDL_PER_MMOL = 18.016  # glucose unit conversion


def load_csv(path, header=True):
    with open(path, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))
    if header:
        return rows[0], rows[1:]
    return None, rows


def evaluate(X, y, threshold):
    """5-fold stratified CV for the deployed logistic model and a GBM baseline."""
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    logit = make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000))
    p_logit = cross_val_predict(logit, X, y, cv=cv, method="predict_proba")[:, 1]
    gbm = HistGradientBoostingClassifier(random_state=SEED)
    p_gbm = cross_val_predict(gbm, X, y, cv=cv, method="predict_proba")[:, 1]
    def at(t):
        pred = (p_logit >= t).astype(int)
        tn = int(((pred == 0) & (y == 0)).sum())
        return {
            "threshold": round(float(t), 3),
            "accuracy": round(float(accuracy_score(y, pred)), 3),
            "sensitivity": round(float(recall_score(y, pred)), 3),
            "specificity": round(tn / max(1, int((y == 0).sum())), 3),
            "precision": round(float(precision_score(y, pred, zero_division=0)), 3),
        }

    # Screening cutoff: the highest threshold that still catches >= 85% of
    # positive cases out-of-fold. Missing a high-risk mother costs more than a
    # false alarm, so this cutoff (not 0.5) decides "Moderate - get checked".
    screening_t = 0.05
    for t in np.arange(0.95, 0.04, -0.01):
        if recall_score(y, (p_logit >= t).astype(int)) >= 0.85:
            screening_t = float(t)
            break

    return {
        "cv": "5-fold stratified, out-of-fold predictions",
        "roc_auc": round(float(roc_auc_score(y, p_logit)), 3),
        "brier": round(float(brier_score_loss(y, p_logit)), 3),
        "high_cutoff": at(threshold),
        "screening_cutoff": at(screening_t),
        "baseline_gradient_boosting_auc": round(float(roc_auc_score(y, p_gbm)), 3),
        "model_choice": "Logistic regression deployed for per-factor explainability "
                        "and portability; gradient boosting AUC reported for comparison.",
    }


def fit_export(X, y, features, labels, units):
    """Fit standardized logistic regression and export it as plain numbers."""
    medians = np.nanmedian(X, axis=0)
    X = np.where(np.isnan(X), medians, X)
    mean = X.mean(axis=0)
    scale = X.std(axis=0)
    scale[scale == 0] = 1.0
    model = LogisticRegression(max_iter=2000).fit((X - mean) / scale, y)
    return X, {
        "type": "standardized_logistic_regression",
        "features": features,
        "labels": labels,
        "units": units,
        "medians": [round(float(v), 4) for v in medians],
        "mean": [round(float(v), 6) for v in mean],
        "scale": [round(float(v), 6) for v in scale],
        "coef": [round(float(v), 6) for v in model.coef_[0]],
        "intercept": round(float(model.intercept_[0]), 6),
    }


def train_maternal():
    header, rows = load_csv(os.path.join(DATA_DIR, "maternal_health_risk.csv"))
    # The UCI file contains many exact duplicate rows; keeping them would leak
    # identical records across CV folds and inflate the reported accuracy.
    unique_rows = sorted({tuple(r) for r in rows if len(r) == len(header)})
    idx = {name: i for i, name in enumerate(header)}
    features = ["SystolicBP", "DiastolicBP", "BS", "Age", "HeartRate"]
    X = np.array([[float(r[idx[f]]) for f in features] for r in unique_rows])
    y = np.array([1 if r[idx["RiskLevel"]].strip() == "high risk" else 0 for r in unique_rows])

    X_filled, model = fit_export(
        X, y, features,
        labels=["Systolic BP", "Diastolic BP", "Blood sugar", "Age", "Heart rate"],
        units=["mmHg", "mmHg", "mmol/L", "years", "bpm"],
    )
    model.update({
        "name": "Maternal high-risk (hypertensive / metabolic) model",
        "dataset": "UCI Maternal Health Risk (Ahmed & Kashem 2020)",
        "dataset_url": "https://archive.ics.uci.edu/dataset/863/maternal+health+risk",
        "n_records": int(len(rows)),
        "n_unique_used": int(len(unique_rows)),
        "positive_rate": round(float(y.mean()), 3),
        "target": "RiskLevel == 'high risk'",
        "metrics": evaluate(X_filled, y, threshold=0.5),
        "limitations": (
            "Labels are overall maternal risk assessed by clinicians, not a "
            "preeclampsia diagnosis. Data comes from one region (Bangladesh). "
            "Used as a screening signal alongside ACOG blood-pressure thresholds."
        ),
    })
    return model


def train_diabetes():
    _, rows = load_csv(os.path.join(DATA_DIR, "pima_diabetes.csv"), header=False)
    cols = ["Pregnancies", "Glucose", "BloodPressure", "SkinThickness", "Insulin",
            "BMI", "DiabetesPedigree", "Age", "Outcome"]
    data = np.array([[float(v) for v in r] for r in rows if len(r) == len(cols)])
    idx = {c: i for i, c in enumerate(cols)}
    features = ["Glucose", "BMI", "Age", "Pregnancies"]
    X = data[:, [idx[f] for f in features]].copy()
    # In this dataset 0 means "not measured" for Glucose and BMI
    for j, f in enumerate(features):
        if f in ("Glucose", "BMI"):
            X[X[:, j] == 0, j] = np.nan
    y = data[:, idx["Outcome"]].astype(int)

    X_filled, model = fit_export(
        X, y, features,
        labels=["Blood glucose", "BMI", "Age", "Previous pregnancies"],
        units=["mg/dL", "kg/m2", "years", "count"],
    )
    model.update({
        "name": "Diabetes risk model (gestational-diabetes screening proxy)",
        "dataset": "Pima Indians Diabetes Database (NIDDK)",
        "dataset_url": "https://www.kaggle.com/datasets/uciml/pima-indians-diabetes-database",
        "n_records": int(len(rows)),
        "n_unique_used": int(len(rows)),
        "positive_rate": round(float(y.mean()), 3),
        "target": "Outcome == 1 (diabetes within 5 years)",
        "metrics": evaluate(X_filled, y, threshold=0.5),
        "limitations": (
            "Outcome is type 2 diabetes, not GDM, and glucose is a 2-hour OGTT "
            "value. Used as a proxy screen together with DIPSI / IADPSG "
            "glucose thresholds; an OGTT at 24-28 weeks is the diagnostic test."
        ),
    })
    return model


def main():
    out = {
        "version": date.today().isoformat(),
        "models": {
            "maternal_risk": train_maternal(),
            "diabetes_risk": train_diabetes(),
        },
        "rule_based": {
            "pcos": "Rotterdam 2003 criteria (ovulatory dysfunction + clinical "
                    "hyperandrogenism); ultrasound criterion not available in-app.",
            "thyroid": "Symptom screen for hypo/hyperthyroid menstrual patterns; "
                       "TSH blood test required to confirm.",
            "cycle": "Statistics from the user's own logged cycles (21-35 day "
                     "normal range, variation <= 7-9 days per ACOG/FIGO).",
        },
    }
    for path in OUT_PATHS:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(out, f, indent=2)
        print(f"Wrote {os.path.normpath(path)}")
    for key, m in out["models"].items():
        print(f"{key}: n={m['n_unique_used']}  metrics={m['metrics']}")


if __name__ == "__main__":
    main()
