// src/components/WeeklyDashboard.js

import React from 'react';
import MoodChart from './MoodChart';
import AverageEmotionChart from './AverageEmotionChart';
import ConcernFrequencyChart from './ConcernFrequencyChart';
import JournalClusters from './JournalClusters';
import JournalHistory from './JournalHistory';
import { format } from 'date-fns'; // Import format for date display

/**
 * Renders the dashboard view for weekly journal entries and aggregated insights.
 * @param {object} props - The component props.
 * @param {Array} props.weeklyEntries - All journal entries for the current week.
 * @param {string} props.userId - The ID of the current user.
 * @param {function} props.onClusteringComplete - Callback for when clustering is complete.
 * @param {object} props.currentClusterResults - The latest clustering results.
 * @param {function} props.onEntryChange - Callback to refresh journal entries.
 * @param {Date} props.startOfCurrentWeek - The start date of the current week.
 * @param {Date} props.endOfCurrentWeek - The end date of the current week.
 * ⭐ REMOVED: @param {function} props.onEditEntry - Callback to signal parent to edit a specific entry. ⭐
 */
function WeeklyDashboard({
    weeklyEntries,
    userId,
    onClusteringComplete,
    currentClusterResults,
    onEntryChange,
    startOfCurrentWeek,
    endOfCurrentWeek
    // ⭐ MODIFIED: Removed onEditEntry from destructuring ⭐
}) {
    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500">
                <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">
                    Weekly Mood & Emotion Trends ({format(startOfCurrentWeek, 'MMM d')} - {format(endOfCurrentWeek, 'MMM d')})
                </h3>
                <MoodChart entries={weeklyEntries} />
            </div>
            <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500">
                <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">Weekly Average Emotion Intensity</h3>
                <AverageEmotionChart entries={weeklyEntries} />
            </div>
            <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500">
                <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">Weekly Most Frequent Journal Concerns</h3>
                <ConcernFrequencyChart entries={weeklyEntries} />
            </div>
            <JournalClusters
                userId={userId}
                onClusteringComplete={onClusteringComplete}
                journalEntries={weeklyEntries}
                currentClusterResults={currentClusterResults}
            />
            <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500">
                <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">All Weekly Entries</h3>
                {/* ⭐ MODIFIED: No longer passing onEditEntry prop ⭐ */}
                <JournalHistory entries={weeklyEntries} onEntryChange={onEntryChange} />
            </div>
        </div>
    );
}

export default WeeklyDashboard;
