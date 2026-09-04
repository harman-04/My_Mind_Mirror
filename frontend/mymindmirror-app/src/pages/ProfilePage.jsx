// src/pages/ProfilePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'sonner';
import {
    User, Edit, Save, X, Trash2, Loader, CheckCircle, AlertCircle,
    KeyRound, Lock, Info, Sparkles, Eye, EyeOff, Shield, Database, Target, Clock, Activity, Coffee, MapPin, CalendarIcon
} from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import {
    useUserFullProfile,
    useApiKeyStatus,
    useUpdateUserProfile,
    useChangeUserPassword,
    useDeleteUserProfile,
    useUpdateApiKey,
    useUpdateRoadmapPreferences,
    useUpdateUserPreferences
} from '../hooks/useUserProfile';

function ProfilePage() {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    const { data: profile, isLoading, isError, error } = useUserFullProfile();
    const apiKeyStatus = useApiKeyStatus();

    const updateProfileMutation = useUpdateUserProfile();
    const deleteProfileMutation = useDeleteUserProfile();
    const changePasswordMutation = useChangeUserPassword();
    const updateApiKeyMutation = useUpdateApiKey();
    const updateRoadmapPrefsMutation = useUpdateRoadmapPreferences();
    const updatePreferencesMutation = useUpdateUserPreferences();

    const updateProfile = updateProfileMutation.mutateAsync;
    const deleteProfile = deleteProfileMutation.mutateAsync;
    const changePassword = changePasswordMutation.mutateAsync;
    const updateApiKey = updateApiKeyMutation.mutateAsync;
    const updateRoadmapPreferences = updateRoadmapPrefsMutation.mutateAsync;
    const updatePreferences = updatePreferencesMutation.mutateAsync;

    const isDeleting = deleteProfileMutation.isPending;
    const isChangingPassword = changePasswordMutation.isPending;

    // Profile edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editedUsername, setEditedUsername] = useState('');
    const [editedEmail, setEditedEmail] = useState('');

    // Password change state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    // API key state
    const [newApiKey, setNewApiKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // ROADMAP DEFAULTS STATE
    const [roadmapPrefs, setRoadmapPrefs] = useState({
        difficulty: 'BEGINNER',
        languagePreference: 'en',
        learningStyle: 'READING',
        hoursPerWeek: 10,
        avoidWeekends: false,
    });

    // LIFESTYLE STATE
    const [energyPeak, setEnergyPeak] = useState('MORNING');
    const [wakeTime, setWakeTime] = useState('07:00');
    const [sleepTime, setSleepTime] = useState('23:00');
    const [lunchTime, setLunchTime] = useState('13:00');
    const [dailyHabits, setDailyHabits] = useState('');

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

    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [savingApiKey, setSavingApiKey] = useState(false);
    const [savingRoadmapPrefs, setSavingRoadmapPrefs] = useState(false);
    const [savingLifestyle, setSavingLifestyle] = useState(false);

    useEffect(() => {
        if (profile?.roadmapPreferences) {
            setRoadmapPrefs({
                difficulty: profile.roadmapPreferences.difficulty || 'BEGINNER',
                languagePreference: profile.roadmapPreferences.languagePreference || 'en',
                learningStyle: profile.roadmapPreferences.learningStyle || 'READING',
                hoursPerWeek: profile.roadmapPreferences.hoursPerWeek || 10,
                avoidWeekends: profile.roadmapPreferences.avoidWeekends || false,
            });
        }
    }, [profile?.roadmapPreferences]);

    useEffect(() => {
        if (profile) {
            if (profile.availableHoursJson) {
                try { setAvailableHours(JSON.parse(profile.availableHoursJson)); } catch(e) { console.error(e); }
            }
            if (profile.timezone) setTimezone(profile.timezone);
            if (profile.energyPeak) setEnergyPeak(profile.energyPeak);
            if (profile.wakeTime) setWakeTime(profile.wakeTime.substring(0, 5));
            if (profile.sleepTime) setSleepTime(profile.sleepTime.substring(0, 5));
            if (profile.lunchTime) setLunchTime(profile.lunchTime.substring(0, 5));
            if (profile.dailyHabitsJson) {
                try {
                    const habitsArray = JSON.parse(profile.dailyHabitsJson);
                    setDailyHabits(habitsArray.join('\n'));
                } catch(e) { console.error(e); }
            }
            setEditedUsername(profile.username || '');
            setEditedEmail(profile.email || '');
        }
    }, [profile]);

    const handlePrefChange = (key, value) => {
        setRoadmapPrefs(prev => ({ ...prev, [key]: value }));
    };

    const handleSaveRoadmapPrefs = useCallback(async () => {
        if (savingRoadmapPrefs) return;
        setSavingRoadmapPrefs(true);
        try {
            await updateRoadmapPreferences(roadmapPrefs);
            toast.success('Roadmap defaults saved successfully!');
        } catch (err) {
            toast.error(err.message || 'Failed to save roadmap preferences.');
        } finally {
            setSavingRoadmapPrefs(false);
        }
    }, [roadmapPrefs, updateRoadmapPreferences, savingRoadmapPrefs]);

    const handleEditClick = () => setIsEditing(true);

    const handleCancelEdit = () => {
        setIsEditing(false);
        if (profile) {
            setEditedUsername(profile.username || '');
            setEditedEmail(profile.email || '');
        }
    };

    const handleSaveProfile = useCallback(async () => {
        if (savingProfile) return;
        try {
            if (editedUsername.length < 3 || editedUsername.length > 50) {
                toast.error('Username must be between 3 and 50 characters.');
                return;
            }
            setSavingProfile(true);
            await updateProfile({ username: editedUsername, email: editedEmail });
            setIsEditing(false);
            toast.success('Profile updated successfully!');
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Failed to update profile.');
        } finally {
            setSavingProfile(false);
        }
    }, [editedUsername, editedEmail, updateProfile, savingProfile]);

    const handleChangePassword = useCallback(async () => {
        if (savingPassword) return;

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            toast.error('All password fields are required.');
            return;
        }
        if (newPassword.length < 6) {
            toast.error('New password must be at least 6 characters long.');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            toast.error('New password and confirmation do not match.');
            return;
        }
        if (currentPassword === newPassword) {
            toast.error('New password cannot be the same as the current password.');
            return;
        }

        setSavingPassword(true);
        try {
            await changePassword({ currentPassword, newPassword });
            toast.success('Password changed successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (err) {
            toast.error(err.message || 'Failed to change password.');
        } finally {
            setSavingPassword(false);
        }
    }, [currentPassword, newPassword, confirmNewPassword, changePassword, savingPassword]);

    const handleSaveApiKey = useCallback(async () => {
        if (savingApiKey) return;
        setSavingApiKey(true);
        try {
            await updateApiKey(newApiKey);
            toast.success('API key saved successfully.');
            setNewApiKey('');
        } catch (err) {
            toast.error(err.message || 'Failed to save API key.');
        } finally {
            setSavingApiKey(false);
        }
    }, [newApiKey, updateApiKey, savingApiKey]);

    const handleDeleteAccount = () => setShowDeleteConfirm(true);
    const confirmDeleteAccount = async () => {
        try {
            await deleteProfile();
            toast.success('Account deleted successfully. Redirecting...');
            setTimeout(() => navigate('/'), 2000);
        } catch (err) {
            toast.error(err.message || 'Failed to delete account.');
        } finally {
            setShowDeleteConfirm(false);
        }
    };
    const cancelDeleteAccount = () => setShowDeleteConfirm(false);

    const handleSaveLifestyle = useCallback(async () => {
        if (savingLifestyle) return;
        setSavingLifestyle(true);
        try {
            const habitsArray = dailyHabits.split('\n').map(h => h.trim()).filter(h => h.length > 0);
            await updatePreferences({
                availableHoursJson: JSON.stringify(availableHours),
                timezone: timezone,
                energyPeak: energyPeak,
                wakeTime: wakeTime + ":00",
                sleepTime: sleepTime + ":00",
                lunchTime: lunchTime + ":00",
                dailyHabitsJson: JSON.stringify(habitsArray)
            });
            toast.success("Lifestyle & Schedule saved successfully!");
        } catch (err) {
            toast.error("Failed to save lifestyle preferences");
        } finally {
            setSavingLifestyle(false);
        }
    }, [availableHours, timezone, energyPeak, wakeTime, sleepTime, lunchTime, dailyHabits, updatePreferences, savingLifestyle]);

    const SectionHeader = ({ icon: Icon, title, colorClass, subtitle }) => (
        <div className="mb-6 lg:mb-8 border-b border-gray-200/50 dark:border-white/5 pb-5">
            <div className="flex items-center gap-3 lg:gap-4">
                <div className={`p-3 lg:p-4 rounded-xl lg:rounded-2xl bg-white/60 dark:bg-black/20 shadow-sm border border-white/40 dark:border-white/5 ${colorClass}`}>
                    <Icon className="w-6 h-6 lg:w-7 lg:h-7" />
                </div>
                <div>
                    <h2 className="text-xl lg:text-2xl font-poppins font-extrabold text-gray-800 dark:text-gray-100 tracking-tight">{title}</h2>
                    {subtitle && <p className="text-xs lg:text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
                </div>
            </div>
        </div>
    );

    // Premium Glassmorphism Sync
    const colors = {
        background: 'bg-transparent',
        cardBg: isDarkMode ? 'bg-[#1A162F]/60 backdrop-blur-xl' : 'bg-white/70 backdrop-blur-xl',
        cardBorder: isDarkMode ? 'border-white/10' : 'border-gray-200/50',
        sectionBg: isDarkMode ? 'bg-[#131127]/60 backdrop-blur-xl' : 'bg-white/50 backdrop-blur-xl',
        sectionBorder: isDarkMode ? 'border-white/5' : 'border-gray-200/50',
        textPrimary: isDarkMode ? 'text-gray-100' : 'text-gray-900',
        textSecondary: isDarkMode ? 'text-gray-400' : 'text-gray-500',
        inputBg: isDarkMode ? 'bg-[#131127]/80 text-gray-100' : 'bg-white text-gray-900',
        inputBorder: isDarkMode ? 'border-white/10' : 'border-gray-300',
        inputFocusRing: 'focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 dark:focus:ring-teal-400/50 dark:focus:border-teal-400/50',
        buttonPrimary: 'bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 text-white disabled:opacity-50 disabled:hover:scale-100 disabled:hover:translate-y-0 transition-all duration-300',
        buttonSecondary: isDarkMode ? 'bg-black/20 hover:bg-black/40 border border-white/10 text-gray-200 active:scale-95 disabled:opacity-50' : 'bg-gray-100 hover:bg-gray-200 active:scale-95 border border-transparent disabled:opacity-50',
        buttonDanger: 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 hover:shadow-[0_0_15px_rgba(244,63,94,0.3)] active:scale-95 text-white disabled:opacity-50 disabled:hover:scale-100 transition-all duration-300',
    };

    if (isLoading) {
        return (
            <div className={`min-h-[75vh] w-full flex flex-col items-center justify-center p-4 relative`}>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-72 h-72 bg-purple-500/10 rounded-full blur-[100px] animate-pulse" />
                    <div className="w-72 h-72 bg-teal-500/10 rounded-full blur-[100px] animate-pulse delay-700 absolute ml-20" />
                </div>
                <div className="relative z-10 flex flex-col items-center">
                    <div className="p-6 rounded-[2rem] bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-2xl mb-8 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-teal-500/10 animate-pulse" />
                        <User size={56} className="text-purple-500 dark:text-purple-400 relative z-10 animate-bounce" style={{ animationDuration: '2s' }} />
                    </div>
                    <h2 className="text-2xl font-poppins font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-teal-500 dark:from-purple-400 dark:to-teal-400 mb-4 tracking-tight">
                        Loading Profile Data
                    </h2>
                    <div className="w-56 h-1.5 bg-gray-200/80 dark:bg-gray-700/50 rounded-full overflow-hidden relative shadow-inner">
                        <div className="absolute top-0 left-0 h-full w-1/2 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-teal-400 rounded-full animate-progress-indeterminate" />
                    </div>
                </div>
                <style>{`
                    @keyframes indeterminate { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
                    .animate-progress-indeterminate { animation: indeterminate 1.5s infinite cubic-bezier(0.65, 0, 0.35, 1); }
                `}</style>
            </div>
        );
    }

    if (isError) {
        return (
            <div className={`min-h-[60vh] w-full flex items-center justify-center p-4`}>
                <div className="text-center space-y-4">
                    <AlertCircle size={48} className="text-red-500 mx-auto" />
                    <p className="text-red-500 font-bold">{error?.message || 'Failed to load profile.'}</p>
                    <button onClick={() => navigate('/login')} className={`px-6 py-2 rounded-full text-white ${colors.buttonPrimary} transition-all`}>Return to Login</button>
                </div>
            </div>
        );
    }

    return (
        <div className={`w-full transition-colors duration-300 relative`}>

            <div className="absolute top-30 left-2 opacity-20 animate-float hidden lg:block pointer-events-none">
                <User size={40} className="text-purple-400" />
            </div>
            <div className="absolute bottom-42 right-10 opacity-20 animate-float-delayed hidden lg:block pointer-events-none">
                <Shield size={40} className="text-teal-400" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10 space-y-6 sm:space-y-8 pb-10">

                <div className={`rounded-2xl ${colors.cardBg} border ${colors.cardBorder} p-6 shadow-lg flex flex-col sm:flex-row items-center gap-5 transition-all hover:shadow-xl mt-4`}>
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-teal-500/20 shadow-inner">
                        <User className="w-8 h-8 text-purple-500  dark:text-purple-400" />
                    </div>
                    <div className="text-center sm:text-left">
                        <h1 className="text-2xl sm:text-3xl font-poppins font-bold bg-gradient-to-r from-purple-600 to-teal-500 dark:from-purple-400 dark:to-teal-400 bg-clip-text text-transparent">
                            Account Settings
                        </h1>
                        <p className={`text-sm ${colors.textSecondary} mt-1 font-medium`}>
                            Manage your personal information and application preferences.
                        </p>
                    </div>
                </div>

                {/* Account Details */}
                <div className={`rounded-2xl ${colors.sectionBg} border ${colors.sectionBorder} p-6 sm:p-8 shadow-lg transition-all hover:shadow-xl`}>
                    <SectionHeader icon={User} title="Account Details" colorClass="text-purple-500 " />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={`block text-[10px] lg:text-xs font-bold uppercase tracking-wider mb-2 ${colors.textSecondary}`}>Username</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editedUsername}
                                    onChange={(e) => setEditedUsername(e.target.value)}
                                    className={`w-full p-3 rounded-xl border ${colors.inputBorder} ${colors.inputBg} ${colors.inputFocusRing} outline-none transition-all text-sm font-medium`}
                                    disabled={savingProfile}
                                />
                            ) : (
                                <div className={`p-3.5 rounded-xl ${colors.inputBg} border ${colors.inputBorder} font-bold text-sm ${colors.textPrimary}`}>
                                    {profile?.username}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className={`block text-[10px] lg:text-xs font-bold uppercase tracking-wider mb-2 ${colors.textSecondary}`}>Email</label>
                            {isEditing ? (
                                <input
                                    type="email"
                                    value={editedEmail}
                                    onChange={(e) => setEditedEmail(e.target.value)}
                                    className={`w-full p-3 rounded-xl border ${colors.inputBorder} ${colors.inputBg} ${colors.inputFocusRing} outline-none transition-all text-sm font-medium`}
                                    disabled={savingProfile}
                                />
                            ) : (
                                <div className={`p-3.5 rounded-xl ${colors.inputBg} border ${colors.inputBorder} font-bold text-sm ${colors.textPrimary}`}>
                                    {profile?.email}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                        {isEditing ? (
                            <>
                                <button onClick={handleCancelEdit} className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${colors.buttonSecondary} ${colors.textPrimary}`} disabled={savingProfile}>
                                    <X size={18} /> Cancel
                                </button>
                                <button onClick={handleSaveProfile} className={`px-8 py-2.5 rounded-xl text-white font-bold transition-all flex items-center justify-center gap-2 ${colors.buttonPrimary}`} disabled={savingProfile}>
                                    {savingProfile ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
                                    {savingProfile ? 'Saving...' : 'Save Profile'}
                                </button>
                            </>
                        ) : (
                            <button onClick={handleEditClick} className={`px-8 py-2.5 rounded-xl text-white font-bold transition-all flex items-center justify-center gap-2 ${colors.buttonPrimary}`}>
                                <Edit size={18} /> Edit Profile
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-stretch">

                    {/* Change Password */}
                    <div className={`col-span-1 flex flex-col h-full rounded-2xl ${colors.sectionBg} border ${colors.sectionBorder} p-6 sm:p-8 shadow-lg transition-all hover:shadow-xl`}>
                        <SectionHeader icon={KeyRound} title="Change Password" colorClass="text-indigo-500" />
                        <div className="space-y-4 flex-grow">
                            <div>
                                <label className={`block text-[10px] lg:text-xs font-bold uppercase tracking-wider mb-2 ${colors.textSecondary}`}>Current Password</label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className={`w-full p-3 rounded-xl border ${colors.inputBorder} ${colors.inputBg} ${colors.inputFocusRing} outline-none transition-all text-sm font-medium`}
                                    placeholder="••••••••"
                                    disabled={savingPassword}
                                />
                            </div>
                            <div>
                                <label className={`block text-[10px] lg:text-xs font-bold uppercase tracking-wider mb-2 ${colors.textSecondary}`}>New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className={`w-full p-3 rounded-xl border ${colors.inputBorder} ${colors.inputBg} ${colors.inputFocusRing} outline-none transition-all text-sm font-medium`}
                                    placeholder="••••••••"
                                    disabled={savingPassword}
                                />
                            </div>
                            <div>
                                <label className={`block text-[10px] lg:text-xs font-bold uppercase tracking-wider mb-2 ${colors.textSecondary}`}>Confirm Password</label>
                                <input
                                    type="password"
                                    value={confirmNewPassword}
                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                    className={`w-full p-3 rounded-xl border ${colors.inputBorder} ${colors.inputBg} ${colors.inputFocusRing} outline-none transition-all text-sm font-medium`}
                                    placeholder="••••••••"
                                    disabled={savingPassword}
                                />
                            </div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-gray-200/50 dark:border-white/5">
                            <button
                                onClick={handleChangePassword}
                                className={`w-full py-3 rounded-xl text-white font-bold transition-all flex items-center justify-center gap-2 ${colors.buttonPrimary}`}
                                disabled={savingPassword || isChangingPassword}
                            >
                                {(savingPassword || isChangingPassword) ? <Loader size={18} className="animate-spin" /> : <Lock size={18} />}
                                {(savingPassword || isChangingPassword) ? 'Changing...' : 'Update Password'}
                            </button>
                        </div>
                    </div>

                    {/* Gemini API Key */}
                    <div className={`col-span-1 flex flex-col h-full rounded-2xl ${colors.sectionBg} border ${colors.sectionBorder} p-6 sm:p-8 shadow-lg transition-all hover:shadow-xl`}>
                        <SectionHeader icon={Database} title="Gemini API Key" colorClass="text-amber-500" />

                        <div className="space-y-6 flex-grow">
                            {apiKeyStatus.isLoading ? (
                                <div className="h-12 bg-gray-200/50 dark:bg-gray-700/50 rounded-xl animate-pulse" />
                            ) : apiKeyStatus.data ? (
                                <div className={`p-4 rounded-xl flex items-center gap-3 border shadow-sm ${apiKeyStatus.data.usingOwnKey ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'}`}>
                                    {apiKeyStatus.data.usingOwnKey ? <CheckCircle size={20} className="shrink-0" /> : <AlertCircle size={20} className="shrink-0" />}
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-sm truncate">{apiKeyStatus.data.message}</span>
                                        {apiKeyStatus.data.usingOwnKey && <span className="text-[10px] font-mono opacity-80 mt-0.5 truncate">({apiKeyStatus.data.maskedKey})</span>}
                                    </div>
                                </div>
                            ) : null}

                            <div>
                                <label className={`block text-[10px] lg:text-xs font-bold uppercase tracking-wider mb-2 ${colors.textSecondary}`}>Private Key</label>
                                <div className="flex shadow-sm rounded-xl overflow-hidden border border-gray-200/50 dark:border-white/10">
                                    <input
                                        type={showApiKey ? 'text' : 'password'}
                                        value={newApiKey}
                                        onChange={(e) => setNewApiKey(e.target.value)}
                                        placeholder="Paste Gemini API key..."
                                        className={`flex-1 p-3 bg-transparent focus:outline-none focus:bg-white/50 dark:focus:bg-black/20 transition-all font-medium text-sm ${colors.textPrimary}`}
                                        disabled={savingApiKey}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        className={`px-4 bg-gray-100 dark:bg-black/20 hover:bg-gray-200 dark:hover:bg-black/40 transition-colors text-gray-500`}
                                        disabled={savingApiKey}
                                    >
                                        {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-200/50 dark:border-white/5 space-y-4">
                            <button
                                onClick={handleSaveApiKey}
                                className={`w-full py-3 rounded-xl text-white font-bold transition-all flex items-center justify-center gap-2 ${colors.buttonPrimary}`}
                                disabled={savingApiKey || updateApiKeyMutation.isPending}
                            >
                                {(savingApiKey || updateApiKeyMutation.isPending) ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
                                {(savingApiKey || updateApiKeyMutation.isPending) ? 'Saving...' : 'Securely Save Key'}
                            </button>
                            <p className={`text-[10px] leading-relaxed flex items-start gap-1.5 ${colors.textSecondary} bg-amber-50 dark:bg-amber-900/10 p-2.5 rounded-lg border border-amber-200/50 dark:border-amber-500/20`}>
                                <Info size={14} className="shrink-0 text-amber-500 mt-0.5" />
                                <span>
                                    Key is heavily encrypted (AES-GCM). Used to bypass shared quotas.
                                    <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-teal-600 dark:text-teal-400 hover:text-teal-700 hover:underline ml-1 font-bold transition-colors">
                                        Get one here.
                                    </a>
                                </span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Roadmap Defaults */}
                <div className={`rounded-2xl ${colors.sectionBg} border ${colors.sectionBorder} p-6 sm:p-8 shadow-lg transition-all hover:shadow-xl`}>
                    <SectionHeader
                        icon={MapPin}
                        title="Roadmap Defaults"
                        colorClass="text-purple-500 dark:text-teal-400"
                        subtitle="Configure the global baseline parameters used when generating new AI Learning Roadmaps."
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                        <div>
                            <label className={`block text-[10px] lg:text-xs font-bold uppercase tracking-wider mb-2 ${colors.textSecondary}`}>Difficulty</label>
                            <select value={roadmapPrefs.difficulty} onChange={(e) => handlePrefChange('difficulty', e.target.value)} className={`w-full p-3 rounded-xl border ${colors.inputBorder} ${colors.inputBg} ${colors.inputFocusRing} outline-none cursor-pointer font-bold text-sm`}>
                                <option value="BEGINNER">Beginner (explain basics)</option>
                                <option value="INTERMEDIATE">Intermediate</option>
                                <option value="ADVANCED">Advanced (skip fundamentals)</option>
                            </select>
                        </div>
                        <div>
                            <label className={`block text-[10px] lg:text-xs font-bold uppercase tracking-wider mb-2 ${colors.textSecondary}`}>Learning Style</label>
                            <select value={roadmapPrefs.learningStyle} onChange={(e) => handlePrefChange('learningStyle', e.target.value)} className={`w-full p-3 rounded-xl border ${colors.inputBorder} ${colors.inputBg} ${colors.inputFocusRing} outline-none cursor-pointer font-bold text-sm`}>
                                <option value="READING">Reading (articles, docs)</option>
                                <option value="VISUAL">Visual (videos, diagrams)</option>
                                <option value="HANDS_ON">Hands-on (projects)</option>
                            </select>
                        </div>
                        <div>
                            <label className={`block text-[10px] lg:text-xs font-bold uppercase tracking-wider mb-2 ${colors.textSecondary}`}>Pace (Hrs/Week)</label>
                            <input type="number" min="1" max="70" value={roadmapPrefs.hoursPerWeek} onChange={(e) => handlePrefChange('hoursPerWeek', parseInt(e.target.value) || 10)} className={`w-full p-3 rounded-xl border ${colors.inputBorder} ${colors.inputBg} ${colors.inputFocusRing} outline-none font-bold text-sm`} />
                        </div>
                        <div>
                            <label className={`block text-[10px] lg:text-xs font-bold uppercase tracking-wider mb-2 ${colors.textSecondary}`}>Weekend Policy</label>
                            <div className={`p-3 rounded-xl border ${colors.inputBorder} ${colors.inputBg} flex items-center gap-3`}>
                                <input type="checkbox" id="avoidWeekends" checked={roadmapPrefs.avoidWeekends} onChange={(e) => handlePrefChange('avoidWeekends', e.target.checked)} className="w-5 h-5 rounded text-purple-500 focus:ring-purple-500 dark:text-teal-400 dark:focus:ring-teal-400 cursor-pointer" />
                                <label htmlFor="avoidWeekends" className="text-sm font-bold cursor-pointer select-none">Avoid Weekends</label>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-200/50 dark:border-white/5">
                        <button
                            onClick={handleSaveRoadmapPrefs}
                            disabled={savingRoadmapPrefs}
                            className={`px-8 py-3 rounded-xl text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 w-full sm:w-auto ${colors.buttonPrimary}`}
                        >
                            {savingRoadmapPrefs ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
                            {savingRoadmapPrefs ? "Saving Defaults..." : "Save Roadmap Defaults"}
                        </button>
                    </div>
                </div>

                {/* Lifestyle Engine */}
                <div className={`rounded-2xl ${colors.sectionBg} border ${colors.sectionBorder} p-6 sm:p-8 shadow-lg transition-all hover:shadow-xl`}>
                    <SectionHeader
                        icon={Activity}
                        title="Lifestyle & Learning Engine"
                        colorClass="text-teal-500"
                        subtitle="Help the AI understand your routine so it can build perfect, burnout-free Smart Timetables."
                    />

                    {/* Row 1: Time Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                        <div>
                            <label className={`block text-[10px] lg:text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${colors.textSecondary}`}><Sparkles size={14} className="text-purple-500 dark:text-teal-400"/> Energy Peak</label>
                            <select value={energyPeak} onChange={(e) => setEnergyPeak(e.target.value)} className={`w-full p-3 rounded-xl border ${colors.inputBorder} ${colors.inputBg} ${colors.inputFocusRing} outline-none cursor-pointer font-bold text-sm`}>
                                <option value="MORNING">Morning (Focus best early)</option>
                                <option value="AFTERNOON">Afternoon (Steady worker)</option>
                                <option value="EVENING">Evening (Night Owl)</option>
                            </select>
                        </div>
                        <div>
                            <label className={`block text-[10px] lg:text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${colors.textSecondary}`}><Clock size={14} className="text-emerald-500"/> Wake Time</label>
                            <input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} className={`w-full p-3 rounded-xl border ${colors.inputBorder} ${colors.inputBg} ${colors.inputFocusRing} outline-none cursor-pointer font-bold text-sm`} />
                        </div>
                        <div>
                            <label className={`block text-[10px] lg:text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${colors.textSecondary}`}><Clock size={14} className="text-indigo-500"/> Sleep Time</label>
                            <input type="time" value={sleepTime} onChange={(e) => setSleepTime(e.target.value)} className={`w-full p-3 rounded-xl border ${colors.inputBorder} ${colors.inputBg} ${colors.inputFocusRing} outline-none cursor-pointer font-bold text-sm`} />
                        </div>
                        <div>
                            <label className={`block text-[10px] lg:text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${colors.textSecondary}`}><Coffee size={14} className="text-amber-500"/> Lunch Break</label>
                            <input type="time" value={lunchTime} onChange={(e) => setLunchTime(e.target.value)} className={`w-full p-3 rounded-xl border ${colors.inputBorder} ${colors.inputBg} ${colors.inputFocusRing} outline-none cursor-pointer font-bold text-sm`} />
                        </div>
                    </div>

                    {/* Row 2: Habits */}
                    <div className="mb-8">
                        <label className={`block text-[10px] lg:text-xs font-bold uppercase tracking-wider mb-2 ${colors.textSecondary}`}>Daily Habits / Routines (One per line)</label>
                        <textarea
                            value={dailyHabits}
                            onChange={(e) => setDailyHabits(e.target.value)}
                            placeholder="15 mins meditation&#10;30 min walk outside&#10;Read 10 pages of a book"
                            rows="3"
                            className={`w-full p-4 rounded-xl border ${colors.inputBorder} ${colors.inputBg} ${colors.inputFocusRing} outline-none resize-y transition-all leading-relaxed font-medium text-sm`}
                        />
                    </div>

                    {/* Row 4: Availability Grid */}
                    <div className="pt-6 border-t border-gray-200/50 dark:border-white/5">
                        <h3 className="font-poppins font-bold text-lg text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                            <CalendarIcon size={20} className="text-purple-500 dark:text-teal-400" /> Availability Slots
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5">
                            {Object.keys(availableHours).map((day) => (
                                <div key={day} className={`rounded-xl border ${colors.sectionBorder} bg-white/40 dark:bg-black/20 p-4 shadow-sm flex flex-col`}>
                                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200/50 dark:border-white/5 shrink-0">
                                        <span className="capitalize font-poppins font-bold text-gray-800 dark:text-gray-200 text-sm">{day}</span>
                                        <button onClick={() => setAvailableHours({ ...availableHours, [day]: [...availableHours[day], ["09:00", "17:00"]] })} className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/30 px-2 py-1 rounded-lg transition-colors bg-white/50 dark:bg-white/5 border border-teal-200/50 dark:border-teal-500/20 shrink-0">+ Add</button>
                                    </div>
                                    <div className="space-y-2.5 flex-1">
                                        {/* 💡 FIX: Safely contained flex inputs and buttons using min-w-0 */}
                                        {availableHours[day].map((slot, idx) => (
                                            <div key={idx} className="flex items-center gap-1.5 sm:gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <input type="time" value={slot[0]} onChange={(e) => { const newSlots = [...availableHours[day]]; newSlots[idx][0] = e.target.value; setAvailableHours({ ...availableHours, [day]: newSlots }); }} className={`w-full p-1.5 sm:p-2 text-[10px] sm:text-xs font-bold rounded-lg border ${colors.inputBorder} ${colors.inputBg} outline-none focus:ring-1 focus:ring-purple-500 text-center`} />
                                                </div>
                                                <span className="text-gray-400 dark:text-gray-600 text-[10px] sm:text-xs font-bold shrink-0">-</span>
                                                <div className="flex-1 min-w-0">
                                                    <input type="time" value={slot[1]} onChange={(e) => { const newSlots = [...availableHours[day]]; newSlots[idx][1] = e.target.value; setAvailableHours({ ...availableHours, [day]: newSlots }); }} className={`w-full p-1.5 sm:p-2 text-[10px] sm:text-xs font-bold rounded-lg border ${colors.inputBorder} ${colors.inputBg} outline-none focus:ring-1 focus:ring-teal-500 text-center`} />
                                                </div>
                                                <button onClick={() => setAvailableHours({ ...availableHours, [day]: availableHours[day].filter((_, i) => i !== idx) })} className="shrink-0 p-1.5 sm:p-2 text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg transition-colors border border-red-100 dark:border-red-900/30">
                                                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        {availableHours[day].length === 0 && (
                                            <div className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 italic py-2 bg-black/5 dark:bg-white/5 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 h-full flex items-center justify-center min-h-[35px]">No slots added</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end pt-6 mt-6 border-t border-gray-200/50 dark:border-white/5">
                        <button
                            onClick={handleSaveLifestyle}
                            disabled={savingLifestyle}
                            className={`px-8 py-3 rounded-xl text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 w-full sm:w-auto ${colors.buttonPrimary}`}
                        >
                            {savingLifestyle ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
                            {savingLifestyle ? "Saving Lifestyle..." : "Save Lifestyle Engine"}
                        </button>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className={`rounded-2xl bg-red-50/50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 p-6 sm:p-8 shadow-lg transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6`}>
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 rounded-xl bg-white/60 dark:bg-black/20 shadow-sm border border-red-200/50 dark:border-red-500/30 text-red-500">
                                <AlertCircle size={24} />
                            </div>
                            <h2 className="text-xl font-poppins font-bold tracking-tight text-gray-900 dark:text-gray-100">Danger Zone</h2>
                        </div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 md:ml-14">
                            Permanently delete your account and all associated data.
                        </p>
                    </div>

                    <button onClick={handleDeleteAccount} className={`shrink-0 w-full md:w-auto px-6 py-3 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 ${colors.buttonDanger}`} disabled={isDeleting}>
                        {isDeleting ? <Loader size={18} className="animate-spin" /> : <Trash2 size={18} />}
                        {isDeleting ? 'Deleting...' : 'Delete Account Forever'}
                    </button>
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
                @keyframes float { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-15px) rotate(5deg); } }
                .animate-float { animation: float 6s ease-in-out infinite; }
                .animate-float-delayed { animation: float 6s ease-in-out infinite 3s; }

                /* Ensures time inputs shrink cleanly on mobile */
                input[type="time"]::-webkit-calendar-picker-indicator {
                    margin-left: -2px;
                    padding-left: 2px;
                    cursor: pointer;
                }
            `}</style>
        </div>
    );
}

export default React.memo(ProfilePage);