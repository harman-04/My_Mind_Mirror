// src/pages/ProfilePage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserProfile } from '../hooks/useUserProfile';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'sonner';
import {
    User, Mail, Edit, Save, X, Trash2, Loader, CheckCircle, AlertCircle,
    KeyRound, Lock, Info, Sparkles, Eye, EyeOff, Shield, Database, Target, Clock
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
        roadmapPreferences,
        updateRoadmapPreferences,
        updatePreferences,
        isUpdatingPreferences,
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

    const [roadmapPrefs, setRoadmapPrefs] = useState({
        difficulty: 'BEGINNER',
        languagePreference: 'en',
        learningStyle: 'READING',
        hoursPerWeek: 10,
        avoidWeekends: false,
    });

    const [availableHours, setAvailableHours] = useState({
        monday: [["09:00","12:00"],["13:00","17:00"]],
        tuesday: [["09:00","12:00"],["13:00","17:00"]],
        wednesday: [["09:00","12:00"],["13:00","17:00"]],
        thursday: [["09:00","12:00"],["13:00","17:00"]],
        friday: [["09:00","12:00"],["13:00","17:00"]],
        saturday: [],
        sunday: []
    });
    const [timezone, setTimezone] = useState("Asia/Kolkata");

    // Local loading flags to prevent double clicks
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [savingApiKey, setSavingApiKey] = useState(false);
    const [savingRoadmapPrefs, setSavingRoadmapPrefs] = useState(false);
    const [savingHours, setSavingHours] = useState(false);

    // Load preferences when available
    useEffect(() => {
        if (roadmapPreferences.data) {
            setRoadmapPrefs({
                difficulty: roadmapPreferences.data.difficulty || 'BEGINNER',
                languagePreference: roadmapPreferences.data.languagePreference || 'en',
                learningStyle: roadmapPreferences.data.learningStyle || 'READING',
                hoursPerWeek: roadmapPreferences.data.hoursPerWeek || 10,
                avoidWeekends: roadmapPreferences.data.avoidWeekends || false,
            });
        }
    }, [roadmapPreferences.data]);

    useEffect(() => {
        if (profile) {
            if (profile.availableHoursJson) {
                try {
                    setAvailableHours(JSON.parse(profile.availableHoursJson));
                } catch(e) { console.error(e); }
            }
            if (profile.timezone) setTimezone(profile.timezone);
        }
    }, [profile]);

    const handlePrefChange = (key, value) => {
        setRoadmapPrefs(prev => ({ ...prev, [key]: value }));
    };

    const saveRoadmapPrefs = useCallback(async () => {
        if (savingRoadmapPrefs) return;
        setSavingRoadmapPrefs(true);
        try {
            await updateRoadmapPreferences(roadmapPrefs);
            toast.success('Roadmap preferences saved successfully!');
            // Clear any existing feedback message for this action
            setFeedbackMessage({ type: '', text: '' });
        } catch (err) {
            console.error("Error saving roadmap prefs", err);
            const errorMsg = err.message || 'Failed to save preferences.';
            toast.error(errorMsg);
            setFeedbackMessage({ type: 'error', text: errorMsg });
        } finally {
            setSavingRoadmapPrefs(false);
        }
    }, [roadmapPrefs, updateRoadmapPreferences, savingRoadmapPrefs]);

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

    const handleSaveProfile = useCallback(async () => {
        if (savingProfile) return;
        setFeedbackMessage({ type: '', text: '' });
        try {
            if (editedUsername.length < 3 || editedUsername.length > 50) {
                const errorMsg = 'Username must be between 3 and 50 characters.';
                setFeedbackMessage({ type: 'error', text: errorMsg });
                toast.error(errorMsg);
                return;
            }
            setSavingProfile(true);
            await updateProfile({ username: editedUsername, email: editedEmail });
            setIsEditing(false);
            toast.success('Profile updated successfully!');
            setFeedbackMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (err) {
            console.error("Error updating profile:", err);
            const errorMsg = err.response?.data?.message || err.message || 'Failed to update profile.';
            setFeedbackMessage({ type: 'error', text: errorMsg });
            toast.error(errorMsg);
        } finally {
            setSavingProfile(false);
        }
    }, [editedUsername, editedEmail, updateProfile, savingProfile]);

    const handleChangePassword = useCallback(async () => {
        if (savingPassword) return;
        setPasswordChangeError('');
        setPasswordChangeSuccess('');

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            const errorMsg = 'All password fields are required.';
            setPasswordChangeError(errorMsg);
            toast.error(errorMsg);
            return;
        }
        if (newPassword.length < 6) {
            const errorMsg = 'New password must be at least 6 characters long.';
            setPasswordChangeError(errorMsg);
            toast.error(errorMsg);
            return;
        }
        if (newPassword !== confirmNewPassword) {
            const errorMsg = 'New password and confirmation do not match.';
            setPasswordChangeError(errorMsg);
            toast.error(errorMsg);
            return;
        }
        if (currentPassword === newPassword) {
            const errorMsg = 'New password cannot be the same as the current password.';
            setPasswordChangeError(errorMsg);
            toast.error(errorMsg);
            return;
        }

        setSavingPassword(true);
        try {
            await changePassword({ currentPassword, newPassword });
            setPasswordChangeSuccess('Password changed successfully!');
            toast.success('Password changed successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (err) {
            console.error("Error changing password:", err);
            const errorMsg = err.message || 'Failed to change password.';
            setPasswordChangeError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setSavingPassword(false);
        }
    }, [currentPassword, newPassword, confirmNewPassword, changePassword, savingPassword]);

    const handleSaveApiKey = useCallback(async () => {
        if (savingApiKey) return;
        setApiKeyMessage('');
        setSavingApiKey(true);
        try {
            await updateApiKey(newApiKey);
            toast.success('API key saved successfully.');
            setApiKeyMessage({ type: 'success', text: 'API key saved successfully.' });
            setNewApiKey('');
        } catch (err) {
            const errorMsg = err.message || 'Failed to save API key.';
            toast.error(errorMsg);
            setApiKeyMessage({ type: 'error', text: errorMsg });
        } finally {
            setSavingApiKey(false);
        }
    }, [newApiKey, updateApiKey, savingApiKey]);

    const handleDeleteAccount = () => setShowDeleteConfirm(true);
    const confirmDeleteAccount = async () => {
        setFeedbackMessage({ type: '', text: '' });
        try {
            await deleteProfile();
            toast.success('Account deleted successfully. Redirecting...');
            setFeedbackMessage({ type: 'success', text: 'Account deleted successfully. Redirecting...' });
            setTimeout(() => navigate('/'), 2000);
        } catch (err) {
            console.error("Error deleting account:", err);
            const errorMsg = err.message || 'Failed to delete account.';
            toast.error(errorMsg);
            setFeedbackMessage({ type: 'error', text: errorMsg });
        } finally {
            setShowDeleteConfirm(false);
        }
    };
    const cancelDeleteAccount = () => setShowDeleteConfirm(false);

    const handleSaveHours = useCallback(async () => {
        if (savingHours) return;
        setSavingHours(true);
        try {
            await updatePreferences({
                availableHoursJson: JSON.stringify(availableHours),
                timezone: timezone,
            });
            toast.success("Available hours saved");
        } catch (err) {
            toast.error("Failed to save preferences");
        } finally {
            setSavingHours(false);
        }
    }, [availableHours, timezone, updatePreferences, savingHours]);

    // Theme styles (unchanged)
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

    return (
        <div className={`min-h-screen w-full ${colors.background} transition-colors duration-300 relative p-4 sm:p-6`}>
            {/* Animated Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-teal-500/5" />
                <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" />
                <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse-slow delay-1000" />
            </div>

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
                                            disabled={savingProfile}
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
                                            disabled={savingProfile}
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
                                            disabled={savingProfile}
                                        >
                                            <X size={16} /> Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveProfile}
                                            className={`px-5 py-2 rounded-full font-medium transition flex items-center gap-2 ${colors.buttonPrimary} ${colors.buttonText}`}
                                            disabled={savingProfile}
                                        >
                                            {savingProfile ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                                            {savingProfile ? 'Saving...' : 'Save'}
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
                                        disabled={savingPassword}
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
                                        disabled={savingPassword}
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
                                        disabled={savingPassword}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    onClick={handleChangePassword}
                                    className={`px-5 py-2 rounded-full font-medium transition flex items-center gap-2 ${colors.buttonPrimary} ${colors.buttonText}`}
                                    disabled={savingPassword || isChangingPassword}
                                >
                                    {(savingPassword || isChangingPassword) ? <Loader size={16} className="animate-spin" /> : <Lock size={16} />}
                                    {(savingPassword || isChangingPassword) ? 'Changing...' : 'Change Password'}
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
                                            disabled={savingApiKey}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowApiKey(!showApiKey)}
                                            className="px-4 rounded-r-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                                            disabled={savingApiKey}
                                        >
                                            {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-end">
                                    <button
                                        onClick={handleSaveApiKey}
                                        className={`px-5 py-2 rounded-full font-medium transition flex items-center gap-2 ${colors.buttonPrimary} ${colors.buttonText}`}
                                        disabled={savingApiKey || updateApiKey.isLoading}
                                    >
                                        {(savingApiKey || updateApiKey.isLoading) ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                                        {(savingApiKey || updateApiKey.isLoading) ? 'Saving...' : 'Save'}
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

                        {/* Roadmap Preferences Card */}
                        <div className={`rounded-xl ${colors.sectionBg} border ${colors.sectionBorder} p-6 space-y-5`}>
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Target size={20} className="text-teal-400" /> Roadmap Preferences
                            </h2>
                            <p className={`text-sm ${colors.textSecondary}`}>
                                These preferences will be used when generating AI roadmaps. You can override them per roadmap.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className={`block text-sm font-medium mb-1.5 ${colors.textSecondary}`}>Difficulty</label>
                                    <select
                                        value={roadmapPrefs.difficulty}
                                        onChange={(e) => handlePrefChange('difficulty', e.target.value)}
                                        className={`w-full p-3 rounded-xl border ${colors.inputBorder} ${colors.inputBg} focus:outline-none focus:ring-2 ${colors.inputFocusRing} transition`}
                                        disabled={savingRoadmapPrefs}
                                    >
                                        <option value="BEGINNER">Beginner (explain basics)</option>
                                        <option value="INTERMEDIATE">Intermediate</option>
                                        <option value="ADVANCED">Advanced (skip fundamentals)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-1.5 ${colors.textSecondary}`}>Preferred Language</label>
                                    <select
                                        value={roadmapPrefs.languagePreference}
                                        onChange={(e) => handlePrefChange('languagePreference', e.target.value)}
                                        className={`w-full p-3 rounded-xl border ${colors.inputBorder} ${colors.inputBg} focus:outline-none focus:ring-2 ${colors.inputFocusRing} transition`}
                                        disabled={savingRoadmapPrefs}
                                    >
                                        <option value="en">English</option>
                                        <option value="hi">Hindi</option>
                                        <option value="es">Spanish</option>
                                        <option value="fr">French</option>
                                        <option value="de">German</option>
                                        <option value="zh">Chinese</option>
                                        <option value="ar">Arabic</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-1.5 ${colors.textSecondary}`}>Learning Style</label>
                                    <select
                                        value={roadmapPrefs.learningStyle}
                                        onChange={(e) => handlePrefChange('learningStyle', e.target.value)}
                                        className={`w-full p-3 rounded-xl border ${colors.inputBorder} ${colors.inputBg} focus:outline-none focus:ring-2 ${colors.inputFocusRing} transition`}
                                        disabled={savingRoadmapPrefs}
                                    >
                                        <option value="READING">Reading (articles, docs)</option>
                                        <option value="VISUAL">Visual (videos, diagrams)</option>
                                        <option value="HANDS_ON">Hands‑on (exercises, projects)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-1.5 ${colors.textSecondary}`}>Hours per Week</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="70"
                                        value={roadmapPrefs.hoursPerWeek}
                                        onChange={(e) => handlePrefChange('hoursPerWeek', parseInt(e.target.value) || 10)}
                                        className={`w-full p-3 rounded-xl border ${colors.inputBorder} ${colors.inputBg} focus:outline-none focus:ring-2 ${colors.inputFocusRing} transition`}
                                        disabled={savingRoadmapPrefs}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="avoidWeekends"
                                        checked={roadmapPrefs.avoidWeekends}
                                        onChange={(e) => handlePrefChange('avoidWeekends', e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                                        disabled={savingRoadmapPrefs}
                                    />
                                    <label htmlFor="avoidWeekends" className={`text-sm font-medium ${colors.textSecondary}`}>
                                        Avoid weekends (schedule tasks only on weekdays)
                                    </label>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    onClick={saveRoadmapPrefs}
                                    className={`px-5 py-2 rounded-full font-medium transition flex items-center gap-2 ${colors.buttonPrimary} ${colors.buttonText}`}
                                    disabled={savingRoadmapPrefs || updateRoadmapPreferences.isPending}
                                >
                                    {(savingRoadmapPrefs || updateRoadmapPreferences.isPending) ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                                    {(savingRoadmapPrefs || updateRoadmapPreferences.isPending) ? 'Saving...' : 'Save Preferences'}
                                </button>
                            </div>
                        </div>

                        {/* Available Hours Card */}
                        <div className={`rounded-2xl ${colors.sectionBg} border ${colors.sectionBorder} p-4 sm:p-6 lg:p-8 shadow-sm backdrop-blur-sm space-y-6`}>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                    <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-teal-500/10">
                                            <Clock size={18} className="text-teal-400" />
                                        </div>
                                        Your Available Hours
                                    </h2>
                                    <p className={`text-sm mt-2 ${colors.textSecondary} max-w-2xl`}>
                                        Set the time slots when you are free to work. The AI scheduler will automatically use these hours.
                                    </p>
                                </div>
                            </div>

                            {isLoading ? (
                                <div className="animate-pulse space-y-4">
                                    <div className="h-16 rounded-xl bg-gray-200 dark:bg-gray-700" />
                                    <div className="h-16 rounded-xl bg-gray-200 dark:bg-gray-700" />
                                    <div className="h-16 rounded-xl bg-gray-200 dark:bg-gray-700" />
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {Object.keys(availableHours).map((day) => (
                                        <div
                                            key={day}
                                            className={`rounded-2xl border ${colors.sectionBorder} bg-white/40 dark:bg-white/[0.03] p-4 sm:p-5 transition-all duration-200 hover:shadow-md`}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-8 rounded-full bg-gradient-to-b from-purple-500 to-teal-400" />
                                                    <div>
                                                        <h3 className="capitalize font-semibold text-base sm:text-lg">{day}</h3>
                                                        <p className={`text-xs ${colors.textSecondary}`}>
                                                            {availableHours[day].length} slot{availableHours[day].length !== 1 ? "s" : ""}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newSlots = [...availableHours[day], ["09:00", "17:00"]];
                                                        setAvailableHours({ ...availableHours, [day]: newSlots });
                                                    }}
                                                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-500 to-teal-500 text-white transition-all duration-200 hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
                                                    disabled={savingHours}
                                                >
                                                    + Add Slot
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                {availableHours[day].map((slot, idx) => (
                                                    <div key={idx} className={`group rounded-xl border ${colors.inputBorder} ${colors.inputBg} p-3`}>
                                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                                            <div className="flex-1">
                                                                <label className={`text-xs mb-1 block ${colors.textSecondary}`}>Start</label>
                                                                <input
                                                                    type="time"
                                                                    value={slot[0]}
                                                                    onChange={(e) => {
                                                                        const newSlots = [...availableHours[day]];
                                                                        newSlots[idx][0] = e.target.value;
                                                                        setAvailableHours({ ...availableHours, [day]: newSlots });
                                                                    }}
                                                                    className={`w-full px-3 py-2.5 rounded-xl border ${colors.inputBorder} ${colors.inputBg} focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 outline-none transition-all`}
                                                                    disabled={savingHours}
                                                                />
                                                            </div>
                                                            <div className="hidden sm:flex items-center justify-center pt-5">
                                                                <span className="text-gray-400">→</span>
                                                            </div>
                                                            <div className="flex-1">
                                                                <label className={`text-xs mb-1 block ${colors.textSecondary}`}>End</label>
                                                                <input
                                                                    type="time"
                                                                    value={slot[1]}
                                                                    onChange={(e) => {
                                                                        const newSlots = [...availableHours[day]];
                                                                        newSlots[idx][1] = e.target.value;
                                                                        setAvailableHours({ ...availableHours, [day]: newSlots });
                                                                    }}
                                                                    className={`w-full px-3 py-2.5 rounded-xl border ${colors.inputBorder} ${colors.inputBg} focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 outline-none transition-all`}
                                                                    disabled={savingHours}
                                                                />
                                                            </div>
                                                            <div className="flex items-end">
                                                                <button
                                                                    onClick={() => {
                                                                        const newSlots = availableHours[day].filter((_, i) => i !== idx);
                                                                        setAvailableHours({ ...availableHours, [day]: newSlots });
                                                                    }}
                                                                    className="w-full sm:w-11 h-11 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-all duration-200 disabled:opacity-50"
                                                                    disabled={savingHours}
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {availableHours[day].length === 0 && (
                                                    <div className={`rounded-xl border border-dashed ${colors.sectionBorder} p-5 text-center`}>
                                                        <p className={`text-sm italic ${colors.textSecondary}`}>No slots added — no tasks will be scheduled on this day.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
                                <button
                                    onClick={handleSaveHours}
                                    disabled={savingHours || isUpdatingPreferences}
                                    className="w-full sm:w-auto min-w-[180px] px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-teal-500 text-white font-semibold flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-xl hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100"
                                >
                                    {(savingHours || isUpdatingPreferences) ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
                                    {(savingHours || isUpdatingPreferences) ? "Saving..." : "Save Hours"}
                                </button>
                            </div>
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
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    {isDeleting ? 'Deleting...' : 'Delete Account'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

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