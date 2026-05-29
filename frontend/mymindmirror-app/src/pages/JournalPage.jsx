// src/pages/JournalPage.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';
import ExportButtons from '../components/ExportButtons';
import WritingPrompt from '../components/WritingPrompt';
import RoadmapPlanner from '../components/RoadmapPlanner';
import AchievementsWidget from '../components/AchievementsWidget';
import {
  useTodayEntries,
  useWeeklyEntries,
  usePaginatedJournalEntries,
} from '../hooks/useJournalData';
import JournalInput from '../components/JournalInput';
import AnomalyAlerts from '../components/AnomalyAlerts';
import TodayDashboard from '../components/TodayDashboard';
import WeeklyDashboard from '../components/WeeklyDashboard';
import OverallDashboard from '../components/OverallDashboard';
import JournalSearch from '../components/JournalSearch';
import MilestoneTracker from '../components/MilestoneTracker';
import ReflectionChat from '../components/ReflectionChat';
import AppLoader from '../components/AppLoader';
import SchedulePage from '../pages/SchedulePage';
import {
  Calendar,
  BarChart3,
  History,
  Search,
  Target,
  Map,
  Sparkles,
  Feather,
  User,
} from 'lucide-react';
const ALL_TABS = ['today', 'weekly', 'all', 'search', 'milestones', 'roadmap', 'chat', 'schedule'];

function JournalPage() {
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState(null);
  const [currentClusterResults, setCurrentClusterResults] = useState(null);
const [activeTab, setActiveTab] = useState(() => {
    const saved = sessionStorage.getItem('journalActiveTab');
    const validTabs = ['today', 'weekly', 'all', 'search', 'milestones', 'roadmap', 'chat', 'schedule'];
    return saved && validTabs.includes(saved) ? saved : 'today';
});

  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const journalInputRef = useRef();

  // Date ranges for queries
  const todayDate = new Date();
  const startOfCurrentWeek = startOfWeek(todayDate, { weekStartsOn: 0 });
  const endOfCurrentWeek = endOfWeek(todayDate, { weekStartsOn: 0 });

  // Queries
  const todayQuery = useTodayEntries();
  const weeklyQuery = useWeeklyEntries(
    format(startOfCurrentWeek, 'yyyy-MM-dd'),
    format(endOfCurrentWeek, 'yyyy-MM-dd')
  );
  const paginatedQuery = usePaginatedJournalEntries(20, {
    enabled: activeTab === 'all',   // <<< key change
  });

  const totalEntries = paginatedQuery.data?.pages[0]?.totalElements || 0;

  let entriesData, isLoading, isError, error, refetch, hasNextPage, fetchNextPage, isFetchingNextPage;
  switch (activeTab) {
    case 'today':
      entriesData = todayQuery.data || [];
      isLoading = todayQuery.isLoading;
      isError = todayQuery.isError;
      error = todayQuery.error;
      refetch = todayQuery.refetch;
      break;
    case 'weekly':
      entriesData = weeklyQuery.data || [];
      isLoading = weeklyQuery.isLoading;
      isError = weeklyQuery.isError;
      error = weeklyQuery.error;
      refetch = weeklyQuery.refetch;
      break;
    case 'all':
      entriesData = paginatedQuery.data?.pages.flatMap(page => page.content) || [];
      isLoading = paginatedQuery.isLoading;
      isError = paginatedQuery.isError;
      error = paginatedQuery.error;
      refetch = paginatedQuery.refetch;
      hasNextPage = paginatedQuery.hasNextPage;
      fetchNextPage = paginatedQuery.fetchNextPage;
      isFetchingNextPage = paginatedQuery.isFetchingNextPage;
      break;
    default:
      entriesData = [];
      isLoading = false;
      isError = false;
      error = null;
      refetch = () => {};
  }

  const todayEntries = activeTab === 'today' ? entriesData : [];
  const weeklyEntries = activeTab === 'weekly' ? entriesData : [];

useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && ALL_TABS.includes(hash)) {
      setActiveTab(hash);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);
