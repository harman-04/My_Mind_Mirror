// In src/main/java/com/mymindmirror.backend/pages/JournalPage.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import JournalInput from '../components/JournalInput';
import AnomalyAlerts from '../components/AnomalyAlerts';
import TodayDashboard from '../components/TodayDashboard';
import WeeklyDashboard from '../components/WeeklyDashboard';
import OverallDashboard from '../components/OverallDashboard';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { format, subDays, startOfWeek, endOfWeek, isSameDay, parseISO } from 'date-fns';

function JournalPage() {
    const [journalEntries, setJournalEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [username, setUsername] = useState('');
    const [userId, setUserId] = useState(null);
    const [currentClusterResults, setCurrentClusterResults] = useState(null);
    const [activeTab, setActiveTab] = useState('today');
    // ⭐ REMOVED: editingEntry state is no longer managed here ⭐
    const navigate = useNavigate();

    // Function to fetch journal entries and mood data
    const fetchJournalData = async () => {
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
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await axios.get('http://localhost:8080/api/journal/history', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setJournalEntries(response.data);
            console.log("Fetched journal entries:", response.data);
        } catch (err) {
            console.error('Error fetching journal data:', err.response ? err.response.data : err.message);
            setError('Failed to load journal data. Please try logging in again.');
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                localStorage.removeItem('jwtToken');
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJournalData();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('jwtToken');
        navigate('/login');
    };

    const handleClusteringComplete = (results) => {
        console.log("handleClusteringComplete called with results:", results);
        setCurrentClusterResults(results);
        // Refresh entries after clustering to show updated cluster IDs
        setTimeout(() => {
            fetchJournalData();
        }, 0);
    };

    // ⭐ REMOVED: handleEditEntry and handleCancelEdit are no longer needed here ⭐

    // The most recent entry overall (for TodaysReflection and DailyEmotionSnapshot)
    const latestEntryForDashboard = journalEntries.length > 0 ? journalEntries[0] : null;

    // Filter entries for "Today" tab
    const today = new Date();
    const todayEntries = journalEntries.filter(entry =>
        isSameDay(parseISO(entry.entryDate), today)
    );

    // Filter entries for "Weekly Overview" tab
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 0 }); // Sunday as start of week
    const endOfCurrentWeek = endOfWeek(today, { weekStartsOn: 0 }); // Saturday as end of week
    const weeklyEntries = journalEntries.filter(entry => {
        const entryDate = parseISO(entry.entryDate);
        return entryDate >= startOfCurrentWeek && entryDate <= endOfCurrentWeek;
    });

    if (loading) {
        return (
            <div className="w-full max-w-4xl flex-grow p-6 rounded-xl
                                bg-white/70 dark:bg-black/30 backdrop-blur-md shadow-lg border border-white/30 dark:border-white/10
                                transition-all duration-500 flex items-center justify-center font-inter text-lg">
                Loading your journal...
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full max-w-4xl flex-grow p-6 rounded-xl
                                bg-white/70 dark:bg-black/30 backdrop-blur-md shadow-lg border border-white/30 dark:border-white/10
                                transition-all duration-500 flex flex-col items-center justify-center font-inter text-lg text-[#FF8A7A]">
                <p>{error}</p>
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
        <div className="min-h-screen flex flex-col items-center p-2 sm:p-4
                             bg-gradient-to-br from-[#F8F9FA] to-[#E0E0E0]
                             dark:from-[#1E1A3E] dark:to-[#3A355C]
                             text-gray-800 dark:text-gray-200">

            <main className="w-full max-w-4xl flex-grow p-4 sm:p-6 rounded-xl
                                     bg-white/70 dark:bg-black/30 backdrop-blur-md shadow-lg border border-white/30 dark:border-white/10
                                     transition-all duration-500 flex flex-col space-y-6 sm:space-y-8">

                {/* JournalInput is now ONLY for new entries */}
                <JournalInput onNewEntry={fetchJournalData} />

                <AnomalyAlerts />

                {/* Tab Navigation */}
                <div className="flex justify-center space-x-2 sm:space-x-4 mb-6">
                    <button
                        onClick={() => setActiveTab('today')}
                        className={`py-2 px-4 sm:px-6 rounded-full font-poppins font-semibold text-sm sm:text-base
                                         transition-all duration-300 shadow-md
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
                                         transition-all duration-300 shadow-md
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
                                         transition-all duration-300 shadow-md
                                         ${activeTab === 'all'
                                             ? 'bg-[#B399D4] text-white dark:bg-[#5CC8C2] dark:text-gray-800'
                                             : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                         }`}
                    >
                        All Entries
                    </button>
                </div>

                {/* Conditional Rendering based on activeTab */}
                {activeTab === 'today' && (
                    <TodayDashboard
                        latestEntry={latestEntryForDashboard}
                        todayEntries={todayEntries}
                        onEntryChange={fetchJournalData}
                        // ⭐ REMOVED: onEditEntry prop is no longer passed from here ⭐
                    />
                )}

                {activeTab === 'weekly' && (
                    <WeeklyDashboard
                        weeklyEntries={weeklyEntries}
                        userId={userId}
                        onClusteringComplete={handleClusteringComplete}
                        currentClusterResults={currentClusterResults}
                        onEntryChange={fetchJournalData}
                        startOfCurrentWeek={startOfCurrentWeek}
                        endOfCurrentWeek={endOfCurrentWeek}
                        // ⭐ REMOVED: onEditEntry prop is no longer passed from here ⭐
                    />
                )}

                {activeTab === 'all' && (
                    <OverallDashboard
                        journalEntries={journalEntries}
                        userId={userId}
                        onClusteringComplete={handleClusteringComplete}
                        currentClusterResults={currentClusterResults}
                        onEntryChange={fetchJournalData}
                        // ⭐ REMOVED: onEditEntry prop is no longer passed from here ⭐
                    />
                )}
            </main>

            <footer className="w-full max-w-4xl text-center mt-6 sm:mt-8 text-xs sm:text-sm text-gray-600 dark:text-gray-400 p-2 sm:p-0">
                &copy; {new Date().getFullYear()} MyMindMirror. All rights reserved.
            </footer>
        </div>
    );
}

export default JournalPage;
