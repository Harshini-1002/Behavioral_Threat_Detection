"""
Batch Dataset Ingestion & Anomaly Inference Service.
Processes multi-account transaction datasets, standardizes schema variations,
aggregates raw transaction logs (account no, tx id, timestamp, sent/rec amount, duration),
executes vectorized 8-model anomaly inference, calculates weighted ensemble scores,
and computes aggregated risk analytics and ground-truth metrics.
"""

import io
import re
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional
from sklearn.metrics.pairwise import cosine_similarity
from scipy.spatial.distance import cdist
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from services.model_loader import ModelRegistry

# Canonical 16 behavioral features
FEATURE_COLUMNS = [
    'Avg_min_between_sent',
    'Avg_min_between_rec',
    'Active_Span_Mins',
    'Sent_tnx',
    'Received_tnx',
    'Created_Contracts',
    'Uniq_Rec_Addr',
    'Uniq_Sent_Addr',
    'Avg_Val_Rec',
    'Avg_Val_Sent',
    'Total_ETH_Rec',
    'Total_ETH_Sent',
    'Ether_Balance',
    'Total_ERC20_tnx',
    'ERC20_Total_Rec',
    'ERC20_Total_Sent'
]

# Baseline medians derived from normal behavioral profiles
NORMAL_BASELINE_MEDIANS = {
    'Avg_min_between_sent': 2500.0,
    'Avg_min_between_rec': 2000.0,
    'Active_Span_Mins': 250000.0,
    'Sent_tnx': 45.0,
    'Received_tnx': 55.0,
    'Created_Contracts': 0.0,
    'Uniq_Rec_Addr': 25.0,
    'Uniq_Sent_Addr': 20.0,
    'Avg_Val_Rec': 1.5,
    'Avg_Val_Sent': 1.2,
    'Total_ETH_Rec': 50.0,
    'Total_ETH_Sent': 45.0,
    'Ether_Balance': 5.0,
    'Total_ERC20_tnx': 25.0,
    'ERC20_Total_Rec': 1500.0,
    'ERC20_Total_Sent': 1200.0
}

COLUMN_ALIASES = {
    'avg_min_between_sent': 'Avg_min_between_sent',
    'avg min between sent tnx': 'Avg_min_between_sent',
    'avg_min_between_sent_tnx': 'Avg_min_between_sent',
    'avg min between sent': 'Avg_min_between_sent',
    
    'avg_min_between_rec': 'Avg_min_between_rec',
    'avg min between received tnx': 'Avg_min_between_rec',
    'avg_min_between_received_tnx': 'Avg_min_between_rec',
    'avg min between rec': 'Avg_min_between_rec',
    
    'active_span_mins': 'Active_Span_Mins',
    'time diff between first and last (mins)': 'Active_Span_Mins',
    'time_diff_between_first_and_last_(mins)': 'Active_Span_Mins',
    'lifespan_mins': 'Active_Span_Mins',
    
    'sent_tnx': 'Sent_tnx',
    'sent tnx': 'Sent_tnx',
    'sent_tx': 'Sent_tnx',
    
    'received_tnx': 'Received_tnx',
    'received tnx': 'Received_tnx',
    'rec_tnx': 'Received_tnx',
    'received_tx': 'Received_tnx',
    
    'created_contracts': 'Created_Contracts',
    'number of created contracts': 'Created_Contracts',
    'number_of_created_contracts': 'Created_Contracts',
    
    'uniq_rec_addr': 'Uniq_Rec_Addr',
    'unique received from addresses': 'Uniq_Rec_Addr',
    'unique_received_from_addresses': 'Uniq_Rec_Addr',
    'uniq_rec_addresses': 'Uniq_Rec_Addr',
    
    'uniq_sent_addr': 'Uniq_Sent_Addr',
    'unique sent to addresses': 'Uniq_Sent_Addr',
    'unique_sent_to_addresses': 'Uniq_Sent_Addr',
    'uniq_sent_addresses': 'Uniq_Sent_Addr',
    
    'avg_val_rec': 'Avg_Val_Rec',
    'avg val received': 'Avg_Val_Rec',
    'avg_val_received': 'Avg_Val_Rec',
    'min val received': 'Avg_Val_Rec',
    
    'avg_val_sent': 'Avg_Val_Sent',
    'avg val sent': 'Avg_Val_Sent',
    'min val sent': 'Avg_Val_Sent',
    
    'total_eth_rec': 'Total_ETH_Rec',
    'total ether received': 'Total_ETH_Rec',
    'total_ether_received': 'Total_ETH_Rec',
    'total_rec': 'Total_ETH_Rec',
    
    'total_eth_sent': 'Total_ETH_Sent',
    'total ether sent': 'Total_ETH_Sent',
    'total_ether_sent': 'Total_ETH_Sent',
    'total_sent': 'Total_ETH_Sent',
    
    'ether_balance': 'Ether_Balance',
    'total ether balance': 'Ether_Balance',
    'total_ether_balance': 'Ether_Balance',
    'balance': 'Ether_Balance',
    
    'total_erc20_tnx': 'Total_ERC20_tnx',
    'total erc20 tnxs': 'Total_ERC20_tnx',
    'total_erc20_tnxs': 'Total_ERC20_tnx',
    'erc20_total_tx': 'Total_ERC20_tnx',
    
    'erc20_total_rec': 'ERC20_Total_Rec',
    'erc20 total ether received': 'ERC20_Total_Rec',
    'erc20_total_ether_received': 'ERC20_Total_Rec',
    
    'erc20_total_sent': 'ERC20_Total_Sent',
    'erc20 total ether sent': 'ERC20_Total_Sent',
    'erc20_total_ether_sent': 'ERC20_Total_Sent'
}

