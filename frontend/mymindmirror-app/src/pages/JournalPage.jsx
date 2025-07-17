// src/pages/JournalPage.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { format, startOfWeek, endOfWeek, isSameDay, parseISO } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';

// Import the new hooks
import { useJournalEntries } from '../hooks/useJournalData';

// Import components
import JournalInput from '../components/JournalInput';
import AnomalyAlerts from '../components/AnomalyAlerts';
import TodayDashboard from '../components/TodayDashboard';
import WeeklyDashboard from '../components/WeeklyDashboard';
import OverallDashboard from '../components/OverallDashboard';
import JournalSearch from '../components/JournalSearch';
import MilestoneTracker from '../components/MilestoneTracker';
import AppLoader from '../components/AppLoader'; // ⭐ NEW: Import the advanced loader ⭐

function JournalPage() {
    const [username, setUsername] = useState('');
    const [userId, setUserId] = useState(null); // This will hold the UUID string
    const [currentClusterResults, setCurrentClusterResults] = useState(null);
    const [activeTab, setActiveTab] = useState('today');
    const navigate = useNavigate();
    const { theme } = useTheme();

    // Use the Tanstack Query hook to fetch journal entries
    const {
        data: journalEntries, // Renamed from 'data' to 'journalEntries' for clarity
        isLoading, // Tanstack Query's loading state
        isError, // Tanstack Query's error state
        error, // Tanstack Query's error object
        // refetch is available but invalidateQueries is preferred for mutations
    } = useJournalEntries();

    useEffect(() => {
        const token = localStorage.getItem('jwtToken');
        if (!token) {
            navigate('/login');
            return;
        }

        try {
            const decodedToken = jwtDecode(token);
            setUsername(decodedToken.sub);
            setUserId(decodedToken.userId);
        } catch (decodeError) {
            console.error("Error decoding JWT:", decodeError);
            localStorage.removeItem('jwtToken');
            navigate('/login');
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('jwtToken');
        navigate('/login');
    };

    const handleClusteringComplete = (results) => {
        console.log("handleClusteringComplete called with results:", results);
        setCurrentClusterResults(results);
    };

    // The most recent entry overall (for TodaysReflection and DailyEmotionSnapshot)
    const latestEntryForDashboard = journalEntries?.length > 0 ? journalEntries[0] : null;

    // Filter entries for "Today" tab
    const todayDate = new Date();
    const todayEntries = journalEntries ? journalEntries.filter(entry =>
        isSameDay(parseISO(entry.entryDate), todayDate)
    ) : [];

    // Filter entries for "Weekly Overview" tab
    const startOfCurrentWeek = startOfWeek(todayDate, { weekStartsOn: 0 });
    const endOfCurrentWeek = endOfWeek(todayDate, { weekStartsOn: 0 });
    const weeklyEntries = journalEntries ? journalEntries.filter(entry => {
        const entryDate = parseISO(entry.entryDate);
        return entryDate >= startOfCurrentWeek && entryDate <= endOfCurrentWeek;
    }) : [];

    if (isLoading) { // Use Tanstack Query's isLoading
        return <AppLoader />; // ⭐ REPLACED with the new loader component ⭐
    }

    if (isError) { // Use Tanstack Query's isError and error object
        return (
            <div className={`w-full max-w-4xl flex-grow p-6 rounded-xl
                            ${theme === 'dark' ? 'bg-black/30 text-[#FF8A7A] border-white/10' : 'bg-white/70 text-[#FF8A7A] border-white/30'}
                            backdrop-blur-md shadow-lg transition-all duration-500 flex flex-col items-center justify-center font-inter text-lg`}>
                <p>{error?.message || 'Failed to load journal data.'}</p>
                <button
                    onClick={handleLogout}
                    className="mt-4 py-2 px-4 rounded-full font-poppins font-semibold text-white
                                bg-[#FF8A7A] hover:bg-[#FF6C5A] active:bg-[#D45E4D]
                                shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#FF8A7A] focus:ring-opacity-75
                                transition-all duration-300"
                >
                    Logout
                </button>
            </div>
        );
    }

    return (
        <div className={`min-h-screen flex flex-col items-center p-2 sm:p-4
                            bg-gradient-to-br from-[#F8F9FA] to-[#E0E0E0]
                            dark:from-[#1E1A3E] dark:to-[#3A355C]
                            text-gray-800 dark:text-gray-200`}>

            <main className="w-full max-w-4xl flex-grow p-4 sm:p-6 rounded-xl
                                    bg-white/70 dark:bg-black/30 backdrop-blur-md shadow-lg border border-white/30 dark:border-white/10
                                    transition-all duration-500 flex flex-col space-y-6 sm:space-y-8">

                <JournalInput />

                <AnomalyAlerts />

                {/* Tab Navigation */}
                <div className="flex justify-center space-x-2 sm:space-x-4 mb-6 flex-wrap">
                    <button
                        onClick={() => setActiveTab('today')}
                        className={`py-2 px-4 sm:px-6 rounded-full font-poppins font-semibold text-sm sm:text-base
                                            transition-all duration-300 shadow-md mb-2 sm:mb-0
                                            ${activeTab === 'today'
                                                ? 'bg-[#B399D4] text-white dark:bg-[#5CC8C2] dark:text-gray-800'
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                            }`}
                    >
                        Today
                    </button>
                    <button
                        onClick={() => setActiveTab('weekly')}
                        className={`py-2 px-4 sm:px-6 rounded-full font-poppins font-semibold text-sm sm:text-base
                                            transition-all duration-300 shadow-md mb-2 sm:mb-0
                                            ${activeTab === 'weekly'
                                                ? 'bg-[#B399D4] text-white dark:bg-[#5CC8C2] dark:text-gray-800'
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                            }`}
                    >
                        Weekly Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`py-2 px-4 sm:px-6 rounded-full font-poppins font-semibold text-sm sm:text-base
                                            transition-all duration-300 shadow-md mb-2 sm:mb-0
                                            ${activeTab === 'all'
                                                ? 'bg-[#B399D4] text-white dark:bg-[#5CC8C2] dark:text-gray-800'
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                            }`}
                    >
                        All Entries
                    </button>
                    <button
                        onClick={() => setActiveTab('search')}
                        className={`py-2 px-4 sm:px-6 rounded-full font-poppins font-semibold text-sm sm:text-base
                                            transition-all duration-300 shadow-md mb-2 sm:mb-0
                                            ${activeTab === 'search'
                                                ? 'bg-[#B399D4] text-white dark:bg-[#5CC8C2] dark:text-gray-800'
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                            }`}
                    >
                        Search
                    </button>
                    <button
                        onClick={() => setActiveTab('milestones')}
                        className={`py-2 px-4 sm:px-6 rounded-full font-poppins font-semibold text-sm sm:text-base
                                            transition-all duration-300 shadow-md mb-2 sm:mb-0
                                            ${activeTab === 'milestones'
                                                ? 'bg-[#B399D4] text-white dark:bg-[#5CC8C2] dark:text-gray-800'
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                            }`}
                    >
                        Milestones & To-Dos
                    </button>
                </div>

                {/* Conditional Rendering based on activeTab */}
                {activeTab === 'today' && (
                    <TodayDashboard
                        latestEntry={latestEntryForDashboard}
                        todayEntries={todayEntries}
                    />
                )}

                {activeTab === 'weekly' && (
                    <WeeklyDashboard
                        weeklyEntries={weeklyEntries}
                        userId={userId}
                        onClusteringComplete={handleClusteringComplete}
                        currentClusterResults={currentClusterResults}
                        startOfCurrentWeek={startOfCurrentWeek}
                        endOfCurrentWeek={endOfCurrentWeek}
                    />
                )}

                {activeTab === 'all' && (
                    <OverallDashboard
                        journalEntries={journalEntries}
                        userId={userId}
                        onClusteringComplete={handleClusteringComplete}
                        currentClusterResults={currentClusterResults}
                    />
                )}

                {activeTab === 'search' && (
                    <JournalSearch
                        userId={userId}
                    />
                )}

                {activeTab === 'milestones' && (
                    <MilestoneTracker userId={userId} />
                )}
            </main>
        </div>
    );
}

export default JournalPage;
