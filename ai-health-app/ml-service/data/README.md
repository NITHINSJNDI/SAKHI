# Training data

| File | Source | Licence | Used for |
|---|---|---|---|
| `maternal_health_risk.csv` | [UCI Maternal Health Risk](https://archive.ics.uci.edu/dataset/863/maternal+health+risk) — Ahmed, M. & Kashem, M.A. (2020) | CC BY 4.0 | `maternal_risk` model (pregnancy BP / sugar risk) |
| `pima_diabetes.csv` | [Pima Indians Diabetes Database](https://www.kaggle.com/datasets/uciml/pima-indians-diabetes-database) — NIDDK, via jbrownlee/Datasets | CC0 / public domain | `diabetes_risk` model (GDM screening proxy) |

Retrain with `python train_models.py`; it rewrites `models/risk_models.json` and
`frontend/lib/ml/risk_models.json`. Metrics are printed and stored in the JSON.
