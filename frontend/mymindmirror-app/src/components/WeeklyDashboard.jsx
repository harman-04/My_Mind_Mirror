// src/components/WeeklyDashboard.js
import React, { useState } from 'react';
// Reverted to original MoodChart and AverageEmotionChart imports
import MoodChart from './MoodChart';
import AverageEmotionChart from './AverageEmotionChart';
import ConcernFrequencyChart from './ConcernFrequencyChart';
import JournalClusters from './JournalClusters';
import JournalHistory from './JournalHistory';
import { format } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';

// ⭐ NEW CHART COMPONENT IMPORT ⭐
import MoodCalendarHeatmap from './MoodCalendarHeatmap';


function WeeklyDashboard({
    weeklyEntries,
    userId,
    onClusteringComplete,
    currentClusterResults,
    startOfCurrentWeek,
    endOfCurrentWeek
}) {
    const [filterClusterId, setFilterClusterId] = useState(null);
    const { theme } = useTheme(); // Use theme for background colors

    const handleFilterCluster = (clusterId) => {
        setFilterClusterId(clusterId);
    };

    // Determine card background color based on theme
    // ⭐ MODIFIED: Explicitly initialize with let and assign ⭐
    let cardBgClass = '';
    let textColorClass = '';

    if (theme === 'dark') {
        cardBgClass = 'bg-black/40';
        textColorClass = 'text-gray-200';
    } else {
        cardBgClass = 'bg-white/60';
        textColorClass = 'text-gray-800';
    }

    // ⭐ ADDED DEBUG LOGGING ⭐
    console.log("WeeklyDashboard Render - theme:", theme);
    console.log("WeeklyDashboard Render - cardBgClass:", cardBgClass);
    console.log("WeeklyDashboard Render - textColorClass:", textColorClass);


    return (
        <div className="space-y-6 sm:space-y-8 w-full">
            <div className={`${cardBgClass} p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500 w-full`}>
                <h3 className={`text-xl font-poppins font-semibold ${textColorClass} mb-4 text-center`}>
                    Weekly Mood & Emotion Trends ({format(startOfCurrentWeek, 'MMM d')} - {format(endOfCurrentWeek, 'MMM d')})
                </h3>
                {/* Your original MoodChart */}
                <MoodChart entries={weeklyEntries} />
            </div>

            {/* ⭐ NEW: Mood Calendar Heatmap ⭐ */}
            <div className={`${cardBgClass} p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500 w-full`}>
                <MoodCalendarHeatmap journalEntries={weeklyEntries} displayMonth={new Date()} />
            </div>

            <div className={`${cardBgClass} p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500 w-full`}>
                <h3 className={`text-xl font-poppins font-semibold ${textColorClass} mb-4 text-center`}>Weekly Average Emotion Intensity</h3>
                {/* Your original AverageEmotionChart */}
                <AverageEmotionChart entries={weeklyEntries} />
            </div>
            <div className={`${cardBgClass} p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500 w-full`}>
                <h3 className={`text-xl font-poppins font-semibold ${textColorClass} mb-4 text-center`}>Weekly Most Frequent Journal Concerns</h3>
                <ConcernFrequencyChart entries={weeklyEntries} />
            </div>
            <JournalClusters
                userId={userId}
                onClusteringComplete={onClusteringComplete}
                journalEntries={weeklyEntries}
                currentClusterResults={currentClusterResults}
                onFilterCluster={handleFilterCluster}
            />
            <div className={`${cardBgClass} p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500 w-full`}>
                <h3 className={`text-xl font-poppins font-semibold ${textColorClass} mb-4 text-center`}>All Weekly Entries</h3>
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
