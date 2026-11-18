"""
Robustness checks for the PCOS symptom model (no independent open dataset
with matching self-reported columns was found, so this stress-tests the
Kerala data instead):

  1. Repeated 5-fold cross-validation (10 repeats) with bootstrap 95% CIs.
  2. Calibration: predicted vs observed rate in 5 risk bands.
  3. Subgroups: age < 25 vs >= 25, BMI < 25 vs >= 25.
  4. App reality: what happens when BMI and age are unknown (the app often
     does not have them), and when only the 5 yes/no answers + cycle
     regularity are known.

Run from ai-health-app/ml-service:  python scripts/validate_pcos.py
Writes models/pcos_validation.json.
"""
import json
import os
import sys

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import roc_auc_score, brier_score_loss

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE)
import train_pcos as tp  # noqa: E402

RNG = np.random.default_rng(42)
NAMES = [f[0] for f in tp.FEATURES]


def fit_predict(Xtr, ytr, Xte, drop=()):
    """Standardised logistic regression, missing values -> training medians.
    Features in `drop` are treated as unknown at prediction time (set to median),
    exactly as the app does when she hasn't given them."""
    med = np.nanmedian(Xtr, axis=0)
    Xtr = np.where(np.isnan(Xtr), med, Xtr)
    Xte = np.where(np.isnan(Xte), med, Xte).copy()
    for name in drop:
        Xte[:, NAMES.index(name)] = med[NAMES.index(name)]
    mu, sd = Xtr.mean(0), Xtr.std(0)
    sd[sd == 0] = 1
    m = LogisticRegression(max_iter=2000).fit((Xtr - mu) / sd, ytr)
    return m.predict_proba((Xte - mu) / sd)[:, 1]


def oof(X, y, repeats=10, drop=()):
    """Out-of-fold predictions, averaged over repeated stratified 5-fold CV."""
    total = np.zeros(len(y))
    for r in range(repeats):
        p = np.zeros(len(y))
        for tr, te in StratifiedKFold(5, shuffle=True, random_state=r).split(X, y):
            p[te] = fit_predict(X[tr], y[tr], X[te], drop)
        total += p
    return total / repeats


def boot_ci(y, p, fn, n=1000):
    vals = []
    for _ in range(n):
        i = RNG.integers(0, len(y), len(y))
        if len(set(y[i])) < 2:
            continue
        vals.append(fn(y[i], p[i]))
    return [round(float(np.percentile(vals, 2.5)), 3), round(float(np.percentile(vals, 97.5)), 3)]


def sens_spec(y, p, t):
    pred = p >= t
    return round(float((pred & (y == 1)).sum() / max(1, (y == 1).sum())), 3), round(float((~pred & (y == 0)).sum() / max(1, (y == 0).sum())), 3)


def main():
    X, y = tp.load()
    out = {"n": int(len(y)), "positive_rate": round(float(y.mean()), 3), "repeats": 10}

    scenarios = {
        "all_answers": (),
        "no_bmi_or_age": ("bmi", "age"),
        "answers_only": ("bmi", "age", "period_days"),
    }
    out["scenarios"] = {}
    for key, drop in scenarios.items():
        p = oof(X, y, drop=drop)
        se, sp = sens_spec(y, p, 0.23)
        out["scenarios"][key] = {
            "unknown_at_prediction": list(drop),
            "roc_auc": round(float(roc_auc_score(y, p)), 3),
            "roc_auc_95ci": boot_ci(y, p, roc_auc_score),
            "brier": round(float(brier_score_loss(y, p)), 3),
            "sensitivity_at_0.23": se,
            "specificity_at_0.23": sp,
        }
        if key == "all_answers":
            p_all = p

    # Calibration in 5 bands of predicted risk
    bands = []
    for lo, hi in [(0, .1), (.1, .25), (.25, .5), (.5, .75), (.75, 1.01)]:
        m = (p_all >= lo) & (p_all < hi)
        if m.sum():
            bands.append({"band": f"{lo:.2f}-{min(hi, 1):.2f}", "n": int(m.sum()),
                          "mean_predicted": round(float(p_all[m].mean()), 3),
                          "observed_rate": round(float(y[m].mean()), 3)})
    out["calibration"] = bands

    # Subgroups
    age = X[:, NAMES.index("age")]
    bmi = X[:, NAMES.index("bmi")]
    groups = {"age_under_25": age < 25, "age_25_plus": age >= 25, "bmi_under_25": bmi < 25, "bmi_25_plus": bmi >= 25}
    out["subgroups"] = {}
    for k, m in groups.items():
        if m.sum() >= 30 and len(set(y[m])) == 2:
            se, sp = sens_spec(y[m], p_all[m], 0.23)
            out["subgroups"][k] = {"n": int(m.sum()), "roc_auc": round(float(roc_auc_score(y[m], p_all[m])), 3),
                                   "sensitivity_at_0.23": se, "specificity_at_0.23": sp}

    path = os.path.join(BASE, "models", "pcos_validation.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
