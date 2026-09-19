"""
Generate a realistic transaction-level blockchain ledger dataset.
Includes:
- account no
- transaction id (tx hash)
- time stamp
- sent amount (ETH)
- recieved amount (ETH)
- total time duration of transaction (seconds)
- counterparty address
- gas fee (ETH)
- transaction type
- account balance after transaction
- is_abnormal_label (FLAG)
"""

import os
import random
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

random.seed(42)
np.random.seed(42)

def generate_raw_transactions(output_path="raw_transactions_dataset.csv"):
    base_time = datetime(2026, 3, 1, 8, 0, 0)
    records = []

    # -------------------------------------------------------------
    # 1. NORMAL RETAIL USERS (3 Accounts, ~35 transactions total)
    # -------------------------------------------------------------
    retail_accounts = [
        "0x71C934B491a27e3160a2418e950821b01c38a101",
        "0x55d14285a910bf2350a45920042c019918231002",
        "0x8a23049182c41031920aa9021894012903102003"
    ]
    
    for acc in retail_accounts:
        curr_time = base_time + timedelta(days=random.randint(1, 10))
        balance = round(random.uniform(5.0, 15.0), 4)
        
        # Initial funding
        tx_id = f"0x{random.randint(10**14, 10**15):x}{random.randint(10**14, 10**15):x}"
        rec_amt = round(random.uniform(3.0, 8.0), 4)
        balance += rec_amt
        records.append({
            "account no": acc,
            "transaction id": tx_id,
            "time stamp": curr_time.strftime("%Y-%m-%d %H:%M:%S"),
            "sent amount": 0.0,
            "recieved amount": rec_amt,
            "total time duration of transaction": round(random.uniform(12.0, 35.0), 1),
            "counterparty address": f"0xExchDeposit{random.randint(100, 999)}",
            "gas fee": 0.0012,
            "transaction type": "DEPOSIT_FROM_EXCHANGE",
            "account balance after transaction": round(balance, 4),
            "is_abnormal_label": 0
        })

        # Routine human transactions spaced out by days/hours
        for _ in range(random.randint(8, 14)):
            curr_time += timedelta(hours=random.randint(12, 96), minutes=random.randint(5, 50))
            is_sent = random.random() < 0.65
            duration_sec = round(random.uniform(12.0, 45.0), 1)
            gas = round(random.uniform(0.0008, 0.0025), 5)
            tx_id = f"0x{random.randint(10**14, 10**15):x}{random.randint(10**14, 10**15):x}"

            if is_sent and balance > 0.5:
                sent_amt = round(random.uniform(0.1, min(1.5, balance * 0.4)), 4)
                balance = max(0.05, balance - sent_amt - gas)
                records.append({
                    "account no": acc,
                    "transaction id": tx_id,
                    "time stamp": curr_time.strftime("%Y-%m-%d %H:%M:%S"),
                    "sent amount": sent_amt,
                    "recieved amount": 0.0,
                    "total time duration of transaction": duration_sec,
                    "counterparty address": f"0xMerchant{random.randint(1000, 9999)}",
                    "gas fee": gas,
                    "transaction type": "RETAIL_PAYMENT",
                    "account balance after transaction": round(balance, 4),
                    "is_abnormal_label": 0
                })
            else:
                rec_amt = round(random.uniform(0.2, 2.0), 4)
                balance += rec_amt - gas
                records.append({
                    "account no": acc,
                    "transaction id": tx_id,
                    "time stamp": curr_time.strftime("%Y-%m-%d %H:%M:%S"),
                    "sent amount": 0.0,
                    "recieved amount": rec_amt,
                    "total time duration of transaction": duration_sec,
                    "counterparty address": f"0xPeerTransfer{random.randint(1000, 9999)}",
                    "gas fee": gas,
                    "transaction type": "PEER_TRANSFER_IN",
                    "account balance after transaction": round(balance, 4),
                    "is_abnormal_label": 0
                })

    # -------------------------------------------------------------
    # 2. DEFI TRADER (1 Account, ~25 high-frequency legitimate swaps)
    # -------------------------------------------------------------
    defi_acc = "0x3f5A109281bcD901284019280192a01920192004"
    curr_time = base_time + timedelta(days=5)
    balance = 25.0
    for _ in range(25):
        curr_time += timedelta(minutes=random.randint(45, 300))
        tx_id = f"0x{random.randint(10**14, 10**15):x}{random.randint(10**14, 10**15):x}"
        is_swap_out = random.random() < 0.5
        duration_sec = round(random.uniform(8.0, 20.0), 1)
        gas = round(random.uniform(0.003, 0.012), 4)
        
        if is_swap_out:
            amt = round(random.uniform(1.0, 4.0), 4)
            balance = max(2.0, balance - amt - gas)
            records.append({
                "account no": defi_acc,
                "transaction id": tx_id,
                "time stamp": curr_time.strftime("%Y-%m-%d %H:%M:%S"),
                "sent amount": amt,
                "recieved amount": 0.0,
                "total time duration of transaction": duration_sec,
                "counterparty address": "0xUniswapV3RouterPool",
                "gas fee": gas,
                "transaction type": "DEX_TOKEN_SWAP_BUY",
                "account balance after transaction": round(balance, 4),
                "is_abnormal_label": 0
            })
        else:
            amt = round(random.uniform(1.0, 4.5), 4)
            balance += amt - gas
            records.append({
                "account no": defi_acc,
                "transaction id": tx_id,
                "time stamp": curr_time.strftime("%Y-%m-%d %H:%M:%S"),
                "sent amount": 0.0,
                "recieved amount": amt,
                "total time duration of transaction": duration_sec,
                "counterparty address": "0xUniswapV3RouterPool",
                "gas fee": gas,
                "transaction type": "DEX_TOKEN_SWAP_SELL",
                "account balance after transaction": round(balance, 4),
                "is_abnormal_label": 0
            })

    # -------------------------------------------------------------
    # 3. PHISHING SWEEPER DRAINER (THREAT, 1 Account, 25 rapid victim deposits + instant sweep)
    # -------------------------------------------------------------
    drainer_acc = "0xEE41B92b70c8a1476b3210923fae8301726a45b8"
    master_attacker_wallet = "0xHackerColdWallet9999999999999999999999"
    curr_time = base_time + timedelta(days=12, hours=14, minutes=0)
    balance = 0.002
    total_stolen = 0.0

    # Rapid influx from 20 distinct victim wallets within 35 minutes!
    for i in range(20):
        curr_time += timedelta(minutes=random.randint(1, 2), seconds=random.randint(10, 50))
        tx_id = f"0x{random.randint(10**14, 10**15):x}{random.randint(10**14, 10**15):x}"
        victim_addr = f"0xVictimWallet{i+1:04d}_{random.randint(1000, 9999)}"
        stolen_amt = round(random.uniform(0.35, 2.5), 4)
        balance += stolen_amt
        total_stolen += stolen_amt
        records.append({
            "account no": drainer_acc,
            "transaction id": tx_id,
            "time stamp": curr_time.strftime("%Y-%m-%d %H:%M:%S"),
            "sent amount": 0.0,
            "recieved amount": stolen_amt,
            "total time duration of transaction": round(random.uniform(3.0, 10.0), 1),
            "counterparty address": victim_addr,
            "gas fee": 0.0005,
            "transaction type": "PHISHING_VICTIM_DEPOSIT",
            "account balance after transaction": round(balance, 4),
            "is_abnormal_label": 1
        })

    # Instant batch drain sweep to single cold wallet!
    curr_time += timedelta(minutes=1, seconds=15)
    sweep_amt = round(balance - 0.003, 4)
    balance = 0.003
    tx_id = f"0x{random.randint(10**14, 10**15):x}{random.randint(10**14, 10**15):x}"
    records.append({
        "account no": drainer_acc,
        "transaction id": tx_id,
        "time stamp": curr_time.strftime("%Y-%m-%d %H:%M:%S"),
        "sent amount": sweep_amt,
        "recieved amount": 0.0,
        "total time duration of transaction": 2.1,  # Automated fast execution
        "counterparty address": master_attacker_wallet,
        "gas fee": 0.003,
        "transaction type": "AUTOMATED_SWEEPER_DRAIN",
        "account balance after transaction": round(balance, 4),
        "is_abnormal_label": 1
    })

    # -------------------------------------------------------------
    # 4. FLASH LOAN PROTOCOL EXPLOITER (THREAT, 1 Account, 6 rapid massive calls in 4 minutes)
    # -------------------------------------------------------------
    exploiter_acc = "0x991C0A4f29103192081029301928019280192005"
    curr_time = base_time + timedelta(days=15, hours=3, minutes=12)
    balance = 0.5
    
    # Step 1: Flash borrow
    tx_id1 = f"0x{random.randint(10**14, 10**15):x}{random.randint(10**14, 10**15):x}"
    records.append({
        "account no": exploiter_acc,
        "transaction id": tx_id1,
        "time stamp": curr_time.strftime("%Y-%m-%d %H:%M:%S"),
        "sent amount": 0.0,
        "recieved amount": 5000.0,
        "total time duration of transaction": 1.2, # Sub-second atomic tx
        "counterparty address": "0xAaveLendingPoolV3",
        "gas fee": 0.05,
        "transaction type": "FLASH_LOAN_BORROW",
        "account balance after transaction": 5000.45,
        "is_abnormal_label": 1
    })

    # Step 2: Protocol exploit drain
    curr_time += timedelta(seconds=45)
    tx_id2 = f"0x{random.randint(10**14, 10**15):x}{random.randint(10**14, 10**15):x}"
    records.append({
        "account no": exploiter_acc,
        "transaction id": tx_id2,
        "time stamp": curr_time.strftime("%Y-%m-%d %H:%M:%S"),
        "sent amount": 5000.0,
        "recieved amount": 0.0,
        "total time duration of transaction": 1.5,
        "counterparty address": "0xVictimVulnerableLendingContract",
        "gas fee": 0.12,
        "transaction type": "REENTRANCY_EXPLOIT_CALL",
        "account balance after transaction": 0.33,
        "is_abnormal_label": 1
    })

    # Step 3: Extract drained loot
    curr_time += timedelta(seconds=30)
    tx_id3 = f"0x{random.randint(10**14, 10**15):x}{random.randint(10**14, 10**15):x}"
    records.append({
        "account no": exploiter_acc,
        "transaction id": tx_id3,
        "time stamp": curr_time.strftime("%Y-%m-%d %H:%M:%S"),
        "sent amount": 0.0,
        "recieved amount": 8450.0,
        "total time duration of transaction": 1.8,
        "counterparty address": "0xVictimVulnerableLendingContract",
        "gas fee": 0.08,
        "transaction type": "EXPLOIT_PAYOUT_SIPHON",
        "account balance after transaction": 8450.25,
        "is_abnormal_label": 1
    })

    # Step 4: Repay flash loan
    curr_time += timedelta(seconds=25)
    tx_id4 = f"0x{random.randint(10**14, 10**15):x}{random.randint(10**14, 10**15):x}"
    records.append({
        "account no": exploiter_acc,
        "transaction id": tx_id4,
        "time stamp": curr_time.strftime("%Y-%m-%d %H:%M:%S"),
        "sent amount": 5004.5,
        "recieved amount": 0.0,
        "total time duration of transaction": 1.1,
        "counterparty address": "0xAaveLendingPoolV3",
        "gas fee": 0.02,
        "transaction type": "FLASH_LOAN_REPAY",
        "account balance after transaction": 3445.73,
        "is_abnormal_label": 1
    })

    # Step 5: Laundering transfer to Tornado Cash mixer
    curr_time += timedelta(seconds=40)
    tx_id5 = f"0x{random.randint(10**14, 10**15):x}{random.randint(10**14, 10**15):x}"
    records.append({
        "account no": exploiter_acc,
        "transaction id": tx_id5,
        "time stamp": curr_time.strftime("%Y-%m-%d %H:%M:%S"),
        "sent amount": 3445.0,
        "recieved amount": 0.0,
        "total time duration of transaction": 2.4,
        "counterparty address": "0x722122dF12D450404793b52d7e7742507309569B", # Tornado Cash
        "gas fee": 0.05,
        "transaction type": "TORNADO_CASH_MIXER_DEPOSIT",
        "account balance after transaction": 0.68,
        "is_abnormal_label": 1
    })

    df = pd.DataFrame(records)
    # Sort chronologically by time stamp
    df['dt'] = pd.to_datetime(df['time stamp'])
    df = df.sort_values(by='dt').drop(columns=['dt']).reset_index(drop=True)
    df.to_csv(output_path, index=False)
    print(f"Successfully generated {len(df)} transactions in {output_path}")
    return df

if __name__ == "__main__":
    generate_raw_transactions()
