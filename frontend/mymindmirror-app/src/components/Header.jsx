import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import AppLogo from './AppLogo';
import ThemeToggle from './ThemeToggle';
import HeaderApiKeyStatus from './HeaderApiKeyStatus';

function Header({ isAuthenticated, showLogoutAndProfile, handleLogout }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navigate = useNavigate();

    const closeMenu = () => setMobileMenuOpen(false);

    const handleLogoutClick = () => {
        closeMenu();
        handleLogout();
    };

    const navLinks = [
        { to: '/features', label: 'Features', color: 'bg-[#7B9EC2] hover:bg-[#6A8DB0]' },
        { to: '/achievements', label: 'Achievements', color: 'bg-[#B399D4] hover:bg-[#9B7BBF]' },
    ];

    const authLinks = isAuthenticated ? [
        { to: '/profile', label: 'Profile', color: 'bg-[#5CC8C2] hover:bg-[#4bb3ac]' },
    ] : [];

    const allLinks = [...navLinks, ...authLinks];

    return (
        <>
            {/* Header Bar */}
            <header className="w-full max-w-4xl flex justify-between items-center py-3 px-4 sm:px-6 mb-4 sm:mb-8 rounded-xl
                               bg-white/50 dark:bg-black/20 backdrop-blur-md shadow-lg border border-white/30 dark:border-white/10
                               transition-all duration-500 gap-4">

                <AppLogo />

                {/* Desktop Navigation */}
                <div className="hidden sm:flex items-center gap-3">
                    {allLinks.map((link) => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className={`py-2 px-4 rounded-full font-poppins font-semibold text-white text-sm whitespace-nowrap
                                       ${link.color} active:opacity-90 shadow-md hover:shadow-lg transition-all duration-300`}
                        >
                            {link.label}
                        </Link>
                    ))}

                    {/* API Key Status – no extra styling wrapper */}
                    {isAuthenticated && <HeaderApiKeyStatus />}

                    {showLogoutAndProfile && (
                        <button
                            onClick={handleLogout}
                            className="py-2 px-4 rounded-full font-poppins font-semibold text-white text-sm whitespace-nowrap
                                       bg-[#FF8A7A] hover:bg-[#FF6C5A] active:bg-[#D45E4D]
                                       shadow-md hover:shadow-lg transition-all duration-300"
                        >
                            Logout
                        </button>
                    )}

                    <div className="pl-2 border-l border-white/20 dark:border-white/10">
                        <ThemeToggle />
                    </div>
                </div>

                {/* Mobile Controls */}
                <div className="flex sm:hidden items-center gap-2">
                    <ThemeToggle />
                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
                        aria-label="Menu"
                    >
                        <Menu size={22} className="text-gray-800 dark:text-gray-200" />
                    </button>
                </div>
            </header>

            {/* Mobile Sidebar */}
            {mobileMenuOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 sm:hidden"
                        onClick={closeMenu}
                    />
                    <div className="fixed top-0 right-0 h-full w-64 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-2xl z-50 sm:hidden flex flex-col p-5 transition-transform duration-300 transform translate-x-0">
                        <div className="flex justify-end mb-6">
                            <button
                                onClick={closeMenu}
                                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-3">
                            {allLinks.map((link) => (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    onClick={closeMenu}
                                    className={`py-2.5 px-4 rounded-xl font-poppins font-semibold text-white text-center
                                               ${link.color} active:opacity-90 transition-all duration-300`}
                                >
                                    {link.label}
                                </Link>
                            ))}

                            {isAuthenticated && (
                                <div className="flex justify-center">
                                    <HeaderApiKeyStatus />
                                </div>
                            )}

                            {showLogoutAndProfile && (
                                <button
                                    onClick={handleLogoutClick}
                                    className="py-2.5 px-4 rounded-xl font-poppins font-semibold text-white text-center
                                               bg-[#FF8A7A] hover:bg-[#FF6C5A] active:bg-[#D45E4D]
                                               transition-all duration-300"
                                >
                                    Logout
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </>
    );
}

export default Header;