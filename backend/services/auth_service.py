"""
Authentication Service.
Handles cryptographic password hashing with salt (PBKDF2-HMAC-SHA256),
JWT token issuance & verification, Email OTP account registration,
Direct username/password sign-in, and Forgot Password recovery via Email/Username & OTP.
"""

import os
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from bson import ObjectId
import jwt

from mongo_db import get_users_collection, get_otp_collection
from services.email_service import send_otp_email

JWT_SECRET = os.getenv("JWT_SECRET", "threat-guard-super-secret-cryptographic-key-2026-distributed-ledger")
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRATION_HOURS = 48
OTP_EXPIRATION_MINUTES = 5

def hash_password(password: str) -> str:
    """
    Hashes a password using PBKDF2-HMAC-SHA256 with a unique random salt.
    Format: salt_hex$hash_hex
    """
    salt = secrets.token_bytes(16)
    pw_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return f"{salt.hex()}${pw_hash.hex()}"

def verify_password(plain_password: str, stored_hash: str) -> bool:
    """
    Verifies a plain-text password against a stored salt$hash string.
    """
    try:
        parts = stored_hash.split('$')
        if len(parts) != 2:
            return False
        salt = bytes.fromhex(parts[0])
        expected_hash = bytes.fromhex(parts[1])
        actual_hash = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt, 100000)
        return secrets.compare_digest(actual_hash, expected_hash)
    except Exception:
        return False

def mask_email(email: str) -> str:
    """
    Masks an email for user presentation (e.g. ad***n@threatguard.eth).
    """
    if not email or "@" not in email:
        return email or "user@domain.eth"
    parts = email.split("@", 1)
    name = parts[0]
    domain = parts[1]
    if len(name) <= 2:
        masked_name = name[0] + "***"
    else:
        masked_name = name[:2] + "***" + name[-1]
    return f"{masked_name}@{domain}"

