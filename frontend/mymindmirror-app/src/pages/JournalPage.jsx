// src/pages/JournalPage.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
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
    return saved && ALL_TABS.includes(saved) ? saved : 'today';
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
    enabled: activeTab === 'all',
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

  // Memoized tabs
  const tabs = useMemo(() => [
    { id: 'today', label: 'Today', icon: Calendar },
    { id: 'weekly', label: 'Weekly', icon: BarChart3 },
    { id: 'all', label: 'History', icon: History },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'milestones', label: 'Goals', icon: Target },
    { id: 'roadmap', label: 'Roadmap', icon: Map },
    { id: 'chat', label: 'AI Coach', icon: Sparkles },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
  ], []);

  if (isLoading) return <AppLoader />;

  if (isError) {
    return (
      <div className={`w-full max-w-7xl mx-auto flex-grow p-6 rounded-2xl border ${isDarkMode ? 'bg-[#1A162F]/80 border-gray-700/50' : 'bg-white/80 border-gray-200/50'} backdrop-blur-md shadow-lg flex flex-col items-center justify-center font-inter text-lg text-rose-500`}>
        <p>{error?.message || 'Failed to load journal data.'}</p>
        <button
          onClick={handleLogout}
          className="mt-6 py-2.5 px-6 rounded-full font-poppins font-semibold text-white bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 active:scale-95 shadow-md transition-all"
        >
          Logout
        </button>
      </div>
    );
  }

  const cardBg = isDarkMode ? 'bg-[#1A162F]/40' : 'bg-white/40';
  const cardBorder = isDarkMode ? 'border-white/10' : 'border-white/50';
  const textSecondary = isDarkMode ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className="w-full flex-grow flex flex-col relative">

      {/* Subtle Local Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[10%] left-[5%] w-[40vw] h-[40vw] bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[10%] right-[5%] w-[40vw] h-[40vw] bg-teal-500/10 dark:bg-teal-500/5 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Floating Decorative Icons */}
      <div className="absolute top-32 left-4 xl:left-8 opacity-20 animate-float hidden lg:block z-0 pointer-events-none">
        <Feather size={48} className="text-purple-400" />
      </div>
      <div className="absolute bottom-32 right-4 xl:right-8 opacity-20 animate-float hidden lg:block z-0 pointer-events-none" style={{ animationDelay: '1.5s' }}>
        <User size={48} className="text-teal-400" />
      </div>

<main className={`relative w-full max-w-7xl mx-auto flex-grow p-3 sm:p-6 lg:p-8 xl:p-10 rounded-[2rem] lg:rounded-[2.5rem] ${cardBg} ${cardBorder} border shadow-2xl backdrop-blur-xl flex flex-col space-y-6 lg:space-y-8 z-10`}>
        {/* Core Widgets Area */}
        <div className="space-y-6 lg:space-y-8">
          <AchievementsWidget />

          <WritingPrompt
            onUsePrompt={(prompt) => {
              if (journalInputRef.current) {
                journalInputRef.current.setText(prompt);
                window.scrollTo({ top: 350, behavior: 'smooth' });
              }
            }}
          />

          <JournalInput ref={journalInputRef} />

          <AnomalyAlerts />
        </div>

        {/* 🚀 NEW DYNAMIC CENTER DOCK (Tabs + Export) */}
        <div className="flex flex-wrap items-center justify-center gap-3 lg:gap-5 w-full pt-6 pb-2 sticky top-2 sm:top-4 z-40">

          {/* Main Tab Navigation Wrapper (Swipable on mobile) */}
          <div className="w-full xl:w-auto overflow-x-auto scrollbar-hide -mx-4 px-4 xl:mx-0 xl:px-0 text-center">

            {/* The Tab Island */}
            <div className="inline-flex items-center p-1.5 bg-white/70 dark:bg-[#1A162F]/80 backdrop-blur-2xl rounded-[1.25rem] border border-white/60 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] min-w-max">
              <nav className="flex flex-nowrap gap-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative flex items-center justify-center gap-2 px-3 sm:px-4 lg:px-5 py-2.5 lg:py-3 rounded-xl transition-all duration-300 outline-none group ${
                        isActive
                          ? 'text-white shadow-md'
                          : `${textSecondary} hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10`
                      }`}
                    >
                      {/* 💡 UPDATED: Purple in Light Mode, Teal in Dark Mode */}
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-purple-600 dark:from-teal-500 dark:to-teal-700 rounded-xl z-0 shadow-inner" />
                      )}

                      {/* Icon */}
                      <span className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                        <Icon className="w-4 h-4 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                      </span>

                      {/* Label */}
                      <span className="relative z-10 font-poppins font-semibold text-xs sm:text-sm lg:text-base hidden sm:inline whitespace-nowrap tracking-wide">
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Export Action Center Island */}
          <div className="shrink-0 flex justify-center">
            <div className="inline-flex items-center p-1.5 bg-white/70 dark:bg-[#1A162F]/80 backdrop-blur-2xl rounded-xl lg:rounded-[1.25rem] border border-white/60 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)]">
              <ExportButtons />
            </div>
          </div>
        </div>

        {/* Dashboard Content Container (Fade transition) */}
        <div className="animate-fade-in pt-2 lg:pt-4 min-h-[50vh]">
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
        </div>
      </main>

      <style>{`
              @keyframes pulse-slow {
                0%, 100% { opacity: 0.3; transform: scale(1); }
                50% { opacity: 0.6; transform: scale(1.05); }
              }
              @keyframes float {
                0%, 100% { transform: translateY(0px) rotate(0deg); }
                50% { transform: translateY(-20px) rotate(5deg); }
              }
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
              }
              .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
              .animate-float { animation: float 6s ease-in-out infinite; }
              .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }

              /* Hide scrollbar for mobile tabs but allow smooth swiping */
              .scrollbar-hide::-webkit-scrollbar {
                  display: none;
              }
              .scrollbar-hide {
                  -ms-overflow-style: none;
                  scrollbar-width: none;
              }
            `}</style>
    </div>
  );
}

export default JournalPage;