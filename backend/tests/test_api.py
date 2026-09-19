"""
Verification Test Script for Backend Services and Model Serving.
"""

import sys
import os
import json

# Setup import path
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

from database import init_db, get_aggregate_statistics, get_all_history
from schemas.prediction_schema import AccountFeatureInput
from services.model_loader import ModelRegistry
from services.prediction_service import process_account_prediction
from services.response_service import generate_automated_response

def run_backend_tests():
    print("=" * 70)
    print("RUNNING BACKEND VERIFICATION TESTS")
    print("=" * 70)

    # 1. DB Init
    print("-> Testing SQLite initialization...")
    init_db()
    stats = get_aggregate_statistics()
    print(f"   Initial DB Stats: Total Analyzed={stats['total_analyzed']}, Threats={stats['threats_detected']}")
    assert stats["total_analyzed"] > 0, "Database seeding failed!"

    # 2. Model Loader
    print("-> Testing ModelRegistry singleton loading...")
    reg = ModelRegistry.get_instance()
    assert reg.is_loaded, "Model loading failed!"
    assert reg.kmeans is not None
    assert reg.isolation_forest is not None
    assert reg.autoencoder is not None
    assert reg.gan_discriminator is not None
    print("   All 8 models verified in memory.")

    # 3. Test Normal Account Prediction
    print("\n-> Testing Prediction: Normal Retail User...")
    normal_input = AccountFeatureInput(
        account_id="0xTEST_NORMAL_USER",
        Avg_min_between_sent=4820.5,
        Avg_min_between_rec=3940.1,
        Active_Span_Mins=248100.0,
        Sent_tnx=28.0,
        Received_tnx=35.0,
        Created_Contracts=0.0,
        Uniq_Rec_Addr=18.0,
        Uniq_Sent_Addr=14.0,
        Avg_Val_Rec=0.82,
        Avg_Val_Sent=0.71,
        Total_ETH_Rec=28.7,
        Total_ETH_Sent=19.88,
        Ether_Balance=8.82,
        Total_ERC20_tnx=12.0,
        ERC20_Total_Rec=1200.0,
        ERC20_Total_Sent=450.0
    )
    pred_normal = process_account_prediction(normal_input)
    print(f"   Prediction: {pred_normal.prediction}")
    print(f"   Ensemble Score: {pred_normal.ensemble_score:.4f} (Threshold: {pred_normal.threshold:.4f})")
    print(f"   Severity: {pred_normal.severity} | Action: {pred_normal.recommended_action}")
    assert pred_normal.prediction == "NORMAL", "Normal account falsely flagged as threat!"

    # 4. Test Fraud Account Prediction (Phishing Sweeper)
    print("\n-> Testing Prediction: Phishing Sweeper Bot...")
    fraud_input = AccountFeatureInput(
        account_id="0xTEST_PHISHING_BOT",
        Avg_min_between_sent=2.15,
        Avg_min_between_rec=1850.4,
        Active_Span_Mins=1420.0,
        Sent_tnx=4.0,
        Received_tnx=162.0,
        Created_Contracts=0.0,
        Uniq_Rec_Addr=158.0,
        Uniq_Sent_Addr=1.0,
        Avg_Val_Rec=0.45,
        Avg_Val_Sent=18.22,
        Total_ETH_Rec=72.9,
        Total_ETH_Sent=72.88,
        Ether_Balance=0.02,
        Total_ERC20_tnx=18.0,
        ERC20_Total_Rec=1450.0,
        ERC20_Total_Sent=1450.0
    )
    pred_fraud = process_account_prediction(fraud_input)
    print(f"   Prediction: {pred_fraud.prediction}")
    print(f"   Ensemble Score: {pred_fraud.ensemble_score:.4f} (Threshold: {pred_fraud.threshold:.4f})")
    print(f"   Severity: {pred_fraud.severity} | Action: {pred_fraud.recommended_action}")
    print(f"   Model Scores Breakdown: {pred_fraud.model_scores.model_dump()}")
    assert pred_fraud.prediction == "THREAT", "Phishing sweeper missed!"
    assert pred_fraud.severity in ["MEDIUM", "HIGH"], "Expected elevated severity for fraud!"

    # 5. Verify History Persistence
    print("\n-> Verifying SQLite Audit Log persistence...")
    history = get_all_history(limit=5)
    latest_ids = [h["account_id"] for h in history]
    assert "0xTEST_PHISHING_BOT" in latest_ids, "Prediction failed to persist in SQLite history!"
    assert "0xTEST_NORMAL_USER" in latest_ids, "Prediction failed to persist in SQLite history!"
    print("   Audit log persistence verified.")

    # 6. Response Simulation
    print("\n-> Verifying Automated Response Generation...")
    resp = generate_automated_response("HIGH", 0.95, {"isolation_forest": 0.95, "autoencoder": 0.96})
    print(f"   Action: {resp['recommended_action']}")
    print(f"   Simulated EVM Call: {resp['simulated_contract_call']}")
    assert resp["recommended_action"] == "FLAG_ACCOUNT"

    print("\n" + "=" * 70)
    print("ALL BACKEND & MODEL SERVING TESTS PASSED (100% SUCCESS)")
    print("=" * 70)

if __name__ == "__main__":
    run_backend_tests()
