// src/components/AppLogo.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

function AppLogo() {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    const isAuthenticated = localStorage.getItem('jwtToken');
    const logoLinkPath = isAuthenticated ? '/journal' : '/';

    // Theme‑based colours for the indicator
    const ringColor = isDarkMode ? '#5CC8C2' : '#B399D4';      // teal in dark, purple in light
    const ringBg = isDarkMode ? 'rgba(92,200,194,0.2)' : 'rgba(179,153,212,0.2)';
    const dotColor = isDarkMode ? 'bg-teal-500' : 'bg-purple-500';

    const colors = {
        iconColor: isDarkMode ? 'text-teal-300' : 'text-purple-600',
        iconGlow: isDarkMode ? 'drop-shadow(0 0 4px rgba(45,212,191,0.5))' : 'drop-shadow(0 0 4px rgba(147,51,234,0.5))',
        textGradient: isDarkMode
            ? 'from-purple-300 via-pink-300 to-teal-300'
            : 'from-purple-600 via-pink-500 to-teal-600',
        hoverTranslate: 'hover:-translate-y-1',
        transition: 'transition-all duration-300 ease-out',
    };

    return (
        <Link
            to={logoLinkPath}
            className={`flex items-center gap-2 sm:gap-3 group
                        ${colors.hoverTranslate} ${colors.transition}
                        focus:outline-none focus:ring-2 focus:ring-offset-2
                        ${isDarkMode
                            ? 'focus:ring-teal-500 focus:ring-offset-gray-900'
                            : 'focus:ring-purple-500 focus:ring-offset-gray-50'}
                        rounded-full`}
            aria-label="Go to MyMindMirror Homepage or Journal"
        >
            {/* Icon with theme‑matched indicator */}
            <div className="relative">
                {isAuthenticated && (
                    <>
                        {/* Glowing ring – colour matches icon */}
                        <div
                            className="absolute -inset-1 rounded-full blur-sm animate-pulse-ring"
                            style={{ backgroundColor: ringBg }}
                        />
                        <div
                            className="absolute -inset-0.5 rounded-full border-2 animate-ping-slow"
                            style={{ borderColor: ringColor }}
                        />
                    </>
                )}
                <Sparkles
                    size={34}
                    className={`${colors.iconColor} ${colors.transition}
                               group-hover:rotate-12 group-hover:scale-110
                               group-hover:animate-pulse-subtle relative z-10`}
                    style={{ filter: colors.iconGlow }}
                />
                {/* Small badge dot – now uses theme colour */}
                {isAuthenticated && (
                    <span
                        className={`absolute -top-1 -right-2 w-2 h-2 ${dotColor} rounded-full shadow-md animate-pulse z-20`}
                        title="Logged in"
                    />
                )}
            </div>

            {/* Text logo */}
            <h1 className={`text-2xl sm:text-3xl font-poppins font-extrabold
                           bg-gradient-to-r ${colors.textGradient} bg-clip-text text-transparent
                           ${colors.transition} group-hover:opacity-90 group-hover:scale-[1.02]`}>
                MyMindMirror
            </h1>
        </Link>
    );
}

// Animations (unchanged)
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse-subtle {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.05); }
    }
    @keyframes pulse-ring {
        0% { transform: scale(0.8); opacity: 0.8; }
        100% { transform: scale(1.2); opacity: 0; }
    }
    @keyframes ping-slow {
        0% { transform: scale(0.8); opacity: 0.6; }
        100% { transform: scale(1.4); opacity: 0; }
    }
    .animate-pulse-subtle {
        animation: pulse-subtle 0.8s ease-in-out;
    }
    .animate-pulse-ring {
        animation: pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    .animate-ping-slow {
        animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
    }
`;
if (!document.head.querySelector('#logo-animations')) {
    style.id = 'logo-animations';
    document.head.appendChild(style);
}

export default AppLogo;