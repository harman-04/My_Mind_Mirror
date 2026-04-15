// src/components/WeeklyDashboard.jsx

import React, { useState } from 'react';
import MoodChart from './MoodChart';
import AverageEmotionChart from './AverageEmotionChart';
import ConcernFrequencyChart from './ConcernFrequencyChart';
import JournalClusters from './JournalClusters';
import JournalHistory from './JournalHistory';
import { format } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';
import { SkeletonChart, SkeletonCard } from './Skeleton';
import { Activity, BarChart3, PieChart, BookOpen } from 'lucide-react';

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
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    const cardBg = isDarkMode ? 'bg-gray-800/60 backdrop-blur-md' : 'bg-white/70 backdrop-blur-md';
    const cardBorder = isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50';
    const textSecondary = isDarkMode ? 'text-gray-300' : 'text-gray-600';

    const handleFilterCluster = (clusterId) => setFilterClusterId(clusterId);

    if (isLoading) {
        return (
            <div className="space-y-6 sm:space-y-8 w-full">
                <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg p-4 sm:p-6`}>
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Activity size={20} className={textSecondary} />
                        <h3 className="text-xl font-poppins font-semibold text-center">Weekly Mood & Emotion Trends</h3>
                    </div>
                    <SkeletonChart />
                </div>
                <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg p-4 sm:p-6`}>
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <BarChart3 size={20} className={textSecondary} />
                        <h3 className="text-xl font-poppins font-semibold text-center">Weekly Average Emotion Intensity</h3>
                    </div>
                    <SkeletonChart />
                </div>
                <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg p-4 sm:p-6`}>
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <PieChart size={20} className={textSecondary} />
                        <h3 className="text-xl font-poppins font-semibold text-center">Weekly Most Frequent Journal Concerns</h3>
                    </div>
                    <SkeletonChart />
                </div>
                <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg p-4 sm:p-6`}>
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <BookOpen size={20} className={textSecondary} />
                        <h3 className="text-xl font-poppins font-semibold text-center">Weekly Journal Themes</h3>
                    </div>
                    <SkeletonCard count={2} />
                </div>
                <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg p-4 sm:p-6`}>
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <BookOpen size={20} className={textSecondary} />
                        <h3 className="text-xl font-poppins font-semibold text-center">All Weekly Entries</h3>
                    </div>
                    <SkeletonCard count={3} />
                </div>
            </div>
        );
    }

    const dateRangeText = `${format(startOfCurrentWeek, 'MMM d')} - ${format(endOfCurrentWeek, 'MMM d')}`;

    return (
        <div className="space-y-6 sm:space-y-8 w-full">
            {/* Mood & Emotion Trends */}
            <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg p-4 sm:p-6 transition-all duration-300 hover:shadow-xl`}>
                <div className="flex items-center justify-center gap-2 mb-4">
                    <Activity size={20} className="text-purple-400" />
                    <h3 className="text-xl font-poppins font-semibold text-center">
                        Weekly Mood & Emotion Trends <span className="text-sm font-normal text-purple-400">({dateRangeText})</span>
                    </h3>
                </div>
                <MoodChart entries={weeklyEntries} />
            </div>

            {/* Average Emotion Intensity */}
            <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg p-4 sm:p-6 transition-all duration-300 hover:shadow-xl`}>
                <div className="flex items-center justify-center gap-2 mb-4">
                    <BarChart3 size={20} className="text-blue-400" />
                    <h3 className="text-xl font-poppins font-semibold text-center">Weekly Average Emotion Intensity</h3>
                </div>
                <AverageEmotionChart entries={weeklyEntries} />
            </div>

            {/* Most Frequent Concerns */}
            <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg p-4 sm:p-6 transition-all duration-300 hover:shadow-xl`}>
                <div className="flex items-center justify-center gap-2 mb-4">
                    <PieChart size={20} className="text-rose-400" />
                    <h3 className="text-xl font-poppins font-semibold text-center">Weekly Most Frequent Journal Concerns</h3>
                </div>
                <ConcernFrequencyChart entries={weeklyEntries} />
            </div>

            {/* Journal Clusters */}
            <JournalClusters
                userId={userId}
                onClusteringComplete={onClusteringComplete}
                journalEntries={weeklyEntries}
                currentClusterResults={currentClusterResults}
                onFilterCluster={handleFilterCluster}
                isLoading={isLoading}
            />

            {/* All Weekly Entries */}
            <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg p-4 sm:p-6 transition-all duration-300 hover:shadow-xl`}>
                <div className="flex items-center justify-center gap-2 mb-4">
                    <BookOpen size={20} className="text-amber-400" />
                    <h3 className="text-xl font-poppins font-semibold text-center">All Weekly Entries</h3>
                </div>
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