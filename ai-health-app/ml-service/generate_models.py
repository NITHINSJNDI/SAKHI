import pickle
import numpy as np
from sklearn.linear_model import LogisticRegression

# 1. Train and save dummy Cycle Prediction model
# Features: [cycle_length_avg, days_since_last_period]
# Target: is_regular (0 or 1)
np.random.seed(42)
X_cycle = np.random.randn(100, 2)
# center cycle_length_avg around 28 and days_since_last_period around 15
X_cycle[:, 0] = X_cycle[:, 0] * 3 + 28
X_cycle[:, 1] = X_cycle[:, 1] * 5 + 15
y_cycle = (X_cycle[:, 0] > 26).astype(int)

model_cycle = LogisticRegression()
model_cycle.fit(X_cycle, y_cycle)

with open("cycle.pkl", "wb") as f:
    pickle.dump(model_cycle, f)
print("Saved cycle.pkl successfully.")

# 2. Train and save dummy PCOS Prediction model
# Features: [weight, cycle_regularity, acne_severity]
# Target: has_pcos (0 or 1)
X_pcos = np.random.randn(100, 3)
# scale weight around 60, cycle_regularity (0 or 1), acne_severity (1 to 10)
X_pcos[:, 0] = X_pcos[:, 0] * 10 + 60
X_pcos[:, 1] = np.random.choice([0, 1], size=100)
X_pcos[:, 2] = np.random.randint(1, 11, size=100)
y_pcos = ((X_pcos[:, 1] == 0) & (X_pcos[:, 2] > 5)).astype(int)

model_pcos = LogisticRegression()
model_pcos.fit(X_pcos, y_pcos)

with open("pcos.pkl", "wb") as f:
    pickle.dump(model_pcos, f)
print("Saved pcos.pkl successfully.")

# 3. Train and save dummy Thyroid Prediction model
# Features: [fatigue_severity, heavy_or_prolonged_flow, cycle_irregularity]
# Target: has_thyroid_risk (0 or 1)
X_thyroid = np.random.randn(100, 3)
X_thyroid[:, 0] = np.random.randint(1, 11, size=100) # fatigue 1-10
X_thyroid[:, 1] = np.random.choice([0, 1], size=100) # heavy/prolonged flow
X_thyroid[:, 2] = np.random.choice([0, 1], size=100) # cycle regularity (0=irregular, 1=regular)
y_thyroid = ((X_thyroid[:, 0] >= 6) & (X_thyroid[:, 1] == 1)).astype(int)

model_thyroid = LogisticRegression()
model_thyroid.fit(X_thyroid, y_thyroid)

with open("thyroid.pkl", "wb") as f:
    pickle.dump(model_thyroid, f)
print("Saved thyroid.pkl successfully.")

# 4. Train and save Preeclampsia Prediction model
# Features: [systolic_bp, diastolic_bp, has_hypertension_history]
# Target: preeclampsia_risk (0 or 1)
np.random.seed(42)
n_samples = 200
systolic = np.random.randint(95, 160, size=n_samples)
diastolic = np.random.randint(60, 105, size=n_samples)
hyp_hist = np.random.choice([0, 1], size=n_samples, p=[0.8, 0.2])

X_preeclampsia = np.column_stack([systolic, diastolic, hyp_hist])
y_preeclampsia = ((systolic >= 138) | (diastolic >= 88) | ((hyp_hist == 1) & (systolic >= 128))).astype(int)

model_preeclampsia = LogisticRegression()
model_preeclampsia.fit(X_preeclampsia, y_preeclampsia)

with open("preeclampsia.pkl", "wb") as f:
    pickle.dump(model_preeclampsia, f)
print("Saved preeclampsia.pkl successfully.")

# 5. Train and save Gestational Diabetes (GDM) model
# Features: [fasting_blood_sugar, has_diabetes_history]
# Target: gdm_risk (0 or 1)
blood_sugar = np.random.randint(70, 145, size=n_samples)
diab_hist = np.random.choice([0, 1], size=n_samples, p=[0.85, 0.15])

X_gdm = np.column_stack([blood_sugar, diab_hist])
y_gdm = ((blood_sugar >= 95) | ((diab_hist == 1) & (blood_sugar >= 90))).astype(int)

model_gdm = LogisticRegression()
model_gdm.fit(X_gdm, y_gdm)

with open("gestational_diabetes.pkl", "wb") as f:
    pickle.dump(model_gdm, f)
print("Saved gestational_diabetes.pkl successfully.")


