"""
FastAPI Backend Application for Behavioral Threat Detection & Automated Response
Distributed Ledger Networks
"""

import sys
import os
import io
import pandas as pd
from contextlib import asynccontextmanager
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, HTTPException, Request, status, UploadFile, File, Form, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import init_db, get_all_history, get_history_by_account, get_aggregate_statistics
from mongo_db import init_mongo_db
from schemas.prediction_schema import (
    AccountFeatureInput, PredictionResponse,
    ResponseActionRequest, ResponseActionReply,
    HistoryItem, StatisticsResponse, LiveAccountQuery,
    BatchAnalysisResponse
)
from schemas.auth_schema import (
    UserRegisterRequest, UserLoginRequest,
    RegisterInitiateResponse, RegisterVerifyOtpRequest,
    ForgotPasswordInitiateRequest, ForgotPasswordInitiateResponse,
    ForgotPasswordVerifyRequest, ResendOtpRequest, ResendOtpResponse,
    UserResponse, AuthTokenResponse
)
from services.model_loader import ModelRegistry
from services.prediction_service import process_account_prediction
from services.response_service import generate_automated_response
from services.etherscan_service import fetch_onchain_features
from services.batch_service import standardize_dataframe, run_batch_inference
from services.auth_service import (
    login_user, initiate_registration_otp, verify_registration_otp,
    initiate_forgot_password_otp, verify_forgot_password_otp,
    resend_auth_otp, decode_access_token, get_current_user_profile
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SAMPLE_DATASET_PATH = os.path.join(BASE_DIR, "sample_ethereum_dataset.csv")
RAW_DATASET_PATH = os.path.join(BASE_DIR, "raw_transactions_dataset.csv")
EXACT_DATASET_PATH = os.path.join(BASE_DIR, "transactions_exact_fields.csv")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize SQLite, MongoDB, and load all 8 models into memory
    print("[SERVER STARTUP] Initializing SQLite database...")
    init_db()
    print("[SERVER STARTUP] Connecting to MongoDB & initializing user authentication...")
    try:
        init_mongo_db()
    except Exception as mongo_err:
        print(f"[SERVER STARTUP] MongoDB init warning: {str(mongo_err)}")
    print("[SERVER STARTUP] Loading ML models into memory...")
    ModelRegistry.get_instance().load_all_models()
    print("[SERVER STARTUP] System ready to serve predictions and authenticate analysts.")
    yield
    print("[SERVER SHUTDOWN] Shutting down threat intelligence service.")

app = FastAPI(
    title="Behavioral Threat Detection & Automated Response API",
    description="Multi-Model Behavioral Anomaly Detection & Threat Intelligence for Decentralized Ledger Networks",
    version="2.2.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Error Handler: Prevents Python stack trace leakage to frontend
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"[ERROR] Unhandled exception on {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalThreatDetectionError",
            "message": f"Security processing failed: {str(exc)}",
            "path": request.url.path
        }
    )

# ====================================================================
# USER AUTHENTICATION & PROFILE ROUTES (MONGODB)
# ====================================================================

@app.post("/api/auth/login", response_model=AuthTokenResponse)
async def login_account(payload: UserLoginRequest):
    """
    Direct User Sign-In: Authenticates credentials and directly issues JWT session token.
    No 2-step verification.
    """
    try:
        auth_data = login_user(
            username_or_email=payload.username_or_email,
            password=payload.password
        )
        return auth_data
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Login failed: {str(e)}")

@app.post("/api/auth/register-initiate", response_model=RegisterInitiateResponse)
async def register_initiate(payload: UserRegisterRequest):
    """
    Step 1 Account Creation: Validates user details and dispatches a 6-digit email OTP.
    """
    try:
        data = initiate_registration_otp(
            username=payload.username,
            email=payload.email,
            password=payload.password,
            full_name=payload.full_name,
            role=payload.role or "Threat Analyst"
        )
        return data
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Registration initiate failed: {str(e)}")

@app.post("/api/auth/register-verify", response_model=AuthTokenResponse)
async def register_verify(payload: RegisterVerifyOtpRequest):
    """
    Step 2 Account Creation: Validates 6-digit email OTP, persists account in MongoDB, and issues JWT token.
    """
    try:
        auth_data = verify_registration_otp(
            temp_session_id=payload.temp_session_id,
            otp_code=payload.otp_code
        )
        return auth_data
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Registration verification failed: {str(e)}")

