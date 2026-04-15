// src/components/JournalSearch.jsx

import React, { useState } from 'react';
import JournalHistory from './JournalHistory';
import { useTheme } from '../contexts/ThemeContext';
import { format, parseISO } from 'date-fns';
import { useSearchJournalEntries } from '../hooks/useJournalData';
import {
  Search,
  Sliders,
  Calendar,
  X,
  Loader,
  FileText,
  AlertCircle
} from 'lucide-react';
import { SkeletonCard } from './Skeleton';

function JournalSearch({ userId }) {
  const [keyword, setKeyword] = useState('');
  const [minMood, setMinMood] = useState('');
  const [maxMood, setMaxMood] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchType, setSearchType] = useState('keyword');
  const [activeSearchParams, setActiveSearchParams] = useState(null);
  const [localError, setLocalError] = useState('');

  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const {
    data: searchResults,
    isLoading,
    isError,
    error,
  } = useSearchJournalEntries(activeSearchParams);

  // Glass‑morphic styles
  const cardBg = isDarkMode ? 'bg-gray-800/60 backdrop-blur-md' : 'bg-white/70 backdrop-blur-md';
  const cardBorder = isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50';
  const textPrimary = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textSecondary = isDarkMode ? 'text-gray-300' : 'text-gray-600';
  const inputBg = isDarkMode ? 'bg-gray-800/80' : 'bg-white/90';
  const inputBorder = isDarkMode ? 'border-gray-600' : 'border-gray-300';
  const inputFocusRing = 'focus:ring-purple-500';
  const buttonActive = isDarkMode
    ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white'
    : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white';
  const buttonInactive = isDarkMode
    ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
    : 'bg-gray-200/80 text-gray-700 hover:bg-gray-300/80';
  const errorColor = isDarkMode ? 'text-red-300' : 'text-red-600';

  const handleSearch = async () => {
    setLocalError('');
    try {
      let params = { searchType };
      if (searchType === 'keyword') {
        if (!keyword.trim()) throw new Error('Please enter a keyword to search.');
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
        params.minMood = minMood;
        params.maxMood = maxMood;
      } else { // date
        if (!startDate && !endDate) {
          throw new Error('Please select at least a start date or an end date.');
        }
        if (startDate && endDate && parseISO(startDate) > parseISO(endDate)) {
          throw new Error('Start date cannot be after end date.');
        }
        params.startDate = startDate;
        params.endDate = endDate;
      }
      setActiveSearchParams(params);
    } catch (err) {
      setLocalError(err.message);
      setActiveSearchParams(null);
    }
  };

  const clearSearch = () => {
    setActiveSearchParams(null);
    setKeyword('');
    setMinMood('');
    setMaxMood('');
    setStartDate('');
    setEndDate('');
    setLocalError('');
  };

  const isSearchActive = activeSearchParams !== null;

  return (
    <div className="space-y-6 sm:space-y-8 w-full">
      {/* Search Card */}
      <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-xl backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-2xl`}>
        <div className="flex items-center justify-center gap-2 mb-4">
          <Search size={24} className="text-purple-400" />
          <h3 className="text-2xl font-poppins font-semibold text-center">Search Journal Entries</h3>
        </div>

        {/* Search Type Tabs */}
        <div className="flex justify-center gap-2 sm:gap-3 mb-6 flex-wrap">
          {[
            { id: 'keyword', label: 'Keyword', icon: <Search size={16} /> },
            { id: 'mood', label: 'Mood Score', icon: <Sliders size={16} /> },
            { id: 'date', label: 'Date', icon: <Calendar size={16} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSearchType(tab.id)}
              className={`flex items-center gap-1.5 py-2 px-4 rounded-full font-poppins font-medium text-sm transition-all duration-300 shadow-md
                         ${searchType === tab.id ? buttonActive : buttonInactive}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input Fields */}
        <div className="space-y-4">
          {searchType === 'keyword' && (
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${textSecondary}`}>Keyword</label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g., happy, stress, work"
                className={`w-full p-3 rounded-xl border ${inputBorder} ${inputBg} focus:outline-none focus:ring-2 ${inputFocusRing} transition`}
              />
            </div>
          )}

          {searchType === 'mood' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${textSecondary}`}>Min Mood</label>
                <input
                  type="number"
                  step="0.01"
                  value={minMood}
                  onChange={(e) => setMinMood(e.target.value)}
                  placeholder="-1.0 to 1.0"
                  className={`w-full p-3 rounded-xl border ${inputBorder} ${inputBg} focus:outline-none focus:ring-2 ${inputFocusRing} transition`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${textSecondary}`}>Max Mood</label>
                <input
                  type="number"
                  step="0.01"
                  value={maxMood}
                  onChange={(e) => setMaxMood(e.target.value)}
                  placeholder="-1.0 to 1.0"
                  className={`w-full p-3 rounded-xl border ${inputBorder} ${inputBg} focus:outline-none focus:ring-2 ${inputFocusRing} transition`}
                />
              </div>
            </div>
          )}

          {searchType === 'date' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${textSecondary}`}>Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`w-full p-3 rounded-xl border ${inputBorder} ${inputBg} focus:outline-none focus:ring-2 ${inputFocusRing} transition`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${textSecondary}`}>End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full p-3 rounded-xl border ${inputBorder} ${inputBg} focus:outline-none focus:ring-2 ${inputFocusRing} transition`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {(localError || (isError && !isLoading)) && (
          <div className="mt-4 p-3 rounded-xl bg-red-100/20 dark:bg-red-900/30 border border-red-500/30 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{localError || error?.message || 'Search failed. Please try again.'}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-teal-500 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader size={18} className="animate-spin" />
            ) : (
              <Search size={18} />
            )}
            {isLoading ? 'Searching...' : 'Search Journal'}
          </button>
          {isSearchActive && (
            <button
              onClick={clearSearch}
              className="py-3 px-6 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition flex items-center justify-center gap-2"
            >
              <X size={18} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Results Section */}
      {isLoading && (
        <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg p-4 sm:p-6`}>
          <div className="flex items-center gap-2 mb-4">
            <FileText size={20} className="text-purple-400" />
            <h3 className={`text-xl font-poppins font-semibold`}>Search Results</h3>
          </div>
          <SkeletonCard count={3} />
        </div>
      )}

      {!isLoading && searchResults?.length > 0 && (
        <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg p-4 sm:p-6 transition-all duration-300 hover:shadow-xl`}>
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-emerald-400" />
              <h3 className={`text-xl font-poppins font-semibold`}>Search Results</h3>
            </div>
            <span className="text-sm bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-sm">
              <FileText size={14} /> {searchResults.length} entries found
            </span>
          </div>
          <JournalHistory entries={searchResults} />
        </div>
      )}

      {!isLoading && !isError && searchResults?.length === 0 && isSearchActive && (
        <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg p-8 text-center`}>
          <Search size={48} className={`mx-auto mb-3 opacity-30 ${textSecondary}`} />
          <p className={`text-lg ${textSecondary}`}>No entries found matching your criteria.</p>
          <button
            onClick={clearSearch}
            className="mt-4 text-sm text-purple-500 hover:text-purple-600 dark:text-purple-400 transition"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}

export default JournalSearch;