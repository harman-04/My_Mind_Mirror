// src/utils/axiosConfig.js
import axios from 'axios';
import { toast } from 'sonner';

// 💡 UPGRADE 1: Environment Variables for Production
// If VITE_API_BASE_URL is set in your .env file, it uses that. Otherwise, defaults to localhost.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
axios.defaults.baseURL = API_BASE_URL;

// Request interceptor – add auth token automatically
axios.interceptors.request.use(
  (config) => {
    // 💡 UPGRADE 2: Security check! Only attach JWT if the request is going to YOUR backend.
    const isOurBackend = config.url?.startsWith(API_BASE_URL) || config.url?.startsWith('/');

    if (isOurBackend) {
      const token = localStorage.getItem('jwtToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor – handle common errors globally
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response, request, config } = error;

    // 💡 UPGRADE 3: Allow specific API calls to bypass global toasts if they want to handle it themselves
    if (config?.hideGlobalError) {
      return Promise.reject(error);
    }

    // Network error (no response from server)
    if (!response) {
      if (request) {
        toast.error('Network error. Cannot reach the server.', {
          description: 'Please check your internet connection and verify the backend is running.',
        });
      } else {
        toast.error('Request setup error', {
          description: error.message,
        });
      }
      return Promise.reject(error);
    }

    const { status, data } = response;
    const errorMessage = data?.message || data?.error || 'An unexpected error occurred.';

    // Handle specific status codes
    switch (status) {
      case 400:
        toast.error('Bad Request', { description: errorMessage });
        break;
      case 401:
        // Only toast and redirect if we aren't already on the login page
        if (window.location.pathname !== '/login') {
            toast.error('Session expired', {
            description: 'Please log in again.',
            });
            localStorage.removeItem('jwtToken');
            window.location.href = '/login';
        }
        break;
      case 403:
        toast.error('Access Denied', {
          description: 'You do not have permission to perform this action.',
        });
        break;
      case 429:
        toast.error('Rate limit exceeded', {
          description: 'Too many requests. Please wait a moment and try again.',
        });
        break;
      case 500:
      case 503:
        toast.error('Service Unavailable', {
          description: 'Our AI service is temporarily unavailable. Please try again later.',
        });
        break;
      default:
        toast.error(`Error ${status}`, { description: errorMessage });
    }

    return Promise.reject(error);
  }
);

export default axios;