def clean_col_name(c: str) -> str:
    s = str(c).strip().lower()
    s = re.sub(r'\s+', ' ', s)
    return s

def aggregate_raw_transactions(df_renamed: pd.DataFrame, account_col: str, time_col: str, sent_col: Optional[str], rec_col: Optional[str], counterparty_col: Optional[str], ground_truth_col: Optional[str]):
    """
    Transforms raw transaction-level records (account no, tx id, timestamp, sent/rec amount, duration)
    into aggregated 16 behavioral feature profiles per unique account address.
    """
    df_renamed['parsed_time'] = pd.to_datetime(df_renamed[time_col], errors='coerce')
    # Filter out NaT timestamps if any, otherwise preserve
    df_renamed = df_renamed.sort_values(by=['parsed_time'])
    
    accounts = []
    features_list = []
    ground_truths = []
    has_gt = ground_truth_col is not None and ground_truth_col in df_renamed.columns
    
    for acc, group in df_renamed.groupby(account_col, sort=False):
        accounts.append(str(acc))
        
        sent_vals = pd.to_numeric(group[sent_col], errors='coerce').fillna(0.0) if sent_col else pd.Series(0.0, index=group.index)
        rec_vals = pd.to_numeric(group[rec_col], errors='coerce').fillna(0.0) if rec_col else pd.Series(0.0, index=group.index)
        
        sent_mask = sent_vals > 0.0
        rec_mask = rec_vals > 0.0
        
        sent_count = int(sent_mask.sum())
        rec_count = int(rec_mask.sum())
        
        tot_sent = float(sent_vals.sum())
        tot_rec = float(rec_vals.sum())
        
        # Temporal velocity: minutes between sent / received
        sent_times = group.loc[sent_mask, 'parsed_time'].dropna()
        if len(sent_times) > 1:
            diffs_sent = sent_times.diff().dt.total_seconds() / 60.0
            avg_min_sent = float(diffs_sent.dropna().mean())
        else:
            avg_min_sent = 2500.0
            
        rec_times = group.loc[rec_mask, 'parsed_time'].dropna()
        if len(rec_times) > 1:
            diffs_rec = rec_times.diff().dt.total_seconds() / 60.0
            avg_min_rec = float(diffs_rec.dropna().mean())
        else:
            avg_min_rec = 2000.0
            
        all_times = group['parsed_time'].dropna()
        if len(all_times) > 1:
            span_mins = float((all_times.max() - all_times.min()).total_seconds() / 60.0)
            span_mins = max(1.0, span_mins)
        else:
            span_mins = 50000.0
            
        # Counterparty dispersion
        if counterparty_col and counterparty_col in group.columns:
            uniq_rec = int(group.loc[rec_mask, counterparty_col].nunique())
            uniq_sent = int(group.loc[sent_mask, counterparty_col].nunique())
        else:
            uniq_rec = max(1, rec_count // 2)
            uniq_sent = max(1, sent_count // 2)
            
        uniq_rec = max(1, uniq_rec)
        uniq_sent = max(1, uniq_sent)
        
        avg_val_sent = tot_sent / max(1, sent_count)
        avg_val_rec = tot_rec / max(1, rec_count)
        balance = max(0.001, tot_rec - tot_sent)
        
        created_contracts = 0.0
        if 'created_contracts' in group.columns:
            created_contracts = float(pd.to_numeric(group['created_contracts'], errors='coerce').fillna(0).max())
            
        if has_gt:
            gt_val = int(pd.to_numeric(group[ground_truth_col], errors='coerce').fillna(0).max())
            ground_truths.append(gt_val)
            
        features_list.append({
            'Avg_min_between_sent': avg_min_sent,
            'Avg_min_between_rec': avg_min_rec,
            'Active_Span_Mins': span_mins,
            'Sent_tnx': float(max(1, sent_count)),
            'Received_tnx': float(max(1, rec_count)),
            'Created_Contracts': created_contracts,
            'Uniq_Rec_Addr': float(uniq_rec),
            'Uniq_Sent_Addr': float(uniq_sent),
            'Avg_Val_Rec': float(avg_val_rec),
            'Avg_Val_Sent': float(avg_val_sent),
            'Total_ETH_Rec': float(tot_rec),
            'Total_ETH_Sent': float(tot_sent),
            'Ether_Balance': float(balance),
            'Total_ERC20_tnx': float(group['transaction type'].str.contains('TOKEN|ERC20', case=False, na=False).sum() if 'transaction type' in group.columns else 0.0),
            'ERC20_Total_Rec': 0.0,
            'ERC20_Total_Sent': 0.0
        })
        
    feat_df = pd.DataFrame(features_list, columns=FEATURE_COLUMNS)
    gt_series = pd.Series(ground_truths) if has_gt else None
    return feat_df, gt_series, accounts

def standardize_dataframe(df: pd.DataFrame):
    """
    Standardizes dataset headers, detects raw transaction ledger logs vs. pre-aggregated accounts,
    and extracts or aggregates 16 behavioral features.
    """
    normalized_cols = {col: clean_col_name(col) for col in df.columns}
    df_renamed = df.rename(columns=normalized_cols)
    
    # Check for Account ID / Address column
    account_col = None
    for cand in ['account no', 'account_no', 'account_id', 'address', 'account', 'id', 'account address', 'wallet']:
        if cand in df_renamed.columns:
            account_col = cand
            break

    # Check for Raw Transaction Ledger markers (time stamp, sent amount, received amount)
    time_col = None
    for tc in ['time stamp', 'timestamp', 'time', 'date', 'datetime', 'time_stamp']:
        if tc in df_renamed.columns:
            time_col = tc
            break
            
    sent_col = None
    for sc in ['sent amount', 'sent_amount', 'sent_eth', 'amount sent', 'amount_sent']:
        if sc in df_renamed.columns:
            sent_col = sc
            break
            
    rec_col = None
    for rc in ['recieved amount', 'received amount', 'recieved_amount', 'received_amount', 'received_eth', 'amount received']:
        if rc in df_renamed.columns:
            rec_col = rc
            break

    counterparty_col = None
    for cc in ['counterparty address', 'counterparty_address', 'counterparty', 'to', 'from', 'target']:
        if cc in df_renamed.columns:
            counterparty_col = cc
            break

    # Check for Ground Truth FLAG / Label
    ground_truth_col = None
    for label_cand in ['is_abnormal_label', 'flag', 'is_fraud', 'label', 'target', 'is_attack', 'is_abnormal']:
        if label_cand in df_renamed.columns:
            ground_truth_col = label_cand
            break

    # -------------------------------------------------------------
    # Case A: RAW TRANSACTION LEDGER DATASET -> AGGREGATE TO PROFILES
    # -------------------------------------------------------------
    if account_col and time_col and (sent_col or rec_col):
        return aggregate_raw_transactions(
            df_renamed,
            account_col=account_col,
            time_col=time_col,
            sent_col=sent_col,
            rec_col=rec_col,
            counterparty_col=counterparty_col,
            ground_truth_col=ground_truth_col
        )

    # -------------------------------------------------------------
    # Case B: PRE-AGGREGATED 16-FEATURE DATASET
    # -------------------------------------------------------------
    if account_col is not None:
        account_ids = df_renamed[account_col].astype(str).tolist()
    else:
        account_ids = [f"0x{i:04x}_{abs(hash(str(row))) % 0xFFFFFF:06x}" for i, row in enumerate(df_renamed.to_dict(orient='records'))]
        
    ground_truth = None
    if ground_truth_col:
        ground_truth = pd.to_numeric(df_renamed[ground_truth_col], errors='coerce').fillna(0).astype(int)

    feature_mapping = {}
    for col in df_renamed.columns:
        c_clean = clean_col_name(col)
        if c_clean in COLUMN_ALIASES:
            feature_mapping[col] = COLUMN_ALIASES[c_clean]
        elif col in FEATURE_COLUMNS:
            feature_mapping[col] = col

    mapped_df = df_renamed.rename(columns=feature_mapping)
    
    clean_data = {}
    for feat in FEATURE_COLUMNS:
        if feat in mapped_df.columns:
            clean_data[feat] = pd.to_numeric(mapped_df[feat], errors='coerce').fillna(NORMAL_BASELINE_MEDIANS[feat])
        else:
            clean_data[feat] = np.full(len(df), NORMAL_BASELINE_MEDIANS[feat])
            
    clean_features_df = pd.DataFrame(clean_data, columns=FEATURE_COLUMNS)
    return clean_features_df, ground_truth, account_ids

def run_batch_inference(features_df: pd.DataFrame, account_ids: List[str], ground_truth: Optional[pd.Series] = None) -> Dict[str, Any]:
    """
    Executes vectorized multi-model evaluation across all rows without retraining.
    """
    reg = ModelRegistry.get_instance()
    n_samples = len(features_df)
    
    if n_samples == 0:
        raise ValueError("Dataset contains 0 valid transaction records.")
        
    # 1. Robust Scaling using fitted scaler
    X_scaled = reg.scaler.transform(features_df)
    
    # 2. Vectorized Anomaly Scoring across all 8 models
    # K-Means
    kmeans_raw = reg.kmeans.transform(X_scaled).min(axis=1)
    
    # DBSCAN
    dbscan_raw = np.min(cdist(X_scaled, reg.dbscan_cores, metric='euclidean'), axis=1)
    
    # HDBSCAN
    h_info = reg.hdbscan_info
    anchors = h_info["anchors"]
    core_dists = h_info["core_dists"]
    k = h_info["k"]
    dists_query = cdist(X_scaled, anchors, metric='euclidean')
    query_core = np.sort(dists_query, axis=1)[:, min(k, dists_query.shape[1]-1)]
    mreach = np.maximum(dists_query, np.maximum(query_core[:, None], core_dists[None, :]))
    hdbscan_raw = np.mean(np.sort(mreach, axis=1)[:, :k], axis=1)
    
    # Isolation Forest
    iso_raw = -reg.isolation_forest.decision_function(X_scaled)
    
    # One-Class SVM
    ocsvm_raw = -reg.one_class_svm.decision_function(X_scaled)
    
    # Autoencoder
    recon = reg.autoencoder.predict(X_scaled)
    autoencoder_raw = np.mean(np.square(X_scaled - recon), axis=1)
    
    # GAN
    disc_prob = reg.gan_discriminator.predict_proba(X_scaled)[:, 1]
    gan_raw = 1.0 - disc_prob
    
    # Graph Model
    sims = cosine_similarity(X_scaled, reg.graph_anchors)
    top_sim = np.sort(sims, axis=1)[:, -10:]
    graph_raw = 1.0 - np.mean(top_sim, axis=1)
    
    # 3. Score Normalization via calibrated score scalers
    raw_dict = {
        "kmeans": kmeans_raw,
        "dbscan": dbscan_raw,
        "hdbscan": hdbscan_raw,
        "isolation_forest": iso_raw,
        "one_class_svm": ocsvm_raw,
        "autoencoder": autoencoder_raw,
        "gan": gan_raw,
        "graph": graph_raw
    }
    
    norm_dict = {}
    for m, raw_vals in raw_dict.items():
        scaler_m = reg.score_scalers.get(m)
        if scaler_m:
            scaled_m = scaler_m.transform(raw_vals.reshape(-1, 1)).flatten()
            norm_dict[m] = np.clip(scaled_m, 0.0, 1.0)
        else:
            norm_dict[m] = np.clip(raw_vals, 0.0, 1.0)
            
    # 4. Weighted Ensemble Aggregation
    weights = reg.config.get("weights", {})
    threshold = reg.config.get("threshold", 0.4199)
    
    ensemble_scores = np.zeros(n_samples)
    for m, w in weights.items():
        if m in norm_dict:
            ensemble_scores += w * norm_dict[m]
            
    ensemble_scores = np.round(ensemble_scores, 4)
    predictions = np.where(ensemble_scores >= threshold, "THREAT", "NORMAL")
    
    # 5. Severity Assignment & Actions
    severities = []
    actions = []
    for s in ensemble_scores:
        if s >= 0.70:
            severities.append("HIGH")
            actions.append("FLAG_ACCOUNT")
        elif s >= threshold:
            severities.append("MEDIUM")
            actions.append("MONITOR_ACCOUNT")
        elif s >= 0.35:
            severities.append("LOW")
            actions.append("LOG_ACTIVITY")
        else:
            severities.append("NORMAL")
            actions.append("ALLOW_TRANSACTION")
            
    # 6. Feature Attribution / Top Anomaly Driver Identification
    feature_matrix = features_df.values
    baseline_vector = np.array([NORMAL_BASELINE_MEDIANS[f] for f in FEATURE_COLUMNS])
    rel_deviations = np.abs(feature_matrix - baseline_vector) / (baseline_vector + 1e-4)
    top_driver_indices = np.argmax(rel_deviations, axis=1)
    
    FEATURE_FRIENDLY_NAMES = {
        'Avg_min_between_sent': 'Rapid Sent Burst Frequency',
        'Avg_min_between_rec': 'Received Transfer Rate',
        'Active_Span_Mins': 'Short Account Lifespan',
        'Sent_tnx': 'Abnormal Sent Tx Count',
        'Received_tnx': 'High Deposit Volume',
        'Created_Contracts': 'Contract Creation Anomaly',
        'Uniq_Rec_Addr': 'Disproportionate Receiver Fan-In',
        'Uniq_Sent_Addr': 'Disproportionate Sender Fan-Out',
        'Avg_Val_Rec': 'High Value Inflow',
        'Avg_Val_Sent': 'High Value Outflow',
        'Total_ETH_Rec': 'Abnormal Cumulative Ether Received',
        'Total_ETH_Sent': 'Abnormal Cumulative Ether Drained',
        'Ether_Balance': 'Zeroed / Abnormal Balance',
        'Total_ERC20_tnx': 'Excessive Token Interactions',
        'ERC20_Total_Rec': 'Massive Token Inflow',
        'ERC20_Total_Sent': 'Massive Token Outflow'
    }
    
    top_drivers = [FEATURE_FRIENDLY_NAMES[FEATURE_COLUMNS[idx]] for idx in top_driver_indices]
    
    # 7. Aggregate Summary Statistics
    threat_count = int(np.sum(predictions == "THREAT"))
    normal_count = n_samples - threat_count
    threat_pct = round((threat_count / n_samples) * 100, 2)
    avg_score = round(float(np.mean(ensemble_scores)), 4)
    
    severity_counts = {
        "HIGH": int(np.sum(np.array(severities) == "HIGH")),
        "MEDIUM": int(np.sum(np.array(severities) == "MEDIUM")),
        "LOW": int(np.sum(np.array(severities) == "LOW")),
        "NORMAL": int(np.sum(np.array(severities) == "NORMAL"))
    }
    
    threat_driver_counts = {}
    for i, pred in enumerate(predictions):
        if pred == "THREAT":
            d = top_drivers[i]
            threat_driver_counts[d] = threat_driver_counts.get(d, 0) + 1
            
    sorted_drivers = sorted(
        [{"driver": k, "count": v, "percentage": round((v / max(1, threat_count)) * 100, 1)} 
         for k, v in threat_driver_counts.items()],
        key=lambda x: x["count"],
        reverse=True
    )
    
    # 8. Ground-Truth Validation Metrics (if labels supplied)
    validation_metrics = None
    if ground_truth is not None and len(ground_truth) == n_samples:
        y_true = ground_truth.values
        y_pred = (predictions == "THREAT").astype(int)
        
        cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
        tn, fp, fn, tp = cm.ravel()
        
        acc = float(accuracy_score(y_true, y_pred))
        prec = float(precision_score(y_true, y_pred, zero_division=0))
        rec = float(recall_score(y_true, y_pred, zero_division=0))
        f1 = float(f1_score(y_true, y_pred, zero_division=0))
        
        validation_metrics = {
            "has_ground_truth": True,
            "accuracy": round(acc * 100, 2),
            "precision": round(prec * 100, 2),
            "recall": round(rec * 100, 2),
            "f1_score": round(f1 * 100, 2),
            "confusion_matrix": {
                "true_negatives": int(tn),
                "false_positives": int(fp),
                "false_negatives": int(fn),
                "true_positives": int(tp)
            }
        }
        
    # 9. Format individual record rows for UI
    records = []
    for i in range(n_samples):
        records.append({
            "id": i + 1,
            "account_id": account_ids[i],
            "ensemble_score": float(ensemble_scores[i]),
            "prediction": str(predictions[i]),
            "severity": str(severities[i]),
            "recommended_action": str(actions[i]),
            "top_driver": str(top_drivers[i]),
            "model_scores": {m: round(float(norm_dict[m][i]), 4) for m in norm_dict},
            "features": {feat: round(float(features_df.iloc[i][feat]), 4) for feat in FEATURE_COLUMNS}
        })
        
    bins = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0]
    hist, _ = np.histogram(ensemble_scores, bins=bins)
    score_distribution = [
        {"range": "0.0 - 0.2", "count": int(hist[0]), "status": "Low Risk"},
        {"range": "0.2 - 0.4", "count": int(hist[1]), "status": "Normal / Near-Threshold"},
        {"range": "0.4 - 0.6", "count": int(hist[2]), "status": "Suspicious (Medium)"},
        {"range": "0.6 - 0.8", "count": int(hist[3]), "status": "Elevated Threat"},
        {"range": "0.8 - 1.0", "count": int(hist[4]), "status": "Critical Threat (High)"}
    ]
    
    return {
        "summary": {
            "total_records": n_samples,
            "threat_count": threat_count,
            "normal_count": normal_count,
            "threat_percentage": threat_pct,
            "average_threat_score": avg_score,
            "calibrated_threshold": threshold,
            "severity_breakdown": severity_counts,
            "score_distribution": score_distribution,
            "top_drivers": sorted_drivers[:6],
            "validation_metrics": validation_metrics
        },
        "records": records
    }
