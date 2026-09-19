"""
Anomaly Inference Service: Runs the preprocessed vector against all 8 models.
"""

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from scipy.spatial.distance import cdist
from services.model_loader import ModelRegistry

def compute_raw_anomaly_scores(scaled_features: np.ndarray) -> dict:
    """
    Computes raw model scores across all 8 detection algorithms.
    """
    reg = ModelRegistry.get_instance()

    # 1. K-Means
    kmeans_score = float(reg.kmeans.transform(scaled_features).min(axis=1)[0])

    # 2. DBSCAN
    dbscan_score = float(np.min(cdist(scaled_features, reg.dbscan_cores, metric='euclidean'), axis=1)[0])

    # 3. HDBSCAN
    h_info = reg.hdbscan_info
    anchors = h_info["anchors"]
    core_dists = h_info["core_dists"]
    k = h_info["k"]
    dists_query = cdist(scaled_features, anchors, metric='euclidean')
    query_core = np.sort(dists_query, axis=1)[:, min(k, dists_query.shape[1]-1)]
    mreach = np.maximum(dists_query, np.maximum(query_core[:, None], core_dists[None, :]))
    hdbscan_score = float(np.mean(np.sort(mreach, axis=1)[:, :k], axis=1)[0])

    # 4. Isolation Forest
    iso_score = float(-reg.isolation_forest.decision_function(scaled_features)[0])

    # 5. One-Class SVM
    ocsvm_score = float(-reg.one_class_svm.decision_function(scaled_features)[0])

    # 6. Deep Autoencoder
    reconstructed = reg.autoencoder.predict(scaled_features)
    autoencoder_score = float(np.mean(np.square(scaled_features - reconstructed), axis=1)[0])

    # 7. GAN (AnoGAN)
    disc_prob = float(reg.gan_discriminator.predict_proba(scaled_features)[:, 1][0])
    gan_score = float(1.0 - disc_prob)

    # 8. Graph Affinity Model
    sims = cosine_similarity(scaled_features, reg.graph_anchors)
    top_sim = np.sort(sims, axis=1)[:, -10:]
    graph_score = float(1.0 - np.mean(top_sim, axis=1)[0])

    return {
        "kmeans": kmeans_score,
        "dbscan": dbscan_score,
        "hdbscan": hdbscan_score,
        "isolation_forest": iso_score,
        "one_class_svm": ocsvm_score,
        "autoencoder": autoencoder_score,
        "gan": gan_score,
        "graph": graph_score
    }
