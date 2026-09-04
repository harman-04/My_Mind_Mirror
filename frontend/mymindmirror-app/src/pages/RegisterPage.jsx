// src/pages/RegisterPage.jsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useRegister } from '../hooks/useAuth';
import {
  Sparkles, Mail, Lock, User, ArrowRight, CheckCircle, AlertCircle,
  Eye, EyeOff, Shield, Key
} from 'lucide-react';

function RegisterPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const registerMutation = useRegister();

  // Password strength calculation
  const getPasswordStrength = (pwd) => {
    let score = 0;
    if (!pwd) return { score: 0, label: '', color: '' };
    if (pwd.length >= 8) score++;
    if (pwd.match(/[a-z]/) && pwd.match(/[A-Z]/)) score++;
    if (pwd.match(/\d/)) score++;
    if (pwd.match(/[^a-zA-Z\d]/)) score++;
    const strengths = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = [
      '', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'
    ];
    return {
      score,
      label: strengths[score] || '',
      color: colors[score] || 'bg-gray-500'
    };
  };
  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      const data = await registerMutation.mutateAsync({ username, email, password });

      setMessage(data.message || 'Registration successful! You can now login.');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error('Registration error:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Registration failed. Please try again.');
      }
    }
  };

  // Premium Deep Indigo Glassmorphism Palette
  const colors = {
    background: 'bg-gray-50 dark:bg-transparent',
    cardBg: isDarkMode ? 'bg-[#1A162F]/60 backdrop-blur-xl' : 'bg-white/70 backdrop-blur-xl',
    cardBorder: isDarkMode ? 'border-white/10' : 'border-gray-200/50',
    textPrimary: isDarkMode ? 'text-gray-100' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-gray-400' : 'text-gray-500',
    inputBg: isDarkMode ? 'bg-[#131127]/80 text-gray-100' : 'bg-white text-gray-900',
    inputBorder: isDarkMode ? 'border-white/10' : 'border-gray-300',
    inputFocusRing: 'focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:focus:ring-teal-400 dark:focus:border-teal-400',
    buttonGradient: 'bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 text-white transition-all duration-300',
  };

  return (
    <div className={`min-h-[90vh] w-full ${colors.background} ${colors.textPrimary} transition-colors duration-300 relative flex items-center justify-center p-4 sm:p-6`}>

      {/* Animated Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-teal-500/5" />
        <div className="absolute top-[10%] left-[15%] w-[30vw] h-[30vw] bg-purple-500/10 rounded-full blur-[100px] animate-pulse-slow" />
        <div className="absolute bottom-[10%] right-[15%] w-[30vw] h-[30vw] bg-teal-500/10 rounded-full blur-[100px] animate-pulse-slow delay-1000" />
      </div>

      {/* Floating Decorative Icons */}
      <div className="absolute top-32 left-10 opacity-20 animate-float hidden lg:block pointer-events-none z-0">
        <Sparkles className="w-12 h-12 text-purple-400" />
      </div>
      <div className="absolute bottom-32 right-10 opacity-20 animate-float-delayed hidden lg:block pointer-events-none z-0">
        <User className="w-12 h-12 text-teal-400" />
      </div>
      <div className="absolute top-1/2 left-[15%] opacity-20 animate-float-slow hidden lg:block pointer-events-none z-0">
        <Shield className="w-10 h-10 text-indigo-400" />
      </div>

      {/* Registration Card */}
      <div className={`w-full max-w-md rounded-3xl ${colors.cardBg} border ${colors.cardBorder} shadow-2xl p-8 lg:p-10 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500`}>

        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-teal-500/20 dark:from-purple-900/30 dark:to-teal-900/30 mb-5 shadow-inner border border-purple-200/50 dark:border-teal-700/30">
            <Sparkles className="w-8 h-8 text-purple-600 dark:text-teal-400" />
          </div>
          <h2 className="text-3xl font-poppins font-extrabold bg-gradient-to-r from-purple-600 to-teal-500 dark:from-purple-400 dark:to-teal-400 bg-clip-text text-transparent tracking-tight">
            Create Account
          </h2>
          <p className={`text-sm lg:text-base font-medium ${colors.textSecondary} mt-2`}>
            Start your journey with MyMindMirror.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 lg:space-y-6">

          {/* Success/Error Messages */}
          {message && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium animate-in fade-in">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span>{message}</span>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-500/30 text-red-700 dark:text-red-400 text-sm font-medium animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Username Input */}
          <div>
            <label className={`block text-xs lg:text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${colors.textSecondary}`}>
              <User className="w-3.5 h-3.5" /> Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full p-3.5 lg:p-4 rounded-xl border ${colors.inputBorder} ${colors.inputBg} outline-none transition-all text-sm lg:text-base placeholder-gray-400 dark:placeholder-gray-600 ${colors.inputFocusRing}`}
              placeholder="johndoe"
              required
              disabled={registerMutation.isPending}
            />
          </div>

          {/* Email Input */}
          <div>
            <label className={`block text-xs lg:text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${colors.textSecondary}`}>
              <Mail className="w-3.5 h-3.5" /> Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full p-3.5 lg:p-4 rounded-xl border ${colors.inputBorder} ${colors.inputBg} outline-none transition-all text-sm lg:text-base placeholder-gray-400 dark:placeholder-gray-600 ${colors.inputFocusRing}`}
              placeholder="you@example.com"
              required
              disabled={registerMutation.isPending}
            />
          </div>

          {/* Password Input */}
          <div>
            <label className={`block text-xs lg:text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${colors.textSecondary}`}>
              <Lock className="w-3.5 h-3.5" /> Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full p-3.5 lg:p-4 rounded-xl border ${colors.inputBorder} ${colors.inputBg} outline-none transition-all text-sm lg:text-base placeholder-gray-400 dark:placeholder-gray-600 pr-12 ${colors.inputFocusRing}`}
                placeholder="••••••••"
                required
                disabled={registerMutation.isPending}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-500 hover:text-purple-600 dark:hover:text-teal-400 hover:bg-black/5 dark:hover:bg-white/5 transition-all outline-none"
                tabIndex="-1"
                disabled={registerMutation.isPending}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {/* Password strength indicator */}
            {password && (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-3 text-xs lg:text-sm font-medium">
                  <span className="text-gray-500 dark:text-gray-400">Strength:</span>
                  <div className="flex-1 h-1.5 bg-gray-200 dark:bg-[#131127] rounded-full overflow-hidden border border-transparent dark:border-white/5">
                    <div className={`h-full ${strength.color} transition-all duration-300 shadow-sm`} style={{ width: `${(strength.score / 4) * 100}%` }} />
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider ${
                    strength.score === 1 ? 'text-red-500' :
                    strength.score === 2 ? 'text-amber-500' :
                    strength.score === 3 ? 'text-blue-500' :
                    strength.score === 4 ? 'text-emerald-500' : 'text-gray-500'
                  }`}>
                    {strength.label}
                  </span>
                </div>
                {strength.score < 3 && (
                    <p className="text-[10px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 leading-tight">
                    Use 8+ chars, upper/lowercase, numbers, and symbols.
                    </p>
                )}
              </div>
            )}
          </div>

          {/* Confirm Password Input */}
          <div>
            <label className={`block text-xs lg:text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${colors.textSecondary}`}>
              <Key className="w-3.5 h-3.5" /> Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full p-3.5 lg:p-4 rounded-xl border ${colors.inputBorder} ${colors.inputBg} outline-none transition-all text-sm lg:text-base placeholder-gray-400 dark:placeholder-gray-600 pr-12 ${colors.inputFocusRing}`}
                placeholder="••••••••"
                required
                disabled={registerMutation.isPending}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-500 hover:text-purple-600 dark:hover:text-teal-400 hover:bg-black/5 dark:hover:bg-white/5 transition-all outline-none"
                tabIndex="-1"
                disabled={registerMutation.isPending}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs font-bold text-red-500 mt-2 animate-in fade-in">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={registerMutation.isPending}
            className={`w-full mt-4 py-4 rounded-xl lg:rounded-2xl font-bold text-base lg:text-lg flex items-center justify-center gap-2 ${colors.buttonGradient} group`}
          >
            {registerMutation.isPending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Create Account <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200/50 dark:border-white/5 text-center">
            <p className={`text-sm font-medium ${colors.textSecondary}`}>
            Already have an account?{' '}
            <Link to="/login" className="text-purple-600 dark:text-teal-400 hover:text-purple-700 dark:hover:text-teal-300 font-bold transition-colors">
                Login here
            </Link>
            </p>
        </div>
      </div>

      {/* Global animations */}
      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.05); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
        .animate-float { animation: float 5s ease-in-out infinite; }
        .animate-float-delayed { animation: float 5s ease-in-out infinite 2.5s; }
        .animate-float-slow { animation: float 6s ease-in-out infinite 1.5s; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInFromBottom { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        .animate-in { animation-duration: 0.5s; animation-fill-mode: both; }
        .fade-in { animation-name: fadeIn; }
        .slide-in-from-bottom-4 { animation-name: slideInFromBottom; }
        .delay-1000 { animation-delay: 1s; }
      `}</style>
    </div>
  );
}

export default RegisterPage;