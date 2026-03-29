// src/components/AppLogo.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react'; // Using Sparkles for consistency and theme
import { useTheme } from '../contexts/ThemeContext';

function AppLogo() {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    // Define colors for the logo, consistent with your app's theme
    const colors = {
        iconColor: isDarkMode ? 'text-teal-300' : 'text-purple-600', // Teal in dark, Purple in light
        textGradient: isDarkMode ? 'from-purple-300 to-teal-300' : 'from-purple-600 to-teal-600', // Gradient for text
        hoverTranslate: 'hover:-translate-y-0.5', // Subtle lift on hover
        transition: 'transition-all duration-300 ease-in-out',
    };

    // Determine the target path based on authentication status
    const isAuthenticated = localStorage.getItem('jwtToken');
    const logoLinkPath = isAuthenticated ? '/journal' : '/'; // Go to journal if logged in, else homepage

    return (
        <Link
            to={logoLinkPath}
            className={`flex items-center space-x-2 sm:space-x-3 group
                        ${colors.hoverTranslate} ${colors.transition}
                        focus:outline-none focus:ring-2 focus:ring-offset-2
                        ${isDarkMode ? 'focus:ring-teal-500 focus:ring-offset-gray-900' : 'focus:ring-purple-500 focus:ring-offset-gray-50'}`}
            aria-label="Go to MyMindMirror Homepage or Journal"
        >
            {/* Animated Sparkles Icon */}
            <Sparkles
                size={32} // Slightly larger for impact
                className={`${colors.iconColor} ${colors.transition}
                           group-hover:rotate-12 group-hover:scale-110`} // Rotate and scale on hover
            />
            {/* Stylized Text Logo with Gradient */}
            <h1 className={`text-2xl sm:text-3xl font-poppins font-bold
                           bg-gradient-to-r ${colors.textGradient} bg-clip-text text-transparent
                           ${colors.transition} group-hover:opacity-90`}>
                MyMindMirror
            </h1>
        </Link>
    );
}

export default AppLogo;
