// src/components/ThemeToggle.jsx
import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === 'dark';

    // Premium Glass‑morphic background styles
    const buttonBg = isDarkMode
        ? 'bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/5'
        : 'bg-black/5 backdrop-blur-md hover:bg-black/10 border border-black/5';

    return (
        <button
            onClick={toggleTheme}
            className={`p-2 sm:p-2.5 rounded-full transition-all duration-300
                        ${buttonBg}
                        shadow-sm hover:shadow-md hover:scale-105 active:scale-95
                        focus:outline-none focus:ring-2 focus:ring-offset-2
                        ${isDarkMode
                            ? 'focus:ring-teal-500 focus:ring-offset-gray-900'
                            : 'focus:ring-purple-500 focus:ring-offset-gray-50'}
                        flex items-center justify-center group`}
            aria-label="Toggle theme"
            title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
        >
            <div className="relative flex items-center justify-center w-5 h-5">
                {isDarkMode ? (
                    <Sun
                        size={20}
                        className="absolute text-yellow-400 transition-all duration-500 transform
                                   group-hover:rotate-90 group-hover:scale-110"
                    />
                ) : (
                    <Moon
                        size={20}
                        className="absolute text-purple-600 transition-all duration-500 transform
                                   group-hover:-rotate-12 group-hover:scale-110"
                    />
                )}
            </div>
        </button>
    );
};

export default React.memo(ThemeToggle);