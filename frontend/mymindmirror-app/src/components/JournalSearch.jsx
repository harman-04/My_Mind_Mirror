// src/components/JournalSearch.jsx
import React, { useState, useCallback, useEffect } from 'react';
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
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { SkeletonCard } from './Skeleton';

function JournalSearch({ userId }) {
  const [keyword, setKeyword] = useState('');
  const [concept, setConcept] = useState('');
  const [minMood, setMinMood] = useState('');
  const [maxMood, setMaxMood] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchType, setSearchType] = useState('semantic');
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

  // Premium Glassmorphism Theme Sync
  const cardBg = isDarkMode ? 'bg-[#1A162F]/60 backdrop-blur-xl' : 'bg-white/70 backdrop-blur-xl';
  const cardBorder = isDarkMode ? 'border-white/10' : 'border-white/50';
  const textSecondary = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const inputBg = isDarkMode ? 'bg-[#131127]/80' : 'bg-white/90';
  const inputBorder = isDarkMode ? 'border-white/10' : 'border-gray-300';
  const inputFocusRing = 'focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:focus:border-teal-400 dark:focus:ring-teal-400';

  const buttonActive = isDarkMode
    ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-900/30 border border-transparent'
    : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30 border border-transparent';
  const buttonInactive = isDarkMode
    ? 'bg-black/20 text-gray-400 hover:bg-black/40 border border-white/5'
    : 'bg-gray-100/80 text-gray-600 hover:bg-gray-200 border border-gray-200/50';

  const handleSearch = useCallback(() => {
    setLocalError('');
    try {
      let params = { searchType };

      if (searchType === 'semantic') {
        if (!concept.trim()) throw new Error('Please describe a concept or memory.');
        params.concept = concept.trim();
      } else if (searchType === 'keyword') {
        if (!keyword.trim()) throw new Error('Please enter a keyword to search.');
        params.keyword = keyword.trim();
      } else if (searchType === 'mood') {
        const parsedMinMood = minMood === '' ? null : parseFloat(minMood);
        const parsedMaxMood = maxMood === '' ? null : parseFloat(maxMood);
        if (isNaN(parsedMinMood) && isNaN(parsedMaxMood)) {
          throw new Error('Please enter at least a min or max mood score.');
        }
        if (parsedMinMood !== null && parsedMaxMood !== null && parsedMinMood > parsedMaxMood) {
          throw new Error('Minimum mood cannot be greater than maximum mood.');
        }
        params.minMood = minMood;
        params.maxMood = maxMood;
      } else {
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
  }, [searchType, keyword, concept, minMood, maxMood, startDate, endDate]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const clearSearch = () => {
    setActiveSearchParams(null);
    setKeyword('');
    setConcept('');
    setMinMood('');
    setMaxMood('');
    setStartDate('');
    setEndDate('');
    setLocalError('');
  };

  const isSearchActive = activeSearchParams !== null;

  return (
    // 💡 FIX: Removed max-w-5xl and mx-auto so it stretches to 100% full width just like the Dashboards!
    <div className="space-y-6 sm:space-y-8 w-full">

      {/* Search Card */}
      <div className={`rounded-2xl lg:rounded-3xl ${cardBg} border ${cardBorder} shadow-xl p-5 sm:p-6 lg:p-8 transition-all duration-300 hover:shadow-2xl`}>

        <div className="flex items-center justify-center gap-3 mb-6 lg:mb-8">
          {/* 💡 FIX: Icon color perfectly shifts to Teal in Dark Mode */}
          <div className="p-2 lg:p-3 rounded-xl lg:rounded-2xl bg-gradient-to-br from-purple-100 to-purple-50 dark:from-teal-900/40 dark:to-teal-800/20 text-purple-600 dark:text-teal-400 shrink-0 shadow-sm border border-purple-200/50 dark:border-teal-700/30">
            <Search className="w-5 h-5 lg:w-6 lg:h-6" />
          </div>
          <h3 className="text-xl lg:text-2xl font-poppins font-extrabold text-center text-gray-800 dark:text-gray-100 tracking-tight">
            Search Journal Entries
          </h3>
        </div>

        {/* Search Type Tabs */}
        <div className="flex justify-center gap-2 sm:gap-3 mb-8 lg:mb-10 flex-wrap">
          {[
            { id: 'semantic', label: 'AI Concept', icon: <Sparkles size={16} /> },
            { id: 'keyword', label: 'Exact Keyword', icon: <Search size={16} /> },
            { id: 'mood', label: 'Mood Score', icon: <Sliders size={16} /> },
            { id: 'date', label: 'Date Range', icon: <Calendar size={16} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSearchType(tab.id)}
              className={`flex items-center gap-1.5 lg:gap-2 py-2 px-4 lg:px-5 rounded-full font-poppins font-medium text-xs lg:text-sm transition-all duration-300 shadow-sm hover:-translate-y-0.5
                         ${searchType === tab.id ? buttonActive : buttonInactive}`}
            >
              {React.cloneElement(tab.icon, { className: 'w-4 h-4 lg:w-4 lg:h-4' })}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input Fields */}
        <div className="space-y-4 lg:space-y-5">
          {searchType === 'semantic' && (
            <div className="animate-fade-in">
              <label className={`block text-xs lg:text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2 ${textSecondary}`}>
                Ask AI to find a memory
                <span className="text-[10px] bg-gradient-to-r from-purple-500 to-teal-500 text-white px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">New</span>
              </label>
              <input
                type="text"
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g., 'Times I felt overwhelmed at work', 'Peaceful moments in nature'"
                className={`w-full p-3 lg:p-4 rounded-xl border ${inputBorder} ${inputBg} text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none transition-all text-sm lg:text-base ${inputFocusRing}`}
              />
            </div>
          )}

          {searchType === 'keyword' && (
            <div className="animate-fade-in">
              <label className={`block text-xs lg:text-sm font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Exact Keyword</label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g., happy, stress, meeting"
                className={`w-full p-3 lg:p-4 rounded-xl border ${inputBorder} ${inputBg} text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none transition-all text-sm lg:text-base ${inputFocusRing}`}
              />
            </div>
          )}

          {searchType === 'mood' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 animate-fade-in">
              <div>
                <label className={`block text-xs lg:text-sm font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Min Mood</label>
                <input
                  type="number"
                  step="0.01"
                  value={minMood}
                  onChange={(e) => setMinMood(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="-1.0 to 1.0"
                  className={`w-full p-3 lg:p-4 rounded-xl border ${inputBorder} ${inputBg} text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none transition-all text-sm lg:text-base ${inputFocusRing}`}
                />
              </div>
              <div>
                <label className={`block text-xs lg:text-sm font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Max Mood</label>
                <input
                  type="number"
                  step="0.01"
                  value={maxMood}
                  onChange={(e) => setMaxMood(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="-1.0 to 1.0"
                  className={`w-full p-3 lg:p-4 rounded-xl border ${inputBorder} ${inputBg} text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none transition-all text-sm lg:text-base ${inputFocusRing}`}
                />
              </div>
            </div>
          )}

          {searchType === 'date' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 animate-fade-in">
              <div>
                <label className={`block text-xs lg:text-sm font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={`w-full p-3 lg:p-4 rounded-xl border ${inputBorder} ${inputBg} text-gray-800 dark:text-gray-100 focus:outline-none transition-all text-sm lg:text-base ${inputFocusRing}`}
                />
              </div>
              <div>
                <label className={`block text-xs lg:text-sm font-bold uppercase tracking-wider mb-2 ${textSecondary}`}>End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={`w-full p-3 lg:p-4 rounded-xl border ${inputBorder} ${inputBg} text-gray-800 dark:text-gray-100 focus:outline-none transition-all text-sm lg:text-base ${inputFocusRing}`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {(localError || (isError && !isLoading)) && (
          <div className="mt-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 text-sm lg:text-base font-medium flex items-center gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{localError || error?.message || 'Search failed. Please try again.'}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 mt-8 lg:mt-10">
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="flex-1 py-3 lg:py-4 rounded-xl bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-bold text-sm lg:text-base shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            {isLoading ? 'Searching...' : 'Search Journal'}
          </button>
          {isSearchActive && (
            <button
              onClick={clearSearch}
              className="py-3 lg:py-4 px-6 lg:px-8 rounded-xl bg-gray-200 dark:bg-black/20 text-gray-800 dark:text-gray-200 font-bold text-sm lg:text-base border border-transparent dark:border-white/10 hover:bg-gray-300 dark:hover:bg-black/40 transition flex items-center justify-center gap-2"
            >
              <X className="w-5 h-5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Results Section */}
      {isLoading && (
        <div className={`rounded-2xl lg:rounded-3xl ${cardBg} border ${cardBorder} shadow-lg p-5 sm:p-6 lg:p-8 animate-fade-in`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 lg:p-3 rounded-xl lg:rounded-2xl bg-gradient-to-br from-purple-100 to-purple-50 dark:from-teal-900/40 dark:to-teal-800/20 text-purple-600 dark:text-teal-400 shrink-0 shadow-sm border border-purple-200/50 dark:border-teal-700/30">
                <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-xl lg:text-2xl font-poppins font-extrabold text-gray-800 dark:text-gray-100">Search Results</h3>
          </div>
          <SkeletonCard count={3} />
        </div>
      )}

      {!isLoading && searchResults?.length > 0 && (
        <div className={`rounded-2xl lg:rounded-3xl ${cardBg} border ${cardBorder} shadow-lg p-4 sm:p-6 lg:p-8 transition-all duration-300 hover:shadow-xl animate-fade-in`}>

          <div className="flex flex-wrap justify-between items-center gap-4 mb-6 lg:mb-8 border-b border-gray-200/50 dark:border-gray-700/50 pb-4 lg:pb-6">
              <div className="flex items-center gap-3 lg:gap-4">
                  <div className="p-2 lg:p-3 rounded-xl lg:rounded-2xl bg-white/60 dark:bg-black/20 shadow-sm border border-white/40 dark:border-white/5 text-emerald-500">
                      <FileText className="w-5 h-5 lg:w-6 lg:h-6" />
                  </div>
                  <h3 className="text-xl lg:text-2xl font-poppins font-extrabold text-gray-800 dark:text-gray-100 tracking-tight">
                      Search Results
                  </h3>
              </div>

              <div className="flex items-center gap-2 px-3 lg:px-4 py-1.5 lg:py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-full shadow-sm text-emerald-700 dark:text-emerald-300">
                  <span className="text-[10px] lg:text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                      {searchResults.length} {searchResults.length === 1 ? 'Entry' : 'Entries'} Found
                  </span>
              </div>
          </div>

          <JournalHistory entries={searchResults} searchType={searchType} />
        </div>
      )}

      {!isLoading && !isError && searchResults?.length === 0 && isSearchActive && (
        <div className={`rounded-2xl lg:rounded-3xl ${cardBg} border ${cardBorder} shadow-lg p-10 lg:p-14 text-center animate-fade-in flex flex-col items-center justify-center`}>
          <div className="w-16 h-16 lg:w-20 lg:h-20 mb-4 rounded-full bg-gray-100 dark:bg-black/20 flex items-center justify-center">
            <Search className={`w-8 h-8 lg:w-10 lg:h-10 ${textSecondary} opacity-50`} />
          </div>
          <h3 className="text-xl lg:text-2xl font-poppins font-bold text-gray-800 dark:text-gray-100 mb-2">No Results Found</h3>
          <p className={`text-sm lg:text-base ${textSecondary} max-w-md`}>We couldn't find any journal entries matching your exact search criteria.</p>
          <button
            onClick={clearSearch}
            className="mt-6 text-sm lg:text-base font-bold text-purple-600 hover:text-purple-700 dark:text-teal-400 dark:hover:text-teal-300 transition-colors px-6 py-2 rounded-full hover:bg-purple-50 dark:hover:bg-teal-900/20"
          >
            Clear search & try again
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}

export default JournalSearch;