"""
Authentication and User Account Pydantic Schemas.
Includes Email OTP Registration, Direct Login, and Forgot Password Recovery.
"""

from typing import Optional
from pydantic import BaseModel, Field

class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    email: str = Field(..., min_length=5, description="User corporate or personal email")
    password: str = Field(..., min_length=6, description="Account password (min 6 characters)")
    full_name: str = Field(..., min_length=2, max_length=100, description="Full name of analyst/officer")
    role: Optional[str] = Field("Threat Analyst", description="Security role (e.g. Security Lead, Threat Analyst, Incident Responder)")

class UserLoginRequest(BaseModel):
    username_or_email: str = Field(..., description="Username or registered email address")
    password: str = Field(..., description="Account password")

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    role: str
    created_at: str

class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# ====================================================================
# REGISTRATION OTP SCHEMAS
# ====================================================================

class RegisterInitiateResponse(BaseModel):
    requires_otp: bool = True
    temp_session_id: str = Field(..., description="Session token for pending registration")
    email_masked: str = Field(..., description="Masked target email address")
    dev_otp: Optional[str] = Field(None, description="Auto-generated OTP code for testing")
    message: str = "A 6-digit email verification code has been dispatched."

class RegisterVerifyOtpRequest(BaseModel):
    temp_session_id: str = Field(..., description="Temporary registration session ID")
    otp_code: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")

# ====================================================================
# FORGOT PASSWORD & RECOVERY SCHEMAS
# ====================================================================

class ForgotPasswordInitiateRequest(BaseModel):
    identifier: str = Field(..., description="Username or registered email address")

class ForgotPasswordInitiateResponse(BaseModel):
    temp_session_id: str = Field(..., description="Temporary recovery session ID")
    email_masked: str = Field(..., description="Masked recipient email address")
    dev_otp: Optional[str] = Field(None, description="Auto-generated OTP code for testing")
    message: str = "A 6-digit recovery code has been dispatched."

class ForgotPasswordVerifyRequest(BaseModel):
    temp_session_id: str = Field(..., description="Temporary recovery session ID")
    otp_code: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")
    new_password: Optional[str] = Field(None, min_length=6, description="Optional new password to set")

# ====================================================================
# RESEND OTP SCHEMAS
# ====================================================================

class ResendOtpRequest(BaseModel):
    temp_session_id: str = Field(..., description="Active session ID to refresh OTP")

class ResendOtpResponse(BaseModel):
    temp_session_id: str
    message: str
    dev_otp: Optional[str] = None
