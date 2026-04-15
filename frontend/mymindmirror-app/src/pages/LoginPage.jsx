// src/pages/LoginPage.jsx

import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Lock, User, ArrowRight, AlertCircle, Eye, EyeOff, LogIn } from 'lucide-react';

function LoginPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:8080/api/auth/login', {
        username,
        password,
      });
      console.log('Login successful:', response.data);
      localStorage.setItem('jwtToken', response.data.token);
      navigate('/journal');
    } catch (err) {
      console.error('Login error:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Login failed. Please check your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Theme-aware colors
  const colors = {
    background: isDarkMode ? 'bg-gray-900' : 'bg-gray-50',
    cardBg: isDarkMode ? 'bg-gray-800/60 backdrop-blur-md' : 'bg-white/80 backdrop-blur-md',
    cardBorder: isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50',
    textPrimary: isDarkMode ? 'text-gray-100' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-gray-300' : 'text-gray-600',
    inputBg: isDarkMode ? 'bg-gray-800/80' : 'bg-white/90',
    inputBorder: isDarkMode ? 'border-gray-600' : 'border-gray-300',
    inputFocusRing: 'focus:ring-purple-500',
    buttonGradient: 'bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600',
  };

  return (
    <div className={`min-h-screen w-full ${colors.background} ${colors.textPrimary} transition-colors duration-300 relative flex items-center justify-center p-4`}>
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-teal-500/5" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse-slow delay-1000" />
      </div>

      {/* Floating Icons */}
      <div className="absolute top-32 left-5 opacity-30 animate-float hidden lg:block">
        <LogIn size={32} className="text-purple-400" />
      </div>
      <div className="absolute bottom-32 right-10 opacity-30 animate-float-delayed hidden lg:block">
        <User size={32} className="text-teal-400" />
      </div>
      <div className="absolute top-1/2 right-1/3 opacity-20 animate-float-slow hidden lg:block">
        <Lock size={28} className="text-indigo-400" />
      </div>

      {/* Login Card */}
      <div className={`w-full max-w-md rounded-2xl ${colors.cardBg} border ${colors.cardBorder} shadow-2xl backdrop-blur-sm transition-all duration-500 hover:shadow-xl p-8 relative z-10`}>
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-teal-500/20 mb-4">
            <LogIn className="w-8 h-8 text-purple-400" />
          </div>
          <h2 className="text-3xl font-poppins font-bold bg-gradient-to-r from-purple-400 to-teal-400 bg-clip-text text-transparent">
            Welcome Back
          </h2>
          <p className={`text-sm ${colors.textSecondary} mt-2`}>
            Sign in to continue your journey
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-100/20 dark:bg-red-900/30 border border-red-500/30 text-red-700 dark:text-red-300 text-sm animate-in fade-in">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Username */}
          <div>
            <label className="block text-sm font-medium mb-1.5 flex items-center gap-1">
              <User size={14} /> Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full p-3 rounded-xl border ${colors.inputBorder} ${colors.inputBg} focus:outline-none focus:ring-2 ${colors.inputFocusRing} transition`}
              placeholder="johndoe"
              required
            />
          </div>

          {/* Password with visibility toggle */}
          <div>
            <label className="block text-sm font-medium mb-1.5 flex items-center gap-1">
              <Lock size={14} /> Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full p-3 rounded-xl border ${colors.inputBorder} ${colors.inputBg} focus:outline-none focus:ring-2 ${colors.inputFocusRing} transition pr-10`}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl ${colors.buttonGradient} text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Login <ArrowRight size={16} className="group-hover:translate-x-1 transition" />
              </>
            )}
          </button>
        </form>

        <p className={`text-center text-sm ${colors.textSecondary} mt-6`}>
          Don't have an account?{' '}
          <Link to="/register" className="text-purple-500 dark:text-purple-400 hover:text-teal-500 dark:hover:text-teal-400 font-semibold transition">
            Register here
          </Link>
        </p>
      </div>

      {/* Global animations */}
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
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
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
        .animate-float-slow {
          animation: float 6s ease-in-out infinite 1s;
        }
        .animate-in {
          animation: fadeIn 0.3s ease-out;
        }
        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}

export default LoginPage;