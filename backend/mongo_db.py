"""
MongoDB Connection and Database Management Module.
Connects to local MongoDB instance on mongodb://127.0.0.1:27017/
and manages collections: users, audit_logs, transactions, otp_verifications.
"""

import os
from datetime import datetime
from pymongo import MongoClient, ASCENDING
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/")
DB_NAME = "behavioral_threat_detection"

_mongo_client = None
_db = None

def get_mongo_client() -> MongoClient:
    global _mongo_client
    if _mongo_client is None:
        try:
            _mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2500)
            # Test connection
            _mongo_client.admin.command('ping')
            print(f"[MONGODB] Successfully connected to MongoDB at {MONGO_URI}")
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            print(f"[MONGODB_WARN] Unable to connect to MongoDB: {str(e)}. Fallback modes active.")
    return _mongo_client

def get_database():
    global _db
    if _db is None:
        client = get_mongo_client()
        if client:
            _db = client[DB_NAME]
    return _db

def get_users_collection():
    db = get_database()
    if db is not None:
        return db["users"]
    return None

def get_otp_collection():
    db = get_database()
    if db is not None:
        return db["otp_verifications"]
    return None

def init_mongo_db():
    """
    Initializes database indexes for users and pre-seeds default demo credentials.
    """
    db = get_database()
    if db is None:
        print("[MONGODB_WARN] Skipping MongoDB initialization: Server not reachable.")
        return

    users_col = db["users"]
    otp_col = db["otp_verifications"]
    
    # Ensure unique indexes on username and email
    try:
        users_col.create_index([("username", ASCENDING)], unique=True)
        users_col.create_index([("email", ASCENDING)], unique=True)
        otp_col.create_index([("temp_session_id", ASCENDING)], unique=True)
    except Exception as idx_err:
        print(f"[MONGODB] Index setup notice: {str(idx_err)}")

    # Seed demo users if empty
    from services.auth_service import hash_password
    
    demo_users = [
        {
            "username": "admin",
            "email": "admin@threatguard.eth",
            "full_name": "Chief Security Officer",
            "role": "Security Lead",
            "password_hash": hash_password("admin123"),
            "created_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        },
        {
            "username": "analyst",
            "email": "analyst@threatguard.eth",
            "full_name": "Senior Threat Analyst",
            "role": "Threat Analyst",
            "password_hash": hash_password("analyst123"),
            "created_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        }
    ]

    for demo in demo_users:
        if not users_col.find_one({"username": demo["username"]}):
            users_col.insert_one(demo)
            print(f"[MONGODB] Seeded default user: {demo['username']}")

if __name__ == "__main__":
    init_mongo_db()
