// src/components/ConfirmationModal.jsx
import React from 'react';
import { XCircle, AlertTriangle, Loader } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText, isDestructive = false, isLoading = false }) {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    if (!isOpen) return null;

    const colors = {
        overlayBg: 'bg-black/60',
        modalBg: isDarkMode ? 'bg-[#1A162F]/95 backdrop-blur-xl' : 'bg-white/95 backdrop-blur-xl',
        modalBorder: isDarkMode ? 'border-white/10' : 'border-gray-200/70',
        textColor: isDarkMode ? 'text-gray-100' : 'text-gray-900',
        textSecondary: isDarkMode ? 'text-gray-400' : 'text-gray-500',
        buttonPrimary: isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600',
        buttonSecondary: isDarkMode ? 'bg-black/20 hover:bg-black/40 text-gray-200 border border-white/10' : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-transparent',
        buttonText: 'text-white',
        iconBg: isDestructive ? 'bg-red-100 dark:bg-red-900/30' : 'bg-purple-100 dark:bg-teal-900/30',
        iconColor: isDestructive ? 'text-red-600 dark:text-red-400' : 'text-purple-600 dark:text-teal-400',
        shadow: 'shadow-2xl shadow-black/50',
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${colors.overlayBg} backdrop-blur-md transition-opacity duration-300`}>
            {/* Click outside to close (disabled if loading) */}
            <div className="absolute inset-0" onClick={!isLoading ? onClose : undefined} aria-hidden="true" />

            <div className={`relative p-6 lg:p-8 rounded-2xl lg:rounded-3xl ${colors.modalBg} ${colors.modalBorder} border ${colors.shadow}
                             max-w-md w-full text-center transform scale-95 opacity-0 animate-scale-in`}>

                <div className={`mx-auto w-14 h-14 lg:w-16 lg:h-16 mb-4 lg:mb-6 rounded-full flex items-center justify-center ${colors.iconBg}`}>
                    {isDestructive ? (
                        <XCircle className={`w-7 h-7 lg:w-8 lg:h-8 ${colors.iconColor}`} />
                    ) : (
                        <AlertTriangle className={`w-7 h-7 lg:w-8 lg:h-8 ${colors.iconColor}`} />
                    )}
                </div>

                <h2 className={`text-xl lg:text-2xl font-poppins font-bold tracking-tight mb-2 ${colors.textColor}`}>
                    {title}
                </h2>
                <p className={`text-sm lg:text-base font-medium mb-6 lg:mb-8 ${colors.textSecondary}`}>
                    {message}
                </p>

                <div className="flex flex-col sm:flex-row justify-center gap-3">
                    <button
                        onClick={onClose}
                        className={`flex-1 py-2.5 lg:py-3 px-6 rounded-full font-bold text-sm lg:text-base ${colors.buttonSecondary}
                                   transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50`}
                        disabled={isLoading}
                    >
                        {cancelText || 'Cancel'}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-2.5 lg:py-3 px-6 rounded-full font-bold text-sm lg:text-base ${colors.buttonPrimary} ${colors.buttonText}
                                   transition-all duration-300 hover:scale-105 active:scale-95 shadow-md disabled:opacity-70 disabled:hover:scale-100 flex justify-center items-center`}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <Loader className="w-4 h-4 lg:w-5 lg:h-5 animate-spin" /> {confirmText === 'Confirm' ? 'Processing...' : (confirmText || 'Processing...')}
                            </span>
                        ) : (
                            confirmText || 'Confirm'
                        )}
                    </button>
                </div>
            </div>

            <style>
                {`
                @keyframes scale-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-scale-in {
                    animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                `}
            </style>
        </div>
    );
}

export default ConfirmationModal;