useEffect(() => {
    sessionStorage.setItem('journalActiveTab', activeTab);
}, [activeTab]);

  useEffect(() => {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const decodedToken = jwtDecode(token);
      setUsername(decodedToken.sub);
      setUserId(decodedToken.userId);
    } catch (decodeError) {
      console.error('Error decoding JWT:', decodeError);
      localStorage.removeItem('jwtToken');
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('jwtToken');
    navigate('/login');
  };

  const handleClusteringComplete = (results) => {
    setCurrentClusterResults(results);
  };

  const tabs = [
    { id: 'today', label: 'Today', icon: <Calendar size={18} /> },
    { id: 'weekly', label: 'Weekly', icon: <BarChart3 size={18} /> },
    { id: 'all', label: 'History', icon: <History size={18} /> },
    { id: 'search', label: 'Search', icon: <Search size={18} /> },
    { id: 'milestones', label: 'Goals', icon: <Target size={18} /> },
    { id: 'roadmap', label: 'Roadmap', icon: <Map size={18} /> },
    { id: 'chat', label: 'AI Coach', icon: <Sparkles size={18} /> },
    { id: 'schedule', label: 'Schedule', icon: <Calendar size={18} /> },
  ];

  if (isLoading) return <AppLoader />;
  if (isError) {
    return (
      <div
        className={`w-full max-w-4xl flex-grow p-6 rounded-xl ${
          theme === 'dark'
            ? 'bg-black/30 text-[#FF8A7A] border-white/10'
            : 'bg-white/70 text-[#FF8A7A] border-white/30'
        } backdrop-blur-md shadow-lg transition-all duration-500 flex flex-col items-center justify-center font-inter text-lg`}
      >
        <p>{error?.message || 'Failed to load journal data.'}</p>
        <button
          onClick={handleLogout}
          className="mt-4 py-2 px-4 rounded-full font-poppins font-semibold text-white bg-[#FF8A7A] hover:bg-[#FF6C5A] active:bg-[#D45E4D] shadow-md hover:shadow-lg transition-all duration-300"
        >
          Logout
        </button>
      </div>
    );
  }

  const bgClass = isDarkMode ? 'bg-gray-900' : 'bg-gray-50';
  const cardBg = isDarkMode ? 'bg-black/30 backdrop-blur-md' : 'bg-white/70 backdrop-blur-md';
  const cardBorder = isDarkMode ? 'border-white/10' : 'border-white/30';
  const textSecondary = isDarkMode ? 'text-gray-300' : 'text-gray-600';

  return (
    <div className={`min-h-screen w-full ${bgClass} transition-colors duration-300 relative p-2 sm:p-4`}>
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-teal-500/5" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse-slow delay-1000" />
      </div>

      {/* Floating Icons */}
      <div className="absolute top-32 left-5 opacity-30 animate-float hidden lg:block z-20">
        <Feather size={32} className="text-purple-400" />
      </div>
      <div className="absolute bottom-32 right-10 opacity-30 animate-float-delayed hidden lg:block z-20">
        <User size={32} className="text-teal-400" />
      </div>

      <main
        className={`relative w-full max-w-4xl mx-auto flex-grow p-4 sm:p-6 rounded-xl
                    ${cardBg} ${cardBorder} shadow-lg backdrop-blur-md
                    transition-all duration-500 flex flex-col space-y-6 sm:space-y-8 z-10`}
      >
        {/* Achievements Widget */}
        <div className="mb-2">
          <AchievementsWidget />
        </div>

        {/* Writing Prompt & Input */}
        <WritingPrompt
          onUsePrompt={(prompt) => {
            if (journalInputRef.current) journalInputRef.current.setText(prompt);
          }}
        />
        <JournalInput ref={journalInputRef} />
        <AnomalyAlerts />

        {/* Navigation & Export Islands */}
        <div className="flex flex-col items-center gap-4 w-full">
          {/* Floating Navigation Island – never scrolls */}
          <div className="inline-flex p-1.5 bg-white/20 dark:bg-white/5 backdrop-blur-2xl rounded-2xl border border-white/30 dark:border-white/10 shadow-2xl">
            <nav className="flex flex-nowrap justify-center gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-xl transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'text-white'
                      : `${textSecondary} hover:text-gray-800 dark:hover:text-gray-200`
                  }`}
                >
                  {/* Active Background */}
                  {activeTab === tab.id && (
                    <div className="absolute inset-0 bg-gradient-to-r from-[#5CC8C2] to-[#2E8B85] rounded-xl shadow-lg shadow-teal-500/30 z-0" />
                  )}
                  <span className="relative z-10 transition-transform duration-300 group-hover:scale-110">
                    {tab.icon}
                  </span>
                  <span className="relative z-10 font-poppins font-medium text-xs sm:text-sm hidden sm:inline whitespace-nowrap">
                    {tab.label}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Export Island */}
          <div className="inline-flex p-1.5 bg-white/20 dark:bg-white/5 backdrop-blur-2xl rounded-2xl border border-white/30 dark:border-white/10">
            <ExportButtons />
          </div>
        </div>

        {/* Dashboard Content */}
        {activeTab === 'today' && <TodayDashboard todayEntries={todayEntries} isLoading={isLoading} />}
        {activeTab === 'weekly' && (
          <WeeklyDashboard
            weeklyEntries={weeklyEntries}
            isLoading={isLoading}
            userId={userId}
            onClusteringComplete={handleClusteringComplete}
            currentClusterResults={currentClusterResults}
            startOfCurrentWeek={startOfCurrentWeek}
            endOfCurrentWeek={endOfCurrentWeek}
          />
        )}
        {activeTab === 'all' && (
          <OverallDashboard
            journalEntries={entriesData}
            isLoading={isLoading}
            userId={userId}
            onClusteringComplete={handleClusteringComplete}
            currentClusterResults={currentClusterResults}
            loadMore={paginatedQuery.fetchNextPage}
            hasNextPage={paginatedQuery.hasNextPage}
            isFetchingNextPage={paginatedQuery.isFetchingNextPage}
            totalEntries={totalEntries}
          />
        )}
        {activeTab === 'search' && <JournalSearch userId={userId} />}
        {activeTab === 'milestones' && <MilestoneTracker userId={userId} />}
        {activeTab === 'roadmap' && <RoadmapPlanner />}
        {activeTab === 'chat' && <ReflectionChat />}
        {activeTab === 'schedule' && <SchedulePage />}
      </main>

      {/* Global Animations */}
      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.05); }
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 6s ease-in-out infinite;
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 4s ease-in-out infinite 2s;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

export default JournalPage;