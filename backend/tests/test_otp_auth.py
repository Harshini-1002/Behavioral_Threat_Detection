"""
Automated Integration Tests for 2FA OTP Authentication.
Tests login step 1, OTP verification, single-use invalidation,
resend OTP, and JWT access token creation.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from mongo_db import init_mongo_db, get_users_collection, get_otp_collection
from services.auth_service import (
    login_user, verify_user_otp, resend_user_otp,
    decode_access_token
)

def run_tests():
    print("[TEST] Initializing MongoDB connection...")
    init_mongo_db()
    users_col = get_users_collection()
    otp_col = get_otp_collection()
    
    assert users_col is not None, "Users collection is not available."
    assert otp_col is not None, "OTP collection is not available."

    print("\n--- TEST 1: Step 1 Login with Valid Credentials ---")
    step1 = login_user("admin", "admin123")
    assert step1.get("requires_otp") is True, "Expected requires_otp=True"
    assert "temp_session_id" in step1, "Missing temp_session_id"
    assert "dev_otp" in step1, "Missing dev_otp"
    assert len(step1["dev_otp"]) == 6, f"Expected 6-digit OTP, got {step1['dev_otp']}"
    assert "@" in step1["email_masked"], "Expected masked email"
    print(f"  [PASS] Step 1 returned temp_session_id: {step1['temp_session_id'][:10]}..., OTP: {step1['dev_otp']}")

    session_id = step1["temp_session_id"]
    otp_code = step1["dev_otp"]

    print("\n--- TEST 2: Step 1 Login with Invalid Password ---")
    try:
        login_user("admin", "wrong_password_999")
        assert False, "Should have thrown ValueError for wrong password"
    except ValueError as e:
        print(f"  [PASS] Correctly rejected invalid password: {e}")

    print("\n--- TEST 3: Step 2 OTP Verification with Incorrect Code ---")
    try:
        verify_user_otp(session_id, "000000" if otp_code != "000000" else "999999")
        assert False, "Should have thrown ValueError for incorrect OTP"
    except ValueError as e:
        print(f"  [PASS] Correctly rejected wrong OTP: {e}")

    print("\n--- TEST 4: Step 2 OTP Verification with Valid Code ---")
    auth_result = verify_user_otp(session_id, otp_code)
    assert "access_token" in auth_result, "Missing access_token in successful auth"
    assert auth_result["user"]["username"] == "admin", "User should be admin"
    decoded = decode_access_token(auth_result["access_token"])
    assert decoded is not None and decoded["username"] == "admin", "JWT token could not be validated"
    print(f"  [PASS] Successfully verified OTP and issued JWT token: {auth_result['access_token'][:20]}...")

    print("\n--- TEST 5: Single-Use OTP Consumption (Replay Prevention) ---")
    try:
        verify_user_otp(session_id, otp_code)
        assert False, "Should have rejected re-use of consumed OTP"
    except ValueError as e:
        print(f"  [PASS] Correctly rejected reused OTP: {e}")

    print("\n--- TEST 6: Resend OTP Workflow ---")
    step1_analyst = login_user("analyst", "analyst123")
    analyst_session = step1_analyst["temp_session_id"]
    old_otp = step1_analyst["dev_otp"]

    resend_result = resend_user_otp(analyst_session)
    new_otp = resend_result["dev_otp"]
    assert new_otp is not None and len(new_otp) == 6, "Invalid new OTP code"
    print(f"  [PASS] Successfully resent OTP: Old={old_otp} -> New={new_otp}")

    # Old OTP should fail if different
    if old_otp != new_otp:
        try:
            verify_user_otp(analyst_session, old_otp)
            assert False, "Old OTP should no longer work after resend"
        except ValueError:
            print("  [PASS] Old OTP invalidated after resend")

    # New OTP verifies analyst
    analyst_auth = verify_user_otp(analyst_session, new_otp)
    assert analyst_auth["user"]["username"] == "analyst", "Expected analyst user"
    print(f"  [PASS] Verified analyst with refreshed OTP code: {new_otp}")

    print("\n==========================================")
    print("ALL 2FA OTP AUTHENTICATION TESTS PASSED OK!")
    print("==========================================")

if __name__ == "__main__":
    run_tests()
