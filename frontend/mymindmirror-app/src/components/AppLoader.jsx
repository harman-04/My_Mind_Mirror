// src/components/AppLoader.jsx
import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
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
    const [fade, setFade] = useState(true);

    // Cycle through loading messages with a smooth fade transition
    useEffect(() => {
        const interval = setInterval(() => {
            setFade(false); // Start fade out
            setTimeout(() => {
                setCurrentMessageIndex(prevIndex => (prevIndex + 1) % loadingMessages.length);
                setFade(true); // Start fade in
            }, 300); // Wait for fade out to finish before changing text
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const overlayBg = isDarkMode ? 'bg-[#0f0c29]/90 backdrop-blur-2xl' : 'bg-white/80 backdrop-blur-xl';
    const cardBg = isDarkMode ? 'bg-[#1A162F]/60 border-white/10' : 'bg-white/60 border-gray-200/50';

    return (
        <div className={`fixed inset-0 flex items-center justify-center z-[200] ${overlayBg} transition-all duration-500`}>

            <div className={`p-8 lg:p-12 rounded-[2rem] lg:rounded-[2.5rem] ${cardBg} border shadow-2xl flex flex-col items-center justify-center text-center max-w-[90%] sm:max-w-md mx-auto transform transition-all duration-500 ease-in-out`}>

                {/* Glowing Animated Icon */}
                <div className="relative mb-8 lg:mb-10">
                    <div className="absolute inset-0 bg-purple-500/30 dark:bg-teal-500/30 rounded-full blur-2xl animate-pulse" />
                    <Sparkles
                        className="w-12 h-12 lg:w-16 lg:h-16 relative text-purple-600 dark:text-teal-400 animate-bounce shadow-sm"
                        style={{ animationDuration: '2.5s' }}
                    />
                </div>

                {/* Dynamic Loading Message Container (Fixed height to prevent jumping) */}
                <div className="h-16 lg:h-20 flex items-center justify-center mb-6 lg:mb-8 w-full px-4">
                    <p className={`text-xl lg:text-2xl font-poppins font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-teal-500 dark:from-purple-400 dark:to-teal-400 transition-opacity duration-300 leading-tight ${fade ? 'opacity-100' : 'opacity-0'}`}>
                        {loadingMessages[currentMessageIndex]}
                    </p>
                </div>

                {/* Indeterminate Sweeping Progress Bar */}
                <div className="w-48 lg:w-64 h-1.5 lg:h-2 bg-gray-200 dark:bg-[#131127] rounded-full overflow-hidden relative shadow-inner border border-transparent dark:border-white/5">
                    <div className="absolute top-0 left-0 h-full w-1/2 bg-gradient-to-r from-purple-500 to-teal-500 rounded-full animate-progress-indeterminate shadow-[0_0_10px_rgba(20,184,166,0.5)]" />
                </div>

                <p className="text-[10px] lg:text-xs mt-6 lg:mt-8 text-gray-500 dark:text-gray-400 font-bold tracking-widest uppercase">
                    Please wait a moment
                </p>
            </div>

            {/* Custom Keyframe for the Sweeping Progress Bar */}
            <style>{`
                @keyframes indeterminate {
                    0% { transform: translateX(-150%); }
                    100% { transform: translateX(250%); }
                }
                .animate-progress-indeterminate {
                    animation: indeterminate 1.5s infinite cubic-bezier(0.65, 0, 0.35, 1);
                }
            `}</style>
        </div>
    );
}

export default React.memo(AppLoader);