@app.post("/api/auth/forgot-password/initiate", response_model=ForgotPasswordInitiateResponse)
async def forgot_password_initiate(payload: ForgotPasswordInitiateRequest):
    """
    Step 1 Forgot Password: Generates and dispatches a 6-digit recovery OTP to user's registered email.
    """
    try:
        data = initiate_forgot_password_otp(identifier=payload.identifier)
        return data
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Recovery initiate failed: {str(e)}")

@app.post("/api/auth/forgot-password/verify", response_model=AuthTokenResponse)
async def forgot_password_verify(payload: ForgotPasswordVerifyRequest):
    """
    Step 2 Forgot Password: Validates recovery OTP, optionally updates password, and logs user in directly.
    """
    try:
        auth_data = verify_forgot_password_otp(
            temp_session_id=payload.temp_session_id,
            otp_code=payload.otp_code,
            new_password=payload.new_password
        )
        return auth_data
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Password recovery verification failed: {str(e)}")

@app.post("/api/auth/resend-otp", response_model=ResendOtpResponse)
async def resend_otp(payload: ResendOtpRequest):
    """
    Refreshes the 6-digit verification code for pending registration or recovery session.
    """
    try:
        resend_data = resend_auth_otp(temp_session_id=payload.temp_session_id)
        return resend_data
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"OTP resend failed: {str(e)}")

