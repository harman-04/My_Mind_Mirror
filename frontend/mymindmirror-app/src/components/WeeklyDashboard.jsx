// src/components/WeeklyDashboard.js
import React, { useState } from 'react';
import MoodChart from './MoodChart';
import AverageEmotionChart from './AverageEmotionChart';
import ConcernFrequencyChart from './ConcernFrequencyChart';
import JournalClusters from './JournalClusters';
import JournalHistory from './JournalHistory'; // Assuming JournalHistory handles its own mutations now
import { format } from 'date-fns';

// ⭐ MODIFIED: Removed onEntryChange prop ⭐
function WeeklyDashboard({
    weeklyEntries,
    userId,
    onClusteringComplete,
    currentClusterResults,
    startOfCurrentWeek,
    endOfCurrentWeek
}) {
    const [filterClusterId, setFilterClusterId] = useState(null);

    const handleFilterCluster = (clusterId) => {
        setFilterClusterId(clusterId);
    };

    return (
        <div className="space-y-6 sm:space-y-8 w-full">
            <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500 w-full">
                <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">
                    Weekly Mood & Emotion Trends ({format(startOfCurrentWeek, 'MMM d')} - {format(endOfCurrentWeek, 'MMM d')})
                </h3>
                <MoodChart entries={weeklyEntries} />
            </div>
            <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500 w-full">
                <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">Weekly Average Emotion Intensity</h3>
                <AverageEmotionChart entries={weeklyEntries} />
            </div>
            <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500 w-full">
                <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">Weekly Most Frequent Journal Concerns</h3>
                <ConcernFrequencyChart entries={weeklyEntries} />
            </div>
            <JournalClusters
                userId={userId}
                onClusteringComplete={onClusteringComplete}
                journalEntries={weeklyEntries}
                currentClusterResults={currentClusterResults}
                onFilterCluster={handleFilterCluster}
            />
            <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500 w-full">
                <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">All Weekly Entries</h3>
                {/* ⭐ MODIFIED: Removed onEntryChange prop from JournalHistory ⭐ */}
                <JournalHistory
                    entries={weeklyEntries}
                    clusterThemes={currentClusterResults?.clusterThemes}
                    filterClusterId={filterClusterId}
                />
            </div>
        </div>
    );
}

export default WeeklyDashboard;
