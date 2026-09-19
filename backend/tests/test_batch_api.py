"""
Automated Backend Verification for Batch Dataset Analysis & Abnormal Transaction Detection.
"""

import os
import io
import sys
import pandas as pd

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.model_loader import ModelRegistry
from services.batch_service import standardize_dataframe, run_batch_inference

def test_batch_pipeline():
    print("=" * 70)
    print("RUNNING BATCH DATASET ANALYSIS VERIFICATION TESTS")
    print("=" * 70)

    # 1. Load Registry
    reg = ModelRegistry.get_instance()
    reg.load_all_models()
    assert reg.is_loaded, "Model registry failed to load."
    print("-> Model registry verified for batch processing.")

    # 2. Test Canonical CSV
    sample_path = os.path.join(os.path.dirname(__file__), "..", "sample_ethereum_dataset.csv")
    assert os.path.exists(sample_path), f"Sample CSV not found at {sample_path}"
    df = pd.read_csv(sample_path)
    print(f"-> Loaded sample dataset ({len(df)} rows, {len(df.columns)} columns).")

    # 3. Test Column Standardization
    features_df, ground_truth, account_ids = standardize_dataframe(df)
    assert len(features_df) == len(df), "Row count mismatch after standardization"
    assert len(features_df.columns) == 16, f"Expected 16 features, got {len(features_df.columns)}"
    assert ground_truth is not None, "Ground truth FLAG should be detected in sample dataset"
    print("-> Dataset column standardization and mapping verified.")

    # 4. Test Vectorized Batch Inference
    result = run_batch_inference(features_df, account_ids, ground_truth)
    summary = result["summary"]
    records = result["records"]

    assert summary["total_records"] == 100, f"Expected 100 records, got {summary['total_records']}"
    assert summary["threat_count"] > 0, "Expected threats to be detected"
    assert len(records) == 100, "Expected 100 formatted records"
    assert "score_distribution" in summary, "Score distribution missing"
    assert "top_drivers" in summary, "Top drivers missing"
    assert summary["validation_metrics"] is not None, "Validation metrics should be calculated"

    print(f"-> Inference complete: {summary['total_records']} accounts evaluated.")
    print(f"   Threats Identified: {summary['threat_count']} ({summary['threat_percentage']}%)")
    print(f"   Normal Accounts: {summary['normal_count']}")
    print(f"   Mean Threat Score: {summary['average_threat_score']}")
    print(f"   Recall: {summary['validation_metrics']['recall']}% | Accuracy: {summary['validation_metrics']['accuracy']}%")
    print(f"   Top Anomaly Driver: {summary['top_drivers'][0]['driver']} ({summary['top_drivers'][0]['percentage']}%)")

    # 5. Test Missing Column Fallback Imputation
    sparse_df = pd.DataFrame({
        "Address": ["0xTestSparse1", "0xTestSparse2"],
        "Sent tnx": [5, 120],
        "total ether balance": [0.01, 25.0]
    })
    s_feat, _, s_ids = standardize_dataframe(sparse_df)
    assert len(s_feat.columns) == 16, "Missing columns were not imputed to 16 features"
    s_res = run_batch_inference(s_feat, s_ids)
    assert len(s_res["records"]) == 2, "Sparse records failed to evaluate"
    print("-> Graceful fallback imputation for partial/sparse datasets verified.")

    print("=" * 70)
    print("ALL BATCH DATASET ANALYSIS TESTS PASSED (100% SUCCESS)")
    print("=" * 70)

if __name__ == "__main__":
    test_batch_pipeline()
