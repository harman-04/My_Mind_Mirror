// src/App.jsx
import React, { lazy, Suspense, useState, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { Menu, X, Home, Sparkles, Award, User, LogOut, LogIn, UserPlus } from 'lucide-react';
import ThemeToggle from './components/ThemeToggle';
import AppLogo from './components/AppLogo';
import HeaderApiKeyStatus from './components/HeaderApiKeyStatus';
import { useTheme } from './contexts/ThemeContext';

// Lazy load pages
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const JournalPage = lazy(() => import('./pages/JournalPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AchievementsPage = lazy(() => import('./pages/AchievementsPage'));
const FeaturesGuide = lazy(() => import('./pages/FeaturesGuide'));
const SchedulePage = lazy(() => import('./pages/SchedulePage'));

// 🚀 ENTERPRISE UPGRADE 1: Automatic Scroll Restoration
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);
  return null;
};

// 🚀 PREMIUM KINETIC LOADER
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[70vh] w-full animate-in fade-in duration-500">
    <div className="relative flex items-center justify-center w-28 h-28 mb-8">
      <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-purple-500/80 animate-spin" style={{ animationDuration: '2s' }}></div>
      <div className="absolute inset-3 rounded-full border-b-2 border-l-2 border-teal-500/80 animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}></div>
      <div className="absolute inset-6 rounded-full border-t-2 border-l-2 border-pink-500/80 animate-spin" style={{ animationDuration: '1s' }}></div>
      <div className="absolute bg-gradient-to-br from-purple-500/20 to-teal-500/20 rounded-full inset-8 animate-pulse flex items-center justify-center blur-[2px]"></div>
      <Sparkles className="w-6 h-6 text-purple-400 animate-pulse relative z-10" />
    </div>
    <div className="flex flex-col items-center gap-2">
      <p className="text-gray-500 dark:text-gray-400 font-medium font-poppins tracking-[0.2em] uppercase text-sm animate-pulse">
        Initializing Workspace
      </p>
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  </div>
);

const PrivateRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('jwtToken');
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('jwtToken'));

  const isDarkMode = theme === 'dark';

  // 🚀 ENTERPRISE UPGRADE 2: Cross-Tab Auth Syncing
  useEffect(() => {
    const handleStorageChange = () => setIsAuthenticated(!!localStorage.getItem('jwtToken'));
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Sync auth state on same-tab route changes
  useEffect(() => {
    setIsAuthenticated(!!localStorage.getItem('jwtToken'));
  }, [location.pathname]);

  // 🚀 ENTERPRISE UPGRADE 3: Dynamic Browser Theme Color
  useEffect(() => {
    const metaThemeColor = document.querySelector("meta[name=theme-color]");
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", isDarkMode ? '#131127' : '#F8F9FA');
    }
  }, [isDarkMode]);

  const handleLogout = () => {
    localStorage.removeItem('jwtToken');
    setIsAuthenticated(false);
    navigate('/login', { replace: true });
    setMobileMenuOpen(false);
  };

  const showLogoutAndProfile = isAuthenticated &&
    ['/journal', '/profile', '/achievements', '/features', '/'].includes(location.pathname);

  // 🚀 ENTERPRISE UPGRADE 4: Memoizing Navigation Links to prevent re-renders
  const navLinks = useMemo(() => {
    const links = [
      { to: '/', label: 'Home', icon: Home, color: 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700' },
      { to: '/features', label: 'Features', icon: Sparkles, color: 'bg-gradient-to-r from-[#7B9EC2] to-[#6A8DB0] hover:from-[#6A8DB0] hover:to-[#5A7A9E]' },
    ];

    if (!isAuthenticated) {
      links.push(
        { to: '/login', label: 'Login', icon: LogIn, color: 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700' },
        { to: '/register', label: 'Register', icon: UserPlus, color: 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700' }
      );
    } else {
      links.push(
        { to: '/achievements', label: 'Achievements', icon: Award, color: 'bg-gradient-to-r from-[#B399D4] to-[#9B7BBF] hover:from-[#9B7BBF] hover:to-[#806AA0]' },
        { to: '/profile', label: 'Profile', icon: User, color: 'bg-gradient-to-r from-[#5CC8C2] to-[#4bb3ac] hover:from-[#4bb3ac] hover:to-[#3da19a]' }
      );
    }
    return links;
  }, [isAuthenticated]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Refined Background Gradient
  const bgGradient = isDarkMode
    ? 'from-[#131127] via-[#1E1A3E] to-[#2B2748]'
    : 'from-[#F8F9FA] via-[#F1F3F5] to-[#E9ECEF]';

  const layoutMaxWidth = "max-w-7xl";

  return (
      <div className={`min-h-screen flex flex-col items-center px-2 sm:px-6 py-4 sm:py-6 text-gray-800 dark:text-gray-200 relative overflow-x-hidden selection:bg-purple-500/30`}>
        {/* Inject Scroll To Top Observer */}
        <ScrollToTop />

        {/* 🌟 3-POINT DYNAMIC RESPONSIVE BACKGROUND */}
        <div className={`fixed inset-0 pointer-events-none overflow-hidden -z-10 bg-gradient-to-br ${bgGradient} transition-colors duration-700`}>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20 dark:opacity-[0.03] mix-blend-overlay"></div>
          {/* Top Left - Purple */}
          <div className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] bg-purple-500/15 dark:bg-purple-600/20 rounded-full blur-[140px] animate-pulse-slow" />
          {/* Bottom Right - Teal */}
          <div className="absolute -bottom-[20%] -right-[10%] w-[50vw] h-[50vw] bg-teal-500/15 dark:bg-teal-600/20 rounded-full blur-[140px] animate-pulse-slow delay-1000" />
          {/* Center - Pink Blend */}
          <div className="absolute top-[30%] left-[25%] w-[40vw] h-[40vw] bg-pink-500/10 dark:bg-fuchsia-600/15 rounded-full blur-[160px] animate-pulse-slow delay-500" />
        </div>

        {/* 🚀 DESKTOP HEADER (Now restricted strictly to Laptops/Desktops via 'lg:flex') */}
        <header className={`hidden lg:flex w-full ${layoutMaxWidth} flex-nowrap justify-between items-center
                           py-4 px-8 lg:px-10 mb-10 rounded-[2rem]
                           bg-white/70 dark:bg-[#1A162F]/70 backdrop-blur-xl shadow-xl
                           border border-white/50 dark:border-white/10 ring-1 ring-black/5 dark:ring-white/5
                           transition-all duration-500 gap-6 relative z-20`}>

          <div className="transform hover:scale-[1.02] transition-transform duration-300 shrink-0">
            <AppLogo />
          </div>

          <div className="flex flex-nowrap justify-end items-center gap-3 xl:gap-5 shrink-0">
            <Link to="/features" className="py-2.5 px-5 xl:px-6 rounded-full font-poppins font-semibold text-white text-sm whitespace-nowrap
                                            bg-gradient-to-r from-[#7B9EC2] to-[#6A8DB0] hover:-translate-y-0.5 active:translate-y-0
                                            shadow-md hover:shadow-lg transition-all duration-300">
              Features
            </Link>

            {!isAuthenticated && (
              <>
                <Link to="/login" className="py-2.5 px-5 xl:px-6 rounded-full font-poppins font-semibold text-white text-sm whitespace-nowrap
                                              bg-gradient-to-r from-teal-500 to-teal-600 hover:-translate-y-0.5 active:translate-y-0
                                              shadow-md hover:shadow-lg transition-all duration-300">
                  Login
                </Link>
                <Link to="/register" className="py-2.5 px-5 xl:px-6 rounded-full font-poppins font-semibold text-white text-sm whitespace-nowrap
                                                bg-gradient-to-r from-purple-500 to-purple-600 hover:-translate-y-0.5 active:translate-y-0
                                                shadow-md hover:shadow-lg transition-all duration-300">
                  Register
                </Link>
              </>
            )}

            {isAuthenticated && (
              <>
                <Link to="/achievements" className="py-2.5 px-5 xl:px-6 rounded-full font-poppins font-semibold text-white text-sm whitespace-nowrap
                                                    bg-gradient-to-r from-[#B399D4] to-[#9B7BBF] hover:-translate-y-0.5 active:translate-y-0
                                                    shadow-md hover:shadow-lg transition-all duration-300">
                  Achievements
                </Link>
                <Link to="/profile" className="py-2.5 px-5 xl:px-6 rounded-full font-poppins font-semibold text-white text-sm whitespace-nowrap
                                              bg-gradient-to-r from-[#5CC8C2] to-[#4bb3ac] hover:-translate-y-0.5 active:translate-y-0
                                              shadow-md hover:shadow-lg transition-all duration-300">
                  Profile
                </Link>
                <div className="pl-1 xl:pl-2">
                  <HeaderApiKeyStatus />
                </div>
                {showLogoutAndProfile && (
                  <button onClick={handleLogout} className="py-2.5 px-5 xl:px-6 rounded-full font-poppins font-semibold text-white text-sm whitespace-nowrap
                                                            bg-gradient-to-r from-[#FF8A7A] to-[#FF6C5A] hover:-translate-y-0.5 active:translate-y-0
                                                            shadow-md hover:shadow-lg transition-all duration-300">
                    Logout
                  </button>
                )}
              </>
            )}

            <div className="pl-4 xl:pl-5 border-l-2 border-gray-200 dark:border-gray-700/80 flex items-center">
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* 📱 MOBILE / TABLET HEADER (Now applies to tablets via 'lg:hidden') */}
        <div className={`lg:hidden w-full flex justify-between items-center py-3.5 px-5 md:px-8 mb-6 rounded-2xl
                        bg-white/70 dark:bg-[#1A162F]/70 backdrop-blur-xl shadow-lg
                        border border-white/50 dark:border-white/10 ring-1 ring-black/5 dark:ring-white/5
                        relative z-20`}>
          <AppLogo />
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-xl bg-gray-500/10 hover:bg-gray-500/20 transition active:scale-95"
              aria-label="Open Mobile Menu"
              aria-expanded={mobileMenuOpen}
            >
              <Menu size={24} className="text-gray-800 dark:text-gray-200" />
            </button>
          </div>
        </div>

        {/* 📱 MOBILE / TABLET SIDEBAR */}
        {mobileMenuOpen && (
          <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in" onClick={closeMobileMenu} />
            <div className="fixed top-0 right-0 h-full w-[280px] md:w-[320px] bg-white/95 dark:bg-[#1A162F]/95 backdrop-blur-2xl shadow-2xl z-50 lg:hidden flex flex-col p-6 animate-slide-in-right border-l border-white/20 dark:border-white/10">
              <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200 dark:border-gray-800">
                <span className="text-xl font-poppins font-extrabold bg-gradient-to-r from-purple-500 to-teal-500 bg-clip-text text-transparent tracking-wide">
                  Navigation
                </span>
                <button onClick={closeMobileMenu} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition active:scale-90" aria-label="Close Menu">
                  <X size={22} className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link key={link.to} to={link.to} onClick={closeMobileMenu}
                      className={`flex items-center gap-3 py-4 px-5 rounded-xl font-poppins font-semibold text-white transition-transform duration-200
                                 ${link.color} active:scale-95 shadow-md`}>
                      <Icon size={20} />
                      {link.label}
                    </Link>
                  );
                })}
                {isAuthenticated && (
                  <div className="mt-4 border-t border-gray-200 dark:border-gray-800 pt-4">
                    <HeaderApiKeyStatus compact={false} />
                  </div>
                )}
                {showLogoutAndProfile && (
                  <button onClick={handleLogout}
                    className="flex items-center gap-3 py-4 px-5 mt-2 rounded-xl font-poppins font-semibold text-white
                               bg-gradient-to-r from-rose-500 to-red-600 active:scale-95 transition-transform duration-200 shadow-md">
                    <LogOut size={20} />
                    Logout
                  </button>
                )}
              </div>
              <div className="mt-6 pt-5 text-center text-xs font-medium text-gray-400 dark:text-gray-500">
                MyMindMirror &copy; {new Date().getFullYear()}
              </div>
            </div>
          </>
        )}

        {/* 🖥️ MAIN CONTENT AREA */}
        <main id="main-content" className={`w-full ${layoutMaxWidth} flex-grow flex flex-col items-center justify-start relative z-10`}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/features" element={<FeaturesGuide />} />
              <Route path="/achievements" element={<PrivateRoute><AchievementsPage /></PrivateRoute>} />
              <Route path="/journal" element={<PrivateRoute><JournalPage /></PrivateRoute>} />
              <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
              <Route path="/schedule" element={<PrivateRoute><SchedulePage /></PrivateRoute>} />
            </Routes>
          </Suspense>
        </main>

        {/* 🌟 GLASSMORPHIC FOOTER */}
        <footer className={`w-full ${layoutMaxWidth} flex justify-center mt-16 mb-6 relative z-10`}>
          <div className="px-6 py-3 rounded-full bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/50 dark:border-white/10 shadow-sm flex items-center justify-center">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 tracking-wide">
              &copy; {new Date().getFullYear()} <span className="text-purple-600 dark:text-purple-400 font-semibold">MyMindMirror</span>. All rights reserved.
            </p>
          </div>
        </footer>

        {/* 🎨 GLOBAL CSS ANIMATIONS */}
        <style>{`
          @keyframes pulse-slow {
            0%, 100% { opacity: 0.2; transform: scale(1) translate(0, 0); }
            50% { opacity: 0.5; transform: scale(1.05) translate(30px, -30px); }
          }
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slide-in-right {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          .animate-pulse-slow { animation: pulse-slow 10s ease-in-out infinite; }
          .delay-500 { animation-delay: 1.5s; }
          .delay-1000 { animation-delay: 3s; }
          .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
          .animate-slide-in-right { animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        `}</style>
      </div>
    );
}

export default App;