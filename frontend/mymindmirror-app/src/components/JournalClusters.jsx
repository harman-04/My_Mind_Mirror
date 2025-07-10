// In src/main/java/com/mymindmirror.backend/components/JournalClusters.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';

function JournalClusters({ userId, onClusteringComplete, journalEntries, currentClusterResults }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [numClusters, setNumClusters] = useState(5);

    useEffect(() => {
        console.log("JournalClusters prop 'currentClusterResults' changed:", currentClusterResults);
    }, [currentClusterResults]);

    // ⭐ NEW: Add a useEffect to inspect currentClusterResults when it updates ⭐
    useEffect(() => {
        if (currentClusterResults) {
            console.log("Cluster results are present:");
            console.log("  numClusters:", currentClusterResults.numClusters);
            console.log("  clusterThemes:", currentClusterResults.clusterThemes);
            console.log("  entryClusters:", currentClusterResults.entryClusters);
            if (currentClusterResults.clusterThemes) {
                console.log("  Keys in clusterThemes:", Object.keys(currentClusterResults.clusterThemes));
                console.log("  Length of clusterThemes keys:", Object.keys(currentClusterResults.clusterThemes).length);
            }
        } else {
            console.log("Cluster results are NULL or UNDEFINED.");
        }
    }, [currentClusterResults]);


    const handleCluster = async () => {
        setLoading(true);
        setError('');

        const token = localStorage.getItem('jwtToken');
        if (!token) {
            setError('Authentication token not found. Please log in.');
            setLoading(false);
            return;
        }

        if (!userId) {
            setError('User ID not available for clustering.');
            setLoading(false);
            return;
        }

        const effectiveNumClusters = Math.min(numClusters, journalEntries.length);
        if (journalEntries.length < 2 || effectiveNumClusters < 2) {
            setError('You need at least 2 journal entries to find themes. Keep writing!');
            setLoading(false);
            return;
        }

        try {
            const response = await axios.post(
                `http://localhost:8080/api/journal/cluster-entries?nClusters=${effectiveNumClusters}`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.data) {
                if (onClusteringComplete) {
                    onClusteringComplete(response.data);
                }
                console.log("Clustering results received by JournalClusters from API call (response.data):", response.data);
            } else {
                setError('Clustering response was empty.');
            }
        } catch (err) {
            console.error('Error during journal clustering:', err.response ? err.response.data : err.message);
            setError('Failed to perform clustering. Ensure backend services are running and you have enough entries.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 rounded-lg bg-white/60 dark:bg-black/40 shadow-inner transition-all duration-500">
            <h2 className="text-2xl font-poppins font-semibold text-[#B399D4] dark:text-[#5CC8C2] mb-4 text-center">
                Journal Themes & Clusters
            </h2>

            <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4 mb-6">
                <label htmlFor="numClusters" className="font-inter text-gray-700 dark:text-gray-300">
                    Number of Themes:
                </label>
                <input
                    type="number"
                    id="numClusters"
                    value={numClusters}
                    onChange={(e) => setNumClusters(Math.max(2, parseInt(e.target.value) || 2))}
                    min="2"
                    max={Math.max(2, journalEntries.length)}
                    className="w-20 p-2 rounded-md border border-gray-300 dark:border-gray-600
                               bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200
                               focus:outline-none focus:ring-2 focus:ring-[#B399D4] dark:focus:ring-[#5CC8C2]
                               font-inter text-center"
                />
                <button
                    onClick={handleCluster}
                    disabled={loading || journalEntries.length < 2 || numClusters > journalEntries.length}
                    className="py-2 px-6 rounded-full font-poppins font-semibold text-white
                               bg-[#FF8A7A] hover:bg-[#FF6C5A] active:bg-[#D45E4D]
                               shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#FF8A7A] focus:ring-opacity-75
                               transition-all duration-300
                               disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Clustering...' : 'Find My Themes'}
                </button>
            </div>

            {error && <p className="text-[#FF8A7A] font-inter text-center mb-4">{error}</p>}

            {/* ⭐ Debugging the rendering conditions directly in the render method ⭐ */}
            {console.log("--- JournalClusters Render Check ---")}
            {console.log("currentClusterResults:", currentClusterResults)}
            {console.log("currentClusterResults exists:", !!currentClusterResults)}
            {console.log("currentClusterResults.clusterThemes exists:", !!(currentClusterResults && currentClusterResults.clusterThemes))}
            {console.log("Object.keys(currentClusterResults.clusterThemes).length:", currentClusterResults && currentClusterResults.clusterThemes ? Object.keys(currentClusterResults.clusterThemes).length : 'N/A')}
            {console.log("Condition for displaying themes:", currentClusterResults && currentClusterResults.clusterThemes && Object.keys(currentClusterResults.clusterThemes).length > 0)}
            {console.log("--- End Render Check ---")}


            {currentClusterResults && currentClusterResults.clusterThemes && Object.keys(currentClusterResults.clusterThemes).length > 0 ? (
                <div className="space-y-4 mt-6 p-4 bg-white/70 dark:bg-black/50 rounded-lg shadow-inner">
                    <p className="font-inter text-gray-700 dark:text-gray-300 text-center text-lg font-medium mb-4">
                        Your entries are grouped into {currentClusterResults.numClusters} themes:
                    </p>
                    {Object.entries(currentClusterResults.clusterThemes).map(([clusterName, keywords], index) => (
                        <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 mb-3">
                            <h3 className="text-lg font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-2">
                                Theme {index + 1}: <span className="text-[#B399D4] dark:text-[#5CC8C2]">{clusterName}</span>
                            </h3>
                            <p className="font-inter text-gray-700 dark:text-gray-300 text-sm">
                                **Keywords:** {keywords.join(', ')}
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                !loading && !error && journalEntries.length > 0 && (
                    <p className="font-inter text-gray-700 dark:text-gray-300 text-center mt-6">
                        Click "Find My Themes" to analyze your journal entries and discover recurring themes.
                        {journalEntries.length < 2 && <span className="block mt-2"> (You need at least 2 entries for clustering!)</span>}
                    </p>
                )
            )}
        </div>
    );
}

export default JournalClusters;
