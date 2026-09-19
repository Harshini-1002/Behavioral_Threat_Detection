"""
Generate a realistic 100-account sample benchmark Ethereum dataset
with diverse normal profiles and sophisticated on-chain threat patterns.
"""

import os
import numpy as np
import pandas as pd

np.random.seed(42)

def generate_sample_csv():
    records = []
    
    # 1. Normal Retail Users (40 accounts)
    for i in range(40):
        addr = f"0x71{i:02x}{np.random.randint(1000, 9999)}a0b{np.random.randint(100000, 999999):06x}"
        records.append({
            "Address": addr,
            "Avg min between sent tnx": round(np.random.uniform(1000, 7000), 2),
            "Avg min between received tnx": round(np.random.uniform(800, 5000), 2),
            "Time Diff between first and last (Mins)": round(np.random.uniform(100000, 500000), 1),
            "Sent tnx": int(np.random.poisson(25) + 1),
            "Received tnx": int(np.random.poisson(35) + 1),
            "Number of Created Contracts": int(np.random.choice([0, 1], p=[0.95, 0.05])),
            "Unique Received From Addresses": int(np.random.randint(10, 30)),
            "Unique Sent To Addresses": int(np.random.randint(8, 25)),
            "min value received": 0.01,
            "max val sent": round(np.random.uniform(1.0, 5.0), 4),
            "avg val received": round(np.random.uniform(0.4, 2.0), 4),
            "avg val sent": round(np.random.uniform(0.3, 1.8), 4),
            "total ether received": round(np.random.uniform(10.0, 50.0), 2),
            "total Ether sent": round(np.random.uniform(8.0, 42.0), 2),
            "total ether balance": round(np.random.uniform(1.0, 15.0), 4),
            "Total ERC20 tnxs": int(np.random.randint(2, 20)),
            "ERC20 total Ether received": round(np.random.uniform(100, 2000), 2),
            "ERC20 total Ether sent": round(np.random.uniform(50, 1500), 2),
            "FLAG": 0
        })
        
    # 2. DeFi Traders & Stakers (20 accounts)
    for i in range(20):
        addr = f"0x3f{i:02x}{np.random.randint(1000, 9999)}d0e{np.random.randint(100000, 999999):06x}"
        records.append({
            "Address": addr,
            "Avg min between sent tnx": round(np.random.uniform(150, 600), 2),
            "Avg min between received tnx": round(np.random.uniform(200, 800), 2),
            "Time Diff between first and last (Mins)": round(np.random.uniform(120000, 400000), 1),
            "Sent tnx": int(np.random.randint(80, 250)),
            "Received tnx": int(np.random.randint(70, 200)),
            "Number of Created Contracts": 0,
            "Unique Received From Addresses": int(np.random.randint(20, 60)),
            "Unique Sent To Addresses": int(np.random.randint(25, 70)),
            "min value received": 0.05,
            "max val sent": round(np.random.uniform(5.0, 25.0), 4),
            "avg val received": round(np.random.uniform(1.5, 6.0), 4),
            "avg val sent": round(np.random.uniform(1.2, 5.5), 4),
            "total ether received": round(np.random.uniform(150.0, 600.0), 2),
            "total Ether sent": round(np.random.uniform(140.0, 580.0), 2),
            "total ether balance": round(np.random.uniform(10.0, 40.0), 4),
            "Total ERC20 tnxs": int(np.random.randint(40, 150)),
            "ERC20 total Ether received": round(np.random.uniform(10000, 80000), 2),
            "ERC20 total Ether sent": round(np.random.uniform(9000, 75000), 2),
            "FLAG": 0
        })

    # 3. Phishing Sweeper Bots (15 accounts - THREAT)
    for i in range(15):
        addr = f"0xEE{i:02x}{np.random.randint(1000, 9999)}a9b{np.random.randint(100000, 999999):06x}"
        records.append({
            "Address": addr,
            "Avg min between sent tnx": round(np.random.uniform(0.5, 3.0), 2), # Rapid sweeping
            "Avg min between received tnx": round(np.random.uniform(1200, 3000), 2),
            "Time Diff between first and last (Mins)": round(np.random.uniform(800, 3500), 1), # Short lifespan
            "Sent tnx": int(np.random.randint(3, 8)),
            "Received tnx": int(np.random.randint(80, 250)), # Many victims depositing
            "Number of Created Contracts": 0,
            "Unique Received From Addresses": int(np.random.randint(70, 230)), # Multi-victim fan-in
            "Unique Sent To Addresses": 1, # Swept to single master wallet
            "min value received": 0.01,
            "max val sent": round(np.random.uniform(20.0, 80.0), 4),
            "avg val received": round(np.random.uniform(0.2, 0.9), 4),
            "avg val sent": round(np.random.uniform(15.0, 60.0), 4),
            "total ether received": round(np.random.uniform(40.0, 180.0), 2),
            "total Ether sent": round(np.random.uniform(39.9, 179.9), 2),
            "total ether balance": round(np.random.uniform(0.001, 0.02), 4), # Zeroed balance
            "Total ERC20 tnxs": int(np.random.randint(10, 30)),
            "ERC20 total Ether received": round(np.random.uniform(1000, 5000), 2),
            "ERC20 total Ether sent": round(np.random.uniform(1000, 5000), 2),
            "FLAG": 1
        })

    # 4. Flash Loan Protocol Exploiters (10 accounts - CRITICAL THREAT)
    for i in range(10):
        addr = f"0x99{i:02x}{np.random.randint(1000, 9999)}c4f{np.random.randint(100000, 999999):06x}"
        records.append({
            "Address": addr,
            "Avg min between sent tnx": round(np.random.uniform(0.01, 0.2), 3), # Millisecond-level txs
            "Avg min between received tnx": round(np.random.uniform(0.01, 0.2), 3),
            "Time Diff between first and last (Mins)": round(np.random.uniform(5, 60), 1), # Under 1 hour
            "Sent tnx": int(np.random.randint(4, 12)),
            "Received tnx": int(np.random.randint(2, 6)),
            "Number of Created Contracts": int(np.random.randint(1, 4)),
            "Unique Received From Addresses": int(np.random.randint(1, 4)),
            "Unique Sent To Addresses": int(np.random.randint(1, 3)),
            "min value received": 10.0,
            "max val sent": round(np.random.uniform(5000, 20000), 2),
            "avg val received": round(np.random.uniform(3000, 12000), 2),
            "avg val sent": round(np.random.uniform(2900, 11900), 2),
            "total ether received": round(np.random.uniform(8000, 25000), 2),
            "total Ether sent": round(np.random.uniform(7950, 24900), 2),
            "total ether balance": round(np.random.uniform(5, 50), 2),
            "Total ERC20 tnxs": int(np.random.randint(6, 20)),
            "ERC20 total Ether received": round(np.random.uniform(50000000, 250000000), 2), # Mega token exploit
            "ERC20 total Ether sent": round(np.random.uniform(50000000, 250000000), 2),
            "FLAG": 1
        })

    # 5. Privacy Mixer Funnel / Laundering Wallets (15 accounts - THREAT)
    for i in range(15):
        addr = f"0x72{i:02x}{np.random.randint(1000, 9999)}b5d{np.random.randint(100000, 999999):06x}"
        eth_amt = round(np.random.choice([10.0, 50.0, 100.0, 250.0]), 2)
        records.append({
            "Address": addr,
            "Avg min between sent tnx": round(np.random.uniform(1.0, 8.0), 2),
            "Avg min between received tnx": round(np.random.uniform(1.0, 8.0), 2),
            "Time Diff between first and last (Mins)": round(np.random.uniform(2000, 15000), 1),
            "Sent tnx": int(np.random.randint(30, 100)),
            "Received tnx": int(np.random.randint(30, 100)),
            "Number of Created Contracts": 0,
            "Unique Received From Addresses": int(np.random.randint(25, 90)),
            "Unique Sent To Addresses": 1,
            "min value received": eth_amt,
            "max val sent": eth_amt,
            "avg val received": eth_amt,
            "avg val sent": eth_amt,
            "total ether received": round(eth_amt * np.random.randint(30, 90), 2),
            "total Ether sent": round(eth_amt * np.random.randint(29, 89), 2),
            "total ether balance": round(np.random.uniform(0.01, 0.5), 3),
            "Total ERC20 tnxs": 0,
            "ERC20 total Ether received": 0.0,
            "ERC20 total Ether sent": 0.0,
            "FLAG": 1
        })

    df = pd.DataFrame(records)
    # Shuffle
    df = df.sample(frac=1.0, random_state=42).reset_index(drop=True)
    return df

if __name__ == "__main__":
    df = generate_sample_csv()
    base_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(base_dir, "sample_ethereum_dataset.csv")
    df.to_csv(out_path, index=False)
    print(f"Generated sample dataset: {out_path} ({len(df)} records)")
