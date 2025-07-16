// src/components/JournalSearch.js
import React, { useState } from 'react';
// import axios from 'axios'; // No longer needed directly
import JournalHistory from './JournalHistory'; // Assuming JournalHistory handles its own mutations now
import { useTheme } from '../contexts/ThemeContext';
import { format, parseISO } from 'date-fns';
import { useSearchJournalEntries } from '../hooks/useJournalData'; // Import the new search hook

// ⭐ MODIFIED: Removed onEntryChange prop ⭐
function JournalSearch({ userId }) {
    const [keyword, setKeyword] = useState('');
    const [minMood, setMinMood] = useState('');
    const [maxMood, setMaxMood] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchType, setSearchType] = useState('keyword');
    const { theme } = useTheme();

    // State to hold the parameters for the search query
    const [activeSearchParams, setActiveSearchParams] = useState(null);

    // Use the Tanstack Query hook for search results
    const {
        data: searchResults,
        isLoading,
        isError,
        error,
    } = useSearchJournalEntries(activeSearchParams); // Pass the search parameters to the hook

    const handleSearch = async () => {
        // Reset previous errors/results display
        // setError(''); // Error handling is now via useSearchJournalEntries hook
        // setSearchResults([]); // Data is managed by the hook

        try {
            let params = { searchType };
            if (searchType === 'keyword') {
                if (!keyword.trim()) {
                    throw new Error('Please enter a keyword to search.');
                }
                params.keyword = keyword.trim();
            } else if (searchType === 'mood') {
                const parsedMinMood = minMood === '' ? null : parseFloat(minMood);
                const parsedMaxMood = maxMood === '' ? null : parseFloat(maxMood);

                if (isNaN(parsedMinMood) && isNaN(parsedMaxMood)) {
                    throw new Error('Please enter at least a minimum or maximum mood score.');
                }
                if (parsedMinMood !== null && parsedMaxMood !== null && parsedMinMood > parsedMaxMood) {
                    throw new Error('Minimum mood score cannot be greater than maximum mood score.');
                }
                params.minMood = minMood; // Send as string, parsing happens in hook
                params.maxMood = maxMood;
            } else { // searchType === 'date'
                if (!startDate && !endDate) {
                    throw new Error('Please select at least a start date or an end date.');
                }
                if (startDate && endDate && parseISO(startDate) > parseISO(endDate)) {
                    throw new Error('Start date cannot be after end date.');
                }
                params.startDate = startDate;
                params.endDate = endDate;
            }
            console.log("Triggering search with params:", params);
            // Set the active search parameters, which will trigger the useSearchJournalEntries query
            setActiveSearchParams(params);

        } catch (err) {
            // Display local validation errors
            setError(err.message);
            // Clear any previous search results if validation fails
            setActiveSearchParams(null);
        }
    };

    return (
        <div className="space-y-6 sm:space-y-8 w-full">
            <div className={`p-6 rounded-lg shadow-md transition-all duration-500 w-full
                             ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                <h3 className="text-2xl font-poppins font-semibold text-[#B399D4] dark:text-[#5CC8C2] mb-4 text-center">
                    Search Journal Entries
                </h3>

                <div className="flex justify-center space-x-2 sm:space-x-4 mb-6 flex-wrap">
                    <button
                        onClick={() => setSearchType('keyword')}
                        className={`py-2 px-3 sm:px-4 rounded-full font-poppins font-semibold text-sm
                                     transition-all duration-300 shadow-md mb-2 sm:mb-0
                                     ${searchType === 'keyword'
                                         ? 'bg-[#FF8A7A] text-white dark:bg-[#5CC8C2] dark:text-gray-800'
                                         : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                     }`}
                    >
                        Search by Keyword
                    </button>
                    <button
                        onClick={() => setSearchType('mood')}
                        className={`py-2 px-3 sm:px-4 rounded-full font-poppins font-semibold text-sm
                                     transition-all duration-300 shadow-md mb-2 sm:mb-0
                                     ${searchType === 'mood'
                                         ? 'bg-[#FF8A7A] text-white dark:bg-[#5CC8C2] dark:text-gray-800'
                                         : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                     }`}
                    >
                        Search by Mood Score
                    </button>
                    <button
                        onClick={() => setSearchType('date')}
                        className={`py-2 px-3 sm:px-4 rounded-full font-poppins font-semibold text-sm
                                     transition-all duration-300 shadow-md mb-2 sm:mb-0
                                     ${searchType === 'date'
                                         ? 'bg-[#FF8A7A] text-white dark:bg-[#5CC8C2] dark:text-gray-800'
                                         : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                     }`}
                    >
                        Search by Date
                    </button>
                </div>

                {searchType === 'keyword' && (
                    <div className="flex flex-col space-y-4">
                        <input
                            type="text"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="Enter keyword (e.g., 'happy', 'stress', 'work')"
                            className={`w-full p-3 rounded-lg border focus:outline-none focus:ring-2
                                         ${theme === 'dark' ? 'bg-gray-700 text-gray-200 border-gray-600 focus:ring-[#5CC8C2]' : 'bg-white text-gray-800 border-gray-300 focus:ring-[#B399D4]'}`}
                            aria-label="Keyword Search Input"
                        />
                    </div>
                )}

                {searchType === 'mood' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input
                            type="number"
                            step="0.01"
                            value={minMood}
                            onChange={(e) => setMinMood(e.target.value)}
                            placeholder="Min Mood (-1.0 to 1.0)"
                            className={`w-full p-3 rounded-lg border focus:outline-none focus:ring-2
                                         ${theme === 'dark' ? 'bg-gray-700 text-gray-200 border-gray-600 focus:ring-[#5CC8C2]' : 'bg-white text-gray-800 border-gray-300 focus:ring-[#B399D4]'}`}
                            aria-label="Minimum Mood Score Input"
                        />
                        <input
                            type="number"
                            step="0.01"
                            value={maxMood}
                            onChange={(e) => setMaxMood(e.target.value)}
                            placeholder="Max Mood (-1.0 to 1.0)"
                            className={`w-full p-3 rounded-lg border focus:outline-none focus:ring-2
                                         ${theme === 'dark' ? 'bg-gray-700 text-gray-200 border-gray-600 focus:ring-[#5CC8C2]' : 'bg-white text-gray-800 border-gray-300 focus:ring-[#B399D4]'}`}
                            aria-label="Maximum Mood Score Input"
                        />
                    </div>
                )}

                {searchType === 'date' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className={`w-full p-3 rounded-lg border focus:outline-none focus:ring-2
                                         ${theme === 'dark' ? 'bg-gray-700 text-gray-200 border-gray-600 focus:ring-[#5CC8C2]' : 'bg-white text-gray-800 border-gray-300 focus:ring-[#B399D4]'}`}
                            aria-label="Start Date Input"
                        />
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className={`w-full p-3 rounded-lg border focus:outline-none focus:ring-2
                                         ${theme === 'dark' ? 'bg-gray-700 text-gray-200 border-gray-600 focus:ring-[#5CC8C2]' : 'bg-white text-gray-800 border-gray-300 focus:ring-[#B399D4]'}`}
                            aria-label="End Date Input"
                        />
                    </div>
                )}

                {error && <p className="text-[#FF8A7A] text-center mt-4 font-inter">{error}</p>}

                <button
                    onClick={handleSearch}
                    disabled={isLoading} // Use isLoading from the hook
                    className="w-full py-3 px-6 mt-6 rounded-full font-poppins font-semibold text-white
                                 bg-[#B399D4] hover:bg-[#9B7BBF] active:bg-[#7F66A0]
                                 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#B399D4] focus:ring-opacity-75
                                 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Searching...' : 'Search Journal'}
                </button>
            </div>

            {isLoading && (
                <div className="text-center py-8 text-gray-700 dark:text-gray-300 font-inter">
                    Loading search results...
                </div>
            )}

            {isError && (
                <div className="text-center py-8 text-[#FF8A7A] font-inter">
                    Error during search: {error?.message}
                </div>
            )}

            {searchResults?.length > 0 && (
                <div className={`bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500 w-full`}>
                    <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">
                        Search Results ({searchResults.length} entries)
                    </h3>
                    {/* ⭐ MODIFIED: Removed onEntryChange prop from JournalHistory ⭐ */}
                    <JournalHistory entries={searchResults} />
                </div>
            )}

            {/* Display message if no results and a search was performed */}
            {searchResults?.length === 0 && !isLoading && !isError && activeSearchParams && (
                <div className="text-center py-8 text-gray-700 dark:text-gray-300 font-inter">
                    No entries found matching your criteria.
                </div>
            )}
        </div>
    );
}

export default JournalSearch;
