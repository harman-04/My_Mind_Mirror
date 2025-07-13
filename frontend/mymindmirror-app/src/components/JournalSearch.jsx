// src/components/JournalSearch.js
import React, { useState } from 'react';
import axios from 'axios';
import JournalHistory from './JournalHistory';
import { useTheme } from '../contexts/ThemeContext';
import { format, parseISO } from 'date-fns';

function JournalSearch({ userId, onEntryChange }) {
    const [keyword, setKeyword] = useState('');
    const [minMood, setMinMood] = useState('');
    const [maxMood, setMaxMood] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchType, setSearchType] = useState('keyword');
    const { theme } = useTheme();

    const handleSearch = async () => {
        setLoading(true);
        setError('');
        setSearchResults([]);

        const token = localStorage.getItem('jwtToken');
        if (!token) {
            setError('Authentication token missing. Please log in again.');
            setLoading(false);
            return;
        }

        try {
            let response;
            if (searchType === 'keyword') {
                if (!keyword.trim()) {
                    setError('Please enter a keyword to search.');
                    setLoading(false);
                    return;
                }
                console.log(`Searching by keyword: ${keyword}`);
                response = await axios.get(`http://localhost:8080/api/journal/search/keyword`, {
                    params: { keyword: keyword.trim() },
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else if (searchType === 'mood') {
                const parsedMinMood = minMood === '' ? null : parseFloat(minMood);
                const parsedMaxMood = maxMood === '' ? null : parseFloat(maxMood);

                if (isNaN(parsedMinMood) && isNaN(parsedMaxMood)) {
                    setError('Please enter at least a minimum or maximum mood score.');
                    setLoading(false);
                    return;
                }
                if (parsedMinMood !== null && parsedMaxMood !== null && parsedMinMood > parsedMaxMood) {
                    setError('Minimum mood score cannot be greater than maximum mood score.');
                    setLoading(false);
                    return;
                    }
                console.log(`Searching by mood: min=${parsedMinMood}, max=${parsedMaxMood}`);
                response = await axios.get(`http://localhost:8080/api/journal/search/mood`, {
                    params: { minMood: parsedMinMood, maxMood: parsedMaxMood },
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else { // searchType === 'date'
                if (!startDate && !endDate) {
                    setError('Please select at least a start date or an end date.');
                    setLoading(false);
                    return;
                }
                if (startDate && endDate && parseISO(startDate) > parseISO(endDate)) {
                    setError('Start date cannot be after end date.');
                    setLoading(false);
                    return;
                }
                console.log(`Searching by date: start=${startDate}, end=${endDate}`);
                response = await axios.get(`http://localhost:8080/api/journal/history`, {
                    params: { startDate: startDate, endDate: endDate },
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            
            setSearchResults(response.data);
            console.log("Search results:", response.data);

        } catch (err) {
            console.error('Error during search:', err.response ? err.response.data : err.message);
            setError('Failed to perform search. Please try again or check your input.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 sm:space-y-8 w-full"> {/* Added w-full here */}
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
                    disabled={loading}
                    className="w-full py-3 px-6 mt-6 rounded-full font-poppins font-semibold text-white
                               bg-[#B399D4] hover:bg-[#9B7BBF] active:bg-[#7F66A0]
                               shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#B399D4] focus:ring-opacity-75
                               transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Searching...' : 'Search Journal'}
                </button>
            </div>

            {searchResults.length > 0 && (
                <div className={`bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500 w-full`}> {/* Added w-full here */}
                    <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">
                        Search Results ({searchResults.length} entries)
                    </h3>
                    <JournalHistory entries={searchResults} onEntryChange={onEntryChange} />
                </div>
            )}

            {searchResults.length === 0 && !loading && !error && (
                (searchType === 'keyword' && keyword.trim() !== '') || 
                (searchType === 'mood' && (minMood !== '' || maxMood !== '')) ||
                (searchType === 'date' && (startDate !== '' || endDate !== ''))
            ) && (
                <div className="text-center py-8 text-gray-700 dark:text-gray-300 font-inter">
                    No entries found matching your criteria.
                </div>
            )}
        </div>
    );
}

export default JournalSearch;
