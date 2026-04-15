// src/pages/HomePage.jsx

import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import {
  Sparkles, Brain, Target, Shield, Feather, ArrowRight, ChevronRight,
  Layers, PieChart, Notebook, Hash, Clock, Zap, BookOpen, Gauge,
  TrendingUp, Folders, HeartPulse, BarChart, Lightbulb, Trophy, Flame,
  Cloud, LineChart, ListChecks, MapPin, Award, Calendar, CheckCircle
} from 'lucide-react';

function HomePage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [animatedStats, setAnimatedStats] = useState(false);
  const statsRef = useRef(null);

  // Check if user is authenticated
  const isAuthenticated = !!localStorage.getItem('jwtToken');

  // Intersection Observer for stats animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimatedStats(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const colors = {
    primary: isDarkMode ? 'text-purple-300' : 'text-purple-600',
    secondary: isDarkMode ? 'text-teal-300' : 'text-teal-600',
    accent: isDarkMode ? 'text-rose-400' : 'text-rose-500',
    background: isDarkMode ? 'bg-gray-900' : 'bg-gray-50',
    cardBg: isDarkMode ? 'bg-gray-800/60 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm',
    cardBorder: isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50',
    textPrimary: isDarkMode ? 'text-gray-100' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-gray-300' : 'text-gray-600',
    buttonPrimary: isDarkMode
      ? 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600'
      : 'bg-gradient-to-r from-purple-500 to-purple-400 hover:from-purple-600 hover:to-purple-500',
    buttonSecondary: isDarkMode
      ? 'bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600'
      : 'bg-gradient-to-r from-teal-500 to-teal-400 hover:from-teal-600 hover:to-teal-500',
  };

  const features = [
    {
      title: "AI-Powered Journal Analysis",
      description: "Get emotion scores, key phrases, summaries, and growth tips from every entry.",
      icon: <Brain size={28} />,
      gradient: "from-purple-500/20 to-pink-500/20",
      iconBg: "bg-purple-500/20",
      iconColor: "text-purple-400",
    },
    {
      title: "Smart Roadmap Generator",
      description: "Turn any goal into a step-by-step plan with AI-generated tasks, resources, and milestones.",
      icon: <MapPin size={28} />,
      gradient: "from-teal-500/20 to-cyan-500/20",
      iconBg: "bg-teal-500/20",
      iconColor: "text-teal-400",
    },
    {
      title: "Gamified Progress",
      description: "Earn badges, maintain streaks, and watch your growth with visual achievements.",
      icon: <Trophy size={28} />,
      gradient: "from-amber-500/20 to-orange-500/20",
      iconBg: "bg-amber-500/20",
      iconColor: "text-amber-400",
    },
    {
      title: "Visual Insights",
      description: "Mood trends, emotion breakdowns, word clouds, and correlation charts.",
      icon: <LineChart size={28} />,
      gradient: "from-blue-500/20 to-indigo-500/20",
      iconBg: "bg-blue-500/20",
      iconColor: "text-blue-400",
    },
    {
      title: "Semantic Clustering",
      description: "Discover hidden themes in your journal entries with AI clustering.",
      icon: <Folders size={28} />,
      gradient: "from-rose-500/20 to-red-500/20",
      iconBg: "bg-rose-500/20",
      iconColor: "text-rose-400",
    },
    {
      title: "End-to-End Encryption",
      description: "Your private thoughts stay private with military-grade encryption.",
      icon: <Shield size={28} />,
      gradient: "from-green-500/20 to-emerald-500/20",
      iconBg: "bg-green-500/20",
      iconColor: "text-green-400",
    },
  ];

  const stats = [
    { value: "100%", label: "Privacy First", icon: <Shield size={20} />, suffix: "" },
    { value: "24/7", label: "AI Availability", icon: <Brain size={20} />, suffix: "" },
    { value: "Unlimited", label: "Journal Entries", icon: <BookOpen size={20} />, suffix: "" },
    { value: "Real-time", label: "Insights", icon: <TrendingUp size={20} />, suffix: "" },
  ];

  return (
    <div className={`min-h-screen w-full ${colors.background} ${colors.textPrimary} transition-colors duration-300 relative`}>
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-teal-500/5" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse-slow delay-1000" />
      </div>

      {/* Hero Section */}
      <section className="relative w-full overflow-hidden pt-24 pb-32 px-4 sm:px-6 lg:px-8 z-10">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-teal-500/20 border border-purple-500/30 backdrop-blur-sm mb-6 animate-in fade-in slide-in-from-top-5 duration-700">
            <Sparkles className="w-4 h-4 text-purple-400 mr-2" />
            <span className="text-sm font-medium">Your Mind, Mirrored & Enhanced</span>
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight animate-in fade-in slide-in-from-bottom-5 duration-700">
            Reflect, Grow, and{" "}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-teal-400 bg-clip-text text-transparent">
              Transform
            </span>
          </h1>
          <p className={`text-xl max-w-3xl mx-auto mt-6 ${colors.textSecondary} animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100`}>
            MyMindMirror combines AI-powered journal analysis, goal roadmaps, and gamification to help you understand yourself better and achieve your dreams.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-10 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200">
            {/* Hero Button - conditional based on authentication */}
            <Link
              to={isAuthenticated ? "/journal" : "/register"}
              className={`${colors.buttonPrimary} text-white px-8 py-3 rounded-full font-semibold flex items-center justify-center gap-2 transition-all hover:scale-105 shadow-lg`}
            >
              {isAuthenticated ? "Go to Journal" : "Start Free Journey"}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </Link>
            <Link
              to="/features"
              className="px-8 py-3 rounded-full font-medium flex items-center justify-center gap-2 transition-all hover:shadow-lg border border-purple-500/30 text-purple-600 dark:text-purple-300 hover:bg-purple-500/10"
            >
              Learn More <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Floating Icons (unchanged) */}
        <div className="absolute top-32 left-5 opacity-30 animate-float hidden lg:block">
          <Sparkles size={32} className="text-purple-400" />
        </div>
        <div className="absolute top-48 right-10 opacity-30 animate-float-delayed hidden lg:block">
          <Brain size={32} className="text-teal-400" />
        </div>
        <div className="absolute bottom-10 left-1/3 opacity-30 animate-float-slow hidden lg:block">
          <Trophy size={32} className="text-amber-400" />
        </div>
        <div className="absolute bottom-15 right-1/4 opacity-30 animate-float-slow hidden lg:block">
          <Target size={32} className="text-rose-400" />
        </div>
      </section>

      {/* Stats Bar (unchanged) */}
      <section ref={statsRef} className="w-full py-12 px-4 sm:px-6 lg:px-8 border-y border-white/10 bg-white/5 dark:bg-black/20 backdrop-blur-sm z-10 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, idx) => (
              <div key={idx} className="space-y-2 transform transition-all duration-300 hover:scale-105">
                <div className="flex justify-center text-purple-400">{stat.icon}</div>
                <div className="text-2xl font-bold">
                  {animatedStats ? stat.value : "0"}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid (unchanged) */}
      <section className="w-full py-24 px-4 sm:px-6 lg:px-8 z-10 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything You Need for{" "}
              <span className="bg-gradient-to-r from-purple-400 to-teal-400 bg-clip-text text-transparent">
                Personal Growth
              </span>
            </h2>
            <p className={`text-lg max-w-2xl mx-auto ${colors.textSecondary}`}>
              Powerful tools that work together to give you deep insights and keep you motivated.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className={`group relative p-6 rounded-2xl ${colors.cardBg} border ${colors.cardBorder} backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl overflow-hidden`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative z-10">
                  <div className={`mb-4 w-12 h-12 rounded-xl ${feature.iconBg} flex items-center justify-center ${feature.iconColor} group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className={`text-sm ${colors.textSecondary}`}>{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Showcase – Charts Preview (unchanged) */}
      <section className="w-full py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-purple-500/5 to-teal-500/5 z-10 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-3xl font-bold mb-4">
                Visualize Your Emotional Journey
              </h2>
              <p className={`text-lg ${colors.textSecondary} mb-6`}>
                Track mood trends, emotion distribution, and correlations with word count. Our charts help you see patterns you might otherwise miss.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-purple-400" /> Mood & Emotion Trends Over Time</li>
                <li className="flex items-center gap-2"><PieChart className="w-5 h-5 text-teal-400" /> Emotion Breakdown Charts</li>
                <li className="flex items-center gap-2"><BarChart className="w-5 h-5 text-rose-400" /> Mood vs. Word Count Correlation</li>
              </ul>
            </div>
            <div className="order-1 lg:order-2">
              <div className={`rounded-2xl ${colors.cardBg} border ${colors.cardBorder} p-6 backdrop-blur-sm transition-all duration-300 hover:shadow-xl`}>
                <div className="h-48 flex items-end justify-between gap-1">
                  {[40, 65, 45, 80, 70, 55, 90, 75, 60, 85].map((h, i) => (
                    <div key={i} className="flex-1 bg-gradient-to-t from-purple-500 to-teal-500 rounded-t transition-all duration-500 hover:from-purple-400 hover:to-teal-400" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="flex justify-between mt-4 text-xs text-gray-500">
                  <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap & Achievements Showcase (unchanged) */}
      <section className="w-full py-24 px-4 sm:px-6 lg:px-8 z-10 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className={`rounded-2xl ${colors.cardBg} border ${colors.cardBorder} p-6 backdrop-blur-sm space-y-5 transition-all duration-300 hover:shadow-xl`}>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold">AI Roadmap Generator</h3>
                    <p className="text-sm text-gray-500">"Learn React in 8 weeks" → Detailed weekly tasks, resources, milestones.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                    <Trophy size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold">Gamification</h3>
                    <p className="text-sm text-gray-500">Earn badges, maintain streaks, and celebrate your progress.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                    <Cloud size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold">Key Phrase Cloud</h3>
                    <p className="text-sm text-gray-500">See your most frequent topics at a glance.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl font-bold mb-4">Turn Goals into Action</h2>
              <p className={`text-lg ${colors.textSecondary} mb-6`}>
                Generate personalized roadmaps, import tasks to milestones, and watch your progress with streaks and badges.
              </p>
              <Link to="/journal" className="inline-flex items-center gap-2 text-purple-400 hover:underline transition">
                Try it now <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA - conditional based on authentication */}
      <section className="w-full py-24 px-4 sm:px-6 lg:px-8 z-10 relative">
        <div className="max-w-5xl mx-auto text-center">
          <div className={`rounded-3xl ${colors.cardBg} border ${colors.cardBorder} p-8 md:p-12 relative overflow-hidden transition-all duration-500 hover:shadow-2xl`}>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-teal-500/10" />
            <div className="relative z-10">
              <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-teal-500/20 mb-6">
                <Feather className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Ready to Start Your Journey?
              </h2>
              <p className={`text-lg mb-8 max-w-2xl mx-auto ${colors.textSecondary}`}>
                Join thousands who have transformed their self-reflection practice with MyMindMirror.
              </p>
              <Link
                to={isAuthenticated ? "/journal" : "/register"}
                className={`${colors.buttonPrimary} text-white px-8 py-3 rounded-full font-semibold inline-flex items-center gap-2 transition-all hover:scale-105 shadow-lg`}
              >
                {isAuthenticated ? "Go to Journal" : "Create Free Account"}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Global Animations (unchanged) */}
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
          animation-duration: 0.5s;
          animation-fill-mode: both;
        }
        .fade-in {
          animation-name: fadeIn;
        }
        .slide-in-from-top-5 {
          animation-name: slideInFromTop;
        }
        .slide-in-from-bottom-5 {
          animation-name: slideInFromBottom;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInFromTop {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInFromBottom {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
      `}</style>
    </div>
  );
}

export default HomePage;