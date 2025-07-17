// src/contexts/ThemeContext.jsx

import React, { createContext, useContext, useState, useEffect } from 'react';

// 1. Create the Context
export const ThemeContext = createContext(null); // Explicitly set default value to null for clarity

// 2. Create the custom hook to use the ThemeContext
//    This hook MUST be exported so other components can import and use it.
//    It should be defined *before* the ThemeProvider for robust module evaluation.
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // This error indicates useTheme was called outside of a ThemeProvider
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// 3. Create the Provider Component
//    This component MUST be exported so it can wrap your application in main.jsx.
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme;
    }
    // Check user's system preference only if no theme is saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement; // Get the <html> element
    
    // Add transition classes directly to the <html> element for smooth global theme transitions.
    root.classList.add('transition-colors', 'duration-500'); 
    
    // Ensure only the current theme class is present
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    
    // Save the theme preference to localStorage
    localStorage.setItem('theme', theme);

    console.log(`Theme set to: ${theme}`);
  }, [theme]); // Re-run effect when theme changes

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
