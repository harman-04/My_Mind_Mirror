// In src/main/java/com/mymindmirror.backend/pages/JournalPage.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import JournalInput from '../components/JournalInput';
import MoodChart from '../components/MoodChart';
import JournalHistory from '../components/JournalHistory';
import ConcernFrequencyChart from '../components/ConcernFrequencyChart';
import TodaysReflection from '../components/TodaysReflection';
import AverageEmotionChart from '../components/AverageEmotionChart';
import DailyEmotionSnapshot from '../components/DailyEmotionSnapshot';
import AnomalyAlerts from '../components/AnomalyAlerts';
import JournalClusters from '../components/JournalClusters';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

function JournalPage() {
    const [journalEntries, setJournalEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [username, setUsername] = useState('');
    const [userId, setUserId] = useState(null);
    const [currentClusterResults, setCurrentClusterResults] = useState(null); 
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

    // ⭐ MODIFIED: Ensure cluster results are set before re-fetching journal data ⭐
    const handleClusteringComplete = (results) => {
        console.log("handleClusteringComplete called with results:", results);
        setCurrentClusterResults(results); // Set the results in parent state FIRST
        // Then, after a short delay or next tick, re-fetch journal data
        // This gives React a chance to process the state update for currentClusterResults
        setTimeout(() => {
            fetchJournalData(); 
        }, 0); // Use setTimeout with 0 delay to defer the re-fetch
    };

    const latestEntryForDashboard = journalEntries.length > 0 ? journalEntries[0] : null;

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
                
                <JournalInput onNewEntry={fetchJournalData} />

                <AnomalyAlerts /> 

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                    <TodaysReflection latestEntry={latestEntryForDashboard} />
                    <DailyEmotionSnapshot latestEntry={latestEntryForDashboard} />
                </div>

                <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500">
                    <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">Your Mood & Emotion Trends Over Time</h3>
                    <MoodChart entries={journalEntries} />
                </div>

                <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500">
                    <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">Average Emotion Intensity</h3>
                    <AverageEmotionChart entries={journalEntries} />
                </div>

                <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500">
                    <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">Most Frequent Journal Concerns</h3>
                    <ConcernFrequencyChart entries={journalEntries} />
                </div>

                {/* Journal Clusters Section */}
                <JournalClusters 
                    userId={userId} 
                    onClusteringComplete={handleClusteringComplete}
                    journalEntries={journalEntries}
                    currentClusterResults={currentClusterResults} // ⭐ Pass the state variable as a prop ⭐
                />

                <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500">
                    <JournalHistory entries={journalEntries} onEntryChange={fetchJournalData} />
                </div>
            </main>

            <footer className="w-full max-w-4xl text-center mt-6 sm:mt-8 text-xs sm:text-sm text-gray-600 dark:text-gray-400 p-2 sm:p-0">
                &copy; {new Date().getFullYear()} MyMindMirror. All rights reserved.
            </footer>
        </div>
    );
}

export default JournalPage;
