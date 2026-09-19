"""
Preprocessing service: Converts input payload into correctly ordered
feature vectors and applies the saved RobustScaler.
"""

import numpy as np
import pandas as pd
from schemas.prediction_schema import AccountFeatureInput
from services.model_loader import ModelRegistry

def preprocess_features(input_data: AccountFeatureInput) -> np.ndarray:
    """
    Extracts features in exact sequence expected by models and applies saved RobustScaler.
    """
    registry = ModelRegistry.get_instance()
    feature_list = registry.config["features"]

    # Extract dictionary values matching saved feature columns
    raw_dict = input_data.model_dump()
    raw_vector = [raw_dict[col] for col in feature_list]
    
    # DataFrame with feature names for scaler
    raw_df = pd.DataFrame([raw_vector], columns=feature_list)
    
    # Transform via saved RobustScaler
    scaled_array = registry.scaler.transform(raw_df)
    return scaled_array
