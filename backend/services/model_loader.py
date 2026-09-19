"""
Singleton Model Loader: Loads all 8 trained models, scalers, and configurations
once into server memory during startup.
"""

import os
import json
import pickle

MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "models"))

class ModelRegistry:
    _instance = None
    
    def __init__(self):
        self.kmeans = None
        self.dbscan_cores = None
        self.hdbscan_info = None
        self.isolation_forest = None
        self.one_class_svm = None
        self.autoencoder = None
        self.graph_anchors = None
        self.gan_generator = None
        self.gan_discriminator = None
        self.scaler = None
        self.score_scalers = None
        self.config = None
        self.is_loaded = False

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
            cls._instance.load_all_models()
        return cls._instance

    def load_all_models(self):
        if self.is_loaded:
            return

        print(f"[MODEL_LOADER] Loading trained models from: {MODELS_DIR}")
        
        # Load scaler & config
        with open(os.path.join(MODELS_DIR, "scaler.pkl"), "rb") as f:
            self.scaler = pickle.load(f)

        with open(os.path.join(MODELS_DIR, "score_scalers.pkl"), "rb") as f:
            self.score_scalers = pickle.load(f)

        with open(os.path.join(MODELS_DIR, "ensemble_config.json"), "r") as f:
            self.config = json.load(f)

        # 1. K-Means
        with open(os.path.join(MODELS_DIR, "kmeans.pkl"), "rb") as f:
            self.kmeans = pickle.load(f)

        # 2. DBSCAN
        with open(os.path.join(MODELS_DIR, "dbscan.pkl"), "rb") as f:
            self.dbscan_cores = pickle.load(f)["cores"]

        # 3. HDBSCAN
        with open(os.path.join(MODELS_DIR, "hdbscan.pkl"), "rb") as f:
            self.hdbscan_info = pickle.load(f)

        # 4. Isolation Forest
        with open(os.path.join(MODELS_DIR, "isolation_forest.pkl"), "rb") as f:
            self.isolation_forest = pickle.load(f)

        # 5. One-Class SVM
        with open(os.path.join(MODELS_DIR, "one_class_svm.pkl"), "rb") as f:
            self.one_class_svm = pickle.load(f)

        # 6. Autoencoder
        with open(os.path.join(MODELS_DIR, "autoencoder.pkl"), "rb") as f:
            self.autoencoder = pickle.load(f)

        # 7. Graph Model Anchors
        with open(os.path.join(MODELS_DIR, "graph_model.pkl"), "rb") as f:
            self.graph_anchors = pickle.load(f)["anchors"]

        # 8. GAN (AnoGAN)
        with open(os.path.join(MODELS_DIR, "gan_generator.pkl"), "rb") as f:
            self.gan_generator = pickle.load(f)
        with open(os.path.join(MODELS_DIR, "gan_discriminator.pkl"), "rb") as f:
            self.gan_discriminator = pickle.load(f)

        self.is_loaded = True
        print("[MODEL_LOADER] Successfully loaded all 8 models into application memory.")
