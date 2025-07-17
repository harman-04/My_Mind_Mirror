// src/components/AppLoader.jsx

import React, { useState, useEffect } from 'react';
import { Sparkles, Loader } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const loadingMessages = [
    "Reflecting on your thoughts...",
    "Unlocking deeper insights...",
    "Analyzing your journaling patterns...",
    "Connecting with your inner self...",
    "Preparing your personalized dashboard...",
    "Generating your daily reflections...",
    "Compiling your emotional trends..."
];

function AppLoader() {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

    // Cycle through loading messages
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentMessageIndex(prevIndex => (prevIndex + 1) % loadingMessages.length);
        }, 3000); // Change message every 3 seconds
        return () => clearInterval(interval);
    }, []);

    // Define colors based on theme
    const colors = {
        bgStart: isDarkMode ? '#1E1A3E' : '#F8F9FA',
        bgEnd: isDarkMode ? '#3A355C' : '#E0E0E0',
        glassBg: isDarkMode ? 'bg-black/30' : 'bg-white/70',
        glassBorder: isDarkMode ? 'border-white/10' : 'border-white/30',
        textColor: isDarkMode ? 'text-gray-200' : 'text-gray-800',
        accentColor: isDarkMode ? 'text-[#5CC8C2]' : 'text-[#B399D4]',
        shadow: 'shadow-lg',
    };

    return (
        <div className={`fixed inset-0 flex flex-col items-center justify-center z-50
                         bg-gradient-to-br from-[${colors.bgStart}] to-[${colors.bgEnd}]
                         transition-all duration-500`}>
            {/* Inline CSS for animations */}
            <style>
                {`
                @keyframes pulse-slow {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }

                @keyframes pulse-fast {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }

                @keyframes gradient-shift {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 100% 50%; }
                }

                @keyframes fade-in-up {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                `}
            </style>

            <div className={`p-8 sm:p-12 rounded-3xl backdrop-blur-xl
                             ${colors.glassBg} ${colors.glassBorder} border ${colors.shadow}
                             flex flex-col items-center justify-center text-center
                             transform transition-all duration-500 ease-in-out`}>
                
                {/* Animated Sparkles Icon */}
                <Sparkles
                    size={80}
                    // Apply animation directly via style prop
                    style={{ animation: 'pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
                    className={`${colors.accentColor} mb-6`} 
                />

                {/* Dynamic Loading Message */}
                <p className={`text-2xl sm:text-3xl font-poppins font-semibold ${colors.textColor} mb-4 transition-opacity duration-700 ease-in-out`}>
                    {loadingMessages[currentMessageIndex]}
                </p>

                {/* Subtle Progress Indicator */}
                <div className="w-48 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-purple-500 to-teal-500"
                        style={{ animation: 'pulse-fast 1s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
                    ></div>
                </div>

                <p className={`text-sm mt-4 ${colors.textColor} opacity-70`}>
                    Please wait a moment...
                </p>
            </div>
        </div>
    );
}

export default AppLoader;
