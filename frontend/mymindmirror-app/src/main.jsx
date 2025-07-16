// src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ThemeProvider } from './contexts/ThemeContext';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'; // Optional: for debugging

// Create a client for Tanstack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered "fresh" for 5 minutes.
      // If a component requests data within this time, it gets it from cache without a network request.
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Data stays in cache for 10 minutes after the last component observing it unmounts.
      // This helps if a user navigates away and quickly comes back.
      cacheTime: 10 * 60 * 1000, // 10 minutes
      // By default, Tanstack Query refetches on window focus and component mount.
      // We will keep refetchOnWindowFocus as true for general freshness (e.g., if you leave the tab open for a long time).
      // refetchOnMount will be managed on a per-query basis if needed.
      refetchOnWindowFocus: true,
      refetchOnMount: true,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode> // You had this commented out, keeping it that way.
    <ThemeProvider>
      <Router>
        <QueryClientProvider client={queryClient}>
          <App />
          {/* Optional: React Query Devtools for easy debugging in development */}
          {/* You can remove this line for production builds */}
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </Router>
    </ThemeProvider>
  // </React.StrictMode>,
);
