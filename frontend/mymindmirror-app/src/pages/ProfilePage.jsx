// src/pages/ProfilePage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserProfile } from '../hooks/useUserProfile';
import { useTheme } from '../contexts/ThemeContext';
import {
    User, Mail, Edit, Save, X, Trash2, Loader, CheckCircle, AlertCircle,
    KeyRound, Lock, Info, Sparkles, Eye, EyeOff, Shield, Database
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
        apiKeyStatus,
        updateApiKey,
    } = useUserProfile();

    // Profile edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editedUsername, setEditedUsername] = useState('');
    const [editedEmail, setEditedEmail] = useState('');

    // Password change state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [passwordChangeError, setPasswordChangeError] = useState('');
    const [passwordChangeSuccess, setPasswordChangeSuccess] = useState('');

    // API key state
    const [newApiKey, setNewApiKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [apiKeyMessage, setApiKeyMessage] = useState('');

    // Feedback messages
    const [feedbackMessage, setFeedbackMessage] = useState({ type: '', text: '' });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Initialize form fields when profile loads
    useEffect(() => {
        if (profile) {
            setEditedUsername(profile.username || '');
            setEditedEmail(profile.email || '');
        }
    }, [profile]);

    // Auto‑clear feedback messages
    useEffect(() => {
        if (feedbackMessage.text) {
            const timer = setTimeout(() => setFeedbackMessage({ type: '', text: '' }), 5000);
            return () => clearTimeout(timer);
        }
    }, [feedbackMessage]);

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

    // Handlers
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

    const handleSaveApiKey = async () => {
        setApiKeyMessage('');
        try {
            await updateApiKey.mutateAsync(newApiKey);
            setApiKeyMessage({ type: 'success', text: 'API key saved successfully.' });
            setNewApiKey('');
        } catch (err) {
            setApiKeyMessage({ type: 'error', text: err.message || 'Failed to save API key.' });
        }
    };

    const handleDeleteAccount = () => setShowDeleteConfirm(true);
    const confirmDeleteAccount = async () => {
        setFeedbackMessage({ type: '', text: '' });
        try {
            await deleteProfile();
            setFeedbackMessage({ type: 'success', text: 'Account deleted successfully. Redirecting...' });
            setTimeout(() => navigate('/'), 2000);
        } catch (err) {
            console.error("Error deleting account:", err);
            setFeedbackMessage({ type: 'error', text: err.message || 'Failed to delete account.' });
        } finally {
            setShowDeleteConfirm(false);
        }
    };
    const cancelDeleteAccount = () => setShowDeleteConfirm(false);

    // Theme styles
    const colors = {
        background: isDarkMode ? 'bg-gray-900' : 'bg-gray-50',
        cardBg: isDarkMode ? 'bg-gray-800/60 backdrop-blur-md' : 'bg-white/80 backdrop-blur-md',
        cardBorder: isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50',
        sectionBg: isDarkMode ? 'bg-gray-800/40 backdrop-blur-sm' : 'bg-white/70 backdrop-blur-sm',
        sectionBorder: isDarkMode ? 'border-gray-700/40' : 'border-gray-200/40',
        textPrimary: isDarkMode ? 'text-gray-100' : 'text-gray-900',
        textSecondary: isDarkMode ? 'text-gray-300' : 'text-gray-600',
        inputBg: isDarkMode ? 'bg-gray-800/80' : 'bg-white/90',
        inputBorder: isDarkMode ? 'border-gray-600' : 'border-gray-300',
        inputFocusRing: 'focus:ring-purple-500',
        buttonPrimary: isDarkMode ? 'bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600' : 'bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600',
        buttonSecondary: isDarkMode ? 'bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-800 hover:to-gray-700' : 'bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400',
        buttonDanger: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800',
        buttonText: 'text-white',
        iconPrimary: isDarkMode ? 'text-teal-300' : 'text-purple-600',
        iconDanger: 'text-red-500',
        feedbackSuccessBg: isDarkMode ? 'bg-green-900/30 border border-green-700/50' : 'bg-green-100/80 border border-green-300',
        feedbackSuccessText: isDarkMode ? 'text-green-300' : 'text-green-800',
        feedbackErrorBg: isDarkMode ? 'bg-red-900/30 border border-red-700/50' : 'bg-red-100/80 border border-red-300',
        feedbackErrorText: isDarkMode ? 'text-red-300' : 'text-red-800',
    };

    // ========== ELEGANT LOADER (restored from old version) ==========
    if (isLoading) {
        return (
            <div className={`min-h-screen w-full ${colors.background} flex flex-col items-center justify-center p-4 transition-all duration-500`}>
                <Sparkles size={80} className={`${colors.iconPrimary} animate-pulse-slow mb-6`} />
                <p className="text-2xl font-poppins font-semibold text-gray-700 dark:text-gray-200">Loading your profile...</p>
                <div className="w-64 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-4">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-teal-500 animate-pulse-fast"></div>
                </div>
                <style>{`
                    @keyframes pulse-slow {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                    @keyframes pulse-fast {
                        0%, 100% { transform: translateX(-100%); }
                        50% { transform: translateX(100%); }
                        100% { transform: translateX(-100%); }
                    }
                    .animate-pulse-slow {
                        animation: pulse-slow 2s ease-in-out infinite;
                    }
                    .animate-pulse-fast {
                        animation: pulse-fast 1.5s ease-in-out infinite;
                    }
                `}</style>
            </div>
        );
    }

    // ========== ERROR STATE (kept modern) ==========
    if (isError) {
        return (
            <div className={`min-h-screen w-full ${colors.background} flex items-center justify-center p-4`}>
                <div className="text-center space-y-4">
                    <AlertCircle size={48} className="text-red-500 mx-auto" />
                    <p className="text-red-500">{error?.message || 'Failed to load profile.'}</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="px-4 py-2 rounded-full bg-purple-500 text-white hover:bg-purple-600 transition"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    // ========== MAIN RENDER (glass‑morphic, fully modern) ==========
    return (
        <div className={`min-h-screen w-full ${colors.background} transition-colors duration-300 relative p-4 sm:p-6`}>
            {/* Animated Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-teal-500/5" />
                <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" />
                <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse-slow delay-1000" />
            </div>

            {/* Floating Icons */}
            <div className="absolute top-32 left-5 opacity-30 animate-float hidden lg:block">
                <User size={32} className="text-purple-400" />
            </div>
            <div className="absolute bottom-32 right-10 opacity-30 animate-float-delayed hidden lg:block">
                <Shield size={32} className="text-teal-400" />
            </div>

            <div className="max-w-3xl mx-auto relative z-10 space-y-6">
                {/* Header */}
                <div className="text-center">
                    <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-teal-500/20 mb-4">
                        <User className="w-8 h-8 text-purple-400" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-poppins font-bold bg-gradient-to-r from-purple-400 to-teal-400 bg-clip-text text-transparent">
                        Your Profile
                    </h1>
                    <p className={`text-sm ${colors.textSecondary} mt-2`}>Manage your account settings</p>
                </div>

                {/* Main Card */}
                <div className={`rounded-2xl ${colors.cardBg} border ${colors.cardBorder} shadow-xl backdrop-blur-sm overflow-hidden`}>
                    <div className="p-6 sm:p-8 space-y-8">
                        {/* Global Feedback */}
                        {feedbackMessage.text && (
                            <div className={`p-4 rounded-xl flex items-center gap-3 ${feedbackMessage.type === 'success' ? colors.feedbackSuccessBg : colors.feedbackErrorBg}`}>
                                {feedbackMessage.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                                <p className="text-sm flex-1">{feedbackMessage.text}</p>
                            </div>
                        )}

                        {/* Account Details */}
                        <div className={`rounded-xl ${colors.sectionBg} border ${colors.sectionBorder} p-6 space-y-5`}>
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <User size={20} className="text-purple-400" /> Account Details
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className={`block text-sm font-medium mb-1.5 ${colors.textSecondary}`}>Username</label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={editedUsername}
                                            onChange={(e) => setEditedUsername(e.target.value)}
                                            className={`w-full p-3 rounded-xl border ${colors.inputBorder} ${colors.inputBg} focus:outline-none focus:ring-2 ${colors.inputFocusRing} transition`}
                                            disabled={isUpdating}
                                        />
                                    ) : (
                                        <div className={`p-3 rounded-xl ${colors.inputBg} border ${colors.inputBorder}`}>
                                            <span className="font-medium">{profile?.username}</span>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-1.5 ${colors.textSecondary}`}>Email</label>
                                    {isEditing ? (
                                        <input
                                            type="email"
                                            value={editedEmail}
                                            onChange={(e) => setEditedEmail(e.target.value)}
                                            className={`w-full p-3 rounded-xl border ${colors.inputBorder} ${colors.inputBg} focus:outline-none focus:ring-2 ${colors.inputFocusRing} transition`}
                                            disabled={isUpdating}
                                        />
                                    ) : (
                                        <div className={`p-3 rounded-xl ${colors.inputBg} border ${colors.inputBorder}`}>
                                            <span className="font-medium">{profile?.email}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                {isEditing ? (
                                    <>
                                        <button
                                            onClick={handleCancelEdit}
                                            className={`px-5 py-2 rounded-full font-medium transition flex items-center gap-2 ${colors.buttonSecondary} ${colors.buttonText}`}
                                            disabled={isUpdating}
                                        >
                                            <X size={16} /> Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveProfile}
                                            className={`px-5 py-2 rounded-full font-medium transition flex items-center gap-2 ${colors.buttonPrimary} ${colors.buttonText}`}
                                            disabled={isUpdating}
                                        >
                                            {isUpdating ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                                            Save
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={handleEditClick}
                                        className={`px-5 py-2 rounded-full font-medium transition flex items-center gap-2 ${colors.buttonPrimary} ${colors.buttonText}`}
                                    >
                                        <Edit size={16} /> Edit Profile
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Change Password */}
                        <div className={`rounded-xl ${colors.sectionBg} border ${colors.sectionBorder} p-6 space-y-5`}>
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <KeyRound size={20} className="text-teal-400" /> Change Password
                            </h2>
                            {passwordChangeSuccess && (
                                <div className={`p-3 rounded-lg flex items-center gap-2 ${colors.feedbackSuccessBg}`}>
                                    <CheckCircle size={16} /> <span className="text-sm">{passwordChangeSuccess}</span>
                                </div>
                            )}
                            {passwordChangeError && (
                                <div className={`p-3 rounded-lg flex items-center gap-2 ${colors.feedbackErrorBg}`}>
                                    <AlertCircle size={16} /> <span className="text-sm">{passwordChangeError}</span>
                                </div>
                            )}
                            <div className="space-y-4">
                                <div>
                                    <label className={`block text-sm font-medium mb-1.5 ${colors.textSecondary}`}>Current Password</label>
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className={`w-full p-3 rounded-xl border ${colors.inputBorder} ${colors.inputBg} focus:outline-none focus:ring-2 ${colors.inputFocusRing} transition`}
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-1.5 ${colors.textSecondary}`}>New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className={`w-full p-3 rounded-xl border ${colors.inputBorder} ${colors.inputBg} focus:outline-none focus:ring-2 ${colors.inputFocusRing} transition`}
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-1.5 ${colors.textSecondary}`}>Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={confirmNewPassword}
                                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                                        className={`w-full p-3 rounded-xl border ${colors.inputBorder} ${colors.inputBg} focus:outline-none focus:ring-2 ${colors.inputFocusRing} transition`}
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    onClick={handleChangePassword}
                                    className={`px-5 py-2 rounded-full font-medium transition flex items-center gap-2 ${colors.buttonPrimary} ${colors.buttonText}`}
                                    disabled={isChangingPassword}
                                >
                                    {isChangingPassword ? <Loader size={16} className="animate-spin" /> : <Lock size={16} />}
                                    Change Password
                                </button>
                            </div>
                        </div>

                        {/* Gemini API Key */}
                        <div className={`rounded-xl ${colors.sectionBg} border ${colors.sectionBorder} p-6 space-y-5`}>
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Database size={20} className="text-purple-400" /> Gemini API Key
                            </h2>
                            {apiKeyStatus.isLoading ? (
                                <p className="text-gray-500">Loading...</p>
                            ) : apiKeyStatus.data ? (
                                <div className={`p-3 rounded-lg flex items-center gap-2 ${apiKeyStatus.data.usingOwnKey ? colors.feedbackSuccessBg : colors.feedbackErrorBg}`}>
                                    {apiKeyStatus.data.usingOwnKey ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                    <span className="text-sm">{apiKeyStatus.data.message}</span>
                                    {apiKeyStatus.data.usingOwnKey && (
                                        <span className="text-xs font-mono ml-2">({apiKeyStatus.data.maskedKey})</span>
                                    )}
                                </div>
                            ) : null}
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1">
                                    <label className={`block text-sm font-medium mb-1.5 ${colors.textSecondary}`}>Your API Key</label>
                                    <div className="flex">
                                        <input
                                            type={showApiKey ? 'text' : 'password'}
                                            value={newApiKey}
                                            onChange={(e) => setNewApiKey(e.target.value)}
                                            placeholder="Paste your Gemini API key here"
                                            className={`flex-1 p-3 rounded-l-xl border ${colors.inputBorder} ${colors.inputBg} focus:outline-none focus:ring-2 ${colors.inputFocusRing} transition`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowApiKey(!showApiKey)}
                                            className="px-4 rounded-r-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                                        >
                                            {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-end">
                                    <button
                                        onClick={handleSaveApiKey}
                                        className={`px-5 py-2 rounded-full font-medium transition flex items-center gap-2 ${colors.buttonPrimary} ${colors.buttonText}`}
                                        disabled={updateApiKey.isLoading}
                                    >
                                        {updateApiKey.isLoading ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                                        Save
                                    </button>
                                </div>
                            </div>
                            {apiKeyMessage && (
                                <div className={`p-3 rounded-lg flex items-center gap-2 ${apiKeyMessage.type === 'success' ? colors.feedbackSuccessBg : colors.feedbackErrorBg}`}>
                                    {apiKeyMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                    <span className="text-sm">{apiKeyMessage.text}</span>
                                </div>
                            )}
                            <p className={`text-xs ${colors.textSecondary} flex items-start gap-1`}>
                                <Info size={12} className="shrink-0 mt-0.5" />
                                Your key is encrypted and stored securely. It will only be used to call the Gemini API on your behalf.
                                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-teal-500 hover:underline ml-1">Get one here</a>.
                            </p>
                        </div>

                        {/* Danger Zone */}
                        <div className={`rounded-xl ${colors.sectionBg} border ${colors.sectionBorder} p-6 space-y-5`}>
                            <h2 className="text-xl font-semibold flex items-center gap-2 text-red-500">
                                <AlertCircle size={20} /> Danger Zone
                            </h2>
                            <p className={`text-sm ${colors.textSecondary}`}>
                                Permanently delete your MyMindMirror account and all associated data. This action cannot be undone.
                            </p>
                            <div className="flex justify-end">
                                <button
                                    onClick={handleDeleteAccount}
                                    className={`px-5 py-2 rounded-full font-medium transition flex items-center gap-2 ${colors.buttonDanger} ${colors.buttonText}`}
                                >
                                    <Trash2 size={16} /> Delete Account
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={cancelDeleteAccount}
                onConfirm={confirmDeleteAccount}
                title="Delete Account"
                message="Are you absolutely sure you want to delete your account? This action is irreversible and all your data will be permanently lost."
                confirmText="Yes, Delete My Account"
                cancelText="Cancel"
                isDestructive={true}
                isLoading={isDeleting}
            />

            {/* Global Animations */}
            <style>{`
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.2; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(1.05); }
                }
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                    100% { transform: translateY(0px); }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 6s ease-in-out infinite;
                }
                .animate-float {
                    animation: float 4s ease-in-out infinite;
                }
                .animate-float-delayed {
                    animation: float 4s ease-in-out infinite 2s;
                }
            `}</style>
        </div>
    );
}

export default ProfilePage;