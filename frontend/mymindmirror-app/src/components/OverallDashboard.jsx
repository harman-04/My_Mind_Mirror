// src/components/OverallDashboard.js

import React from 'react';
import MoodChart from './MoodChart';
import AverageEmotionChart from './AverageEmotionChart';
import ConcernFrequencyChart from './ConcernFrequencyChart';
import JournalClusters from './JournalClusters';
import JournalHistory from './JournalHistory';

/**
 * Renders the dashboard view for all journal entries and overall insights.
 * @param {object} props - The component props.
 * @param {Array} props.journalEntries - All journal entries.
 * @param {string} props.userId - The ID of the current user.
 * @param {function} props.onClusteringComplete - Callback for when clustering is complete.
 * @param {object} props.currentClusterResults - The latest clustering results.
 * @param {function} props.onEntryChange - Callback to refresh journal entries.
 * ⭐ REMOVED: @param {function} props.onEditEntry - Callback to signal parent to edit a specific entry. ⭐
 */
function OverallDashboard({
    journalEntries,
    userId,
    onClusteringComplete,
    currentClusterResults,
    onEntryChange
    // ⭐ MODIFIED: Removed onEditEntry from destructuring ⭐
}) {
    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500">
                <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">Overall Mood & Emotion Trends</h3>
                <MoodChart entries={journalEntries} />
            </div>
            <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500">
                <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">Overall Average Emotion Intensity</h3>
                <AverageEmotionChart entries={journalEntries} />
            </div>
            <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500">
                <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">Overall Most Frequent Journal Concerns</h3>
                <ConcernFrequencyChart entries={journalEntries} />
            </div>
            <JournalClusters
                userId={userId}
                onClusteringComplete={onClusteringComplete}
                journalEntries={journalEntries}
                currentClusterResults={currentClusterResults}
            />
            <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500">
                <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">All Journal Entries</h3>
                {/* ⭐ MODIFIED: No longer passing onEditEntry prop ⭐ */}
                <JournalHistory entries={journalEntries} onEntryChange={onEntryChange} />
            </div>
        </div>
    );
}

export default OverallDashboard;
