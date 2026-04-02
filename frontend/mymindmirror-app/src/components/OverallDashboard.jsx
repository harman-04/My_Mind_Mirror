import React, { useState } from 'react';
import MoodChart from './MoodChart';
import AverageEmotionChart from './AverageEmotionChart';
import ConcernFrequencyChart from './ConcernFrequencyChart';
import JournalClusters from './JournalClusters';
import JournalHistory from './JournalHistory';
import KeyPhraseCloud from './KeyPhraseCloud';
import MoodWordCountChart from './MoodWordCountChart';

function OverallDashboard({
    journalEntries,
    isLoading,
    userId,
    onClusteringComplete,
    currentClusterResults
}) {
    const [filterClusterId, setFilterClusterId] = useState(null);
    const [filterPhrase, setFilterPhrase] = useState(null);

    const handlePhraseClick = (phrase) => {
        setFilterPhrase(phrase);
    };

    const handleFilterCluster = (clusterId) => {
        setFilterClusterId(clusterId);
    };

    return (
        <div className="space-y-6 sm:space-y-8 w-full">
            <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500 w-full">
                <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">Overall Mood & Emotion Trends</h3>
                <MoodChart entries={journalEntries} isLoading={isLoading} />
            </div>
            <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500 w-full">
                <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">Overall Average Emotion Intensity</h3>
                <AverageEmotionChart entries={journalEntries} isLoading={isLoading} />
            </div>
            <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500 w-full">
                <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">Overall Most Frequent Journal Concerns</h3>
                <ConcernFrequencyChart entries={journalEntries} isLoading={isLoading} />
            </div>

            <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500 w-full">
              <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">
                Mood vs. Word Count Correlation
              </h3>
               <MoodWordCountChart entries={journalEntries} isLoading={isLoading} />
            </div>

            <JournalClusters
                userId={userId}
                onClusteringComplete={onClusteringComplete}
                journalEntries={journalEntries}
                currentClusterResults={currentClusterResults}
                onFilterCluster={handleFilterCluster}
                isLoading={isLoading}              // ← add this
            />
            <KeyPhraseCloud onWordClick={handlePhraseClick} />
                    {filterPhrase && (
                        <div className="mt-4 flex justify-center">
                            <button
                                onClick={() => setFilterPhrase(null)}
                                className="px-4 py-2 rounded-full text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                            >
                                Clear Filter: "{filterPhrase}"
                            </button>
                        </div>
                    )}
            <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500 w-full">
                <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">All Journal Entries</h3>
                {/* ⭐ MODIFIED: Removed onEntryChange prop from JournalHistory ⭐ */}
                <JournalHistory
                                    entries={journalEntries}
                                    clusterThemes={currentClusterResults?.clusterThemes}
                                    filterClusterId={filterClusterId}
                                    filterPhrase={filterPhrase}
                                    isLoading={isLoading}
                                />
            </div>
        </div>
    );
}

export default OverallDashboard;
