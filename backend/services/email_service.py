"""
Email Dispatch Service for Behavioral Threat Detection System.
Sends cryptographic OTP verification emails via Gmail SMTP.
"""

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_EMAIL = os.getenv("SMTP_EMAIL", "23r01a05t9@gmail.com")
# Strip spaces from 16-character Gmail App Password
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "bcutbdqcznxrukpb").replace(" ", "")

def send_otp_email(recipient_email: str, otp_code: str, purpose: str = "Account Registration") -> bool:
    """
    Dispatches a professional HTML & plaintext OTP verification email.
    """
    if not recipient_email or "@" not in recipient_email:
        print(f"[EMAIL_SERVICE_WARN] Invalid recipient email address: '{recipient_email}'")
        return False

    # Avoid attempting real SMTP delivery to placeholder domain .eth or test accounts
    if recipient_email.endswith(".eth") or recipient_email.endswith("@test.com"):
        print(f"[EMAIL_SERVICE_INFO] Recipient is simulated internal domain '{recipient_email}'. Logged OTP: {otp_code}")
        return True

    subject = f"[{purpose}] Your Security Verification Code: {otp_code}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #0b1120;
          color: #e2e8f0;
          margin: 0;
          padding: 20px;
        }}
        .container {{
          max-width: 520px;
          margin: 0 auto;
          background: #0f172a;
          border: 1px solid #06b6d4;
          border-radius: 12px;
          padding: 30px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }}
        .header {{
          text-align: center;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }}
        .title {{
          color: #06b6d4;
          font-size: 20px;
          font-weight: bold;
          margin: 10px 0 4px 0;
        }}
        .subtitle {{
          color: #94a3b8;
          font-size: 13px;
        }}
        .content {{
          padding: 24px 0;
          text-align: center;
        }}
        .otp-box {{
          display: inline-block;
          background: rgba(6, 182, 212, 0.1);
          border: 2px dashed #06b6d4;
          color: #38bdf8;
          font-size: 36px;
          font-weight: bold;
          letter-spacing: 8px;
          padding: 14px 28px;
          border-radius: 8px;
          margin: 20px 0;
          font-family: monospace;
        }}
        .notice {{
          color: #cbd5e1;
          font-size: 14px;
          line-height: 1.6;
        }}
        .footer {{
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid rgba(255,255,255,0.06);
          text-align: center;
          font-size: 12px;
          color: #64748b;
        }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div style="font-size: 32px;">🛡️</div>
          <div class="title">Behavioral Threat Detection System</div>
          <div class="subtitle">Distributed Ledger Networks &bull; Security Verification</div>
        </div>
        <div class="content">
          <p class="notice">
            A request was initiated for <strong>{purpose}</strong> on your security analyst account.
          </p>
          <div class="otp-box">{otp_code}</div>
          <p class="notice" style="color: #f59e0b;">
            ⏳ This One-Time Password is valid for <strong>5 minutes</strong>.
          </p>
          <p class="notice" style="font-size: 12px; color: #94a3b8;">
            Please enter this 6-digit code in the security console to complete verification.
          </p>
        </div>
        <div class="footer">
          If you did not request this verification code, please ignore this email or notify your Security Lead.<br>
          Sent via Automated Threat Intelligence Gateway.
        </div>
      </div>
    </body>
    </html>
    """

    plain_text = f"""
    Behavioral Threat Detection System
    -----------------------------------
    Action: {purpose}
    Your Verification Code: {otp_code}

    This code is valid for 5 minutes.
    If you did not request this, please disregard this email.
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Behavioral Threat Detection <{SMTP_EMAIL}>"
    msg["To"] = recipient_email

    msg.attach(MIMEText(plain_text, "plain"))
    msg.attach(MIMEText(html_content, "html"))

    try:
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=12)
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.sendmail(SMTP_EMAIL, recipient_email, msg.as_string())
        server.quit()
        print(f"[EMAIL_SERVICE_SUCCESS] OTP email dispatched to '{recipient_email}' for {purpose}")
        return True
    except Exception as e:
        print(f"[EMAIL_SERVICE_ERROR] Failed to send OTP email to '{recipient_email}': {str(e)}")
        return False
