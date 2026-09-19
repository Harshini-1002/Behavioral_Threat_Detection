import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ArrowLeft,
  Database, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Cpu,
  KeyRound,
  Clock,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const { 
    login, 
    initiateRegistration, 
    confirmRegistration, 
    initiateRecovery, 
    confirmRecovery, 
    resendOtp 
  } = useAuth();

  // Navigation mode: 'login' | 'register' | 'register-otp' | 'forgot-password'
  const [viewMode, setViewMode] = useState('login');
  const [forgotStep, setForgotStep] = useState('request'); // 'request' | 'verify'

  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Direct Login Form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Registration Form state
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('Threat Analyst');

  // Registration OTP session state
  const [regSession, setRegSession] = useState(null); // { temp_session_id, email_masked, dev_otp }
  const [regOtpCode, setRegOtpCode] = useState('');
  const [regCountdown, setRegCountdown] = useState(300);

  // Forgot Password / Recovery state
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [recoverySession, setRecoverySession] = useState(null);
  const [recoveryOtpCode, setRecoveryOtpCode] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryCountdown, setRecoveryCountdown] = useState(300);

  // Countdown timer for Registration OTP
  useEffect(() => {
    let timer = null;
    if (viewMode === 'register-otp' && regCountdown > 0) {
      timer = setInterval(() => {
        setRegCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [viewMode, regCountdown]);

  // Countdown timer for Forgot Password OTP
  useEffect(() => {
    let timer = null;
    if (viewMode === 'forgot-password' && forgotStep === 'verify' && recoveryCountdown > 0) {
      timer = setInterval(() => {
        setRecoveryCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [viewMode, forgotStep, recoveryCountdown]);

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ====================================================================
  // HANDLERS: DIRECT LOGIN
  // ====================================================================
  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      await login(loginIdentifier, loginPassword);
      // Logged in directly!
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (username, password) => {
    setLoginIdentifier(username);
    setLoginPassword(password);
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  // ====================================================================
  // HANDLERS: REGISTRATION WITH EMAIL OTP
  // ====================================================================
  const handleRegisterInitiate = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const data = await initiateRegistration({
        username: regUsername,
        email: regEmail,
        password: regPassword,
        full_name: regFullName,
        role: regRole
      });

      setRegSession(data);
      setRegOtpCode('');
      setRegCountdown(300);
      setViewMode('register-otp');
      setSuccessMsg(`Verification code sent to ${data.email_masked}`);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterVerify = async (e) => {
    if (e) e.preventDefault();
    if (!regSession || !regSession.temp_session_id) {
      setError('Registration session expired. Please start again.');
      setViewMode('register');
      return;
    }
    if (regOtpCode.trim().length !== 6) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      await confirmRegistration(regSession.temp_session_id, regOtpCode.trim());
      // On success, AuthContext sets user and App transitions to authenticated layout
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Verification failed. Please check your code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendRegisterOtp = async () => {
    if (!regSession || !regSession.temp_session_id) return;
    setError(null);
    setSuccessMsg(null);
    setResending(true);

    try {
      const res = await resendOtp(regSession.temp_session_id);
      if (res && res.dev_otp) {
        setRegSession((prev) => ({ ...prev, dev_otp: res.dev_otp }));
      }
      setRegOtpCode('');
      setRegCountdown(300);
      setSuccessMsg('A new verification code has been dispatched.');
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  // ====================================================================
  // HANDLERS: FORGOT PASSWORD / LOGIN VIA OTP
  // ====================================================================
  const handleForgotInitiate = async (e) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      setError('Please enter your username or registered email.');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const data = await initiateRecovery(forgotIdentifier.trim());
      setRecoverySession(data);
      setRecoveryOtpCode('');
      setRecoveryCountdown(300);
      setForgotStep('verify');
      setSuccessMsg(`Recovery code dispatched to ${data.email_masked}`);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Account not found.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotVerify = async (e) => {
    if (e) e.preventDefault();
    if (!recoverySession || !recoverySession.temp_session_id) {
      setError('Recovery session expired. Please request a new code.');
      setForgotStep('request');
      return;
    }
    if (recoveryOtpCode.trim().length !== 6) {
      setError('Please enter a valid 6-digit recovery code.');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      await confirmRecovery(
        recoverySession.temp_session_id, 
        recoveryOtpCode.trim(), 
        recoveryNewPassword.trim() || null
      );
      // Logged in directly!
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to verify recovery code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendRecoveryOtp = async () => {
    if (!recoverySession || !recoverySession.temp_session_id) return;
    setError(null);
    setSuccessMsg(null);
    setResending(true);

    try {
      const res = await resendOtp(recoverySession.temp_session_id);
      if (res && res.dev_otp) {
        setRecoverySession((prev) => ({ ...prev, dev_otp: res.dev_otp }));
      }
      setRecoveryOtpCode('');
      setRecoveryCountdown(300);
      setSuccessMsg('A new recovery code has been dispatched.');
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, rgba(15, 23, 42, 0.95) 0%, rgba(3, 7, 18, 1) 100%)',
      padding: '1.5rem'
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        background: 'rgba(15, 23, 42, 0.85)',
        border: '1px solid rgba(6, 182, 212, 0.35)',
        borderRadius: '16px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(6, 182, 212, 0.15)',
        backdropFilter: 'blur(16px)',
        overflow: 'hidden'
      }}>
        {/* Header Branding */}
        <div style={{
          padding: '2rem 2rem 1.25rem 2rem',
          textAlign: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'linear-gradient(180deg, rgba(6, 182, 212, 0.08) 0%, transparent 100%)'
        }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
            border: '1px solid rgba(6, 182, 212, 0.4)',
            color: '#06b6d4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem auto',
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)'
          }}>
            {viewMode === 'register-otp' ? (
              <Mail size={28} />
            ) : viewMode === 'forgot-password' ? (
              <KeyRound size={28} />
            ) : (
              <ShieldCheck size={28} />
            )}
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, margin: '0 0 0.35rem 0', color: '#f8fafc' }}>
            Behavioral Threat Detection
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
            {viewMode === 'register-otp'
              ? 'Verify Email to Activate Account'
              : viewMode === 'forgot-password'
              ? 'Password Recovery & Login via OTP'
              : 'Decentralized Ledger Networks &bull; Security Console'}
          </p>
        </div>

        {/* Tab Selector (visible on main login and register views) */}
        {(viewMode === 'login' || viewMode === 'register') && (
          <div style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            background: 'rgba(3, 7, 18, 0.4)'
          }}>
            <button
              onClick={() => { setViewMode('login'); setError(null); setSuccessMsg(null); }}
              style={{
                flex: 1,
                padding: '0.9rem',
                background: 'transparent',
                border: 'none',
                borderBottom: viewMode === 'login' ? '2px solid #06b6d4' : '2px solid transparent',
                color: viewMode === 'login' ? '#06b6d4' : '#64748b',
                fontWeight: viewMode === 'login' ? 600 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => { setViewMode('register'); setError(null); setSuccessMsg(null); }}
              style={{
                flex: 1,
                padding: '0.9rem',
                background: 'transparent',
                border: 'none',
                borderBottom: viewMode === 'register' ? '2px solid #06b6d4' : '2px solid transparent',
                color: viewMode === 'register' ? '#06b6d4' : '#64748b',
                fontWeight: viewMode === 'register' ? 600 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Content Body */}
        <div style={{ padding: '1.75rem 2rem' }}>
          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.82rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={16} flexShrink={0} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              fontSize: '0.82rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <CheckCircle2 size={16} flexShrink={0} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ==================================================================== */}
          {/* VIEW 1: DIRECT SIGN IN (NO 2-STEP VERIFICATION) */}
          {/* ==================================================================== */}
          {viewMode === 'login' && (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 500 }}>
                  Username or Email
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="e.g. admin or analyst@threatguard.eth"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.65rem 0.85rem 0.65rem 2.35rem',
                      background: 'rgba(3, 7, 18, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500 }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('forgot-password');
                      setForgotStep('request');
                      setForgotIdentifier(loginIdentifier);
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#06b6d4',
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      padding: 0,
                      fontWeight: 500
                    }}
                  >
                    Forgot password? Login with OTP
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter account password"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.65rem 2.35rem 0.65rem 2.35rem',
                      background: 'rgba(3, 7, 18, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '0.88rem'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '10px',
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.92rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginTop: '0.5rem'
                }}
              >
                {loading ? <RefreshCw size={18} className="spin" /> : <ArrowRight size={18} />}
                {loading ? 'Signing In...' : 'Sign In to Console'}
              </button>

              {/* Quick 1-Click Demo Logins */}
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: '0.74rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.65rem', fontWeight: 600 }}>
                  Quick 1-Click Demo Logins
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin', 'admin123')}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '6px',
                      background: 'rgba(6, 182, 212, 0.1)',
                      border: '1px solid rgba(6, 182, 212, 0.25)',
                      color: '#38bdf8',
                      fontSize: '0.78rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    Security Lead (admin)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('analyst', 'analyst123')}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '6px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      color: '#60a5fa',
                      fontSize: '0.78rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    Threat Analyst (analyst)
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ==================================================================== */}
          {/* VIEW 2: CREATE ACCOUNT FORM (INITIATES EMAIL OTP) */}
          {/* ==================================================================== */}
          {viewMode === 'register' && (
            <form onSubmit={handleRegisterInitiate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 500 }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="e.g. Alex Mercer"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.65rem 0.85rem 0.65rem 2.35rem',
                      background: 'rgba(3, 7, 18, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 500 }}>
                  Username
                </label>
                <div style={{ position: 'relative' }}>
                  <Cpu size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="e.g. alex_security"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.65rem 0.85rem 0.65rem 2.35rem',
                      background: 'rgba(3, 7, 18, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 500 }}>
                  Corporate / Web3 Email (Verification code will be sent here)
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="alex@threatguard.eth"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.65rem 0.85rem 0.65rem 2.35rem',
                      background: 'rgba(3, 7, 18, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 500 }}>
                  Password (min 6 chars)
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create strong password"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.65rem 0.85rem 0.65rem 2.35rem',
                      background: 'rgba(3, 7, 18, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 500 }}>
                  Security Role
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '0.65rem 0.85rem',
                    background: 'rgba(3, 7, 18, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '0.88rem'
                  }}
                >
                  <option value="Threat Analyst">Threat Analyst</option>
                  <option value="Security Lead">Security Lead</option>
                  <option value="Incident Responder">Incident Responder</option>
                  <option value="Smart Contract Auditor">Smart Contract Auditor</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.92rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginTop: '0.5rem'
                }}
              >
                {loading ? <RefreshCw size={18} className="spin" /> : <Mail size={18} />}
                {loading ? 'Dispatching OTP...' : 'Send Verification Code'}
              </button>
            </form>
          )}

          {/* ==================================================================== */}
          {/* VIEW 3: REGISTRATION EMAIL OTP VERIFICATION */}
          {/* ==================================================================== */}
          {viewMode === 'register-otp' && (
            <form onSubmit={handleRegisterVerify} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '20px',
                  background: 'rgba(6, 182, 212, 0.12)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  color: '#06b6d4',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  marginBottom: '0.65rem'
                }}>
                  <Mail size={13} />
                  <span>Email Verification</span>
                </div>
                <h3 style={{ fontSize: '1.15rem', color: '#f8fafc', margin: '0 0 0.4rem 0', fontWeight: 600 }}>
                  Enter 6-Digit Email Code
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
                  A verification code has been dispatched to{' '}
                  <strong style={{ color: '#38bdf8' }}>{regSession?.email_masked}</strong>
                </p>
              </div>

              <div>
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    value={regOtpCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setRegOtpCode(val);
                    }}
                    placeholder="------"
                    style={{
                      width: '220px',
                      padding: '0.75rem 1rem',
                      background: 'rgba(3, 7, 18, 0.8)',
                      border: '2px solid rgba(6, 182, 212, 0.5)',
                      borderRadius: '10px',
                      color: '#38bdf8',
                      fontFamily: 'monospace',
                      fontSize: '1.6rem',
                      fontWeight: 700,
                      letterSpacing: '0.45rem',
                      textAlign: 'center',
                      boxShadow: '0 0 15px rgba(6, 182, 212, 0.2)'
                    }}
                  />
                </div>
              </div>

              {/* Countdown Timer */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                fontSize: '0.82rem',
                color: regCountdown <= 30 ? '#ef4444' : regCountdown <= 60 ? '#f59e0b' : '#94a3b8'
              }}>
                <Clock size={15} />
                <span>Code expires in: <strong>{formatCountdown(regCountdown)}</strong></span>
              </div>



              <button
                type="submit"
                disabled={loading || regOtpCode.length !== 6 || regCountdown === 0}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.92rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  opacity: (loading || regOtpCode.length !== 6 || regCountdown === 0) ? 0.6 : 1,
                  cursor: (loading || regOtpCode.length !== 6 || regCountdown === 0) ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? <RefreshCw size={18} className="spin" /> : <CheckCircle2 size={18} />}
                {loading ? 'Activating Account...' : 'Verify Code & Create Account'}
              </button>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '0.5rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('register');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.25rem 0.5rem'
                  }}
                >
                  <ArrowLeft size={14} />
                  <span>Edit Details</span>
                </button>

                <button
                  type="button"
                  onClick={handleResendRegisterOtp}
                  disabled={resending}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#06b6d4',
                    fontSize: '0.8rem',
                    cursor: resending ? 'not-allowed' : 'pointer',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.25rem 0.5rem'
                  }}
                >
                  {resending ? <RefreshCw size={14} className="spin" /> : <RefreshCw size={14} />}
                  <span>{resending ? 'Resending...' : 'Resend Code'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ==================================================================== */}
          {/* VIEW 4: FORGOT PASSWORD / LOGIN VIA OTP */}
          {/* ==================================================================== */}
          {viewMode === 'forgot-password' && (
            <div>
              {forgotStep === 'request' ? (
                /* Step A: Request OTP */
                <form onSubmit={handleForgotInitiate} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                  <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.15rem', color: '#f8fafc', margin: '0 0 0.35rem 0', fontWeight: 600 }}>
                      Password Recovery
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
                      Enter your username or registered email. We'll send a 6-digit OTP allowing you to log in directly.
                    </p>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 500 }}>
                      Username or Registered Email
                    </label>
                    <div style={{ position: 'relative' }}>
                      <User size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                      <input
                        type="text"
                        required
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        placeholder="e.g. analyst or analyst@threatguard.eth"
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '0.65rem 0.85rem 0.65rem 2.35rem',
                          background: 'rgba(3, 7, 18, 0.6)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          color: '#f8fafc',
                          fontSize: '0.88rem'
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      fontSize: '0.92rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      marginTop: '0.5rem'
                    }}
                  >
                    {loading ? <RefreshCw size={18} className="spin" /> : <KeyRound size={18} />}
                    {loading ? 'Sending Recovery Code...' : 'Send Recovery OTP'}
                  </button>

                  <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('login');
                        setError(null);
                        setSuccessMsg(null);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <ArrowLeft size={14} />
                      <span>Back to Sign In</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Step B: Verify OTP & Login / Reset Password */
                <form onSubmit={handleForgotVerify} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '20px',
                      background: 'rgba(6, 182, 212, 0.12)',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                      color: '#06b6d4',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      marginBottom: '0.65rem'
                    }}>
                      <KeyRound size={13} />
                      <span>OTP Login & Password Reset</span>
                    </div>
                    <h3 style={{ fontSize: '1.15rem', color: '#f8fafc', margin: '0 0 0.4rem 0', fontWeight: 600 }}>
                      Enter Recovery Code
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
                      Code sent to <strong style={{ color: '#38bdf8' }}>{recoverySession?.email_masked}</strong>
                    </p>
                  </div>

                  {/* 6-digit OTP code */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 500, textAlign: 'center' }}>
                      6-Digit Recovery Code
                    </label>
                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        autoFocus
                        value={recoveryOtpCode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setRecoveryOtpCode(val);
                        }}
                        placeholder="------"
                        style={{
                          width: '220px',
                          padding: '0.75rem 1rem',
                          background: 'rgba(3, 7, 18, 0.8)',
                          border: '2px solid rgba(6, 182, 212, 0.5)',
                          borderRadius: '10px',
                          color: '#38bdf8',
                          fontFamily: 'monospace',
                          fontSize: '1.6rem',
                          fontWeight: 700,
                          letterSpacing: '0.45rem',
                          textAlign: 'center',
                          boxShadow: '0 0 15px rgba(6, 182, 212, 0.2)'
                        }}
                      />
                    </div>
                  </div>

                  {/* Optional New Password */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 500 }}>
                      Set New Password <span style={{ color: '#64748b' }}>(Optional - leave blank to login without changing)</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={recoveryNewPassword}
                        onChange={(e) => setRecoveryNewPassword(e.target.value)}
                        placeholder="Enter new password (optional)"
                        minLength={6}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '0.65rem 2.35rem 0.65rem 2.35rem',
                          background: 'rgba(3, 7, 18, 0.6)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          color: '#f8fafc',
                          fontSize: '0.88rem'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '10px',
                          background: 'transparent',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer'
                        }}
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Countdown Timer */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    fontSize: '0.82rem',
                    color: recoveryCountdown <= 30 ? '#ef4444' : recoveryCountdown <= 60 ? '#f59e0b' : '#94a3b8'
                  }}>
                    <Clock size={15} />
                    <span>Code expires in: <strong>{formatCountdown(recoveryCountdown)}</strong></span>
                  </div>



                  <button
                    type="submit"
                    disabled={loading || recoveryOtpCode.length !== 6 || recoveryCountdown === 0}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      fontSize: '0.92rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      opacity: (loading || recoveryOtpCode.length !== 6 || recoveryCountdown === 0) ? 0.6 : 1,
                      cursor: (loading || recoveryOtpCode.length !== 6 || recoveryCountdown === 0) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {loading ? <RefreshCw size={18} className="spin" /> : <CheckCircle2 size={18} />}
                    {loading ? 'Authenticating...' : 'Verify OTP & Enter Console'}
                  </button>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '0.5rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)'
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep('request');
                        setError(null);
                        setSuccessMsg(null);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.25rem 0.5rem'
                      }}
                    >
                      <ArrowLeft size={14} />
                      <span>Back to Username</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResendRecoveryOtp}
                      disabled={resending}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#06b6d4',
                        fontSize: '0.8rem',
                        cursor: resending ? 'not-allowed' : 'pointer',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.25rem 0.5rem'
                      }}
                    >
                      {resending ? <RefreshCw size={14} className="spin" /> : <RefreshCw size={14} />}
                      <span>{resending ? 'Resending...' : 'Resend Code'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer MongoDB Status */}
        <div style={{
          padding: '0.85rem 1.5rem',
          background: 'rgba(3, 7, 18, 0.7)',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.74rem',
          color: '#64748b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Database size={13} color="#10b981" />
            <span>MongoDB Connected (127.0.0.1:27017)</span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', color: '#10b981' }}>SYSTEM SECURE</span>
        </div>
      </div>
    </div>
  );
}
