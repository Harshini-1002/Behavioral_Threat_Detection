"""
Automated Integration Tests for:
1. Direct Sign-In (no 2FA prompt)
2. Email OTP Account Registration
3. Forgot Password Recovery via Username/Email & OTP
"""

import sys
import os
import secrets
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from mongo_db import init_mongo_db, get_users_collection, get_otp_collection
from services.auth_service import (
    login_user,
    initiate_registration_otp,
    verify_registration_otp,
    initiate_forgot_password_otp,
    verify_forgot_password_otp,
    resend_auth_otp,
    decode_access_token
)

def run_tests():
    print("[TEST] Initializing MongoDB connection...")
    init_mongo_db()
    users_col = get_users_collection()
    otp_col = get_otp_collection()
    
    assert users_col is not None, "Users collection is not available."
    assert otp_col is not None, "OTP collection is not available."

    print("\n--- TEST 1: Direct Sign-In (No 2-Step OTP Prompt) ---")
    login_res = login_user("admin", "admin123")
    assert "access_token" in login_res, "Expected access_token in direct sign-in"
    assert login_res["user"]["username"] == "admin", "User must be admin"
    decoded = decode_access_token(login_res["access_token"])
    assert decoded is not None and decoded["username"] == "admin", "Invalid JWT token issued"
    print(f"  [PASS] Direct sign-in successful: JWT token issued ({login_res['access_token'][:20]}...)")

    print("\n--- TEST 2: Direct Sign-In Fails with Bad Credentials ---")
    try:
        login_user("admin", "wrong_pass_999")
        assert False, "Should fail with wrong password"
    except ValueError as e:
        print(f"  [PASS] Correctly rejected: {e}")

    print("\n--- TEST 3: Email OTP Registration Step 1 (Initiate) ---")
    test_user = f"analyst_{secrets.token_hex(3)}"
    test_email = f"{test_user}@threatguard.eth"
    reg_init = initiate_registration_otp(
        username=test_user,
        email=test_email,
        password="TestPassword123!",
        full_name="Test Crypto Analyst",
        role="Smart Contract Auditor"
    )
    assert reg_init["requires_otp"] is True, "Expected requires_otp=True"
    assert "temp_session_id" in reg_init, "Missing temp_session_id"
    assert "dev_otp" in reg_init and len(reg_init["dev_otp"]) == 6, "Invalid 6-digit dev_otp"
    assert "@" in reg_init["email_masked"], "Email must be masked"
    print(f"  [PASS] Registration OTP initiated: Session={reg_init['temp_session_id'][:10]}..., OTP={reg_init['dev_otp']}")

    reg_session = reg_init["temp_session_id"]
    reg_otp = reg_init["dev_otp"]

    print("\n--- TEST 4: Email OTP Registration with Bad OTP ---")
    try:
        verify_registration_otp(reg_session, "000000" if reg_otp != "000000" else "111111")
        assert False, "Should fail with incorrect OTP"
    except ValueError as e:
        print(f"  [PASS] Correctly rejected wrong registration OTP: {e}")

    print("\n--- TEST 5: Email OTP Registration Step 2 (Verify & Account Creation) ---")
    reg_verify = verify_registration_otp(reg_session, reg_otp)
    assert "access_token" in reg_verify, "Expected access_token after successful registration"
    assert reg_verify["user"]["username"] == test_user, "User created must match username"
    assert users_col.find_one({"username": test_user}) is not None, "User not found in MongoDB"
    print(f"  [PASS] Account created successfully in MongoDB for '{test_user}'")

    print("\n--- TEST 6: Duplicate Registration Attempt Fails ---")
    try:
        initiate_registration_otp(
            username=test_user,
            email=test_email,
            password="NewPassword123!",
            full_name="Duplicate User",
            role="Threat Analyst"
        )
        assert False, "Should fail duplicate registration"
    except ValueError as e:
        print(f"  [PASS] Correctly prevented duplicate registration: {e}")

    print("\n--- TEST 7: Forgot Password Step 1 (Initiate Recovery OTP) ---")
    forgot_init = initiate_forgot_password_otp(test_user)
    assert "temp_session_id" in forgot_init, "Missing temp_session_id in forgot password"
    assert "dev_otp" in forgot_init and len(forgot_init["dev_otp"]) == 6, "Missing 6-digit recovery OTP"
    print(f"  [PASS] Recovery OTP initiated for '{test_user}': OTP={forgot_init['dev_otp']}")

    rec_session = forgot_init["temp_session_id"]
    rec_otp = forgot_init["dev_otp"]

    print("\n--- TEST 8: Forgot Password Step 2 (Verify OTP & Reset Password) ---")
    new_password = "ResetPassword2026!"
    forgot_verify = verify_forgot_password_otp(
        temp_session_id=rec_session,
        otp_code=rec_otp,
        new_password=new_password
    )
    assert "access_token" in forgot_verify, "Expected access_token in password recovery"
    assert forgot_verify["user"]["username"] == test_user, "User mismatch"
    print(f"  [PASS] Verified recovery OTP and logged in: '{test_user}'")

    print("\n--- TEST 9: Sign In with New Reset Password ---")
    new_login = login_user(test_user, new_password)
    assert "access_token" in new_login, "Should login with new password"
    print("  [PASS] Direct sign-in with newly reset password works!")

    try:
        login_user(test_user, "TestPassword123!")
        assert False, "Old password should no longer work"
    except ValueError:
        print("  [PASS] Old password successfully invalidated!")

    # Clean up test user
    users_col.delete_one({"username": test_user})
    print(f"\n[CLEANUP] Deleted test account: {test_user}")

    print("\n=======================================================")
    print("ALL DIRECT LOGIN, REGISTRATION OTP & FORGOT PW TESTS OK!")
    print("=======================================================")

if __name__ == "__main__":
    run_tests()
