"""
Generate a realistic transaction dataset with strictly the exact fields requested:
- account no
- tansaction id
- time stamp
- sent amount
- recieved amount
- total time duration of transaction
"""

import os
import random
from datetime import datetime, timedelta
import pandas as pd

random.seed(42)

def generate_exact_fields_csv(output_path="transactions_exact_fields.csv"):
    base_time = datetime(2026, 3, 1, 8, 0, 0)
    records = []

    # 1. Normal Retail User 1 (Moderate intervals, standard amounts)
    acc1 = "0x71C934B491a27e3160a2418e950821b01c38a101"
    curr_time = base_time + timedelta(days=1)
    
    # Inflow
    records.append({
        "account no": acc1,
        "tansaction id": "0x39a04473b18562d7a91823c10491029381029384",
        "time stamp": curr_time.strftime("%Y-%m-%d %H:%M:%S"),
        "sent amount": 0.0,
        "recieved amount": 8.50,
        "total time duration of transaction": 24.5
    })
    
    # Outflows spaced out by days/hours
    for i in range(10):
        curr_time += timedelta(days=random.randint(1, 3), hours=random.randint(1, 12))
        tx_id = f"0x{random.randint(10**24, 10**25):x}{random.randint(10**14, 10**15):x}"
        sent_val = round(random.uniform(0.2, 0.9), 3)
        records.append({
            "account no": acc1,
            "tansaction id": tx_id,
            "time stamp": curr_time.strftime("%Y-%m-%d %H:%M:%S"),
            "sent amount": sent_val,
            "recieved amount": 0.0,
            "total time duration of transaction": round(random.uniform(15.0, 40.0), 1)
        })

    # 2. Normal Retail User 2
    acc2 = "0x55d14285a910bf2350a45920042c019918231002"
    curr_time = base_time + timedelta(days=2)
    records.append({
        "account no": acc2,
        "tansaction id": "0x81b0412850912fa91823c1049102938102938411",
        "time stamp": curr_time.strftime("%Y-%m-%d %H:%M:%S"),
        "sent amount": 0.0,
        "recieved amount": 5.00,
        "total time duration of transaction": 21.0
    })
    for i in range(8):
        curr_time += timedelta(days=random.randint(2, 4), hours=random.randint(2, 8))
        tx_id = f"0x{random.randint(10**24, 10**25):x}{random.randint(10**14, 10**15):x}"
        records.append({
            "account no": acc2,
            "tansaction id": tx_id,
            "time stamp": curr_time.strftime("%Y-%m-%d %H:%M:%S"),
            "sent amount": round(random.uniform(0.15, 0.6), 3),
            "recieved amount": 0.0,
            "total time duration of transaction": round(random.uniform(18.0, 35.0), 1)
        })

    # 3. Phishing Sweeper Bot (Attacker: 15 rapid deposits in minutes, then instant full sweep)
    acc_drainer = "0xEE41B92b70c8a1476b3210923fae8301726a45b8"
    curr_time = base_time + timedelta(days=10, hours=14)
    total_stolen = 0.0
    
    for i in range(15):
        curr_time += timedelta(minutes=random.randint(1, 2), seconds=random.randint(5, 45))
        tx_id = f"0x{random.randint(10**24, 10**25):x}{random.randint(10**14, 10**15):x}"
        victim_deposit = round(random.uniform(0.5, 2.5), 3)
        total_stolen += victim_deposit
        records.append({
            "account no": acc_drainer,
            "tansaction id": tx_id,
            "time stamp": curr_time.strftime("%Y-%m-%d %H:%M:%S"),
            "sent amount": 0.0,
            "recieved amount": victim_deposit,
            "total time duration of transaction": round(random.uniform(4.0, 10.0), 1)
        })
        
    # Immediate sweep drain
    curr_time += timedelta(minutes=1, seconds=10)
    records.append({
        "account no": acc_drainer,
        "tansaction id": f"0x{random.randint(10**24, 10**25):x}{random.randint(10**14, 10**15):x}",
        "time stamp": curr_time.strftime("%Y-%m-%d %H:%M:%S"),
        "sent amount": round(total_stolen - 0.01, 3),
        "recieved amount": 0.0,
        "total time duration of transaction": 2.5
    })

    # 4. Flash Loan Protocol Exploiter (Attacker: Huge amounts in seconds)
    acc_exploit = "0x991C0A4f29103192081029301928019280192005"
    curr_time = base_time + timedelta(days=14, hours=3, minutes=15)
    
    # Borrow
    records.append({
        "account no": acc_exploit,
        "tansaction id": f"0x{random.randint(10**24, 10**25):x}{random.randint(10**14, 10**15):x}",
        "time stamp": curr_time.strftime("%Y-%m-%d %H:%M:%S"),
        "sent amount": 0.0,
        "recieved amount": 5000.0,
        "total time duration of transaction": 1.2
    })
    # Exploit contract call
    curr_time += timedelta(seconds=35)
    records.append({
        "account no": acc_exploit,
        "tansaction id": f"0x{random.randint(10**24, 10**25):x}{random.randint(10**14, 10**15):x}",
        "time stamp": curr_time.strftime("%Y-%m-%d %H:%M:%S"),
        "sent amount": 5000.0,
        "recieved amount": 0.0,
        "total time duration of transaction": 1.5
    })
    # Siphon profit
    curr_time += timedelta(seconds=20)
    records.append({
        "account no": acc_exploit,
        "tansaction id": f"0x{random.randint(10**24, 10**25):x}{random.randint(10**14, 10**15):x}",
        "time stamp": curr_time.strftime("%Y-%m-%d %H:%M:%S"),
        "sent amount": 0.0,
        "recieved amount": 8450.0,
        "total time duration of transaction": 1.4
    })
    # Repay
    curr_time += timedelta(seconds=25)
    records.append({
        "account no": acc_exploit,
        "tansaction id": f"0x{random.randint(10**24, 10**25):x}{random.randint(10**14, 10**15):x}",
        "time stamp": curr_time.strftime("%Y-%m-%d %H:%M:%S"),
        "sent amount": 5004.5,
        "recieved amount": 0.0,
        "total time duration of transaction": 1.1
    })
    # Transfer profit to mixer
    curr_time += timedelta(seconds=30)
    records.append({
        "account no": acc_exploit,
        "tansaction id": f"0x{random.randint(10**24, 10**25):x}{random.randint(10**14, 10**15):x}",
        "time stamp": curr_time.strftime("%Y-%m-%d %H:%M:%S"),
        "sent amount": 3445.0,
        "recieved amount": 0.0,
        "total time duration of transaction": 2.0
    })

    # Convert to DataFrame
    df = pd.DataFrame(records)
    # Sort chronologically by time stamp
    df['dt'] = pd.to_datetime(df['time stamp'])
    df = df.sort_values(by='dt').drop(columns=['dt']).reset_index(drop=True)
    df.to_csv(output_path, index=False)
    print(f"Generated {len(df)} transactions in {output_path}")
    return df

if __name__ == "__main__":
    generate_exact_fields_csv()
