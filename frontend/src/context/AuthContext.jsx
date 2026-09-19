import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  loginUser, 
  initiateRegister, 
  verifyRegisterOtp, 
  initiateForgotPassword, 
  verifyForgotPassword, 
  resendAuthOtp, 
  getCurrentUserProfile 
} from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('threat_guard_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyExistingToken = async () => {
      const storedToken = localStorage.getItem('threat_guard_token');
      if (storedToken) {
        try {
          const profile = await getCurrentUserProfile();
          setUser(profile);
          setToken(storedToken);
        } catch (err) {
          console.warn('[AUTH] Session expired or invalid, clearing credentials.');
          localStorage.removeItem('threat_guard_token');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    verifyExistingToken();
  }, []);

  /**
   * Direct Sign In (No 2-Step OTP Prompt)
   */
  const login = async (usernameOrEmail, password) => {
    const data = await loginUser(usernameOrEmail, password);
    localStorage.setItem('threat_guard_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  /**
   * Step 1 Account Registration: Dispatches email OTP
   */
  const initiateRegistration = async (userData) => {
    const data = await initiateRegister(userData);
    return data;
  };

  /**
   * Step 2 Account Registration: Validates OTP and creates user in MongoDB
   */
  const confirmRegistration = async (tempSessionId, otpCode) => {
    const data = await verifyRegisterOtp(tempSessionId, otpCode);
    localStorage.setItem('threat_guard_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  /**
   * Step 1 Forgot Password: Generates recovery OTP for username/email
   */
  const initiateRecovery = async (identifier) => {
    const data = await initiateForgotPassword(identifier);
    return data;
  };

  /**
   * Step 2 Forgot Password: Validates OTP, optionally resets password, and logs user in
   */
  const confirmRecovery = async (tempSessionId, otpCode, newPassword = null) => {
    const data = await verifyForgotPassword(tempSessionId, otpCode, newPassword);
    localStorage.setItem('threat_guard_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  /**
   * Refreshes OTP code for registration or recovery
   */
  const resendOtp = async (tempSessionId) => {
    const data = await resendAuthOtp(tempSessionId);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('threat_guard_token');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      login, 
      initiateRegistration, 
      confirmRegistration, 
      initiateRecovery, 
      confirmRecovery, 
      resendOtp, 
      logout, 
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
