"""
SQLite Database Layer for Storing Threat Telemetry and Prediction History.
"""

import os
import sqlite3
import json
from datetime import datetime, timedelta
import random

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "threat_history.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS prediction_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        ensemble_score REAL NOT NULL,
        threshold REAL NOT NULL,
        prediction TEXT NOT NULL,
        severity TEXT NOT NULL,
        confidence REAL NOT NULL,
        model_scores TEXT NOT NULL,
        recommended_action TEXT NOT NULL,
        action_reason TEXT NOT NULL,
        response_status TEXT NOT NULL
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_account_id ON prediction_history(account_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON prediction_history(timestamp);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_severity ON prediction_history(severity);")
    conn.commit()

    # Seed initial realistic historical data if database is empty
    cursor.execute("SELECT COUNT(*) FROM prediction_history")
    count = cursor.fetchone()[0]
    if count == 0:
        seed_initial_history(cursor)
        conn.commit()

    conn.close()

def seed_initial_history(cursor):
    """
    Seeds initial realistic audit history representing benign users, suspicious bots,
    and intercepted exploits so the dashboard charts immediately display rich telemetry.
    """
    now = datetime.utcnow()
    records = [
        # Normal retail accounts
        ("0x71C...8491", now - timedelta(hours=14), 0.12, 0.42, "NORMAL", "NORMAL", 0.88, {
            "kmeans": 0.08, "dbscan": 0.11, "hdbscan": 0.09, "isolation_forest": 0.22,
            "one_class_svm": 0.05, "autoencoder": 0.02, "gan": 0.04, "graph": 0.15
        }, "ALLOW_TRANSACTION", "Behavior aligned with normal retail profile", "EXECUTED"),
        
        ("0x3f5...91bc", now - timedelta(hours=12), 0.24, 0.42, "NORMAL", "NORMAL", 0.76, {
            "kmeans": 0.15, "dbscan": 0.18, "hdbscan": 0.21, "isolation_forest": 0.31,
            "one_class_svm": 0.12, "autoencoder": 0.08, "gan": 0.10, "graph": 0.28
        }, "ALLOW_TRANSACTION", "Regular DeFi swap pattern detected", "EXECUTED"),

        ("0x8a2...c410", now - timedelta(hours=10), 0.35, 0.42, "NORMAL", "LOW", 0.65, {
            "kmeans": 0.28, "dbscan": 0.25, "hdbscan": 0.29, "isolation_forest": 0.45,
            "one_class_svm": 0.18, "autoencoder": 0.15, "gan": 0.19, "graph": 0.38
        }, "LOG_ACTIVITY", "Slight volume increase, within acceptable threshold", "LOGGED"),

        # Suspicious medium-risk account
        ("0x11b...45e0", now - timedelta(hours=7), 0.58, 0.42, "THREAT", "MEDIUM", 0.58, {
            "kmeans": 0.45, "dbscan": 0.52, "hdbscan": 0.61, "isolation_forest": 0.68,
            "one_class_svm": 0.55, "autoencoder": 0.48, "gan": 0.52, "graph": 0.64
        }, "MONITOR_ACCOUNT", "Sudden spike in unique recipient fan-out", "ACTIVE_MONITORING"),

        # High-risk phishing sweeper bot
        ("0xee4...192b", now - timedelta(hours=4), 0.94, 0.42, "THREAT", "HIGH", 0.94, {
            "kmeans": 0.88, "dbscan": 0.91, "hdbscan": 0.93, "isolation_forest": 0.97,
            "one_class_svm": 0.99, "autoencoder": 0.96, "gan": 0.98, "graph": 0.82
        }, "FLAG_ACCOUNT", "Phishing sweeper behavior: rapid fund drain with zero remaining balance", "RESTRICTION_SIMULATED"),

        # High-risk smart contract flash exploiter
        ("0x991...a4f2", now - timedelta(hours=2), 0.98, 0.42, "THREAT", "HIGH", 0.98, {
            "kmeans": 0.94, "dbscan": 0.96, "hdbscan": 0.98, "isolation_forest": 0.99,
            "one_class_svm": 1.00, "autoencoder": 0.99, "gan": 0.99, "graph": 0.89
        }, "SIMULATE_RESTRICTION", "Flash exploit signature: massive token volume and contract interaction spike", "CIRCUIT_BREAKER_TRIGGERED"),

        # Normal validator
        ("0x00a...3412", now - timedelta(minutes=45), 0.08, 0.42, "NORMAL", "NORMAL", 0.92, {
            "kmeans": 0.04, "dbscan": 0.05, "hdbscan": 0.06, "isolation_forest": 0.12,
            "one_class_svm": 0.02, "autoencoder": 0.01, "gan": 0.03, "graph": 0.10
        }, "ALLOW_TRANSACTION", "Consistent staking validator reward collection", "EXECUTED"),

        # Sybil airdrop farm bot
        ("0x44c...9811", now - timedelta(minutes=15), 0.89, 0.42, "THREAT", "HIGH", 0.89, {
            "kmeans": 0.82, "dbscan": 0.86, "hdbscan": 0.89, "isolation_forest": 0.92,
            "one_class_svm": 0.94, "autoencoder": 0.91, "gan": 0.93, "graph": 0.79
        }, "FLAG_ACCOUNT", "Repetitive scripted micro-transactions matching Sybil farm pattern", "FLAGGED")
    ]

    for acc, ts, score, th, pred, sev, conf, m_scores, act, reason, status in records:
        cursor.execute("""
        INSERT INTO prediction_history 
        (account_id, timestamp, ensemble_score, threshold, prediction, severity, confidence, model_scores, recommended_action, action_reason, response_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            acc,
            ts.strftime("%Y-%m-%d %H:%M:%S"),
            score,
            th,
            pred,
            sev,
            conf,
            json.dumps(m_scores),
            act,
            reason,
            status
        ))

def insert_prediction(data: dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO prediction_history 
    (account_id, timestamp, ensemble_score, threshold, prediction, severity, confidence, model_scores, recommended_action, action_reason, response_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data["account_id"],
        data["timestamp"],
        data["ensemble_score"],
        data["threshold"],
        data["prediction"],
        data["severity"],
        data["confidence"],
        json.dumps(data["model_scores"]),
        data["recommended_action"],
        data["action_reason"],
        data.get("response_status", "PENDING")
    ))
    record_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return record_id

def get_all_history(limit: int = 100):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM prediction_history ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    
    result = []
    for r in rows:
        d = dict(r)
        d["model_scores"] = json.loads(d["model_scores"])
        result.append(d)
    return result

def get_history_by_account(account_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM prediction_history WHERE account_id LIKE ? ORDER BY id DESC", (f"%{account_id}%",))
    rows = cursor.fetchall()
    conn.close()
    
    result = []
    for r in rows:
        d = dict(r)
        d["model_scores"] = json.loads(d["model_scores"])
        result.append(d)
    return result

def get_aggregate_statistics():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM prediction_history")
    total = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM prediction_history WHERE prediction = 'NORMAL'")
    normal = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM prediction_history WHERE prediction = 'THREAT'")
    threats = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM prediction_history WHERE severity = 'LOW'")
    low = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM prediction_history WHERE severity = 'MEDIUM'")
    medium = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM prediction_history WHERE severity = 'HIGH'")
    high = cursor.fetchone()[0]
    
    cursor.execute("SELECT AVG(ensemble_score) FROM prediction_history")
    avg_score = cursor.fetchone()[0] or 0.0

    cursor.execute("SELECT timestamp, ensemble_score, prediction, severity FROM prediction_history ORDER BY id ASC LIMIT 50")
    recent_activity = [dict(r) for r in cursor.fetchall()]

    conn.close()
    
    detection_rate = round((threats / total * 100), 2) if total > 0 else 0.0

    return {
        "total_analyzed": total,
        "normal_accounts": normal,
        "threats_detected": threats,
        "low_threats": low,
        "medium_threats": medium,
        "high_threats": high,
        "average_anomaly_score": round(avg_score, 4),
        "detection_rate": f"{detection_rate}%",
        "recent_activity": recent_activity
    }
