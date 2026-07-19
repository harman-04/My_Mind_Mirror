// src/components/InstallPrompt.jsx
import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

function InstallPrompt() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstall(false);
      }
    }
  };

  const handleDismiss = () => {
    setShowInstall(false);
  };

  if (!showInstall) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in-up">
      <div className={`p-1.5 pl-4 pr-1.5 rounded-full border shadow-xl flex items-center gap-3 backdrop-blur-md transition-all duration-300
        ${isDarkMode
          ? 'bg-gray-800/80 border-gray-700/50 shadow-[0_0_15px_rgba(0,0,0,0.5)]'
          : 'bg-white/80 border-gray-200/50 shadow-[0_0_15px_rgba(0,0,0,0.1)]'
        }`}
      >
        <div className="flex flex-col">
          <span className="text-sm font-semibold font-poppins text-gray-800 dark:text-gray-200">
            Install App
          </span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
            Add to home screen
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleInstall}
            className="flex items-center justify-center p-2.5 rounded-full bg-gradient-to-r from-purple-500 to-teal-500 text-white hover:scale-105 active:scale-95 transition-transform shadow-md"
            title="Install"
          >
            <Download size={16} />
          </button>

          <button
            onClick={handleDismiss}
            className="p-2 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}

export default React.memo(InstallPrompt);