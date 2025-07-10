// src/App.jsx

import React from 'react';
// Make sure BrowserRouter as Router is NOT imported here
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import ThemeToggle from './components/ThemeToggle';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import JournalPage from './pages/JournalPage';
import { useTheme } from './contexts/ThemeContext';

// A simple component for a protected route
const PrivateRoute = ({ children }) => {
    const isAuthenticated = localStorage.getItem('jwtToken');
    return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
    const { theme } = useTheme();
    // These hooks will now work because App is rendered inside <Router> in main.jsx
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('jwtToken');
        navigate('/login');
    };

    const showLogoutButton = location.pathname === '/journal';

    return (
        <div className="min-h-screen flex flex-col items-center p-2 sm:p-4
                         bg-gradient-to-br from-[#F8F9FA] to-[#E0E0E0]
                         dark:from-[#1E1A3E] dark:to-[#3A355C]
                         text-gray-800 dark:text-gray-200">

            <header className="w-full max-w-4xl flex flex-col sm:flex-row justify-between items-center py-3 px-4 sm:px-6 mb-4 sm:mb-8 rounded-xl
                               bg-white/50 dark:bg-black/20 backdrop-blur-md shadow-lg border border-white/30 dark:border-white/10
                               transition-all duration-500">
                <h1 className="text-2xl sm:text-3xl font-poppins font-bold text-[#B399D4] dark:text-[#5CC8C2] mb-2 sm:mb-0">
                    MyMindMirror
                </h1>
                <div className="flex items-center space-x-3 sm:space-x-4">
                    {showLogoutButton && (
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
                    <Route path="/" element={<Navigate to="/login" />} />
                </Routes>
            </main>
        </div>
    );
}

export default App;