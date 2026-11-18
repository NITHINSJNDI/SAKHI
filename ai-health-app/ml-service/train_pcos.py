"""
PCOS symptom model: trained only on things a woman can tell us herself.

Dataset (not shipped; download it yourself and check the licence):
  "Polycystic ovary syndrome (PCOS)" by Prasoon Kottarathil on Kaggle,
  541 women from 10 hospitals in Kerala, India.
  https://www.kaggle.com/datasets/prasoonkottarathil/polycystic-ovary-syndrome-pcos
Save the sheet as CSV at data/pcos_symptoms.csv (the file named
"PCOS_data_without_infertility" / sheet "Full_new", or PCOS_data.csv).

Lab values and ultrasound follicle counts in that dataset are deliberately
NOT used: the app cannot know them. The model therefore screens, it does not
diagnose; the Rotterdam rule check still runs beside it.

Run:  python train_pcos.py           (prints metrics)
      python train_models.py         (includes this model in risk_models.json
                                      when data/pcos_symptoms.csv exists)
"""
import csv
import os
import re

import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "pcos_symptoms.csv")

# (feature name in the app, label, unit, matcher for the dataset column)
FEATURES = [
    ("irregular_cycles", "Irregular cycles", "yes/no", r"^cycle\(r/i\)$"),
    ("period_days", "Period length (bleeding days)", "days", r"^cycle length"),
    ("bmi", "BMI", "kg/m2", r"^bmi$"),
    ("age", "Age", "years", r"^age"),
    ("weight_gain", "Weight gain", "yes/no", r"^weight gain"),
    ("hair_growth", "Extra hair growth", "yes/no", r"^hair growth"),
    ("skin_darkening", "Skin darkening", "yes/no", r"^skin darkening"),
    ("hair_loss", "Hair loss", "yes/no", r"^hair loss"),
    ("pimples", "Pimples / acne", "yes/no", r"^pimples"),
]
TARGET = r"^pcos \(y/n\)$"


def norm(name: str) -> str:
    return re.sub(r"\s+", " ", name.strip().lower())


def load(path=DATA_PATH):
    with open(path, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))
    header = [norm(h) for h in rows[0]]

    def col(pattern):
        for i, h in enumerate(header):
            if re.search(pattern, h):
                return i
        raise ValueError(f"Column matching {pattern!r} not found. Columns: {header}")

    t = col(TARGET)
    idx = [col(f[3]) for f in FEATURES]
    X, y = [], []
    for r in rows[1:]:
        if len(r) < len(header) or not r[t].strip():
            continue
        vals = []
        for (name, *_), i in zip(FEATURES, idx):
            raw = r[i].strip()
            try:
                v = float(raw)
            except ValueError:
                v = np.nan
            if name == "irregular_cycles" and not np.isnan(v):
                v = 1.0 if v >= 4 else 0.0          # dataset codes 2 = regular, 4 = irregular
            if name == "period_days" and not np.isnan(v) and not (1 <= v <= 15):
                v = np.nan                            # the column is bleeding days; keep plausible values only
            vals.append(v)
        X.append(vals)
        y.append(int(float(r[t])))
    return np.array(X, dtype=float), np.array(y, dtype=int)


def train(export_fn, evaluate_fn, path=DATA_PATH):
    """Fit, evaluate and return the model dict (uses train_models' helpers)."""
    X, y = load(path)
    names = [f[0] for f in FEATURES]
    X_filled, model = export_fn(X, y, names, [f[1] for f in FEATURES], [f[2] for f in FEATURES])
    metrics = evaluate_fn(X_filled, y, threshold=0.5)
    model.update({
        "name": "PCOS symptom screen",
        "dataset": "PCOS dataset, Kerala, India (Kottarathil, Kaggle), self-reportable columns only",
        "dataset_url": "https://www.kaggle.com/datasets/prasoonkottarathil/polycystic-ovary-syndrome-pcos",
        "n_records": int(len(y)),
        "n_unique_used": int(len(y)),
        "positive_rate": round(float(y.mean()), 3),
        "target": "Clinician PCOS diagnosis (Y/N) in the source hospitals",
        "metrics": metrics,
        "limitations": [
            "541 women from hospitals in one Indian state: may not match other regions or women outside hospitals.",
            "Excludes hormones and ultrasound, so it cannot diagnose PCOS.",
            "The dataset column 'Cycle length(days)' holds bleeding days, so it is used as period length.",
        ],
    })
    return model


if __name__ == "__main__":
    import train_models as tm

    if not os.path.exists(DATA_PATH):
        raise SystemExit(f"Put the dataset at {DATA_PATH} first (see the note at the top of this file).")
    m = train(tm.fit_export, tm.evaluate)
    print(f"n={m['n_records']} positive_rate={m['positive_rate']}")
    print(m["metrics"])