def create_access_token(user_id: str, username: str, role: str) -> str:
    """
    Creates a cryptographically signed JWT token.
    """
    payload = {
        "sub": user_id,
        "username": username,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=TOKEN_EXPIRATION_HOURS),
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodes and validates a JWT token.
    """
    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return decoded
    except Exception:
        return None

# ====================================================================
# DIRECT SIGN-IN (NO 2-STEP VERIFICATION)
# ====================================================================

def login_user(username_or_email: str, password: str) -> Dict[str, Any]:
    """
    Authenticates username/email and password against MongoDB.
    Returns JWT access token directly without intermediate 2-step verification.
    """
    users_col = get_users_collection()
    if users_col is None:
        raise RuntimeError("MongoDB connection unavailable.")

    identifier = username_or_email.strip().lower()
    user_doc = users_col.find_one({
        "$or": [
            {"username": identifier},
            {"email": identifier}
        ]
    })

    if not user_doc:
        raise ValueError("Invalid username or password.")

    if not verify_password(password, user_doc.get("password_hash", "")):
        raise ValueError("Invalid username or password.")

    user_id = str(user_doc["_id"])
    token = create_access_token(user_id, user_doc["username"], user_doc.get("role", "Threat Analyst"))

    print(f"[AUTH_LOGIN] Direct sign-in successful for user '{user_doc['username']}'")

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "username": user_doc["username"],
            "email": user_doc["email"],
            "full_name": user_doc.get("full_name", user_doc["username"]),
            "role": user_doc.get("role", "Threat Analyst"),
            "created_at": user_doc.get("created_at", "")
        }
    }

# ====================================================================
# ACCOUNT REGISTRATION WITH MAIL OTP VERIFICATION
# ====================================================================

def initiate_registration_otp(
    username: str, 
    email: str, 
    password: str, 
    full_name: str, 
    role: str = "Threat Analyst"
) -> Dict[str, Any]:
    """
    Step 1 of Account Creation:
    Validates uniqueness, generates a 6-digit OTP, stores pending registration data,
    and returns session metadata.
    """
    users_col = get_users_collection()
    otp_col = get_otp_collection()
    if users_col is None or otp_col is None:
        raise RuntimeError("Database connection unavailable.")

    clean_username = username.strip().lower()
    clean_email = email.strip().lower()

    # Check for existing accounts
    if users_col.find_one({"username": clean_username}):
        raise ValueError(f"Username '{username}' is already registered.")

    if users_col.find_one({"email": clean_email}):
        raise ValueError(f"Email '{email}' is already registered.")

    # Generate 6-digit OTP code & session ID
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    temp_session_id = secrets.token_urlsafe(24)
    expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRATION_MINUTES)

    # Invalidate previous pending registrations for this username or email
    otp_col.delete_many({
        "action": "register",
        "$or": [
            {"username": clean_username},
            {"email": clean_email}
        ]
    })

    pending_record = {
        "action": "register",
        "temp_session_id": temp_session_id,
        "username": clean_username,
        "email": clean_email,
        "full_name": full_name.strip(),
        "role": role.strip() if role else "Threat Analyst",
        "password_hash": hash_password(password),
        "otp_code": otp_code,
        "expires_at": expires_at,
        "created_at": datetime.utcnow()
    }
    otp_col.insert_one(pending_record)

    masked = mask_email(clean_email)
    print(f"[REGISTER_OTP] Generated email OTP {otp_code} for new account '{clean_username}' ({clean_email})")

    # Dispatch real email via Gmail SMTP
    try:
        send_otp_email(clean_email, otp_code, purpose="Account Registration")
    except Exception as email_err:
        print(f"[EMAIL_DISPATCH_WARN] Failed sending email: {email_err}")

    return {
        "requires_otp": True,
        "temp_session_id": temp_session_id,
        "email_masked": masked,
        "dev_otp": otp_code,
        "message": f"Verification code sent to {masked}. Valid for 5 minutes."
    }

def verify_registration_otp(temp_session_id: str, otp_code: str) -> Dict[str, Any]:
    """
    Step 2 of Account Creation:
    Validates the 6-digit OTP code, saves the user account into MongoDB,
    and returns an authenticated JWT access token.
    """
    otp_col = get_otp_collection()
    users_col = get_users_collection()
    if otp_col is None or users_col is None:
        raise RuntimeError("Database connection unavailable.")

    record = otp_col.find_one({
        "temp_session_id": temp_session_id.strip(),
        "action": "register"
    })
    if not record:
        raise ValueError("Invalid or expired registration session. Please sign up again.")

    if datetime.utcnow() > record["expires_at"]:
        otp_col.delete_one({"_id": record["_id"]})
        raise ValueError("Verification code has expired. Please sign up again.")

    if record["otp_code"].strip() != otp_code.strip():
        raise ValueError("Incorrect verification code. Please check and try again.")

    # Single-use consumption
    otp_col.delete_one({"_id": record["_id"]})

    # Double check username/email uniqueness before insert
    if users_col.find_one({"username": record["username"]}):
        raise ValueError(f"Username '{record['username']}' is already registered.")
    if users_col.find_one({"email": record["email"]}):
        raise ValueError(f"Email '{record['email']}' is already registered.")

    user_doc = {
        "username": record["username"],
        "email": record["email"],
        "full_name": record["full_name"],
        "role": record["role"],
        "password_hash": record["password_hash"],
        "created_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    }

    result = users_col.insert_one(user_doc)
    user_id = str(result.inserted_id)

    token = create_access_token(user_id, user_doc["username"], user_doc["role"])
    print(f"[REGISTER_SUCCESS] User account created: '{user_doc['username']}' ({user_doc['email']})")

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "username": user_doc["username"],
            "email": user_doc["email"],
            "full_name": user_doc["full_name"],
            "role": user_doc["role"],
            "created_at": user_doc["created_at"]
        }
    }

# ====================================================================
# FORGOT PASSWORD & RECOVERY VIA USERNAME/EMAIL & OTP
# ====================================================================

def initiate_forgot_password_otp(identifier: str) -> Dict[str, Any]:
    """
    Step 1 of Password Recovery:
    Finds account by username or email, generates a 6-digit OTP, and returns session ID.
    """
    users_col = get_users_collection()
    otp_col = get_otp_collection()
    if users_col is None or otp_col is None:
        raise RuntimeError("Database connection unavailable.")

    clean_id = identifier.strip().lower()
    user_doc = users_col.find_one({
        "$or": [
            {"username": clean_id},
            {"email": clean_id}
        ]
    })

    if not user_doc:
        raise ValueError("No registered account found matching that username or email.")

    otp_code = f"{secrets.randbelow(900000) + 100000}"
    temp_session_id = secrets.token_urlsafe(24)
    expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRATION_MINUTES)
    user_id = str(user_doc["_id"])

    # Clear old recovery sessions for this user
    otp_col.delete_many({
        "action": "forgot_password",
        "user_id": user_id
    })

    recovery_record = {
        "action": "forgot_password",
        "temp_session_id": temp_session_id,
        "user_id": user_id,
        "username": user_doc["username"],
        "email": user_doc["email"],
        "otp_code": otp_code,
        "expires_at": expires_at,
        "created_at": datetime.utcnow()
    }
    otp_col.insert_one(recovery_record)

    masked = mask_email(user_doc["email"])
    print(f"[FORGOT_PW_OTP] Generated recovery OTP {otp_code} for user '{user_doc['username']}'")

    # Dispatch real email via Gmail SMTP
    try:
        send_otp_email(user_doc["email"], otp_code, purpose="Password Recovery")
    except Exception as email_err:
        print(f"[EMAIL_DISPATCH_WARN] Failed sending recovery email: {email_err}")

    return {
        "temp_session_id": temp_session_id,
        "email_masked": masked,
        "dev_otp": otp_code,
        "message": f"Password recovery code sent to {masked}. Valid for 5 minutes."
    }

def verify_forgot_password_otp(
    temp_session_id: str, 
    otp_code: str, 
    new_password: Optional[str] = None
) -> Dict[str, Any]:
    """
    Step 2 of Password Recovery:
    Validates OTP code. If new_password is provided, updates user password in MongoDB.
    Issues JWT token to log the user in immediately.
    """
    otp_col = get_otp_collection()
    users_col = get_users_collection()
    if otp_col is None or users_col is None:
        raise RuntimeError("Database connection unavailable.")

    record = otp_col.find_one({
        "temp_session_id": temp_session_id.strip(),
        "action": "forgot_password"
    })
    if not record:
        raise ValueError("Invalid or expired password recovery session.")

    if datetime.utcnow() > record["expires_at"]:
        otp_col.delete_one({"_id": record["_id"]})
        raise ValueError("Recovery code has expired. Please request a new code.")

    if record["otp_code"].strip() != otp_code.strip():
        raise ValueError("Incorrect recovery code. Please check and try again.")

    # Single-use consumption
    otp_col.delete_one({"_id": record["_id"]})

    # Retrieve user account
    user_doc = users_col.find_one({"_id": ObjectId(record["user_id"])})
    if not user_doc:
        raise ValueError("Associated user account not found.")

    # Update password if provided
    if new_password and len(new_password.strip()) >= 6:
        new_hash = hash_password(new_password.strip())
        users_col.update_one(
            {"_id": user_doc["_id"]},
            {"$set": {"password_hash": new_hash}}
        )
        print(f"[FORGOT_PW] Password successfully updated for user '{user_doc['username']}'")

    user_id = str(user_doc["_id"])
    token = create_access_token(user_id, user_doc["username"], user_doc.get("role", "Threat Analyst"))

    print(f"[FORGOT_PW_LOGIN] User '{user_doc['username']}' authenticated via recovery OTP.")

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "username": user_doc["username"],
            "email": user_doc["email"],
            "full_name": user_doc.get("full_name", user_doc["username"]),
            "role": user_doc.get("role", "Threat Analyst"),
            "created_at": user_doc.get("created_at", "")
        }
    }

# ====================================================================
# UNIFIED RESEND OTP
# ====================================================================

def resend_auth_otp(temp_session_id: str) -> Dict[str, Any]:
    """
    Refreshes the 6-digit OTP code and expiry for any active pending session
    (registration or password recovery).
    """
    otp_col = get_otp_collection()
    if otp_col is None:
        raise RuntimeError("Database connection unavailable.")

    record = otp_col.find_one({"temp_session_id": temp_session_id.strip()})
    if not record:
        raise ValueError("Session expired or invalid. Please request again.")

    new_code = f"{secrets.randbelow(900000) + 100000}"
    new_expires = datetime.utcnow() + timedelta(minutes=OTP_EXPIRATION_MINUTES)

    otp_col.update_one(
        {"_id": record["_id"]},
        {"$set": {
            "otp_code": new_code,
            "expires_at": new_expires,
            "created_at": datetime.utcnow()
        }}
    )
    print(f"[AUTH_OTP_RESEND] Resent OTP {new_code} for session {temp_session_id} (action={record.get('action')})")

    # Dispatch real email via Gmail SMTP
    target_email = record.get("email")
    if target_email:
        try:
            send_otp_email(target_email, new_code, purpose="Verification Resend")
        except Exception as email_err:
            print(f"[EMAIL_DISPATCH_WARN] Failed sending resend email: {email_err}")

    return {
        "temp_session_id": temp_session_id,
        "message": "A new verification code has been dispatched.",
        "dev_otp": new_code
    }

def get_current_user_profile(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves a user profile by ID from MongoDB.
    """
    users_col = get_users_collection()
    if users_col is None:
        return None

    try:
        user_doc = users_col.find_one({"_id": ObjectId(user_id)})
        if not user_doc:
            return None
        return {
            "id": str(user_doc["_id"]),
            "username": user_doc["username"],
            "email": user_doc["email"],
            "full_name": user_doc.get("full_name", user_doc["username"]),
            "role": user_doc.get("role", "Threat Analyst"),
            "created_at": user_doc.get("created_at", "")
        }
    except Exception:
        return None
