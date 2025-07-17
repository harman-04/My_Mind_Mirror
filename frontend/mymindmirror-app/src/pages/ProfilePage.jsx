// src/pages/ProfilePage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserProfile } from '../hooks/useUserProfile';
import { useTheme } from '../contexts/ThemeContext';
import {
    User, Mail, Edit, Save, X, Trash2, Loader, CheckCircle, AlertCircle,
    KeyRound, Lock, Info, Sparkles // Added Info and Sparkles for visual flair
} from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

function ProfilePage() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    const {
        profile,
        isLoading,
        isError,
        error,
        updateProfile,
        deleteProfile,
        changePassword,
        isUpdating,
        isDeleting,
        isChangingPassword,
    } = useUserProfile();

    const [isEditing, setIsEditing] = useState(false);
    const [editedUsername, setEditedUsername] = useState('');
    const [editedEmail, setEditedEmail] = useState('');
    
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [passwordChangeError, setPasswordChangeError] = useState('');
    const [passwordChangeSuccess, setPasswordChangeSuccess] = useState('');

    const [feedbackMessage, setFeedbackMessage] = useState({ type: '', text: '' });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Initialize form fields when profile data loads or changes
    useEffect(() => {
        if (profile) {
            setEditedUsername(profile.username || '');
            setEditedEmail(profile.email || '');
        }
    }, [profile]);

    // Handle feedback message display (for profile updates)
    useEffect(() => {
        if (feedbackMessage.text) {
            const timer = setTimeout(() => {
                setFeedbackMessage({ type: '', text: '' });
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [feedbackMessage]);

    // Effect for password change feedback messages
    useEffect(() => {
        if (passwordChangeSuccess) {
            const timer = setTimeout(() => setPasswordChangeSuccess(''), 5000);
            return () => clearTimeout(timer);
        }
        if (passwordChangeError) {
            const timer = setTimeout(() => setPasswordChangeError(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [passwordChangeSuccess, passwordChangeError]);

    const handleEditClick = () => {
        setIsEditing(true);
        setFeedbackMessage({ type: '', text: '' });
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        if (profile) {
            setEditedUsername(profile.username || '');
            setEditedEmail(profile.email || '');
        }
        setFeedbackMessage({ type: '', text: '' });
    };

    const handleSaveProfile = async () => {
        setFeedbackMessage({ type: '', text: '' });
        try {
            await updateProfile({ username: editedUsername, email: editedEmail });
            setIsEditing(false);
            setFeedbackMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (err) {
            console.error("Error updating profile:", err);
            setFeedbackMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
        }
    };

    const handleChangePassword = async () => {
        setPasswordChangeError('');
        setPasswordChangeSuccess('');

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            setPasswordChangeError('All password fields are required.');
            return;
        }
        if (newPassword.length < 6) {
            setPasswordChangeError('New password must be at least 6 characters long.');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setPasswordChangeError('New password and confirmation do not match.');
            return;
        }
        if (currentPassword === newPassword) {
            setPasswordChangeError('New password cannot be the same as the current password.');
            return;
        }

        try {
            await changePassword({ currentPassword, newPassword });
            setPasswordChangeSuccess('Password changed successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (err) {
            console.error("Error changing password:", err);
            setPasswordChangeError(err.message || 'Failed to change password.');
        }
    };

    const handleDeleteAccount = async () => {
        setShowDeleteConfirm(true);
    };

    const confirmDeleteAccount = async () => {
        setFeedbackMessage({ type: '', text: '' });
        try {
            await deleteProfile();
            setFeedbackMessage({ type: 'success', text: 'Account deleted successfully. Redirecting...' });
        } catch (err) {
            console.error("Error deleting account:", err);
            setFeedbackMessage({ type: 'error', text: err.message || 'Failed to delete account.' });
        } finally {
            setShowDeleteConfirm(false);
        }
    };

    const cancelDeleteAccount = () => {
        setShowDeleteConfirm(false);
    };

    // Consolidated Theme-based Styling
    const colors = {
        // Backgrounds (consistent with App.jsx and HomePage.jsx)
        bgMainStart: isDarkMode ? '#0A0A1A' : '#F0F4F8',
        bgMainEnd: isDarkMode ? '#1E1E2E' : '#E6EAF0',

        // Card/Glassmorphism elements
        cardBg: isDarkMode ? 'bg-gray-900/40' : 'bg-white/90', // Main profile card
        sectionCardBg: isDarkMode ? 'bg-gray-800/60' : 'bg-white/80', // Inner section cards
        cardBorder: isDarkMode ? 'border-gray-700/60' : 'border-gray-200/80',
        shadow: isDarkMode ? 'shadow-xl shadow-black/30' : 'shadow-xl shadow-gray-300/50',
        
        // Text colors
        textPrimary: isDarkMode ? 'text-gray-50' : 'text-gray-900',
        textSecondary: isDarkMode ? 'text-gray-300' : 'text-gray-600',
        headingGradient: 'bg-gradient-to-r from-purple-400 to-teal-400 bg-clip-text text-transparent',

        // Input fields
        inputBg: isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100/50',
        inputBorder: isDarkMode ? 'border-gray-600' : 'border-gray-300',
        inputFocusRing: isDarkMode ? 'focus:ring-teal-500' : 'focus:ring-purple-500',

        // Buttons
        buttonPrimary: isDarkMode ? 'bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700' : 'bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800',
        buttonSecondary: isDarkMode ? 'bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700' : 'bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700',
        buttonDestructive: 'bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800',
        buttonText: 'text-white',
        buttonFocusRingPrimary: isDarkMode ? 'focus:ring-teal-500' : 'focus:ring-purple-500',
        buttonFocusRingSecondary: isDarkMode ? 'focus:ring-purple-500' : 'focus:ring-teal-500',
        buttonFocusRingDestructive: 'focus:ring-red-500',

        // Icons
        iconPrimary: isDarkMode ? 'text-teal-300' : 'text-purple-600',
        iconSecondary: isDarkMode ? 'text-purple-300' : 'text-teal-600',
        iconDanger: 'text-red-500',

        // Feedback messages
        feedbackSuccessBg: isDarkMode ? 'bg-green-700/30' : 'bg-green-500/20',
        feedbackSuccessText: isDarkMode ? 'text-green-300' : 'text-green-700',
        feedbackErrorBg: isDarkMode ? 'bg-red-700/30' : 'bg-red-500/20',
        feedbackErrorText: isDarkMode ? 'text-red-300' : 'text-red-700',
    };

    // Full-page loader
    if (isLoading) {
        return (
            <div className={`min-h-screen flex flex-col items-center justify-center w-full
                             ${colors.bgMainGradient} ${colors.textPrimary} transition-all duration-500`}>
                <Sparkles size={80} className={`${colors.iconPrimary} animate-pulse-slow mb-6`} />
                <p className="text-2xl font-poppins font-semibold">Loading your profile...</p>
                <div className="w-64 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-4">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-teal-500 animate-pulse-fast"></div>
                </div>
                <style>
                    {`
                    @keyframes pulse-slow {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                    @keyframes pulse-fast {
                        0%, 100% { transform: translateX(-100%); }
                        50% { transform: translateX(100%); }
                        100% { transform: translateX(-100%); }
                    }
                    `}
                </style>
            </div>
        );
    }

    // Full-page error display
    if (isError) {
        return (
            <div className={`min-h-screen flex flex-col items-center justify-center w-full
                             ${colors.bgMainGradient} ${colors.textPrimary} transition-all duration-500`}>
                <AlertCircle size={80} className={`${colors.iconDanger} mb-6`} />
                <h2 className="text-3xl font-poppins font-bold mb-4">Error Loading Profile</h2>
                <p className="text-lg font-inter text-center max-w-md mb-8">
                    {error?.message || 'An unexpected error occurred. Please try logging in again.'}
                </p>
                <button
                    onClick={() => navigate('/login')}
                    className={`py-3 px-8 rounded-full font-poppins font-semibold ${colors.buttonDestructive} ${colors.buttonText}
                               transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.buttonFocusRingDestructive}`}
                >
                    Go to Login
                </button>
            </div>
        );
    }

    return (
        <div className={`min-h-screen w-full flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8
                         ${colors.bgMainGradient} font-inter ${colors.textPrimary} transition-colors duration-700`}>
            
            {/* Main Profile Card */}
            <div className={`w-full max-w-3xl mx-auto p-8 sm:p-10 rounded-[40px]
                             ${colors.cardBg} ${colors.cardBorder} border ${colors.shadow}
                             backdrop-blur-xl transition-all duration-500`}>

                <h2 className={`text-4xl sm:text-5xl font-poppins font-bold text-center mb-10 ${colors.headingGradient}`}>
                    Your Profile
                </h2>

                {/* Global Feedback Message */}
                {feedbackMessage.text && (
                    <div className={`p-4 mb-8 rounded-xl flex items-center space-x-3
                                     ${feedbackMessage.type === 'success' ? colors.feedbackSuccessBg : colors.feedbackErrorBg}
                                     ${feedbackMessage.type === 'success' ? colors.feedbackSuccessText : colors.feedbackErrorText}
                                     transition-all duration-300 ease-in-out transform translate-y-0 opacity-100`}>
                        {feedbackMessage.type === 'success' ? (
                            <CheckCircle size={24} className="flex-shrink-0" />
                        ) : (
                            <AlertCircle size={24} className="flex-shrink-0" />
                        )}
                        <p className="text-sm font-medium flex-grow">{feedbackMessage.text}</p>
                    </div>
                )}

                <div className="space-y-10"> {/* Increased spacing between sections */}
                    {/* Account Details Section */}
                    <div className={`p-6 sm:p-8 rounded-3xl ${colors.sectionCardBg} ${colors.cardBorder} border shadow-md`}>
                        <h3 className={`text-2xl sm:text-3xl font-poppins font-semibold mb-6 ${colors.textPrimary}`}>
                            <User size={28} className="inline-block mr-3 align-middle" /> Account Details
                        </h3>
                        <div className="space-y-6">
                            {/* Username Field */}
                            <div>
                                <label htmlFor="username" className={`block text-sm font-medium mb-2 ${colors.textSecondary}`}>Username</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        id="username"
                                        value={editedUsername}
                                        onChange={(e) => setEditedUsername(e.target.value)}
                                        className={`w-full p-3 rounded-lg ${colors.inputBg} ${colors.inputBorder} border ${colors.inputFocusRing} focus:outline-none transition-all duration-200`}
                                        disabled={isUpdating}
                                    />
                                ) : (
                                    <p className={`text-lg sm:text-xl font-semibold ${colors.textPrimary} p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100/30'}`}>{profile?.username}</p>
                                )}
                            </div>

                            {/* Email Field */}
                            <div>
                                <label htmlFor="email" className={`block text-sm font-medium mb-2 ${colors.textSecondary}`}>Email</label>
                                {isEditing ? (
                                    <input
                                        type="email"
                                        id="email"
                                        value={editedEmail}
                                        onChange={(e) => setEditedEmail(e.target.value)}
                                        className={`w-full p-3 rounded-lg ${colors.inputBg} ${colors.inputBorder} border ${colors.inputFocusRing} focus:outline-none transition-all duration-200`}
                                        disabled={isUpdating}
                                    />
                                ) : (
                                    <p className={`text-lg sm:text-xl font-semibold ${colors.textPrimary} p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100/30'}`}>{profile?.email}</p>
                                )}
                            </div>
                        </div>

                        {/* Profile Action Buttons */}
                        <div className="pt-8 flex flex-col sm:flex-row justify-end gap-4">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={handleCancelEdit}
                                        className={`py-2.5 px-7 rounded-full font-semibold text-sm ${colors.buttonSecondary} ${colors.buttonText}
                                                   transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.buttonFocusRingSecondary}`}
                                        disabled={isUpdating}
                                    >
                                        <X size={20} className="inline-block mr-2 align-text-bottom" /> Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveProfile}
                                        className={`py-2.5 px-7 rounded-full font-semibold text-sm ${colors.buttonPrimary} ${colors.buttonText}
                                                   transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.buttonFocusRingPrimary}`}
                                        disabled={isUpdating}
                                    >
                                        {isUpdating ? (
                                            <Loader size={20} className="inline-block mr-2 animate-spin align-text-bottom" />
                                        ) : (
                                            <Save size={20} className="inline-block mr-2 align-text-bottom" />
                                        )}
                                        Save Profile
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={handleEditClick}
                                    className={`py-2.5 px-7 rounded-full font-semibold text-sm ${colors.buttonPrimary} ${colors.buttonText}
                                               transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.buttonFocusRingPrimary}`}
                                >
                                    <Edit size={20} className="inline-block mr-2 align-text-bottom" /> Edit Profile
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Change Password Section */}
                    <div className={`p-6 sm:p-8 rounded-3xl ${colors.sectionCardBg} ${colors.cardBorder} border shadow-md`}>
                        <h3 className={`text-2xl sm:text-3xl font-poppins font-semibold mb-6 ${colors.textPrimary}`}>
                            <KeyRound size={28} className="inline-block mr-3 align-middle" /> Change Password
                        </h3>

                        {passwordChangeSuccess && (
                            <div className={`p-4 mb-4 rounded-xl flex items-center space-x-3 ${colors.feedbackSuccessBg} ${colors.feedbackSuccessText}`}>
                                <CheckCircle size={24} className="flex-shrink-0" />
                                <p className="text-sm font-medium flex-grow">{passwordChangeSuccess}</p>
                            </div>
                        )}
                        {passwordChangeError && (
                            <div className={`p-4 mb-4 rounded-xl flex items-center space-x-3 ${colors.feedbackErrorBg} ${colors.feedbackErrorText}`}>
                                <AlertCircle size={24} className="flex-shrink-0" />
                                <p className="text-sm font-medium flex-grow">{passwordChangeError}</p>
                            </div>
                        )}

                        <div className="space-y-6">
                            {/* Current Password */}
                            <div>
                                <label htmlFor="currentPassword" className={`block text-sm font-medium mb-2 ${colors.textSecondary}`}>Current Password</label>
                                <input
                                    type="password"
                                    id="currentPassword"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className={`w-full p-3 rounded-lg ${colors.inputBg} ${colors.inputBorder} border ${colors.inputFocusRing} focus:outline-none transition-all duration-200`}
                                    disabled={isChangingPassword}
                                />
                            </div>

                            {/* New Password */}
                            <div>
                                <label htmlFor="newPassword" className={`block text-sm font-medium mb-2 ${colors.textSecondary}`}>New Password</label>
                                <input
                                    type="password"
                                    id="newPassword"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className={`w-full p-3 rounded-lg ${colors.inputBg} ${colors.inputBorder} border ${colors.inputFocusRing} focus:outline-none transition-all duration-200`}
                                    disabled={isChangingPassword}
                                />
                            </div>

                            {/* Confirm New Password */}
                            <div>
                                <label htmlFor="confirmNewPassword" className={`block text-sm font-medium mb-2 ${colors.textSecondary}`}>Confirm New Password</label>
                                <input
                                    type="password"
                                    id="confirmNewPassword"
                                    value={confirmNewPassword}
                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                    className={`w-full p-3 rounded-lg ${colors.inputBg} ${colors.inputBorder} border ${colors.inputFocusRing} focus:outline-none transition-all duration-200`}
                                    disabled={isChangingPassword}
                                />
                            </div>
                        </div>

                        {/* Change Password Button */}
                        <div className="pt-8 flex justify-end">
                            <button
                                onClick={handleChangePassword}
                                className={`py-2.5 px-7 rounded-full font-semibold text-sm ${colors.buttonPrimary} ${colors.buttonText}
                                           transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.buttonFocusRingPrimary}`}
                                disabled={isChangingPassword}
                            >
                                {isChangingPassword ? (
                                    <Loader size={20} className="inline-block mr-2 animate-spin align-text-bottom" />
                                ) : (
                                    <Lock size={20} className="inline-block mr-2 align-text-bottom" />
                                )}
                                Change Password
                            </button>
                        </div>
                    </div>

                    {/* Danger Zone Section */}
                    <div className={`p-6 sm:p-8 rounded-3xl ${colors.sectionCardBg} ${colors.cardBorder} border shadow-md`}>
                        <h3 className={`text-2xl sm:text-3xl font-poppins font-semibold mb-6 ${colors.iconDanger}`}>
                            <AlertCircle size={28} className="inline-block mr-3 align-middle" /> Danger Zone
                        </h3>
                        <p className={`text-md mb-6 ${colors.textSecondary}`}>
                            Permanently delete your MyMindMirror account and all associated data. This action cannot be undone.
                        </p>
                        <div className="flex justify-end">
                            <button
                                onClick={handleDeleteAccount}
                                className={`py-2.5 px-7 rounded-full font-semibold text-sm ${colors.buttonDestructive} ${colors.buttonText}
                                           transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.buttonFocusRingDestructive}`}
                            >
                                <Trash2 size={20} className="inline-block mr-2 align-text-bottom" /> Delete Account
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={cancelDeleteAccount}
                onConfirm={confirmDeleteAccount}
                title="Confirm Account Deletion"
                message="Are you absolutely sure you want to delete your account? This action is irreversible and all your data will be permanently lost."
                confirmText="Yes, Delete My Account"
                cancelText="No, Keep My Account"
                isDestructive={true}
                isLoading={isDeleting}
            />
        </div>
    );
}

export default ProfilePage;
