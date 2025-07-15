// src/components/JournalClusters.js

import React, { useState } from 'react';
import axios from 'axios';
import { useTheme } from '../contexts/ThemeContext';

function JournalClusters({ userId, onClusteringComplete, journalEntries, currentClusterResults, onFilterCluster }) {
    const [numClusters, setNumClusters] = useState(3); // Default to 3 clusters
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const { theme } = useTheme();

    const handleFindMyTheme = async () => {
        setLoading(true);
        setError('');
        setSuccessMessage('');

        if (!userId) {
            setError('User ID is not available. Please log in again.');
            setLoading(false);
            return;
        }

        if (!journalEntries || journalEntries.length < 2) {
            setError('You need at least 2 journal entries to perform clustering.');
            setLoading(false);
            return;
        }

        const token = localStorage.getItem('jwtToken');
        if (!token) {
            setError('Authentication token missing. Please log in again.');
            setLoading(false);
            return;
        }

        // Extract raw texts from journal entries for the ML service
        const rawTexts = journalEntries.map(entry => entry.rawText);

            console.log("Sending clustering request with numClusters:", numClusters);

        try {
            // ⭐ CHANGE: Call Spring Boot backend instead of Flask ML Service directly ⭐
            const response = await axios.post(
                'http://localhost:8080/api/journal/cluster-entries', // Spring Boot Backend URL
                { userId: userId, journalTexts: rawTexts, nClusters: numClusters },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log("Clustering response from Spring Boot:", response.data);
            onClusteringComplete(response.data); // Pass full response including themes and entry clusters
            setSuccessMessage('Journal themes generated successfully!');
        } catch (err) {
            console.error('Error during clustering:', err.response ? err.response.data : err.message);
            setError(`Failed to generate themes: ${err.response?.data?.message || err.message}. Please ensure the backend services are running.`);
        } finally {
            setLoading(false);
            setTimeout(() => setSuccessMessage(''), 3000); // Clear success message after 3 seconds
        }
    };

    const handleClearFilter = () => {
        onFilterCluster(null); // Pass null to clear the filter
    };

    return (
        <div className={`p-6 rounded-lg shadow-md transition-all duration-500 w-full
                             ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <h3 className="text-2xl font-poppins font-semibold text-[#B399D4] dark:text-[#5CC8C2] mb-4 text-center">
                Discover Your Journal Themes
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4 text-center font-inter">
                Group your entries into meaningful themes to understand recurring patterns in your thoughts and feelings.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
                <label htmlFor="num-clusters" className="text-gray-700 dark:text-gray-300 font-medium font-inter">
                    Number of Themes:
                </label>
                <input
                    type="number"
                    id="num-clusters"
                    value={numClusters}
                    onChange={(e) => setNumClusters(Math.max(2, parseInt(e.target.value) || 2))} // Min 2 clusters
                    min="2"
                    max={journalEntries.length > 0 ? journalEntries.length : 10} // Max clusters = num entries or 10
                    className={`p-2 rounded-lg border focus:outline-none focus:ring-2 w-24 text-center
                                 ${theme === 'dark' ? 'bg-gray-700 text-gray-200 border-gray-600 focus:ring-[#5CC8C2]' : 'bg-white text-gray-800 border-gray-300 focus:ring-[#B399D4]'}`}
                    aria-label="Number of clusters"
                />
                <button
                    onClick={handleFindMyTheme}
                    disabled={loading || journalEntries.length < 2}
                    className="py-2 px-6 rounded-full font-poppins font-semibold text-white
                                 bg-[#B399D4] hover:bg-[#9B7BBF] active:bg-[#7F66A0]
                                 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#B399D4] focus:ring-opacity-75
                                 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Generating Themes...' : 'Find My Themes'}
                </button>
            </div>

            {error && (
                <div className="bg-red-100 dark:bg-red-900/40 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded relative mb-4 font-inter" role="alert">
                    <strong className="font-bold">Error!</strong>
                    <span className="block sm:inline"> {error}</span>
                </div>
            )}

            {successMessage && (
                <div className="bg-green-100 dark:bg-green-900/40 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded relative mb-4 font-inter" role="alert">
                    <strong className="font-bold">Success!</strong>
                    <span className="block sm:inline"> {successMessage}</span>
                </div>
            )}

            {currentClusterResults && currentClusterResults.clusterThemes && Object.keys(currentClusterResults.clusterThemes).length > 0 && (
                <div className="mt-6">
                    <h4 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">
                        Your Journal Themes:
                    </h4>
                    <div className="flex flex-wrap justify-center gap-3">
                        {Object.entries(currentClusterResults.clusterThemes).map(([themeKey, themeName]) => {
                            // Extract cluster ID from "Theme X" key (e.g., "Theme 1" -> 0)
                            const clusterId = parseInt(themeKey.replace('Theme ', '')) - 1;
                            return (
                                <button
                                    key={clusterId}
                                    onClick={() => onFilterCluster(clusterId)}
                                    className={`px-4 py-2 rounded-full font-poppins font-semibold text-sm
                                                 transition-all duration-300 shadow-md
                                                 bg-[#B399D4] text-white hover:bg-[#9B7BBF] active:bg-[#7F66A0]
                                                 dark:bg-[#5CC8C2] dark:text-gray-800 dark:hover:bg-[#47A8A3] dark:active:bg-[#3A8D89]`}
                                >
                                    {themeName} {/* Display the descriptive name */}
                                </button>
                            );
                        })}
                        {currentClusterResults && currentClusterResults.numClusters > 0 && (
                            <button
                                onClick={handleClearFilter}
                                className={`px-4 py-2 rounded-full font-poppins font-semibold text-sm
                                             transition-all duration-300 shadow-md
                                             bg-gray-300 text-gray-800 hover:bg-gray-400 active:bg-gray-500
                                             dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:active:bg-gray-500`}
                            >
                                Clear Theme Filter
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default JournalClusters;
