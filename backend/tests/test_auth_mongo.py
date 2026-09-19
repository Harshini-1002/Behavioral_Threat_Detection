"""
Automated Backend Verification for MongoDB User Authentication.
"""

import sys
import os
import time

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mongo_db import init_mongo_db, get_database, get_users_collection
from services.auth_service import (
    register_new_user, login_user,
    verify_password, decode_access_token,
    get_current_user_profile
)

def test_auth_pipeline():
    print("=" * 70)
    print("RUNNING MONGODB & USER AUTHENTICATION VERIFICATION TESTS")
    print("=" * 70)

    # 1. Test MongoDB connection & initialization
    init_mongo_db()
    db = get_database()
    assert db is not None, "MongoDB database connection failed."
    print("-> MongoDB connection established and collections initialized.")

    users_col = get_users_collection()
    assert users_col is not None, "Users collection not accessible."

    # 2. Test pre-seeded demo credentials
    admin_login = login_user("admin", "admin123")
    assert admin_login["access_token"], "Admin login failed to return access token."
    assert admin_login["user"]["role"] == "Security Lead", "Admin role mismatch."
    print("-> Default pre-seeded admin credentials verified.")

    analyst_login = login_user("analyst", "analyst123")
    assert analyst_login["access_token"], "Analyst login failed to return access token."
    print("-> Default pre-seeded analyst credentials verified.")

    # 3. Test New User Registration
    test_username = f"testanalyst_{int(time.time())}"
    test_email = f"{test_username}@cybershield.org"
    reg_result = register_new_user(
        username=test_username,
        email=test_email,
        password="SecurePassword99!",
        full_name="Alex Mercer",
        role="Incident Responder"
    )
    assert reg_result["access_token"], "Registration failed to return JWT token."
    assert reg_result["user"]["username"] == test_username, "Registered username mismatch."
    print(f"-> User registration verified for {test_username}.")

    # 4. Test Duplicate Prevention
    try:
        register_new_user(
            username=test_username,
            email="different@example.com",
            password="pwd",
            full_name="Duplicate User"
        )
        assert False, "Should have raised ValueError on duplicate username"
    except ValueError:
        print("-> Duplicate username prevention verified.")

    # 5. Test Login with New User
    login_result = login_user(test_username, "SecurePassword99!")
    assert login_result["access_token"], "Login failed with new user."
    print("-> Login authentication with valid password verified.")

    # 6. Test Invalid Password
    try:
        login_user(test_username, "WrongPassword123")
        assert False, "Should have raised ValueError on wrong password"
    except ValueError:
        print("-> Invalid password rejection verified.")

    # 7. Test JWT Token Decoding
    token = login_result["access_token"]
    decoded = decode_access_token(token)
    assert decoded is not None, "Failed to decode valid JWT token."
    assert decoded["username"] == test_username, "Decoded token username mismatch."
    print("-> JWT token decoding & validation verified.")

    print("=" * 70)
    print("ALL MONGODB AUTHENTICATION TESTS PASSED (100% SUCCESS)")
    print("=" * 70)

if __name__ == "__main__":
    test_auth_pipeline()
