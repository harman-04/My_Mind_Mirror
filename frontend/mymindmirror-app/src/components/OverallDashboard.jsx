// src/components/OverallDashboard.jsx

import React, { useState } from 'react';
import { FileText, Calendar, Activity, BarChart3, PieChart, Target, Radar, TrendingUp, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import MoodChart from './MoodChart';
import AverageEmotionChart from './AverageEmotionChart';
import MoodCalendarHeatmap from './MoodCalendarHeatmap';
import ConcernFrequencyChart from './ConcernFrequencyChart';
import JournalClusters from './JournalClusters';
import JournalHistory from './JournalHistory';
import KeyPhraseCloud from './KeyPhraseCloud';
import MoodWordCountChart from './MoodWordCountChart';
import InfiniteScrollTrigger from './InfiniteScrollTrigger';
import EmotionRadarChart from './EmotionRadarChart';
import { SkeletonChart, SkeletonCard } from './Skeleton';

function OverallDashboard({
    journalEntries,
    isLoading,
    userId,
    onClusteringComplete,
    currentClusterResults,
    loadMore,
    hasNextPage,
    isFetchingNextPage,
    totalEntries,
}) {
    const [filterClusterId, setFilterClusterId] = useState(null);
    const [filterPhrase, setFilterPhrase] = useState(null);
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    const cardBg = isDarkMode ? 'bg-gray-800/60 backdrop-blur-md' : 'bg-white/70 backdrop-blur-md';
    const cardBorder = isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50';
    const textSecondary = isDarkMode ? 'text-gray-300' : 'text-gray-600';

    const handlePhraseClick = (phrase) => setFilterPhrase(phrase);
    const handleFilterCluster = (clusterId) => setFilterClusterId(clusterId);
    const clearFilter = () => {
        setFilterPhrase(null);
        setFilterClusterId(null);
    };

    if (isLoading) {
        return (
            <div className="space-y-6 sm:space-y-8 w-full">
                {/* Mood Trends */}
                <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg p-4 sm:p-6`}>
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Activity size={20} className={textSecondary} />
                        <h3 className="text-xl font-poppins font-semibold text-center">Overall Mood & Emotion Trends</h3>
                    </div>
                    <SkeletonChart />
                </div>

                {/* Mood Calendar Heatmap (skeleton) */}
                <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg p-4 sm:p-6`}>
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Calendar size={20} className={textSecondary} />
                        <h3 className="text-xl font-poppins font-semibold text-center">Mood Calendar Heatmap</h3>
                    </div>
                    <div className="h-80 w-full bg-gray-200/50 dark:bg-gray-800/50 rounded-xl animate-pulse flex items-center justify-center">
                        <div className={`text-sm ${textSecondary}`}>Loading calendar...</div>
                    </div>
                </div>

                {/* Average Emotion Intensity */}
                <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg p-4 sm:p-6`}>
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <BarChart3 size={20} className={textSecondary} />
                        <h3 className="text-xl font-poppins font-semibold text-center">Overall Average Emotion Intensity</h3>
                    </div>
                    <SkeletonChart />
                </div>

                {/* Radar Chart */}
                <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg p-4 sm:p-6`}>
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Radar size={20} className={textSecondary} />
                        <h3 className="text-xl font-poppins font-semibold text-center">Your Emotional Profile (Radar)</h3>
                    </div>
                    <SkeletonChart />
                </div>

                {/* Most Frequent Concerns */}
                <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg p-4 sm:p-6`}>
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <PieChart size={20} className={textSecondary} />
                        <h3 className="text-xl font-poppins font-semibold text-center">Overall Most Frequent Journal Concerns</h3>
                    </div>
                    <SkeletonChart />
                </div>

                {/* Mood vs Word Count */}
                <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg p-4 sm:p-6`}>
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <TrendingUp size={20} className={textSecondary} />
                        <h3 className="text-xl font-poppins font-semibold text-center">Mood vs. Word Count Correlation</h3>
                    </div>
                    <SkeletonChart />
                </div>

                {/* Journal Themes & Key Phrase Cloud */}
                <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg p-4 sm:p-6`}>
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Target size={20} className={textSecondary} />
                        <h3 className="text-xl font-poppins font-semibold text-center">Journal Themes & Key Phrases</h3>
                    </div>
                    <SkeletonCard count={2} />
                </div>

                {/* All Entries */}
                <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg p-4 sm:p-6`}>
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <FileText size={20} className={textSecondary} />
                        <h3 className="text-xl font-poppins font-semibold text-center">All Journal Entries</h3>
                    </div>
                    <SkeletonCard count={3} />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 sm:space-y-8 w-full">
            {/* 1. Mood & Emotion Trends */}
            <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg p-4 sm:p-6 transition-all duration-300 hover:shadow-xl`}>
                <div className="flex items-center justify-center gap-2 mb-4">
                    <Activity size={20} className="text-purple-400" />
                    <h3 className="text-xl font-poppins font-semibold text-center">Overall Mood & Emotion Trends</h3>
                </div>
                <MoodChart entries={journalEntries} isLoading={isLoading} />
            </div>

            {/* 2. Mood Calendar Heatmap (FIXED: uses journalEntries, not weeklyEntries) */}
            <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg p-4 sm:p-6 transition-all duration-300 hover:shadow-xl`}>
                <div className="flex items-center justify-center gap-2 mb-4">
                    <Calendar size={20} className="text-teal-400" />
                    <h3 className="text-xl font-poppins font-semibold text-center">Mood Calendar Heatmap</h3>
                </div>
                <MoodCalendarHeatmap journalEntries={journalEntries} displayMonth={new Date()} />
            </div>

            {/* 3. Average Emotion Intensity */}
            <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg p-4 sm:p-6 transition-all duration-300 hover:shadow-xl`}>
                <div className="flex items-center justify-center gap-2 mb-4">
                    <BarChart3 size={20} className="text-teal-400" />
                    <h3 className="text-xl font-poppins font-semibold text-center">Overall Average Emotion Intensity</h3>
                </div>
                <AverageEmotionChart entries={journalEntries} isLoading={isLoading} />
            </div>

            {/* 4. Emotional Profile Radar */}
            <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg p-4 sm:p-6 transition-all duration-300 hover:shadow-xl`}>
                <div className="flex items-center justify-center gap-2 mb-4">
                    <Radar size={20} className="text-indigo-400" />
                    <h3 className="text-xl font-poppins font-semibold text-center">Your Emotional Profile (Radar)</h3>
                </div>
                <EmotionRadarChart entries={journalEntries} isLoading={isLoading} />
            </div>

            {/* 5. Most Frequent Concerns */}
            <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg p-4 sm:p-6 transition-all duration-300 hover:shadow-xl`}>
                <div className="flex items-center justify-center gap-2 mb-4">
                    <PieChart size={20} className="text-rose-400" />
                    <h3 className="text-xl font-poppins font-semibold text-center">Overall Most Frequent Journal Concerns</h3>
                </div>
                <ConcernFrequencyChart entries={journalEntries} isLoading={isLoading} />
            </div>

            {/* 6. Mood vs Word Count Correlation */}
            <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg p-4 sm:p-6 transition-all duration-300 hover:shadow-xl`}>
                <div className="flex items-center justify-center gap-2 mb-4">
                    <TrendingUp size={20} className="text-amber-400" />
                    <h3 className="text-xl font-poppins font-semibold text-center">Mood vs. Word Count Correlation</h3>
                </div>
                <MoodWordCountChart entries={journalEntries} isLoading={isLoading} />
            </div>

            {/* 7. Journal Clustering */} {/* Clustering feature removed – not useful with mixed-language entries */}
{/*             <JournalClusters */}
{/*                 userId={userId} */}
{/*                 onClusteringComplete={onClusteringComplete} */}
{/*                 journalEntries={journalEntries} */}
{/*                 currentClusterResults={currentClusterResults} */}
{/*                 onFilterCluster={handleFilterCluster} */}
{/*                 isLoading={isLoading} */}
{/*             /> */}


            {/* 8. Key Phrase Cloud */}
            <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg p-4 sm:p-6 transition-all duration-300 hover:shadow-xl`}>
                <div className="flex items-center justify-center gap-2 mb-4">
                    <Target size={20} className="text-cyan-400" />
                    <h3 className="text-xl font-poppins font-semibold text-center">Key Phrase Cloud</h3>
                </div>
                <KeyPhraseCloud onWordClick={handlePhraseClick} />
                {filterPhrase && (
                    <div className="mt-4 flex justify-center">
                        <button
                            onClick={() => setFilterPhrase(null)}
                            className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800/70 transition"
                        >
                            <X size={14} /> Clear Filter: "{filterPhrase}"
                        </button>
                    </div>
                )}
            </div>

            {/* 9. All Journal Entries */}
            <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg p-4 sm:p-6 transition-all duration-300 hover:shadow-xl`}>
                <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
                    <div className="flex items-center gap-2">
                        <FileText size={20} className="text-emerald-400" />
                        <h3 className="text-xl font-poppins font-semibold">All Journal Entries</h3>
                    </div>
                    {totalEntries > 0 && (
                        <span className="text-sm bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-sm">
                            <FileText size={14} /> {journalEntries.length} of {totalEntries} entries
                        </span>
                    )}
                </div>
                <JournalHistory
                    entries={journalEntries}
                    clusterThemes={currentClusterResults?.clusterThemes}
                    filterClusterId={filterClusterId}
                    filterPhrase={filterPhrase}
                    isLoading={isLoading}
                />
                <InfiniteScrollTrigger
                    onIntersect={loadMore}
                    isLoading={isFetchingNextPage}
                    hasNextPage={hasNextPage}
                />
            </div>
        </div>
    );
}

export default OverallDashboard;