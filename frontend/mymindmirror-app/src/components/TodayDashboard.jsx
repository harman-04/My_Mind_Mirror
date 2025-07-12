// src/components/TodayDashboard.js

import React from 'react';
import TodaysReflection from './TodaysReflection';
import DailyEmotionSnapshot from './DailyEmotionSnapshot';
import JournalHistory from './JournalHistory';

/**
 * Renders the dashboard view for today's journal entries and related insights.
 * @param {object} props - The component props.
 * @param {object} props.latestEntry - The most recent journal entry overall.
 * @param {Array} props.todayEntries - All journal entries created today.
 * @param {function} props.onEntryChange - Callback to refresh journal entries.
 * ⭐ REMOVED: @param {function} props.onEditEntry - Callback to signal parent to edit a specific entry. ⭐
 */
function TodayDashboard({ latestEntry, todayEntries, onEntryChange }) { // ⭐ MODIFIED: Removed onEditEntry from destructuring ⭐
    return (
        <div className="space-y-6 sm:space-y-8">
            {/* Top row for Today's Reflection and Daily Emotion Snapshot */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                <TodaysReflection latestEntry={latestEntry} />
                <DailyEmotionSnapshot latestEntry={latestEntry} />
            </div>

            {/* Display all of today's entries in Journal History */}
            {todayEntries.length > 0 ? (
                <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500">
                    <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">All Today's Entries</h3>
                    {/* ⭐ MODIFIED: No longer passing onEditEntry prop ⭐ */}
                    <JournalHistory entries={todayEntries} onEntryChange={onEntryChange} />
                </div>
            ) : (
                <div className="p-6 rounded-lg bg-white/60 dark:bg-black/40 shadow-inner transition-all duration-500
                                 flex items-center justify-center font-inter text-gray-700 dark:text-gray-300 min-h-[150px]">
                    No entries recorded for today yet. Start journaling!
                </div>
            )}
        </div>
    );
}

export default TodayDashboard;
