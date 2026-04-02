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
import { SkeletonChart, SkeletonCard } from './Skeleton';

// ⭐ NEW CHART COMPONENT IMPORT ⭐
import MoodCalendarHeatmap from './MoodCalendarHeatmap';


function WeeklyDashboard({
    weeklyEntries,
    userId,
    onClusteringComplete,
    currentClusterResults,
    startOfCurrentWeek,
    endOfCurrentWeek,
    isLoading,
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

     if (isLoading) {
            return (
                <div className="space-y-6 sm:space-y-8 w-full">
                    <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500 w-full">
                        <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">
                            Weekly Mood & Emotion Trends
                        </h3>
                        <SkeletonChart />
                    </div>
                    <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500 w-full">
                        <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">
                            Weekly Mood Calendar
                        </h3>
                        <div className="h-80 w-full bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse flex items-center justify-center">
                            <div className="text-gray-400">Loading calendar...</div>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500 w-full">
                        <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">
                            Weekly Average Emotion Intensity
                        </h3>
                        <SkeletonChart />
                    </div>
                    <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500 w-full">
                        <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">
                            Weekly Most Frequent Journal Concerns
                        </h3>
                        <SkeletonChart />
                    </div>
                    <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500 w-full">
                        <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">
                            Weekly Journal Themes
                        </h3>
                        <div className="p-6 rounded-lg bg-white/60 dark:bg-black/40 shadow-inner">
                            <div className="animate-pulse space-y-4">
                                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500 w-full">
                        <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">
                            All Weekly Entries
                        </h3>
                        <SkeletonCard count={3} />
                    </div>
                </div>
            );
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
                isLoading={isLoading}              // ← add this
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
