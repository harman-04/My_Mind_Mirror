// src/components/OverallDashboard.jsx
import React, { useState } from 'react';
import { FileText, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import MoodChart from './MoodChart';
import AverageEmotionChart from './AverageEmotionChart';
import MoodCalendarHeatmap from './MoodCalendarHeatmap';
import ConcernFrequencyChart from './ConcernFrequencyChart';
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

    // Premium Glassmorphism for the Journal History wrapper
    const cardBg = isDarkMode ? 'bg-[#1A162F]/60 backdrop-blur-xl' : 'bg-white/70 backdrop-blur-xl';
    const cardBorder = isDarkMode ? 'border-white/10' : 'border-white/50';

    const handlePhraseClick = (phrase) => setFilterPhrase(phrase);
    const clearFilter = () => {
        setFilterPhrase(null);
        setFilterClusterId(null);
    };

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 w-full">
                <div className="col-span-1 lg:col-span-2"><SkeletonChart /></div>
                <div><SkeletonChart /></div>
                <div><SkeletonChart /></div>
                <div className="col-span-1 lg:col-span-2"><SkeletonCard count={3} /></div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 w-full items-stretch">

            {/* 1. Mood & Emotion Trends (Full Width) */}
            {/* 💡 Note: Removed redundant card wrappers since the charts now supply their own! */}
            <div className="col-span-1 lg:col-span-2 w-full block">
                <MoodChart entries={journalEntries} isLoading={isLoading} />
            </div>

            {/* 2. Mood Calendar Heatmap (Full Width) */}
            <div className="col-span-1 lg:col-span-2 w-full block">
                <MoodCalendarHeatmap journalEntries={journalEntries} displayYear={new Date()} />
            </div>

            {/* 3. Emotional Profile Radar (Full Width) */}
            <div className="col-span-1 lg:col-span-2 w-full block">
                <EmotionRadarChart entries={journalEntries} isLoading={isLoading} />
            </div>

            {/* 4. Average Emotion Intensity (Half Width on Desktop) */}
            <div className="col-span-1 w-full block">
                <AverageEmotionChart entries={journalEntries} isLoading={isLoading} />
            </div>

            {/* 5. Most Frequent Concerns (Half Width on Desktop) */}
            <div className="col-span-1 w-full block">
                <ConcernFrequencyChart entries={journalEntries} isLoading={isLoading} />
            </div>

            {/* 6. Mood vs Word Count Correlation (Full Width) */}
            <div className="col-span-1 lg:col-span-2 w-full block">
                <MoodWordCountChart entries={journalEntries} isLoading={isLoading} />
            </div>

            {/* 7. Key Phrase Cloud (Full Width) */}
            <div className="col-span-1 lg:col-span-2 w-full block">
                <KeyPhraseCloud onWordClick={handlePhraseClick} />

                {/* Smoothly animated Filter Button */}
                {filterPhrase && (
                    <div className="mt-4 lg:mt-6 flex justify-center animate-fade-in px-4">
                        <button
                            onClick={clearFilter}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm lg:text-base font-bold bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-500/30 transition-all shadow-sm hover:shadow-md active:scale-95 border border-purple-200 dark:border-purple-500/30"
                        >
                            <X className="w-4 h-4 lg:w-5 lg:h-5" />
                            <span>Clear Filter: <span className="italic">"{filterPhrase}"</span></span>
                        </button>
                    </div>
                )}
            </div>

            {/* 8. All Journal Entries (Full Width Layout) */}
            {/* 💡 Note: JournalHistory gets a wrapper because it is a list, not a canvas chart */}
            <div className={`col-span-1 lg:col-span-2 rounded-2xl lg:rounded-3xl border ${cardBorder} shadow-lg ring-1 ring-black/5 dark:ring-white/5 ${cardBg} p-3 sm:p-6 lg:p-8 mt-2 transition-all duration-300`}>
                <div className={`flex flex-wrap justify-between items-center gap-4 mb-6 lg:mb-8 border-b border-gray-200/50 dark:border-gray-700/50 pb-4 lg:pb-6`}>
                    <div className="flex items-center gap-3 lg:gap-4">
                        <div className="p-2 lg:p-3 rounded-xl lg:rounded-2xl bg-gradient-to-br from-purple-100 to-purple-50 dark:from-teal-900/40 dark:to-teal-800/20 text-purple-600 dark:text-teal-400 shrink-0 shadow-sm border border-purple-200/50 dark:border-teal-700/30 ">
                            <FileText className="w-5 h-5 lg:w-6 lg:h-6" />
                        </div>
                        <h3 className="text-xl lg:text-2xl font-poppins font-extrabold text-gray-800 dark:text-gray-100 tracking-tight">
                            Journal History
                        </h3>
                    </div>

                    {totalEntries > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-full shadow-sm text-emerald-700 dark:text-emerald-300">
                            <span className="text-xs lg:text-sm font-bold uppercase tracking-wider">
                                {journalEntries.length} of {totalEntries} Entries
                            </span>
                        </div>
                    )}
                </div>

                <div className="w-full">
                    <JournalHistory
                        entries={journalEntries}
                        clusterThemes={currentClusterResults?.clusterThemes}
                        filterClusterId={filterClusterId}
                        filterPhrase={filterPhrase}
                        isLoading={isLoading}
                    />
                </div>

                <div className="mt-8 lg:mt-10">
                    <InfiniteScrollTrigger
                        onIntersect={loadMore}
                        isLoading={isFetchingNextPage}
                        hasNextPage={hasNextPage}
                    />
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
}

export default React.memo(OverallDashboard);