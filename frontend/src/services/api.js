import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to all outgoing requests if present
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('threat_guard_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ====================================================================
// AUTHENTICATION APIS
// ====================================================================

export const loginUser = async (usernameOrEmail, password) => {
  const response = await apiClient.post('/auth/login', {
    username_or_email: usernameOrEmail,
    password: password
  });
  return response.data;
};

export const initiateRegister = async (userData) => {
  const response = await apiClient.post('/auth/register-initiate', userData);
  return response.data;
};

export const verifyRegisterOtp = async (tempSessionId, otpCode) => {
  const response = await apiClient.post('/auth/register-verify', {
    temp_session_id: tempSessionId,
    otp_code: otpCode
  });
  return response.data;
};

export const initiateForgotPassword = async (identifier) => {
  const response = await apiClient.post('/auth/forgot-password/initiate', {
    identifier: identifier
  });
  return response.data;
};

export const verifyForgotPassword = async (tempSessionId, otpCode, newPassword = null) => {
  const response = await apiClient.post('/auth/forgot-password/verify', {
    temp_session_id: tempSessionId,
    otp_code: otpCode,
    new_password: newPassword
  });
  return response.data;
};

export const resendAuthOtp = async (tempSessionId) => {
  const response = await apiClient.post('/auth/resend-otp', {
    temp_session_id: tempSessionId
  });
  return response.data;
};

export const getCurrentUserProfile = async () => {
  const response = await apiClient.get('/auth/me');
  return response.data;
};

export const getDemoAccounts = async () => {
  const response = await apiClient.get('/auth/demo-accounts');
  return response.data;
};

// ====================================================================
// THREAT DETECTION & DATASET APIS
// ====================================================================

export const predictAccount = async (featureData) => {
  const response = await apiClient.post('/predict', featureData);
  return response.data;
};

export const getDashboardStatistics = async () => {
  const response = await apiClient.get('/statistics');
  return response.data;
};

export const getHistory = async (limit = 100) => {
  const response = await apiClient.get(`/history?limit=${limit}`);
  return response.data;
};

export const getHistoryByAccount = async (accountId) => {
  const response = await apiClient.get(`/history/${encodeURIComponent(accountId)}`);
  return response.data;
};

export const getModelPerformance = async () => {
  const response = await apiClient.get('/benchmarks');
  return response.data;
};

export const getPresets = async () => {
  const response = await apiClient.get('/presets');
  return response.data;
};

export const getNetworkGraph = async () => {
  const response = await apiClient.get('/network-graph');
  return response.data;
};

export const triggerResponseAction = async (payload) => {
  const response = await apiClient.post('/respond', payload);
  return response.data;
};

export const checkHealth = async () => {
  const response = await apiClient.get('/health');
  return response.data;
};

export const fetchLiveAccount = async (address) => {
  const response = await apiClient.post('/fetch-live-account', { address });
  return response.data;
};

// Batch Dataset Analysis APIs
export const analyzeDataset = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post('/analyze-dataset', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const analyzeSampleDataset = async () => {
  const response = await apiClient.post('/analyze-sample-dataset');
  return response.data;
};

export const getSampleDatasetDownloadUrl = (type = "benchmark") => {
  return `${API_BASE_URL}/dataset/sample?type=${type}&format=csv`;
};
