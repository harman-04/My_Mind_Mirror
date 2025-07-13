// src/components/OverallDashboard.js
import React, { useState } from 'react'; // ⭐ Added useState ⭐
import MoodChart from './MoodChart';
import AverageEmotionChart from './AverageEmotionChart';
import ConcernFrequencyChart from './ConcernFrequencyChart';
import JournalClusters from './JournalClusters';
import JournalHistory from './JournalHistory';

function OverallDashboard({
    journalEntries,
    userId,
    onClusteringComplete,
    currentClusterResults,
    onEntryChange
}) {
    const [filterClusterId, setFilterClusterId] = useState(null); // ⭐ NEW STATE ⭐

    const handleFilterCluster = (clusterId) => {
        setFilterClusterId(clusterId);
    };

    return (
        <div className="space-y-6 sm:space-y-8 w-full">
            <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500 w-full">
                <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">Overall Mood & Emotion Trends</h3>
                <MoodChart entries={journalEntries} />
            </div>
            <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500 w-full">
                <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">Overall Average Emotion Intensity</h3>
                <AverageEmotionChart entries={journalEntries} />
            </div>
            <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500 w-full">
                <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">Overall Most Frequent Journal Concerns</h3>
                <ConcernFrequencyChart entries={journalEntries} />
            </div>
            <JournalClusters
                userId={userId}
                onClusteringComplete={onClusteringComplete}
                journalEntries={journalEntries}
                currentClusterResults={currentClusterResults}
                onFilterCluster={handleFilterCluster} 
            />
            <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500 w-full">
                <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">All Journal Entries</h3>
                <JournalHistory 
                    entries={journalEntries} 
                    onEntryChange={onEntryChange} 
                    clusterThemes={currentClusterResults?.clusterThemes} 
                    filterClusterId={filterClusterId} 
                />
            </div>
        </div>
    );
}

export default OverallDashboard;