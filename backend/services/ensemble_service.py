"""
Ensemble Service: Normalizes raw scores using saved MinMax scalers
and applies the calibrated weights and decision thresholds.
"""

import numpy as np
from services.model_loader import ModelRegistry

def calibrate_and_ensemble(raw_scores: dict) -> dict:
    """
    Normalizes all model scores to [0.0, 1.0] and computes the weighted composite score.
    """
    reg = ModelRegistry.get_instance()
    score_scalers = reg.score_scalers
    weights = reg.config["weights"]
    threshold = reg.config["threshold"]
    severity_cutoffs = reg.config["severity_cutoffs"]

    normalized_scores = {}
    ensemble_score = 0.0

    for model_name, raw_val in raw_scores.items():
        scaler = score_scalers.get(model_name)
        if scaler is not None:
            # Transform and clip to [0, 1]
            norm_val = float(scaler.transform(np.array([[raw_val]]))[0][0])
            norm_val = float(np.clip(norm_val, 0.0, 1.0))
        else:
            norm_val = float(np.clip(raw_val, 0.0, 1.0))

        normalized_scores[model_name] = round(norm_val, 4)
        w = weights.get(model_name, 0.0)
        ensemble_score += w * norm_val

    ensemble_score = round(float(np.clip(ensemble_score, 0.0, 1.0)), 4)
    
    # Classification based on calibrated threshold
    is_threat = bool(ensemble_score >= threshold)
    prediction = "THREAT" if is_threat else "NORMAL"

    # Severity Grading
    if ensemble_score < severity_cutoffs["low"]:
        severity = "NORMAL"
    elif ensemble_score < severity_cutoffs["medium"]:
        severity = "LOW"
    elif ensemble_score < severity_cutoffs["high"]:
        severity = "MEDIUM"
    else:
        severity = "HIGH"

    # Confidence calculation
    if is_threat:
        # Distance above threshold scaled towards 1.0
        confidence = round(float(0.70 + 0.30 * ((ensemble_score - threshold) / max(1.0 - threshold, 0.001))), 4)
    else:
        # Distance below threshold scaled towards 1.0
        confidence = round(float(0.70 + 0.30 * ((threshold - ensemble_score) / max(threshold, 0.001))), 4)

    confidence = min(confidence, 0.9999)

    return {
        "prediction": prediction,
        "ensemble_score": ensemble_score,
        "threshold": threshold,
        "severity": severity,
        "confidence": confidence,
        "model_scores": normalized_scores
    }
