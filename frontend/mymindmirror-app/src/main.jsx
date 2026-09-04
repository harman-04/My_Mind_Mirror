import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ThemeProvider } from './contexts/ThemeContext';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import './utils/axiosConfig';
import InstallPrompt from './components/InstallPrompt';

// 💡 UPGRADE 1: Modernized React Query Config
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,     // Data is fresh for 5 minutes
      gcTime: 10 * 60 * 1000,       // 💡 FIXED: Renamed from cacheTime for React Query v5+
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      retry: 1,                     // 💡 ADDED: Prevents spamming your backend on 401/404 errors
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  // 💡 UPGRADE 2: Added StrictMode to catch hidden memory leaks in development
  <React.StrictMode>
    <ThemeProvider>
      <Router>
        <QueryClientProvider client={queryClient}>
          <App />

          {/* Global UI Overlays */}
          <Toaster position="top-right" richColors closeButton />
          <InstallPrompt />

        </QueryClientProvider>
      </Router>
    </ThemeProvider>
  </React.StrictMode>
);