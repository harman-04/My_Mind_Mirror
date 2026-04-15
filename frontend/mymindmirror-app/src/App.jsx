// src/App.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { Menu, X, Home, Sparkles, Award, User, LogOut, LogIn, UserPlus } from 'lucide-react';
import ThemeToggle from './components/ThemeToggle';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import JournalPage from './pages/JournalPage';
import HomePage from './pages/HomePage';
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
            || location.pathname === '/features' || location.pathname === '/');

    // Build navigation links dynamically for mobile drawer
    const navLinks = [
        { to: '/', label: 'Home', icon: Home, color: 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700' },
        { to: '/features', label: 'Features', icon: Sparkles, color: 'bg-gradient-to-r from-[#7B9EC2] to-[#6A8DB0] hover:from-[#6A8DB0] hover:to-[#5A7A9E]' },
    ];

    if (!isAuthenticated) {
        navLinks.push(
            { to: '/login', label: 'Login', icon: LogIn, color: 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700' },
            { to: '/register', label: 'Register', icon: UserPlus, color: 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700' }
        );
    }

    if (isAuthenticated) {
        navLinks.push(
            { to: '/achievements', label: 'Achievements', icon: Award, color: 'bg-gradient-to-r from-[#B399D4] to-[#9B7BBF] hover:from-[#9B7BBF] hover:to-[#806AA0]' },
            { to: '/profile', label: 'Profile', icon: User, color: 'bg-gradient-to-r from-[#5CC8C2] to-[#4bb3ac] hover:from-[#4bb3ac] hover:to-[#3da19a]' }
        );
    }

    const closeMobileMenu = () => setMobileMenuOpen(false);

    // Theme‑based background styles
    const isDarkMode = theme === 'dark';
    const bgGradient = isDarkMode
        ? 'from-[#1E1A3E] to-[#3A355C]'
        : 'from-[#F8F9FA] to-[#E0E0E0]';

    return (
        <div className={`min-h-screen flex flex-col items-center p-2 sm:p-4 bg-gradient-to-br ${bgGradient} text-gray-800 dark:text-gray-200 relative transition-colors duration-500`}>
            {/* Animated Background Blobs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-teal-500/5" />
                <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" />
                <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse-slow delay-1000" />
            </div>

            {/* ========== DESKTOP HEADER ========== */}
            <header className="hidden sm:flex w-full max-w-4xl flex-wrap justify-between items-center py-3 px-6 mb-8 rounded-2xl
                               bg-white/50 dark:bg-black/20 backdrop-blur-md shadow-lg border border-white/30 dark:border-white/10
                               transition-all duration-500 gap-3 relative z-10">
                <AppLogo />
                <div className="flex flex-wrap justify-end items-center gap-2">
                    <Link to="/features" className="py-2 px-4 rounded-full font-poppins font-semibold text-white text-sm whitespace-nowrap
                                                    bg-gradient-to-r from-[#7B9EC2] to-[#6A8DB0] hover:from-[#6A8DB0] hover:to-[#5A7A9E]
                                                    shadow-md hover:shadow-lg transition-all duration-300">
                        Features
                    </Link>

                    {!isAuthenticated && (
                        <>
                            <Link to="/login" className="py-2 px-4 rounded-full font-poppins font-semibold text-white text-sm whitespace-nowrap
                                                          bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700
                                                          shadow-md hover:shadow-lg transition-all duration-300">
                                Login
                            </Link>
                            <Link to="/register" className="py-2 px-4 rounded-full font-poppins font-semibold text-white text-sm whitespace-nowrap
                                                            bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700
                                                            shadow-md hover:shadow-lg transition-all duration-300">
                                Register
                            </Link>
                        </>
                    )}

                    {isAuthenticated && (
                        <>
                            <Link to="/achievements" className="py-2 px-4 rounded-full font-poppins font-semibold text-white text-sm whitespace-nowrap
                                                                bg-gradient-to-r from-[#B399D4] to-[#9B7BBF] hover:from-[#9B7BBF] hover:to-[#806AA0]
                                                                shadow-md hover:shadow-lg transition-all duration-300">
                                Achievements
                            </Link>
                            <Link to="/profile" className="py-2 px-4 rounded-full font-poppins font-semibold text-white text-sm whitespace-nowrap
                                                           bg-gradient-to-r from-[#5CC8C2] to-[#4bb3ac] hover:from-[#4bb3ac] hover:to-[#3da19a]
                                                           shadow-md hover:shadow-lg transition-all duration-300">
                                Profile
                            </Link>
                            <HeaderApiKeyStatus />
                            {showLogoutAndProfile && (
                                <button onClick={handleLogout} className="py-2 px-4 rounded-full font-poppins font-semibold text-white text-sm whitespace-nowrap
                                                                          bg-gradient-to-r from-[#FF8A7A] to-[#FF6C5A] hover:from-[#FF6C5A] hover:to-[#D45E4D]
                                                                          shadow-md hover:shadow-lg transition-all duration-300">
                                    Logout
                                </button>
                            )}
                        </>
                    )}

                    <div className="pl-2 border-l border-white/20 dark:border-white/10">
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            {/* ========== MOBILE HEADER ========== */}
            <div className="sm:hidden w-full max-w-4xl flex justify-between items-center py-3 px-4 mb-4 rounded-2xl
                            bg-white/50 dark:bg-black/20 backdrop-blur-md shadow-lg border border-white/30 dark:border-white/10
                            relative z-10">
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
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 sm:hidden transition-opacity duration-300"
                        onClick={closeMobileMenu}
                    />
                    <div className="fixed top-0 right-0 h-full w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl z-50 sm:hidden flex flex-col p-5 transition-transform duration-300 transform translate-x-0">
                        <div className="flex justify-between items-center mb-8 pb-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-lg font-poppins font-bold bg-gradient-to-r from-purple-500 to-teal-500 bg-clip-text text-transparent">
                                MyMindMirror
                            </span>
                            <button
                                onClick={closeMobileMenu}
                                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition"
                            >
                                <X size={22} />
                            </button>
                        </div>

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
                                <div className="mt-2">
                                    <HeaderApiKeyStatus compact={false} />
                                </div>
                            )}

                            {showLogoutAndProfile && (
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-3 py-3 px-4 rounded-xl font-poppins font-semibold text-white
                                               bg-gradient-to-r from-[#FF8A7A] to-[#FF6C5A] hover:from-[#FF6C5A] hover:to-[#D45E4D] active:scale-95 transition-all duration-300 shadow-md"
                                >
                                    <LogOut size={20} />
                                    Logout
                                </button>
                            )}
                        </div>

                        <div className="mt-6 pt-4 text-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
                            MyMindMirror © {new Date().getFullYear()}
                        </div>
                    </div>
                </>
            )}

            <main className="w-full max-w-4xl flex-grow flex items-center justify-center p-0 sm:p-0 relative z-10">
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

            <footer className="w-full max-w-4xl text-center mt-6 sm:mt-8 text-xs sm:text-sm text-gray-600 dark:text-gray-400 p-2 sm:p-0 relative z-10">
                &copy; {new Date().getFullYear()} MyMindMirror. All rights reserved.
            </footer>

            {/* Global animations */}
            <style>{`
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.2; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(1.05); }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 6s ease-in-out infinite;
                }
                .delay-1000 {
                    animation-delay: 1s;
                }
            `}</style>
        </div>
    );
}

export default App;