import axios from 'axios';
import { Platform } from 'react-native';
import { tokenStorage } from '../utils/storage';

const getApiUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:3000/api/v1';
  }
  return 'https://epl-1-498g.onrender.com/api/v1';
};

export const API_BASE_URL = getApiUrl();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// In-memory tokens for fast synchronous access in interceptors
let accessToken: string | null = null;
let refreshToken: string | null = null;

export const setInMemoryTokens = (access: string | null, refresh: string | null) => {
  accessToken = access;
  refreshToken = refresh;
};

export const getInMemoryAccessToken = () => accessToken;
export const getInMemoryRefreshToken = () => refreshToken;

// Request Interceptor: Attach the access token
apiClient.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle token refresh on 401
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if the error is 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url === '/auth/refresh' || originalRequest.url === '/auth/login') {
        // If refresh token request itself fails, clear session
        setInMemoryTokens(null, null);
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue the request while refreshing
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken = refreshToken || (await tokenStorage.getItem('refresh_token'));

        if (!storedRefreshToken) {
          throw new Error('No refresh token available');
        }

        // Call the refresh endpoint
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken: storedRefreshToken,
        });

        const newAccessToken = response.data.data.accessToken;
        const newRefreshToken = response.data.data.refreshToken;

        // Save new tokens
        setInMemoryTokens(newAccessToken, newRefreshToken);
        await tokenStorage.setItem('access_token', newAccessToken);
        if (newRefreshToken) {
          await tokenStorage.setItem('refresh_token', newRefreshToken);
        }

        isRefreshing = false;
        processQueue(null, newAccessToken);

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError, null);

        // Log out user by clearing storage
        await tokenStorage.deleteItem('access_token');
        await tokenStorage.deleteItem('refresh_token');
        setInMemoryTokens(null, null);

        return Promise.reject(refreshError);
      }
    }

    // Format server error response messages
    const message = error.response?.data?.message || 'Something went wrong';
    error.friendlyMessage = message;
    return Promise.reject(error);
  }
);

export default apiClient;
