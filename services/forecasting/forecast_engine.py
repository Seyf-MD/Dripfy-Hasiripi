import json
import sys
from datetime import datetime, timedelta
from statistics import mean, pstdev


def load_payload():
    raw = sys.stdin.read()
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def parse_series(payload):
    series = payload.get("series", [])
    parsed = []
    for item in series:
        date_str = item.get("date")
        value = item.get("value", 0)
        try:
            date_obj = datetime.fromisoformat(str(date_str))
        except (TypeError, ValueError):
            continue
        try:
            numeric = float(value)
        except (TypeError, ValueError):
            numeric = 0.0
        parsed.append({"date": date_obj.date(), "value": numeric})
    parsed.sort(key=lambda entry: entry["date"])
    return parsed


def compute_trend(values):
    n = len(values)
    if n <= 1:
        return 0.0, values[0] if values else 0.0

    xs = list(range(n))
    x_mean = mean(xs)
    y_mean = mean(values)
    denominator = sum((x - x_mean) ** 2 for x in xs) or 1.0
    slope = sum((x - x_mean) * (y - y_mean) for x, y in zip(xs, values)) / denominator
    intercept = y_mean - slope * x_mean
    return slope, intercept


def detect_anomalies(history, noise_level):
    anomalies = []
    window = max(3, min(7, len(history)))
    if len(history) < window or not noise_level:
        return anomalies

    values = [item["value"] for item in history]
    for idx, value in enumerate(values):
        window_start = max(0, idx - window + 1)
        window_slice = values[window_start : idx + 1]
        baseline = mean(window_slice)
        deviation = value - baseline
        score = deviation / noise_level if noise_level else 0.0
        severity = "high" if abs(score) > 2.5 else ("warning" if abs(score) > 1.5 else "info")
        if abs(score) > 1.5:
            anomalies.append(
                {
                    "date": history[idx]["date"].isoformat(),
                    "value": value,
                    "score": score,
                    "severity": severity,
                    "description": "Beklenen trend dışı hareket",
                }
            )
    return anomalies


def build_forecast(history, horizon, seasonality):
    if not history:
        today = datetime.utcnow().date()
        fallback = [
            {
                "date": (today + timedelta(days=day + 1)).isoformat(),
                "value": 0.0,
                "lower": -1000.0,
                "upper": 1000.0,
            }
            for day in range(horizon)
        ]
        return fallback, 500.0, 0.0

    values = [item["value"] for item in history]
    slope, intercept = compute_trend(values)
    base_std = pstdev(values) if len(values) > 1 else abs(values[-1]) * 0.1 or 1.0
    noise_level = base_std or (abs(mean(values)) * 0.15) or 1.0

    seasonality = max(1, seasonality)
    last_date = history[-1]["date"]
    forecasts = []

    for step in range(1, horizon + 1):
        x = len(values) + step - 1
        baseline = intercept + slope * x
        if len(values) >= seasonality:
            seasonal_component = values[-seasonality + (step - 1) % seasonality]
            baseline = 0.6 * baseline + 0.4 * seasonal_component

        interval = 1.28 * noise_level
        forecasts.append(
            {
                "date": (last_date + timedelta(days=step)).isoformat(),
                "value": baseline,
                "lower": baseline - interval,
                "upper": baseline + interval,
            }
        )

    return forecasts, noise_level, slope


def main():
    payload = load_payload()
    horizon = int(payload.get("horizon", 14) or 14)
    seasonality = int(payload.get("seasonality", 7) or 7)

    series = parse_series(payload)
    history = [{"date": item["date"], "value": item["value"]} for item in series]

    forecast_points, noise_level, slope = build_forecast(history, horizon, seasonality)
    anomalies = detect_anomalies(history, noise_level)

    stats = {
        "mean": mean([item["value"] for item in history]) if history else 0.0,
        "stdDeviation": noise_level,
        "trendSlope": slope,
        "volatilityIndex": (noise_level / abs(history[-1]["value"]) if history and history[-1]["value"] else 0.0),
        "latestValue": history[-1]["value"] if history else 0.0,
    }

    response = {
        "baseline": forecast_points,
        "history": [
            {"date": item["date"].isoformat(), "value": item["value"]}
            for item in history
        ],
        "stats": stats,
        "anomalies": anomalies,
    }

    sys.stdout.write(json.dumps(response))


if __name__ == "__main__":
    main()
