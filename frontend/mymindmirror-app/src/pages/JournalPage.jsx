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
import AppLoader from '../components/AppLoader';
import {
  Calendar,
  BarChart3,
  History,
  Search,
  Target,
  Map
} from 'lucide-react';
function JournalPage() {
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState(null);
  const [currentClusterResults, setCurrentClusterResults] = useState(null);
  const [activeTab, setActiveTab] = useState('today');
  const navigate = useNavigate();
  const { theme } = useTheme();
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
  const paginatedQuery = usePaginatedJournalEntries(20);


  // Total entries from the first page of paginated query
  const totalEntries = paginatedQuery.data?.pages[0]?.totalElements || 0;

  // Select data based on active tab
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

  // For today and weekly tabs, entriesData already contains the correct entries.
  // We pass them directly to the dashboards.
  const todayEntries = activeTab === 'today' ? entriesData : [];
  const weeklyEntries = activeTab === 'weekly' ? entriesData : [];

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
    console.log('handleClusteringComplete called with results:', results);
    setCurrentClusterResults(results);
  };

  if (isLoading) return <AppLoader />;
  if (isError) {
    return (
      <div
        className={`w-full max-w-4xl flex-grow p-6 rounded-xl
                    ${
                      theme === 'dark'
                        ? 'bg-black/30 text-[#FF8A7A] border-white/10'
                        : 'bg-white/70 text-[#FF8A7A] border-white/30'
                    }
                    backdrop-blur-md shadow-lg transition-all duration-500 flex flex-col items-center justify-center font-inter text-lg`}
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

  return (
    <div
      className={`min-h-screen flex flex-col items-center p-2 sm:p-4
                  bg-gradient-to-br from-[#F8F9FA] to-[#E0E0E0]
                  dark:from-[#1E1A3E] dark:to-[#3A355C]
                  text-gray-800 dark:text-gray-200`}
    >
      <main
        className="w-full max-w-4xl flex-grow p-4 sm:p-6 rounded-xl
                   bg-white/70 dark:bg-black/30 backdrop-blur-md shadow-lg border border-white/30 dark:border-white/10
                   transition-all duration-500 flex flex-col space-y-6 sm:space-y-8"
      >
        <div className="mb-4">
          <AchievementsWidget />
        </div>
        <WritingPrompt
          onUsePrompt={(prompt) => {
            if (journalInputRef.current) journalInputRef.current.setText(prompt);
          }}
        />
        <JournalInput ref={journalInputRef} />
        <AnomalyAlerts />

       {/* Main Header Container */}
       <div className="flex flex-col items-center gap-6 mb-8 w-full">

         {/* Fixed Floating Nav Island - Background now adapts to Light/Dark mode */}
         <div className="inline-flex p-1 bg-gray-200/50 dark:bg-white/5 backdrop-blur-2xl rounded-2xl border border-gray-300/50 dark:border-white/10 shadow-2xl overflow-hidden">
           <nav className="no-scrollbar flex flex-nowrap overflow-x-auto">
             {[
               { id: 'today', label: 'Today', icon: <Calendar size={18} /> },
               { id: 'weekly', label: 'Weekly', icon: <BarChart3 size={18} /> },
               { id: 'all', label: 'History', icon: <History size={18} /> },
               { id: 'search', label: 'Search', icon: <Search size={18} /> },
               { id: 'milestones', label: 'Goals', icon: <Target size={18} /> },
               { id: 'roadmap', label: 'Roadmap', icon: <Map size={18} /> }
             ].map((tab) => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-500 group ${
                   activeTab === tab.id
                     ? 'text-white'
                     : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                 }`}
               >
                 {/* Animated Active Background */}
                 {activeTab === tab.id && (
                   <div className="absolute inset-0 bg-gradient-to-r from-[#5CC8C2] to-[#2E8B85] rounded-xl shadow-[0_0_20px_rgba(92,200,194,0.3)] z-0" />
                 )}

                 <span className="relative z-10 transition-transform duration-300 group-hover:scale-110">
                   {tab.icon}
                 </span>
                 <span className="relative z-10 font-poppins font-bold text-sm hidden md:block">
                   {tab.label}
                 </span>
               </button>
             ))}
           </nav>
         </div>

         {/* Separate Export Island - Adjusted background for light mode visibility */}
         <div className="flex items-center gap-3 p-1.5 bg-gray-200/50 dark:bg-white/5 rounded-2xl border border-gray-300/50 dark:border-white/5 backdrop-blur-md">
           <ExportButtons />
         </div>
       </div>
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
                totalEntries={totalEntries}  // ← new prop
            />
        )}
        {activeTab === 'search' && <JournalSearch userId={userId} />}
        {activeTab === 'milestones' && <MilestoneTracker userId={userId} />}
        {activeTab === 'roadmap' && <RoadmapPlanner />}
      </main>
    </div>
  );
}

export default JournalPage;