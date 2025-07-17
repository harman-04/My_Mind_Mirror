// src/components/ConfirmationModal.jsx

import React from 'react';
import { XCircle, AlertCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText, isDestructive = false, isLoading = false }) {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    if (!isOpen) return null;

    const colors = {
        overlayBg: 'bg-black/60',
        modalBg: isDarkMode ? 'bg-gray-800/90' : 'bg-white/90',
        modalBorder: isDarkMode ? 'border-gray-700/70' : 'border-gray-200/70',
        textColor: isDarkMode ? 'text-gray-100' : 'text-gray-800',
        textSecondary: isDarkMode ? 'text-gray-300' : 'text-gray-600',
        buttonPrimary: isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700',
        buttonSecondary: 'bg-gray-500 hover:bg-gray-600',
        buttonText: 'text-white',
        iconColor: isDestructive ? 'text-red-500' : (isDarkMode ? 'text-purple-400' : 'text-teal-500'),
        shadow: 'shadow-2xl shadow-black/50',
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${colors.overlayBg} backdrop-blur-sm transition-opacity duration-300`}>
            <div className={`relative p-8 rounded-3xl ${colors.modalBg} ${colors.modalBorder} border ${colors.shadow}
                             max-w-md w-full text-center transform scale-95 opacity-0 animate-scale-in`}>
                
                <div className="flex justify-center mb-6">
                    {isDestructive ? (
                        <XCircle size={60} className={colors.iconColor} />
                    ) : (
                        <AlertCircle size={60} className={colors.iconColor} />
                    )}
                </div>

                <h2 className={`text-2xl font-poppins font-bold mb-4 ${colors.textColor}`}>
                    {title}
                </h2>
                <p className={`text-md mb-8 ${colors.textSecondary}`}>
                    {message}
                </p>

                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <button
                        onClick={onClose}
                        className={`py-3 px-6 rounded-full font-poppins font-semibold text-sm ${colors.buttonSecondary} ${colors.buttonText}
                                   transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400`}
                        disabled={isLoading}
                    >
                        {cancelText || 'Cancel'}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`py-3 px-6 rounded-full font-poppins font-semibold text-sm ${colors.buttonPrimary} ${colors.buttonText}
                                   transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isDestructive ? 'focus:ring-red-500' : 'focus:ring-purple-500'}`}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span className="flex items-center">
                                <Loader size={20} className="animate-spin mr-2" /> {confirmText || 'Confirming...'}
                            </span>
                        ) : (
                            confirmText || 'Confirm'
                        )}
                    </button>
                </div>
            </div>

            {/* Inline CSS for modal animation */}
            <style>
                {`
                @keyframes scale-in {
                    from {
                        opacity: 0;
                        transform: scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                .animate-scale-in {
                    animation: scale-in 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
                }
                `}
            </style>
        </div>
    );
}

export default ConfirmationModal;
