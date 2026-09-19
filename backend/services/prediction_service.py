"""
Prediction Orchestration Service: Coordinates end-to-end inference,
ensemble calculation, response synthesis, explainability decomposition,
and database history storage.
"""

from datetime import datetime
from schemas.prediction_schema import AccountFeatureInput, PredictionResponse, ModelScores, FeatureAttribution
from services.preprocessing import preprocess_features
from services.anomaly_service import compute_raw_anomaly_scores
from services.ensemble_service import calibrate_and_ensemble
from services.response_service import generate_automated_response
from services.explainability_service import explain_prediction
from database import insert_prediction

def process_account_prediction(input_data: AccountFeatureInput) -> PredictionResponse:
    """
    Executes the full prediction workflow including feature attribution explainability.
    """
    # 1. Preprocess
    scaled_vector = preprocess_features(input_data)

    # 2. Raw Anomaly Inference
    raw_scores = compute_raw_anomaly_scores(scaled_vector)

    # 3. Calibrate & Ensemble
    calib = calibrate_and_ensemble(raw_scores)

    # 4. Automated Response
    response_data = generate_automated_response(
        severity=calib["severity"],
        ensemble_score=calib["ensemble_score"],
        model_scores=calib["model_scores"]
    )

    # 5. Explainability & Feature Attribution (XAI)
    raw_dict = input_data.model_dump()
    explanations = explain_prediction(
        raw_features_dict=raw_dict,
        ensemble_score=calib["ensemble_score"],
        severity=calib["severity"]
    )

    account_id = input_data.account_id or "0x" + "a"*40
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    # 6. Persist to SQLite History
    history_record = {
        "account_id": account_id,
        "timestamp": now_str,
        "ensemble_score": calib["ensemble_score"],
        "threshold": calib["threshold"],
        "prediction": calib["prediction"],
        "severity": calib["severity"],
        "confidence": calib["confidence"],
        "model_scores": calib["model_scores"],
        "recommended_action": response_data["recommended_action"],
        "action_reason": response_data["reason"],
        "response_status": response_data["status"]
    }
    insert_prediction(history_record)

    # 7. Format Final Response
    return PredictionResponse(
        account_id=account_id,
        prediction=calib["prediction"],
        ensemble_score=calib["ensemble_score"],
        threshold=calib["threshold"],
        severity=calib["severity"],
        confidence=calib["confidence"],
        model_scores=ModelScores(**calib["model_scores"]),
        feature_attributions=[FeatureAttribution(**e) for e in explanations],
        recommended_action=response_data["recommended_action"],
        message=response_data["message"],
        timestamp=now_str
    )
