// src/App.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { Menu, X, Home, Sparkles, Award, User, LogOut } from 'lucide-react';
import ThemeToggle from './components/ThemeToggle';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import JournalPage from './pages/JournalPage';
import HomePage from './pages/HomePage';
import FeaturesPage from './pages/FeaturesPage';
import ProfilePage from './pages/ProfilePage';
import AppLogo from './components/AppLogo';
import HeaderApiKeyStatus from './components/HeaderApiKeyStatus';
import AchievementsPage from './pages/AchievementsPage';
import FeaturesGuide from './pages/FeaturesGuide';
import { useTheme } from './contexts/ThemeContext';

const PrivateRoute = ({ children }) => {
    const isAuthenticated = localStorage.getItem('jwtToken');
    return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
    const { theme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        setIsAuthenticated(!!localStorage.getItem('jwtToken'));
    }, [location]);

    const handleLogout = () => {
        localStorage.removeItem('jwtToken');
        setIsAuthenticated(false);
        navigate('/login');
        setMobileMenuOpen(false);
    };

    const showLogoutAndProfile = isAuthenticated &&
        (location.pathname === '/journal' || location.pathname === '/profile' || location.pathname === '/achievements'
            || location.pathname === '/features');

    // Build navigation links dynamically based on authentication
    const navLinks = [
        { to: '/', label: 'Home', icon: Home, color: 'bg-gray-500/80 hover:bg-gray-600/80' },
        { to: '/features', label: 'Features', icon: Sparkles, color: 'bg-[#7B9EC2] hover:bg-[#6A8DB0]' },
    ];

    if (isAuthenticated) {
        navLinks.push({ to: '/achievements', label: 'Achievements', icon: Award, color: 'bg-[#B399D4] hover:bg-[#9B7BBF]' });
        navLinks.push({ to: '/profile', label: 'Profile', icon: User, color: 'bg-[#5CC8C2] hover:bg-[#4bb3ac]' });
    }

    const closeMobileMenu = () => setMobileMenuOpen(false);

    return (
        <div className="min-h-screen flex flex-col items-center p-2 sm:p-4
                         bg-gradient-to-br from-[#F8F9FA] to-[#E0E0E0]
                         dark:from-[#1E1A3E] dark:to-[#3A355C]
                         text-gray-800 dark:text-gray-200">

            {/* ========== DESKTOP HEADER (hidden on mobile) ========== */}
            <header className="hidden sm:flex w-full max-w-4xl flex-wrap justify-between items-center py-3 px-6 mb-8 rounded-xl
                               bg-white/50 dark:bg-black/20 backdrop-blur-md shadow-lg border border-white/30 dark:border-white/10
                               transition-all duration-500 gap-3">
                <AppLogo />
                <div className="flex flex-wrap justify-end items-center gap-2">
                    <Link to="/features" className="py-2 px-4 rounded-full font-poppins font-semibold text-white text-sm whitespace-nowrap
                                                    bg-[#7B9EC2] hover:bg-[#6A8DB0] active:bg-[#5A7A9E]
                                                    shadow-md hover:shadow-lg transition-all duration-300">
                        Features
                    </Link>
                    {isAuthenticated && (
                        <Link to="/achievements" className="py-2 px-4 rounded-full font-poppins font-semibold text-white text-sm whitespace-nowrap
                                                            bg-[#B399D4] hover:bg-[#9B7BBF] active:bg-[#806AA0]
                                                            shadow-md hover:shadow-lg transition-all duration-300">
                            Achievements
                        </Link>
                    )}
                    {isAuthenticated && (
                        <Link to="/profile" className="py-2 px-4 rounded-full font-poppins font-semibold text-white text-sm whitespace-nowrap
                                                       bg-[#5CC8C2] hover:bg-[#4bb3ac] active:bg-[#3da19a]
                                                       shadow-md hover:shadow-lg transition-all duration-300">
                            Profile
                        </Link>
                    )}
                    {isAuthenticated && <HeaderApiKeyStatus />}
                    {showLogoutAndProfile && (
                        <button onClick={handleLogout} className="py-2 px-4 rounded-full font-poppins font-semibold text-white text-sm whitespace-nowrap
                                                                  bg-[#FF8A7A] hover:bg-[#FF6C5A] active:bg-[#D45E4D]
                                                                  shadow-md hover:shadow-lg transition-all duration-300">
                            Logout
                        </button>
                    )}
                    <div className="pl-2 border-l border-white/20 dark:border-white/10">
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            {/* ========== MOBILE HEADER (visible only on small screens) ========== */}
            <div className="sm:hidden w-full max-w-4xl flex justify-between items-center py-3 px-4 mb-4 rounded-xl
                            bg-white/50 dark:bg-black/20 backdrop-blur-md shadow-lg border border-white/30 dark:border-white/10">
                <AppLogo />
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
                        aria-label="Menu"
                    >
                        <Menu size={22} className="text-gray-800 dark:text-gray-200" />
                    </button>
                </div>
            </div>

            {/* ========== MOBILE SIDEBAR (drawer) ========== */}
            {mobileMenuOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 sm:hidden"
                        onClick={closeMobileMenu}
                    />
                    {/* Drawer */}
                    <div className="fixed top-0 right-0 h-full w-72 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl z-50 sm:hidden flex flex-col p-5 transition-transform duration-300 transform translate-x-0">
                        {/* Header of drawer */}
                        <div className="flex justify-between items-center mb-8 pb-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-lg font-poppins font-semibold bg-gradient-to-r from-purple-500 to-teal-500 bg-clip-text text-transparent">
                                Menu
                            </span>
                            <button
                                onClick={closeMobileMenu}
                                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        {/* Navigation Links with Icons (dynamically built) */}
                        <div className="flex flex-col gap-3 flex-1">
                            {navLinks.map((link) => {
                                const Icon = link.icon;
                                return (
                                    <Link
                                        key={link.to}
                                        to={link.to}
                                        onClick={closeMobileMenu}
                                        className={`flex items-center gap-3 py-3 px-4 rounded-xl font-poppins font-semibold text-white transition-all duration-300
                                                   ${link.color} active:scale-95 shadow-md`}
                                    >
                                        <Icon size={20} />
                                        {link.label}
                                    </Link>
                                );
                            })}

                            {isAuthenticated && (
                                <HeaderApiKeyStatus compact={false} />
                            )}

                            {showLogoutAndProfile && (
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-3 py-3 px-4 rounded-xl font-poppins font-semibold text-white
                                               bg-[#FF8A7A] hover:bg-[#FF6C5A] active:scale-95 transition-all duration-300 shadow-md"
                                >
                                    <LogOut size={20} />
                                    Logout
                                </button>
                            )}
                        </div>

                        {/* Optional footer in drawer */}
                        <div className="mt-6 pt-4 text-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
                            MyMindMirror © {new Date().getFullYear()}
                        </div>
                    </div>
                </>
            )}

            <main className="w-full max-w-4xl flex-grow flex items-center justify-center p-0 sm:p-0">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/features" element={<FeaturesGuide />} />
                    <Route path="/achievements" element={<PrivateRoute><AchievementsPage /></PrivateRoute>} />
                    <Route path="/journal" element={<PrivateRoute><JournalPage /></PrivateRoute>} />
                    <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
                </Routes>
            </main>

            <footer className="w-full max-w-4xl text-center mt-6 sm:mt-8 text-xs sm:text-sm text-gray-600 dark:text-gray-400 p-2 sm:p-0">
                &copy; {new Date().getFullYear()} MyMindMirror. All rights reserved.
            </footer>
        </div>
    );
}

export default App;