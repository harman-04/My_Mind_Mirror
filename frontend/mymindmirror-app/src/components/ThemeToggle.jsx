// src/components/ThemeToggle.jsx

import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === 'dark';

    // Glass‑morphic background styles
    const buttonBg = isDarkMode
        ? 'bg-white/10 backdrop-blur-md hover:bg-white/20'
        : 'bg-black/5 backdrop-blur-md hover:bg-black/10';

    return (
        <button
            onClick={toggleTheme}
            className={`p-2 rounded-full transition-all duration-500
                        ${buttonBg}
                        shadow-md hover:shadow-lg
                        focus:outline-none focus:ring-2 focus:ring-offset-2
                        ${isDarkMode
                            ? 'focus:ring-teal-500 focus:ring-offset-gray-900'
                            : 'focus:ring-purple-500 focus:ring-offset-gray-50'}
                        flex items-center justify-center
                        group`}
            aria-label="Toggle theme"
            title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
        >
            {isDarkMode ? (
                <Sun
                    size={20}
                    className="text-yellow-400 transition-all duration-300
                               group-hover:rotate-90 group-hover:scale-110"
                />
            ) : (
                <Moon
                    size={20}
                    className="text-purple-600 transition-all duration-300
                               group-hover:rotate-12 group-hover:scale-110"
                />
            )}
        </button>
    );
};

export default ThemeToggle;