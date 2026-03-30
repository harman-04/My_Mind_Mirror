import axios from 'axios';
import { toast } from 'sonner';

// Optional: Configure default base URL
axios.defaults.baseURL = 'http://localhost:8080/api';

// Request interceptor – add auth token automatically
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwtToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor – handle common errors globally
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response, request } = error;

    // Network error (no response from server)
    if (!response) {
      if (request) {
        toast.error('Network error. Cannot reach the server.', {
          description: 'Please check your internet connection and try again.',
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
        toast.error('Session expired', {
          description: 'Please log in again.',
        });
        // Clear token and redirect to login
        localStorage.removeItem('jwtToken');
        window.location.href = '/login';
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