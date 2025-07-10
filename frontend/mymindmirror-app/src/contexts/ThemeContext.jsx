import React, { createContext, useContext, useState, useEffect } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement; // Get the <html> element
    
    // Add transition classes directly to the <html> element.
    // This is crucial for smooth global theme transitions controlled by 'dark' class.
    root.classList.add('transition-colors', 'duration-500'); 
    
    // Remove both 'light' and 'dark' classes before adding the current one
    root.classList.remove('light', 'dark');
    // Add the current theme class to <html>
    root.classList.add(theme);
    
    // Save the theme preference
    localStorage.setItem('theme', theme);

    console.log(`Theme set to: ${theme}`);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
