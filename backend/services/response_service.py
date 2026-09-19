"""
Response Service: Generates automated defensive actions and simulated
on-chain/mempool operations based on threat severity.
"""

from datetime import datetime

def generate_automated_response(severity: str, ensemble_score: float, model_scores: dict) -> dict:
    """
    Maps threat severity and model triggers to decentralized mitigation policies.
    """
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    # Count which high-confidence models flagged the account
    triggered_models = [
        name.replace("_", " ").title()
        for name, score in model_scores.items()
        if score >= 0.50
    ]

    if severity == "NORMAL":
        action = "ALLOW_TRANSACTION"
        reason = "Behavioral profile conforms to verified normal decentralized ledger baseline."
        status = "EXECUTED"
        simulated_call = "evm_passthrough(tx_hash, gas_limit=default)"
        message = "Account activity verified as benign. Standard pass-through execution."

    elif severity == "LOW":
        action = "LOG_ACTIVITY"
        reason = "Minor volatility detected above normal threshold. Telemetry tagged for monitoring."
        status = "LOGGED"
        simulated_call = "oracle.emitSecurityTelemetry(account, score, flag=LOW_RISK)"
        message = "Elevated volume/frequency detected. Activity logged to security oracle."

    elif severity == "MEDIUM":
        action = "MONITOR_ACCOUNT"
        reason = f"Suspicious activity confirmed by: {', '.join(triggered_models) or 'Ensemble'}. Mempool queue held."
        status = "CHALLENGE_ISSUED"
        simulated_call = "mempool.quarantine(account, timelock=3_blocks, require_multisig=True)"
        message = "Suspicious behavioral pattern detected. Timelock quarantine and secondary authorization required."

    else:  # HIGH
        action = "FLAG_ACCOUNT"
        reason = f"Critical exploit/fraud signature confirmed by {len(triggered_models)} models ({', '.join(triggered_models[:4])})."
        status = "CIRCUIT_BREAKER_TRIGGERED"
        simulated_call = "security_council.circuitBreaker(account, action=PAUSE_AND_FREEZE, revert=True)"
        message = "CRITICAL THREAT: Automated Smart Contract Circuit Breaker triggered. Transaction restricted."

    return {
        "recommended_action": action,
        "reason": reason,
        "status": status,
        "simulated_contract_call": simulated_call,
        "message": message,
        "timestamp": timestamp,
        "triggered_models": triggered_models
    }