@app.get("/api/auth/me", response_model=UserResponse)
async def get_my_profile(authorization: Optional[str] = Header(None)):
    """
    Returns the authenticated user's profile based on the JWT Bearer token.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid authentication token.")
    
    token = authorization.split(" ")[1]
    decoded = decode_access_token(token)
    if not decoded or "sub" not in decoded:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired or invalid.")
    
    profile = get_current_user_profile(decoded["sub"])
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")
    
    return profile

@app.get("/api/auth/demo-accounts")
async def get_demo_credentials():
    """
    Returns pre-configured demo logins for immediate 1-click evaluation.
    """
    return [
        {
            "role": "Security Lead",
            "username": "admin",
            "password": "admin123",
            "full_name": "Chief Security Officer"
        },
        {
            "role": "Threat Analyst",
            "username": "analyst",
            "password": "analyst123",
            "full_name": "Senior Threat Analyst"
        }
    ]

# ====================================================================
# SYSTEM HEALTH & PREDICTION APIS
# ====================================================================

@app.get("/api/health")
async def health_check():
    """
    Returns the operational status of the threat detection backend and MongoDB.
    """
    reg = ModelRegistry.get_instance()
    weights = reg.config.get("weights", {}) if reg.config else {}
    from mongo_db import get_mongo_client
    mongo_ok = False
    try:
        client = get_mongo_client()
        if client:
            client.admin.command('ping')
            mongo_ok = True
    except Exception:
        mongo_ok = False

    return {
        "status": "HEALTHY",
        "models_loaded": bool(reg.is_loaded),
        "models_count": len(weights) if weights else 8,
        "mongodb_connected": mongo_ok,
        "threshold": reg.config["threshold"] if reg.config else 0.4199
    }

@app.post("/api/predict", response_model=PredictionResponse)
async def predict_account_threat(payload: AccountFeatureInput):
    """
    Analyzes an Ethereum account's behavioral features through all 8 models,
    computes the calibrated ensemble score, and issues automated responses.
    """
    try:
        response = process_account_prediction(payload)
        return response
    except Exception as e:
        print(f"[PREDICTION_ERROR] {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unable to process account features: {str(e)}"
        )

@app.post("/api/respond", response_model=ResponseActionReply)
async def trigger_automated_response(payload: ResponseActionRequest):
    """
    Executes or simulates automated on-chain mitigation actions based on severity.
    """
    try:
        resp = generate_automated_response(
            severity=payload.severity.upper(),
            ensemble_score=payload.threat_score,
            model_scores={"ensemble": payload.threat_score}
        )
        return ResponseActionReply(
            account_id=payload.account_id,
            threat_score=payload.threat_score,
            severity=payload.severity.upper(),
            recommended_action=resp["recommended_action"],
            reason=resp["reason"],
            timestamp=resp["timestamp"],
            status=resp["status"],
            simulated_contract_call=resp["simulated_contract_call"]
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/history", response_model=List[HistoryItem])
async def get_prediction_history(limit: int = 100):
    """
    Returns historical account telemetry logs.
    """
    return get_all_history(limit=limit)

@app.get("/api/history/{account_id}", response_model=List[HistoryItem])
async def get_history_for_account(account_id: str):
    """
    Returns audit logs for a specific Ethereum account address.
    """
    return get_history_by_account(account_id)

@app.get("/api/statistics", response_model=StatisticsResponse)
async def get_dashboard_statistics():
    """
    Returns real-time aggregate statistics for the executive dashboard.
    """
    return get_aggregate_statistics()

@app.get("/api/benchmarks")
async def get_model_benchmarks():
    """
    Returns historical validation benchmark metrics across all 8 models and the ensemble.
    """
    reg = ModelRegistry.get_instance()
    return {
        "benchmarks": reg.config.get("benchmarks", {}),
        "weights": reg.config.get("weights", {}),
        "threshold": reg.config.get("threshold", 0.45)
    }

@app.get("/api/presets")
async def get_sample_presets():
    """
    Returns realistic Ethereum behavioral presets for instant testing in the UI.
    """
    return [
        {
            "id": "retail_user",
            "name": "Normal Retail User",
            "description": "Standard wallet holder with regular time gaps, modest balance, and healthy activity lifespan.",
            "data": {
                "account_id": "0x71C93...B491a",
                "Avg_min_between_sent": 4820.5,
                "Avg_min_between_rec": 3940.1,
                "Active_Span_Mins": 248100.0,
                "Sent_tnx": 28.0,
                "Received_tnx": 35.0,
                "Created_Contracts": 0.0,
                "Uniq_Rec_Addr": 18.0,
                "Uniq_Sent_Addr": 14.0,
                "Avg_Val_Rec": 0.82,
                "Avg_Val_Sent": 0.71,
                "Total_ETH_Rec": 28.7,
                "Total_ETH_Sent": 19.88,
                "Ether_Balance": 8.82,
                "Total_ERC20_tnx": 12.0,
                "ERC20_Total_Rec": 1200.0,
                "ERC20_Total_Sent": 450.0
            }
        },
        {
            "id": "defi_trader",
            "name": "DeFi Liquidity Trader",
            "description": "High-volume decentralized finance participant with high contract interaction and token swaps.",
            "data": {
                "account_id": "0x3f5A1...91bcD",
                "Avg_min_between_sent": 340.2,
                "Avg_min_between_rec": 512.6,
                "Active_Span_Mins": 182500.0,
                "Sent_tnx": 142.0,
                "Received_tnx": 118.0,
                "Created_Contracts": 0.0,
                "Uniq_Rec_Addr": 27.0,
                "Uniq_Sent_Addr": 32.0,
                "Avg_Val_Rec": 2.45,
                "Avg_Val_Sent": 1.95,
                "Total_ETH_Rec": 289.1,
                "Total_ETH_Sent": 276.9,
                "Ether_Balance": 12.2,
                "Total_ERC20_tnx": 86.0,
                "ERC20_Total_Rec": 31200.0,
                "ERC20_Total_Sent": 24500.0
            }
        },
        {
            "id": "phishing_sweeper",
            "name": "Phishing Fund Sweeper (Drainer)",
            "description": "Automated attack bot collecting victim deposits and immediately draining funds to zero balance.",
            "data": {
                "account_id": "0xEE41B...92b70",
                "Avg_min_between_sent": 2.15,
                "Avg_min_between_rec": 1850.4,
                "Active_Span_Mins": 1420.0,
                "Sent_tnx": 4.0,
                "Received_tnx": 162.0,
                "Created_Contracts": 0.0,
                "Uniq_Rec_Addr": 158.0,
                "Uniq_Sent_Addr": 1.0,
                "Avg_Val_Rec": 0.45,
                "Avg_Val_Sent": 18.22,
                "Total_ETH_Rec": 72.9,
                "Total_ETH_Sent": 72.88,
                "Ether_Balance": 0.02,
                "Total_ERC20_tnx": 18.0,
                "ERC20_Total_Rec": 1450.0,
                "ERC20_Total_Sent": 1450.0
            }
        },
        {
            "id": "flash_exploiter",
            "name": "Flash-Loan Protocol Exploiter",
            "description": "Malicious smart contract exploiter with massive instantaneous token volume and tiny lifespan.",
            "data": {
                "account_id": "0x991C0...A4f29",
                "Avg_min_between_sent": 0.1,
                "Avg_min_between_rec": 0.1,
                "Active_Span_Mins": 30.0,
                "Sent_tnx": 8.0,
                "Received_tnx": 4.0,
                "Created_Contracts": 2.0,
                "Uniq_Rec_Addr": 2.0,
                "Uniq_Sent_Addr": 1.0,
                "Avg_Val_Rec": 2500.0,
                "Avg_Val_Sent": 2490.0,
                "Total_ETH_Rec": 10000.0,
                "Total_ETH_Sent": 9960.0,
                "Ether_Balance": 40.0,
                "Total_ERC20_tnx": 14.0,
                "ERC20_Total_Rec": 150000000.0,
                "ERC20_Total_Sent": 150000000.0
            }
        }
    ]

@app.get("/api/network-graph")
async def get_network_graph():
    """
    Returns synthetic network graph nodes and edges generated from behavioral clusters
    for the interactive transaction network visualization.
    """
    nodes = [
        {"id": "0x71C...8491", "label": "Retail User 1", "type": "normal", "score": 0.12, "tx_count": 63, "balance": 8.82, "connections": 4},
        {"id": "0x3f5...91bc", "label": "DeFi Trader", "type": "normal", "score": 0.24, "tx_count": 260, "balance": 12.2, "connections": 7},
        {"id": "0x00a...3412", "label": "Validator Staker", "type": "normal", "score": 0.08, "tx_count": 856, "balance": 0.90, "connections": 2},
        {"id": "0x8a2...c410", "label": "Volatile Trader", "type": "normal", "score": 0.35, "tx_count": 150, "balance": 4.70, "connections": 5},
        {"id": "0x55d...a910", "label": "Retail User 2", "type": "normal", "score": 0.15, "tx_count": 45, "balance": 3.20, "connections": 3},
        {"id": "0x11b...45e0", "label": "Suspicious Funnel", "type": "suspicious", "score": 0.58, "tx_count": 310, "balance": 1.40, "connections": 6},
        {"id": "0xee4...192b", "label": "Phishing Sweeper Bot", "type": "high_risk", "score": 0.94, "tx_count": 166, "balance": 0.02, "connections": 8},
        {"id": "0x991...a4f2", "label": "Flash Loan Exploit", "type": "high_risk", "score": 0.98, "tx_count": 5, "balance": 4.00, "connections": 3},
        {"id": "0x44c...9811", "label": "Sybil Bot Swarm", "type": "high_risk", "score": 0.89, "tx_count": 41, "balance": 0.10, "connections": 5}
    ]
    edges = [
        {"source": "0x71C...8491", "target": "0x3f5...91bc", "value": 2.5, "type": "normal"},
        {"source": "0x55d...a910", "target": "0x3f5...91bc", "value": 1.2, "type": "normal"},
        {"source": "0x00a...3412", "target": "0x71C...8491", "value": 0.05, "type": "normal"},
        {"source": "0x8a2...c410", "target": "0x3f5...91bc", "value": 5.4, "type": "normal"},
        {"source": "0x71C...8491", "target": "0x11b...45e0", "value": 0.8, "type": "suspicious"},
        {"source": "0x8a2...c410", "target": "0x11b...45e0", "value": 2.1, "type": "suspicious"},
        {"source": "0x11b...45e0", "target": "0xee4...192b", "value": 15.0, "type": "threat"},
        {"source": "0x55d...a910", "target": "0xee4...192b", "value": 3.4, "type": "threat"},
        {"source": "0xee4...192b", "target": "0x991...a4f2", "value": 45.0, "type": "threat"},
        {"source": "0x44c...9811", "target": "0x11b...45e0", "value": 0.01, "type": "threat"},
        {"source": "0x44c...9811", "target": "0xee4...192b", "value": 0.01, "type": "threat"}
    ]
    return {"nodes": nodes, "edges": edges}

@app.post("/api/fetch-live-account")
async def fetch_live_ethereum_account(query: LiveAccountQuery):
    """
    Fetches real or queried Ethereum on-chain wallet data,
    extracts the exact 16 behavioral features, and returns them ready for instant evaluation.
    """
    try:
        result = fetch_onchain_features(query.address)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch on-chain account: {str(e)}")

# ====================================================================
# DATASET UPLOAD & BATCH ABNORMAL TRANSACTION ANALYSIS ENDPOINTS
# ====================================================================

@app.post("/api/analyze-dataset", response_model=BatchAnalysisResponse)
async def analyze_uploaded_dataset(file: UploadFile = File(...)):
    """
    Receives an uploaded CSV dataset of Ethereum transactions/accounts,
    standardizes schema headers, imputes missing features safely, runs vectorized
    8-model anomaly inference without retraining, and outputs comprehensive risk analytics.
    """
    try:
        content = await file.read()
        try:
            df = pd.read_csv(io.BytesIO(content))
        except Exception as parse_err:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid CSV format: {str(parse_err)}"
            )

        if df.empty:
            raise HTTPException(
                status_code=400,
                detail="Uploaded CSV contains no rows."
            )

        features_df, ground_truth, account_ids = standardize_dataframe(df)
        result = run_batch_inference(features_df, account_ids, ground_truth)
        return result

    except HTTPException:
        raise
    except Exception as e:
        print(f"[BATCH_ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze dataset: {str(e)}")

@app.get("/api/dataset/sample")
async def get_sample_dataset(type: str = "benchmark", format: str = "json"):
    """
    Returns pre-generated sample Ethereum transaction datasets:
    - type=exact: dataset with strictly the exact fields requested by user
    - type=raw: raw ledger transactions with metadata
    - type=benchmark: 100-account behavioral features
    """
    if type.lower() == "exact":
        target_path = EXACT_DATASET_PATH
        filename = "transactions_exact_fields.csv"
    elif type.lower() == "raw":
        target_path = RAW_DATASET_PATH
        filename = "raw_transactions_dataset.csv"
    else:
        target_path = SAMPLE_DATASET_PATH
        filename = "sample_ethereum_dataset.csv"

    if not os.path.exists(target_path):
        if type.lower() == "exact":
            from generate_exact_fields_dataset import generate_exact_fields_csv
            generate_exact_fields_csv(target_path)
        elif type.lower() == "raw":
            from generate_raw_transactions import generate_raw_transactions
            generate_raw_transactions(target_path)
        else:
            from sample_dataset import generate_sample_csv
            df = generate_sample_csv()
            df.to_csv(SAMPLE_DATASET_PATH, index=False)

    if format.lower() == "csv":
        return FileResponse(
            target_path,
            media_type="text/csv",
            filename=filename
        )
    else:
        df = pd.read_csv(target_path)
        return {
            "filename": filename,
            "total_records": len(df),
            "columns": list(df.columns),
            "data": df.head(100).to_dict(orient="records")
        }

@app.post("/api/analyze-sample-dataset", response_model=BatchAnalysisResponse)
async def analyze_sample_benchmark_dataset():
    """
    One-click analysis of the pre-loaded 100-account benchmark dataset.
    """
    if not os.path.exists(SAMPLE_DATASET_PATH):
        from sample_dataset import generate_sample_csv
        df = generate_sample_csv()
        df.to_csv(SAMPLE_DATASET_PATH, index=False)

    df = pd.read_csv(SAMPLE_DATASET_PATH)
    features_df, ground_truth, account_ids = standardize_dataframe(df)
    result = run_batch_inference(features_df, account_ids, ground_truth)
    return result

@app.post("/api/analyze-raw-sample-dataset", response_model=BatchAnalysisResponse)
async def analyze_raw_transaction_sample_dataset():
    """
    One-click analysis of the raw ledger dataset:
    Aggregates account transactions over time, calculates the 16 features, and evaluates all 8 models.
    """
    if not os.path.exists(RAW_DATASET_PATH):
        from generate_raw_transactions import generate_raw_transactions
        generate_raw_transactions(RAW_DATASET_PATH)

    df = pd.read_csv(RAW_DATASET_PATH)
    features_df, ground_truth, account_ids = standardize_dataframe(df)
    result = run_batch_inference(features_df, account_ids, ground_truth)
    return result
