"""
Verify the FastAPI scorer (main.py) and the Next.js fallback scorer
(frontend/lib/ml/scoring.ts) return the same results for the same inputs.

Run both servers, then:
  python scripts/check_parity.py [ML_URL] [NEXT_URL]
defaults: http://127.0.0.1:8000  http://localhost:3000
"""
import json
import random
import sys
import urllib.request

ML = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"
NEXT = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:3000"
KEYS = ["risk_level", "probability", "probability_pcos", "probability_thyroid",
        "has_pcos", "has_thyroid_risk", "is_regular", "days_until_next_period",
        "next_period_date", "clinical_flags"]


def post(url, body):
    req = urllib.request.Request(url, json.dumps(body).encode(), {"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.load(r)


def cases(rng):
    for _ in range(40):
        yield "preeclampsia", {"systolic": rng.randint(95, 175), "diastolic": rng.randint(55, 115),
                               "hypertension_history": rng.randint(0, 1),
                               "blood_sugar": rng.choice([None, rng.randint(70, 220)]),
                               "age": rng.choice([None, rng.randint(18, 42)])}
        yield "gdm", {"blood_sugar": rng.randint(65, 260), "diabetes_history": rng.randint(0, 1),
                      "bmi": rng.choice([None, round(rng.uniform(18, 40), 1)]),
                      "age": rng.choice([None, rng.randint(18, 42)])}
        yield "pcos", {"cycle_regularity": rng.randint(0, 1), "acne_severity": rng.randint(0, 10),
                       "hair_growth": rng.random() < 0.3, "skin_darkening": rng.random() < 0.2,
                       "weight_gain": rng.random() < 0.3, "missed_periods": rng.randint(0, 2)}
        yield "thyroid", {"fatigue_severity": rng.randint(0, 10), "heavy_or_prolonged_flow": rng.randint(0, 1),
                          "cycle_regularity": rng.randint(0, 1), "weight_gain": rng.random() < 0.3,
                          "palpitations_or_anxiety": rng.random() < 0.2}
        yield "cycle", {"last_period_date": f"2026-{rng.randint(8, 11):02d}-{rng.randint(1, 28):02d}",
                        "cycle_length_avg": rng.randint(22, 40),
                        "cycle_lengths": rng.choice([None, [rng.randint(22, 40) for _ in range(3)]])}


def main():
    rng = random.Random(7)
    mismatches = total = 0
    for task, body in cases(rng):
        body = {k: v for k, v in body.items() if v is not None}
        a = post(f"{ML}/predict/{task}", body)
        b = post(f"{NEXT}/api/predict/{task}?engine=local", body)
        total += 1
        for k in KEYS:
            if k not in a:
                continue
            same = abs(a[k] - b.get(k, 1e9)) < 1e-3 if isinstance(a[k], float) else a[k] == b.get(k)
            if not same:
                mismatches += 1
                print(f"MISMATCH {task} {k}: python={a[k]!r} ts={b.get(k)!r} input={body}")
    print(f"{total} cases, {mismatches} mismatches")
    sys.exit(1 if mismatches else 0)


if __name__ == "__main__":
    main()
