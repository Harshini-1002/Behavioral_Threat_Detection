"""
Load generated Ethereum transaction datasets into local MongoDB
"""

import os
import pandas as pd
from pymongo import MongoClient

def load_datasets():
    client = MongoClient("mongodb://localhost:27017/")
    db = client["behavioral_threat_detection"]

    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 1. Exact fields dataset
    exact_csv = os.path.join(base_dir, "transactions_exact_fields.csv")
    if os.path.exists(exact_csv):
        df_exact = pd.read_csv(exact_csv)
        coll_exact = db["transactions_exact_fields"]
        coll_exact.delete_many({}) # refresh
        coll_exact.insert_many(df_exact.to_dict(orient="records"))
        print(f"Loaded {len(df_exact)} documents into 'transactions_exact_fields'")

    # 2. Raw transactions dataset
    raw_csv = os.path.join(base_dir, "raw_transactions_dataset.csv")
    if os.path.exists(raw_csv):
        df_raw = pd.read_csv(raw_csv)
        coll_raw = db["raw_transactions"]
        coll_raw.delete_many({})
        coll_raw.insert_many(df_raw.to_dict(orient="records"))
        print(f"Loaded {len(df_raw)} documents into 'raw_transactions'")

    # 3. Benchmark accounts dataset
    sample_csv = os.path.join(base_dir, "sample_ethereum_dataset.csv")
    if os.path.exists(sample_csv):
        df_sample = pd.read_csv(sample_csv)
        coll_bench = db["benchmark_accounts"]
        coll_bench.delete_many({})
        coll_bench.insert_many(df_sample.to_dict(orient="records"))
        print(f"Loaded {len(df_sample)} documents into 'benchmark_accounts'")

    print("MongoDB Collections in 'behavioral_threat_detection':", db.list_collection_names())

if __name__ == "__main__":
    load_datasets()
