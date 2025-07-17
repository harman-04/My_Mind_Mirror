// src/App.jsx

import React from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import ThemeToggle from './components/ThemeToggle';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import JournalPage from './pages/JournalPage';
import HomePage from './pages/HomePage';
import FeaturesPage from './pages/FeaturesPage';
import ProfilePage from './pages/ProfilePage'; // ⭐ NEW: Import ProfilePage ⭐
import AppLogo from './components/AppLogo';
import { useTheme } from './contexts/ThemeContext';
import { Link } from 'react-router-dom';

// A simple component for a protected route
const PrivateRoute = ({ children }) => {
    const isAuthenticated = localStorage.getItem('jwtToken');
    return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
    const { theme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('jwtToken');
        navigate('/login');
    };

    // Show logout button only on the /journal page AND if authenticated
    // Also add a Profile link if authenticated
    const isAuthenticated = localStorage.getItem('jwtToken');
    const showLogoutAndProfile = isAuthenticated && (location.pathname === '/journal' || location.pathname === '/profile');


    return (
        <div className="min-h-screen flex flex-col items-center p-2 sm:p-4
                         bg-gradient-to-br from-[#F8F9FA] to-[#E0E0E0]
                         dark:from-[#1E1A3E] dark:to-[#3A355C]
                         text-gray-800 dark:text-gray-200">

            <header className="w-full max-w-4xl flex flex-col sm:flex-row justify-between items-center py-3 px-4 sm:px-6 mb-4 sm:mb-8 rounded-xl
                               bg-white/50 dark:bg-black/20 backdrop-blur-md shadow-lg border border-white/30 dark:border-white/10
                               transition-all duration-500">

                <AppLogo />

                {/* Right Controls */}
                <div className="flex items-center space-x-3 sm:space-x-4">
                    {isAuthenticated && ( // Only show profile link if authenticated
                        <Link
                            to="/profile"
                            className="py-1.5 px-3 sm:py-2 sm:px-4 rounded-full font-poppins font-semibold text-white text-sm sm:text-base
                                       bg-[#B399D4] hover:bg-[#9B7BBF] active:bg-[#806AA0]
                                       shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#B399D4] focus:ring-opacity-75
                                       transition-all duration-300"
                            aria-label="View Profile"
                        >
                            Profile
                        </Link>
                    )}
                    {showLogoutAndProfile && ( // Show logout if authenticated and on journal/profile page
                        <button
                            onClick={handleLogout}
                            className="py-1.5 px-3 sm:py-2 sm:px-4 rounded-full font-poppins font-semibold text-white text-sm sm:text-base
                                       bg-[#FF8A7A] hover:bg-[#FF6C5A] active:bg-[#D45E4D]
                                       shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#FF8A7A] focus:ring-opacity-75
                                       transition-all duration-300"
                            aria-label="Logout"
                        >
                            Logout
                        </button>
                    )}
                    <ThemeToggle />
                </div>
            </header>

            <main className="w-full max-w-4xl flex-grow flex items-center justify-center p-0 sm:p-0">
                <Routes>
                    <Route path="/" element={<HomePage />} /> 
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route
                        path="/journal"
                        element={
                            <PrivateRoute>
                                <JournalPage />
                            </PrivateRoute>
                        }
                    />
                    <Route path="/features" element={<FeaturesPage/>}/>
                    {/* ⭐ NEW: Profile Page Route ⭐ */}
                    <Route
                        path="/profile"
                        element={
                            <PrivateRoute>
                                <ProfilePage />
                            </PrivateRoute>
                        }
                    />
                </Routes>
            </main>

            <footer className="w-full max-w-4xl text-center mt-6 sm:mt-8 text-xs sm:text-sm text-gray-600 dark:text-gray-400 p-2 sm:p-0">
                &copy; {new Date().getFullYear()} MyMindMirror. All rights reserved.
            </footer>
        </div>
    );
}

export default App;
