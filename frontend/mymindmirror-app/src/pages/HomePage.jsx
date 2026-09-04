// src/pages/HomePage.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import {
  Sparkles, Brain, Target, Shield, Feather, ArrowRight, ChevronRight,
  Notebook, Clock, Zap, BookOpen, LineChart, MapPin, CalendarDays,
  MessageCircle, Settings, Search, Download, FileText, LockKeyhole, CheckCircle, Trophy,
  Award, Activity, Database, Coffee, Lightbulb, Flame, HeartPulse, Image as ImageIcon
} from 'lucide-react';

function HomePage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [animatedStats, setAnimatedStats] = useState(false);
  const statsRef = useRef(null);

  const isAuthenticated = !!localStorage.getItem('jwtToken');

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

  // Premium Deep Indigo Glassmorphism Palette
  const colors = {
    background: 'bg-gray-50 dark:bg-transparent',
    cardBg: isDarkMode ? 'bg-[#1A162F]/60 backdrop-blur-xl' : 'bg-white/70 backdrop-blur-xl',
    cardBorder: isDarkMode ? 'border-white/10' : 'border-gray-200/50',
    textPrimary: isDarkMode ? 'text-gray-100' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-gray-400' : 'text-gray-600',
    buttonPrimary: 'bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 text-white transition-all duration-300',
  };

  const features = [
    {
      title: "RAG-Powered AI Coach",
      description: "Chat with an AI that actively remembers your past journal entries using pgvector semantic memory. It provides context-aware advice based on your history.",
      icon: <MessageCircle className="w-6 h-6 lg:w-7 lg:h-7" />,
      gradient: "from-purple-500/20 to-pink-500/20",
      iconBg: "bg-purple-50 dark:bg-purple-500/20",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    {
      title: "Semantic Vector Search",
      description: "Don't just search for keywords. Search for concepts and feelings. Our vector database understands the meaning behind your words to find exact memories.",
      icon: <Search className="w-6 h-6 lg:w-7 lg:h-7" />,
      gradient: "from-blue-500/20 to-cyan-500/20",
      iconBg: "bg-blue-50 dark:bg-blue-500/20",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Smart Lifestyle Timetable",
      description: "Set your Energy Peak, Sleep Times, and Daily Habits. The AI schedules tasks perfectly around your life, with a 'Re-optimize Today' button for sudden changes.",
      icon: <CalendarDays className="w-6 h-6 lg:w-7 lg:h-7" />,
      gradient: "from-teal-500/20 to-emerald-500/20",
      iconBg: "bg-teal-50 dark:bg-teal-500/20",
      iconColor: "text-teal-600 dark:text-teal-400",
    },
    {
      title: "Dynamic Gamification",
      description: "Level up your life. Earn XP for journaling, scheduling, and completing tasks. Unlock dynamic badges like 'Productivity Ninja' and 'AI Whisperer'.",
      icon: <Award className="w-6 h-6 lg:w-7 lg:h-7" />,
      gradient: "from-amber-500/20 to-orange-500/20",
      iconBg: "bg-amber-50 dark:bg-amber-500/20",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      title: "High-Res Visual Analytics",
      description: "Explore horizontally scrolling mood timelines, full-width emotion radar charts, calendar heatmaps, and dynamic core concern breakdowns at a glance.",
      icon: <LineChart className="w-6 h-6 lg:w-7 lg:h-7" />,
      gradient: "from-rose-500/20 to-pink-500/20",
      iconBg: "bg-rose-50 dark:bg-rose-500/20",
      iconColor: "text-rose-600 dark:text-rose-400",
    },
    {
      title: "Universal Data Export",
      description: "Your data is yours. Export beautifully paginated PDF reports of your entire journal, structured CSVs, or panoramic PNGs of your visual timelines.",
      icon: <Download className="w-6 h-6 lg:w-7 lg:h-7" />,
      gradient: "from-indigo-500/20 to-blue-500/20",
      iconBg: "bg-indigo-50 dark:bg-indigo-500/20",
      iconColor: "text-indigo-600 dark:text-indigo-400",
    },
    {
      title: "Chunked AI Roadmaps",
      description: "Generate comprehensive learning roadmaps tailored to your difficulty, language, and pace. Continue generating new weeks as you progress seamlessly.",
      icon: <MapPin className="w-6 h-6 lg:w-7 lg:h-7" />,
      gradient: "from-cyan-500/20 to-teal-500/20",
      iconBg: "bg-cyan-50 dark:bg-cyan-500/20",
      iconColor: "text-cyan-600 dark:text-cyan-400",
    },
    {
      title: "Bring Your Own Key",
      description: "Securely input your own Gemini API key. Our dynamic Spring AI router optimizes model selection (Flash-Lite to Pro) to maximize your free-tier quotas.",
      icon: <LockKeyhole className="w-6 h-6 lg:w-7 lg:h-7" />,
      gradient: "from-fuchsia-500/20 to-purple-500/20",
      iconBg: "bg-fuchsia-50 dark:bg-fuchsia-500/20",
      iconColor: "text-fuchsia-600 dark:text-fuchsia-400",
    },
    {
      title: "Enterprise-Grade Security",
      description: "Zero compromises. Dual databases (MySQL + Postgres), Redis caching, and AES-CBC encryption ensure your deepest thoughts are utterly impenetrable.",
      icon: <Shield className="w-6 h-6 lg:w-7 lg:h-7" />,
      gradient: "from-emerald-500/20 to-green-500/20",
      iconBg: "bg-emerald-50 dark:bg-emerald-500/20",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Deep-Dive Task Elaboration",
      description: "Stuck on a roadmap step? Click 'Elaborate' and the AI dynamically generates a comprehensive, step-by-step guide with micro-tasks and time estimates.",
      icon: <Lightbulb className="w-6 h-6 lg:w-7 lg:h-7" />,
      gradient: "from-yellow-500/20 to-amber-500/20",
      iconBg: "bg-yellow-50 dark:bg-yellow-500/20",
      iconColor: "text-yellow-600 dark:text-yellow-500",
    },
    {
      title: "Smart Milestone Insights",
      description: "Get instant AI performance assessments on your milestones. The system can even parse raw text growth tips and automatically extract them into actionable tasks.",
      icon: <Target className="w-6 h-6 lg:w-7 lg:h-7" />,
      gradient: "from-emerald-500/20 to-teal-500/20",
      iconBg: "bg-emerald-50 dark:bg-emerald-500/20",
      iconColor: "text-emerald-600 dark:text-emerald-500",
    },
    {
      title: "Early Burnout Alerts",
      description: "Our pure Java EWMA algorithm monitors your daily mood and word count averages. It detects subtle emotional shifts and warns you of potential burnout.",
      icon: <HeartPulse className="w-6 h-6 lg:w-7 lg:h-7" />,
      gradient: "from-rose-500/20 to-orange-500/20",
      iconBg: "bg-rose-50 dark:bg-rose-500/20",
      iconColor: "text-rose-600 dark:text-rose-500",
    },
  ];

  const stats = [
    { value: "100%", label: "Encrypted Privacy", icon: <Shield className="w-5 h-5 lg:w-6 lg:h-6" /> },
    { value: "pgvector", label: "Semantic Memory", icon: <Database className="w-5 h-5 lg:w-6 lg:h-6" /> },
    { value: "BYOK", label: "API Flexibility", icon: <LockKeyhole className="w-5 h-5 lg:w-6 lg:h-6" /> },
    { value: "<10ms", label: "Redis Caching", icon: <Zap className="w-5 h-5 lg:w-6 lg:h-6" /> },
  ];

  return (
    <div className={`min-h-screen w-full ${colors.background} ${colors.textPrimary} transition-colors duration-300 relative`}>
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-teal-500/5" />
        <div className="absolute top-[5%] left-[10%] w-[30vw] h-[30vw] bg-purple-500/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[10%] right-[10%] w-[35vw] h-[35vw] bg-teal-500/10 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
      </div>

      {/* Hero Section */}
      <section className="relative w-full overflow-hidden pt-28 lg:pt-36 pb-20 lg:pb-32 px-4 sm:px-6 lg:px-8 z-10">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-teal-500/10 border border-purple-500/20 dark:border-white/10 backdrop-blur-md mb-8 animate-in fade-in slide-in-from-top-5 duration-700 shadow-sm">
            <Sparkles className="w-4 h-4 lg:w-5 lg:h-5 text-purple-500 mr-2" />
            <span className="text-xs lg:text-sm font-bold tracking-wider uppercase text-purple-700 dark:text-purple-300">Powered by Spring AI & pgvector</span>
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-poppins font-extrabold leading-[1.1] animate-in fade-in slide-in-from-bottom-5 duration-700 tracking-tight text-gray-900 dark:text-gray-100">
            Reflect, Grow, and <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-teal-500 dark:from-purple-400 dark:via-fuchsia-400 dark:to-teal-400 bg-clip-text text-transparent">
              Transform.
            </span>
          </h1>
          <p className={`text-base sm:text-lg lg:text-xl max-w-3xl mx-auto mt-6 lg:mt-8 ${colors.textSecondary} animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100 leading-relaxed font-medium`}>
            MyMindMirror is an enterprise-grade, privacy-first AI journaling ecosystem. Featuring semantic vector memory, lifestyle-aware smart scheduling, and deep visual analytics to help you understand your emotional fingerprint.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 lg:gap-6 mt-10 lg:mt-12 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-200">
            <Link
              to={isAuthenticated ? "/journal" : "/register"}
              className={`${colors.buttonPrimary} w-full sm:w-auto px-8 py-3.5 lg:px-10 lg:py-4 rounded-xl lg:rounded-2xl font-bold text-sm lg:text-base flex items-center justify-center gap-2`}
            >
              {isAuthenticated ? "Enter Your Dashboard" : "Start Free Journey"}
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/features"
              className={`w-full sm:w-auto px-8 py-3.5 lg:px-10 lg:py-4 rounded-xl lg:rounded-2xl font-bold text-sm lg:text-base flex items-center justify-center gap-2 transition-all border ${colors.cardBorder} bg-white/50 dark:bg-[#131127]/50 hover:bg-white/80 dark:hover:bg-white/10 backdrop-blur-sm shadow-sm`}
            >
              Explore Architecture <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Floating Icons */}
        <div className="absolute top-32 left-[10%] opacity-20 animate-float hidden xl:block pointer-events-none">
          <Sparkles className="w-10 h-10 text-purple-400" />
        </div>
        <div className="absolute top-48 right-[10%] opacity-20 animate-float-delayed hidden xl:block pointer-events-none">
          <Brain className="w-12 h-12 text-teal-400" />
        </div>
        <div className="absolute bottom-10 left-1/4 opacity-20 animate-float-slow hidden xl:block pointer-events-none">
          <Trophy className="w-10 h-10 text-amber-400" />
        </div>
        <div className="absolute bottom-8 right-1/4 opacity-20 animate-float-slow hidden xl:block pointer-events-none">
          <Target className="w-10 h-10 text-rose-400" />
        </div>
      </section>

      {/* Stats Bar */}
      <section ref={statsRef} className="w-full py-10 lg:py-12 px-4 sm:px-6 lg:px-8 border-y border-gray-200/50 dark:border-white/5 bg-white/40 dark:bg-[#131127]/40 backdrop-blur-lg z-10 relative">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12 text-center">
            {stats.map((stat, idx) => (
              <div key={idx} className="space-y-3 lg:space-y-4 transform transition-all duration-300 hover:scale-105 group">
                <div className="flex justify-center text-purple-600 dark:text-teal-400 group-hover:scale-110 transition-transform">{stat.icon}</div>
                <div className="text-3xl lg:text-4xl font-poppins font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
                  {animatedStats ? stat.value : "..."}
                </div>
                <div className="text-xs lg:text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Showcase 1 – AI Reflection Coach (RAG) */}
      <section className="w-full py-20 lg:py-32 px-4 sm:px-6 lg:px-8 z-10 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="order-2 lg:order-1">
              <div className={`rounded-3xl lg:rounded-[2rem] ${colors.cardBg} border ${colors.cardBorder} p-6 lg:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden group hover:shadow-purple-500/10 transition-shadow`}>
                <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-500" />

                <div className="flex items-center gap-4 mb-8 border-b border-gray-200/50 dark:border-white/5 pb-5">
                  <div className="p-3 lg:p-4 rounded-xl lg:rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 shadow-sm border border-purple-200/50 dark:border-purple-500/20">
                    <Database className="w-6 h-6 lg:w-8 lg:h-8" />
                  </div>
                  <div>
                    <h3 className="font-poppins font-bold text-lg lg:text-xl text-gray-800 dark:text-gray-100">pgvector Search Activated</h3>
                    <p className="text-xs lg:text-sm font-medium text-gray-500 dark:text-gray-400 mt-0.5">Retrieving Semantic Context...</p>
                  </div>
                </div>

                <div className="space-y-5 lg:space-y-6 relative z-10">
                  <div className="bg-white/80 dark:bg-[#131127]/80 p-4 lg:p-5 rounded-2xl rounded-br-sm border border-gray-200/50 dark:border-white/5 ml-4 sm:ml-12 shadow-sm relative">
                    <p className="text-sm lg:text-base font-medium text-gray-800 dark:text-gray-200">Why do I feel so anxious when starting new projects?</p>
                  </div>
                  <div className="bg-gradient-to-r from-purple-500 to-teal-500 dark:from-purple-600 dark:to-teal-600 p-4 lg:p-5 rounded-2xl rounded-bl-sm mr-4 sm:mr-12 shadow-md relative">
                    <Sparkles className="absolute -left-2 -top-2 w-5 h-5 text-purple-500 dark:text-teal-400 bg-white dark:bg-gray-900 rounded-full p-0.5" />
                    <p className="text-sm lg:text-base font-medium text-white leading-relaxed">
                      I noticed in your entry from last month, you mentioned feeling overwhelmed before your presentation. You often feel this way when stepping into the unknown. Remember how capable you felt afterward?
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex p-3 lg:p-4 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-800/20 text-purple-600 dark:text-purple-400 mb-6 shadow-sm border border-purple-200/50 dark:border-purple-700/30">
                <Brain className="w-6 h-6 lg:w-8 lg:h-8" />
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-poppins font-extrabold mb-6 tracking-tight text-gray-900 dark:text-gray-100">
                An AI that <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-teal-500 dark:from-purple-400 dark:to-teal-400">Actually Remembers</span>
              </h2>
              <p className={`text-base sm:text-lg lg:text-xl ${colors.textSecondary} mb-8 leading-relaxed font-medium`}>
                Unlike standard chatbots, MyMindMirror uses advanced Retrieval-Augmented Generation (RAG). Every time you ask a question, the system queries a high-performance PostgreSQL vector database to fetch your most relevant past emotions and summaries, providing deeply contextual, hyper-personalized advice.
              </p>
              <ul className="space-y-4 font-semibold text-sm lg:text-base text-gray-800 dark:text-gray-200">
                <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 lg:w-6 lg:h-6 text-teal-500 shrink-0" /> Redis-backed conversational memory.</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 lg:w-6 lg:h-6 text-teal-500 shrink-0" /> Context-aware reflective questions.</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 lg:w-6 lg:h-6 text-teal-500 shrink-0" /> AES-encrypted vector storage.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Showcase 2 – Lifestyle & Smart Schedule */}
      <section className="w-full py-20 lg:py-32 px-4 sm:px-6 lg:px-8 bg-gray-200/30 dark:bg-black/20 border-y border-gray-200/50 dark:border-white/5 z-10 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <div className="inline-flex p-3 lg:p-4 rounded-2xl bg-gradient-to-br from-teal-100 to-teal-50 dark:from-teal-900/30 dark:to-teal-800/20 text-teal-600 dark:text-teal-400 mb-6 shadow-sm border border-teal-200/50 dark:border-teal-700/30">
                <CalendarDays className="w-6 h-6 lg:w-8 lg:h-8" />
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-poppins font-extrabold mb-6 tracking-tight text-gray-900 dark:text-gray-100">
                The <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-500 dark:from-teal-400 dark:to-emerald-400">Burnout-Free</span> Schedule
              </h2>
              <p className={`text-base sm:text-lg lg:text-xl ${colors.textSecondary} mb-8 leading-relaxed font-medium`}>
                Stop fighting unrealistic timetables. Tell the AI your energy peaks, sleep schedule, and daily habits. It weaves your roadmap tasks, milestones, and breaks into a perfectly balanced schedule. Life happened? Hit <strong>"Re-optimize Today"</strong> and the AI instantly recalculates your remaining hours.
              </p>
              <Link to="/journal#schedule" className="inline-flex items-center gap-2 font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors text-base lg:text-lg">
                Explore Lifestyle Engine <ArrowRight className="w-5 h-5 lg:w-6 lg:h-6" />
              </Link>
            </div>

            <div>
              <div className={`rounded-3xl lg:rounded-[2rem] ${colors.cardBg} border ${colors.cardBorder} p-6 lg:p-10 shadow-2xl backdrop-blur-xl space-y-6 hover:shadow-teal-500/10 transition-shadow`}>
                <div className="grid grid-cols-2 gap-4 lg:gap-5 mb-4">
                  <div className="bg-white/60 dark:bg-black/30 p-4 lg:p-5 rounded-2xl border border-gray-200/50 dark:border-white/5 flex flex-col items-center shadow-sm">
                    <Activity className="w-6 h-6 lg:w-8 lg:h-8 text-amber-500 mb-2" />
                    <span className="text-[10px] lg:text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Energy Peak</span>
                    <span className="text-sm lg:text-base font-bold text-gray-800 dark:text-gray-200 mt-0.5">Night Owl</span>
                  </div>
                  <div className="bg-white/60 dark:bg-black/30 p-4 lg:p-5 rounded-2xl border border-gray-200/50 dark:border-white/5 flex flex-col items-center shadow-sm">
                    <Coffee className="w-6 h-6 lg:w-8 lg:h-8 text-orange-500 mb-2" />
                    <span className="text-[10px] lg:text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Daily Habit</span>
                    <span className="text-sm lg:text-base font-bold text-gray-800 dark:text-gray-200 mt-0.5">15m Meditation</span>
                  </div>
                </div>

                <div className="space-y-3 lg:space-y-4">
                  <div className="flex items-center justify-between p-4 lg:p-5 rounded-xl lg:rounded-2xl bg-white/80 dark:bg-[#131127]/80 border-l-4 border-l-teal-500 shadow-sm border border-gray-200/50 dark:border-white/5">
                    <div>
                      <h4 className="text-sm lg:text-base font-bold text-gray-800 dark:text-gray-100">Build React Component</h4>
                      <p className="text-xs lg:text-sm font-medium text-gray-500 dark:text-gray-400 mt-0.5">14:00 - 15:30 • High Focus</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 lg:p-5 rounded-xl lg:rounded-2xl bg-white/80 dark:bg-[#131127]/80 border-l-4 border-l-amber-500 opacity-80 shadow-sm border border-gray-200/50 dark:border-white/5">
                    <div>
                      <h4 className="text-sm lg:text-base font-bold text-amber-700 dark:text-amber-400">Meditation Break</h4>
                      <p className="text-xs lg:text-sm font-medium text-gray-500 dark:text-gray-400 mt-0.5">15:30 - 15:45 • Routine</p>
                    </div>
                  </div>
                </div>

                <button className="w-full mt-6 lg:mt-8 py-3.5 lg:py-4 rounded-xl lg:rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm lg:text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:scale-95">
                  <Zap className="w-5 h-5 lg:w-6 lg:h-6" /> Re-optimize Rest of Today
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Showcase 2.5 – Gamification & Progression */}
      <section className="w-full py-20 lg:py-32 px-4 sm:px-6 lg:px-8 z-10 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            <div className="order-2 lg:order-1">
              <div className={`rounded-3xl lg:rounded-[2rem] ${colors.cardBg} border ${colors.cardBorder} p-6 lg:p-10 shadow-2xl backdrop-blur-xl space-y-6 lg:space-y-8 relative overflow-hidden group hover:shadow-amber-500/10 transition-shadow`}>
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl group-hover:bg-amber-500/30 transition-all duration-500" />

                {/* Level Progress */}
                <div className="flex items-center gap-5 lg:gap-6 border-b border-gray-200/50 dark:border-white/5 pb-6 lg:pb-8 relative z-10">
                  <div className="relative flex items-center justify-center w-20 h-20 lg:w-24 lg:h-24 shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-500/30">
                    <span className="text-white font-poppins font-black text-3xl lg:text-4xl">12</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap justify-between items-end mb-2.5 gap-2">
                      <h4 className="font-poppins font-extrabold text-xl lg:text-2xl text-gray-800 dark:text-gray-100 truncate">Mindful Master</h4>
                      <span className="text-xs lg:text-sm font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">5,850 / 6,000 XP</span>
                    </div>
                    <div className="w-full h-3 lg:h-4 bg-gray-200 dark:bg-[#131127] rounded-full overflow-hidden shadow-inner border border-transparent dark:border-white/5">
                      <div className="h-full w-[95%] bg-gradient-to-r from-amber-400 to-orange-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                    </div>
                  </div>
                </div>

                {/* Badges & Streaks */}
                {/* 💡 FIX: Responsive layout prevents text overflow on small screens */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5 relative z-10">

                  <div className="bg-white/60 dark:bg-black/20 p-4 lg:p-5 rounded-2xl border border-gray-200/50 dark:border-white/5 flex flex-row items-center gap-3 lg:gap-4 shadow-sm min-w-0">
                    <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 shrink-0 border border-orange-200/50 dark:border-orange-500/30">
                      <Flame className="w-6 h-6 lg:w-7 lg:h-7" />
                    </div>
                    <div className="min-w-0 w-full">
                      <p className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-0.5 truncate">Current Streak</p>
                      <p className="font-poppins font-extrabold text-lg lg:text-xl text-gray-800 dark:text-gray-100 truncate">14 Days</p>
                    </div>
                  </div>

                  <div className="bg-white/60 dark:bg-black/20 p-4 lg:p-5 rounded-2xl border border-gray-200/50 dark:border-white/5 flex flex-row items-center gap-3 lg:gap-4 shadow-sm min-w-0">
                    <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 shrink-0 border border-purple-200/50 dark:border-purple-500/30">
                      <Award className="w-6 h-6 lg:w-7 lg:h-7" />
                    </div>
                    <div className="min-w-0 w-full">
                      <p className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-0.5 truncate">Latest Badge</p>
                      <p className="font-poppins font-extrabold text-lg lg:text-xl text-gray-800 dark:text-gray-100 truncate">AI Whisperer</p>
                    </div>
                  </div>

                </div>

                <div className="bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 p-4 lg:p-5 rounded-xl lg:rounded-2xl flex items-center gap-3 lg:gap-4 relative z-10 shadow-sm">
                  <Sparkles className="w-5 h-5 lg:w-6 lg:h-6 text-amber-500 shrink-0" />
                  <p className="text-sm lg:text-base font-bold text-amber-800 dark:text-amber-300 leading-snug">
                    +50 XP earned for completing today's journal entry!
                  </p>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="inline-flex p-3 lg:p-4 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-800/20 text-amber-600 dark:text-amber-400 mb-6 shadow-sm border border-amber-200/50 dark:border-amber-700/30">
                <Trophy className="w-6 h-6 lg:w-8 lg:h-8" />
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-poppins font-extrabold mb-6 tracking-tight text-gray-900 dark:text-gray-100">
                Level Up Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500 dark:from-amber-400 dark:to-orange-400">Mental Growth</span>
              </h2>
              <p className={`text-base sm:text-lg lg:text-xl ${colors.textSecondary} mb-8 leading-relaxed font-medium`}>
                Consistency is the hardest part of self-improvement. MyMindMirror turns your journey into a rewarding experience. Earn Experience Points (XP) for analyzing entries, scheduling roadmaps, and hitting milestones.
              </p>
              <ul className="space-y-4 font-semibold text-sm lg:text-base text-gray-800 dark:text-gray-200">
                <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 lg:w-6 lg:h-6 text-amber-500 shrink-0" /> Unlock dynamic achievement badges.</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 lg:w-6 lg:h-6 text-amber-500 shrink-0" /> Track your longest reflection streaks.</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 lg:w-6 lg:h-6 text-amber-500 shrink-0" /> Progress through global mental mastery levels.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Showcase 3 - Data Export & Analytics */}
      <section className="w-full py-20 lg:py-32 px-4 sm:px-6 lg:px-8 bg-gray-200/30 dark:bg-black/20 border-y border-gray-200/50 dark:border-white/5 z-10 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="order-2 lg:order-1">
              <div className="grid grid-cols-2 gap-4 lg:gap-6">
                <div className={`rounded-2xl lg:rounded-3xl ${colors.cardBg} border ${colors.cardBorder} p-6 lg:p-8 shadow-xl flex flex-col items-center text-center group hover:-translate-y-1 hover:shadow-rose-500/10 transition-all`}>
                  <div className="p-4 lg:p-5 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-full mb-4 lg:mb-5 group-hover:scale-110 transition-transform border border-rose-200/50 dark:border-rose-500/30 shadow-sm"><FileText className="w-8 h-8 lg:w-10 lg:h-10" /></div>
                  <h3 className="font-poppins font-bold text-lg lg:text-xl text-gray-800 dark:text-gray-100 mb-2">PDF Reports</h3>
                  <p className="text-xs lg:text-sm font-medium text-gray-500 dark:text-gray-400">Paginated & beautifully formatted.</p>
                </div>
                <div className={`rounded-2xl lg:rounded-3xl ${colors.cardBg} border ${colors.cardBorder} p-6 lg:p-8 shadow-xl flex flex-col items-center text-center group hover:-translate-y-1 hover:shadow-blue-500/10 transition-all`}>
                  <div className="p-4 lg:p-5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full mb-4 lg:mb-5 group-hover:scale-110 transition-transform border border-blue-200/50 dark:border-blue-500/30 shadow-sm"><Database className="w-8 h-8 lg:w-10 lg:h-10" /></div>
                  <h3 className="font-poppins font-bold text-lg lg:text-xl text-gray-800 dark:text-gray-100 mb-2">CSV Data</h3>
                  <p className="text-xs lg:text-sm font-medium text-gray-500 dark:text-gray-400">Raw structural data for analysts.</p>
                </div>
                <div className={`col-span-2 rounded-2xl lg:rounded-3xl ${colors.cardBg} border ${colors.cardBorder} p-6 lg:p-8 shadow-xl flex flex-col sm:flex-row items-center sm:items-start lg:items-center text-center sm:text-left gap-4 lg:gap-6 group hover:-translate-y-1 hover:shadow-indigo-500/10 transition-all`}>
                  <div className="p-4 lg:p-5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl group-hover:rotate-12 transition-transform border border-indigo-200/50 dark:border-indigo-500/30 shadow-sm shrink-0"><ImageIcon className="w-8 h-8 lg:w-10 lg:h-10" /></div>
                  <div>
                    <h3 className="font-poppins font-bold text-lg lg:text-xl text-gray-800 dark:text-gray-100 mb-2">High-Res Chart PNGs</h3>
                    <p className="text-xs lg:text-sm font-medium text-gray-500 dark:text-gray-400">Download panoramic timelines and radar charts in Retina quality directly to your device.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="inline-flex p-3 lg:p-4 rounded-2xl bg-gradient-to-br from-rose-100 to-rose-50 dark:from-rose-900/30 dark:to-rose-800/20 text-rose-600 dark:text-rose-400 mb-6 shadow-sm border border-rose-200/50 dark:border-rose-700/30">
                <LineChart className="w-6 h-6 lg:w-8 lg:h-8" />
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-poppins font-extrabold mb-6 tracking-tight text-gray-900 dark:text-gray-100">
                Own Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-500 dark:from-rose-400 dark:to-orange-400">Data</span>
              </h2>
              <p className={`text-base sm:text-lg lg:text-xl ${colors.textSecondary} mb-8 leading-relaxed font-medium`}>
                We believe your mental health data belongs strictly to you. Enjoy comprehensive visual analytics inside the app, or instantly export everything. From perfectly structured CSVs to gorgeous, paginated PDF dossiers of your entire journey.
              </p>
              <ul className="space-y-4 font-semibold text-sm lg:text-base text-gray-800 dark:text-gray-200">
                <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 lg:w-6 lg:h-6 text-rose-500 shrink-0" /> Zero paywalls on data extraction.</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 lg:w-6 lg:h-6 text-rose-500 shrink-0" /> Client-side PDF compilation.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Showcase 4 - Dynamic Roadmaps & Elaboration */}
      <section className="w-full py-20 lg:py-32 px-4 sm:px-6 lg:px-8 z-10 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            <div className="order-2 lg:order-1">
              <div className={`rounded-3xl lg:rounded-[2rem] ${colors.cardBg} border ${colors.cardBorder} p-6 lg:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden group hover:shadow-cyan-500/10 transition-shadow`}>
                <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl group-hover:bg-cyan-500/30 transition-all duration-500" />

                <div className="space-y-4 lg:space-y-5 relative z-10">
                  <div className="flex items-center justify-between border-b border-gray-200/50 dark:border-white/5 pb-5 mb-5">
                      <div className="flex items-center gap-3 lg:gap-4">
                        <div className="p-2.5 lg:p-3 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 border border-cyan-200/50 dark:border-cyan-500/30 shadow-sm"><MapPin className="w-5 h-5 lg:w-6 lg:h-6" /></div>
                        <h3 className="font-poppins font-bold text-lg lg:text-xl text-gray-800 dark:text-gray-100">React Architecture</h3>
                      </div>
                      <span className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 px-3 py-1.5 rounded-lg shadow-sm">Week 2</span>
                  </div>

                  <div className="bg-white/70 dark:bg-[#131127]/60 p-5 lg:p-6 rounded-2xl border border-gray-200/50 dark:border-white/5 shadow-sm hover:border-cyan-300 dark:hover:border-cyan-500/30 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                      <h4 className="font-poppins font-extrabold text-base lg:text-lg text-gray-800 dark:text-gray-100">Understand Context API</h4>
                      <button className="text-[10px] lg:text-xs font-bold uppercase tracking-widest text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/40 border border-purple-200 dark:border-purple-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-default shadow-sm shrink-0 w-max">
                        <Sparkles className="w-3 h-3 lg:w-3.5 lg:h-3.5" /> Elaborated
                      </button>
                    </div>
                    <p className="text-xs lg:text-sm font-medium text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">Learn how to avoid prop drilling by sharing state globally across your application.</p>

                    <div className="space-y-3 lg:space-y-3.5 pl-4 lg:pl-5 border-l-2 border-purple-400/40 dark:border-purple-500/30">
                        <div className="flex items-start gap-3 text-xs lg:text-sm font-bold text-gray-700 dark:text-gray-200"><div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)] mt-1 shrink-0" /> Create a ThemeProvider component</div>
                        <div className="flex items-start gap-3 text-xs lg:text-sm font-bold text-gray-700 dark:text-gray-200"><div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)] mt-1 shrink-0" /> Wrap your root App component</div>
                        <div className="flex items-start gap-3 text-xs lg:text-sm font-bold text-gray-400 dark:text-gray-500"><div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 mt-1 shrink-0" /> Implement the useContext hook</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="inline-flex p-3 lg:p-4 rounded-2xl bg-gradient-to-br from-cyan-100 to-cyan-50 dark:from-cyan-900/30 dark:to-cyan-800/20 text-cyan-600 dark:text-cyan-400 mb-6 shadow-sm border border-cyan-200/50 dark:border-cyan-700/30">
                <Target className="w-6 h-6 lg:w-8 lg:h-8" />
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-poppins font-extrabold mb-6 tracking-tight text-gray-900 dark:text-gray-100">
                Turn Ambition into <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400">Action</span>
              </h2>
              <p className={`text-base sm:text-lg lg:text-xl ${colors.textSecondary} mb-8 leading-relaxed font-medium`}>
                Don't just set goals—engineer them. Generate perfectly paced, chunked learning roadmaps that adapt to your schedule and learning style. Hit a wall? Click <strong>"Elaborate"</strong> and our AI will break any complex task down into bite-sized, actionable subtasks.
              </p>
              <ul className="space-y-4 font-semibold text-sm lg:text-base text-gray-800 dark:text-gray-200">
                <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 lg:w-6 lg:h-6 text-cyan-500 shrink-0" /> Continual roadmap generation (chunking).</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 lg:w-6 lg:h-6 text-cyan-500 shrink-0" /> Deep-dive AI task elaboration.</li>
                <li className="flex items-center gap-3"><CheckCircle className="w-5 h-5 lg:w-6 lg:h-6 text-cyan-500 shrink-0" /> Smart milestone insight parsing.</li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* Features Grid (Bento Box Style) */}
      <section className="w-full py-24 lg:py-32 px-4 sm:px-6 lg:px-8 bg-gray-200/30 dark:bg-black/20 border-t border-gray-200/50 dark:border-white/5 z-10 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 lg:mb-20">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-poppins font-extrabold mb-6 tracking-tight text-gray-900 dark:text-gray-100">
              Everything You Need for{" "}
              <span className="bg-gradient-to-r from-purple-600 to-teal-500 dark:from-purple-400 dark:to-teal-400 bg-clip-text text-transparent">
                Personal Growth
              </span>
            </h2>
            <p className={`text-lg lg:text-xl max-w-3xl mx-auto ${colors.textSecondary} font-medium leading-relaxed`}>
              A flawless integration of modern UI, secure data architecture, and advanced AI models working together seamlessly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className={`group relative p-8 lg:p-10 rounded-3xl lg:rounded-[2rem] ${colors.cardBg} border ${colors.cardBorder} backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:border-purple-500/30 dark:hover:border-white/20 overflow-hidden flex flex-col`}
              >
                <div className={`absolute top-0 right-0 w-32 h-32 lg:w-40 lg:h-40 bg-gradient-to-br ${feature.gradient} rounded-full blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`} />
                <div className="relative z-10 flex-grow">
                  <div className={`mb-6 lg:mb-8 w-14 h-14 lg:w-16 lg:h-16 rounded-2xl lg:rounded-3xl ${feature.iconBg} flex items-center justify-center ${feature.iconColor} shadow-inner border border-white/40 dark:border-white/5 group-hover:scale-110 transition-transform duration-500`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl lg:text-2xl font-poppins font-extrabold mb-3 lg:mb-4 text-gray-800 dark:text-gray-100 tracking-tight">{feature.title}</h3>
                  <p className={`text-sm lg:text-base font-medium leading-relaxed ${colors.textSecondary}`}>{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="w-full py-24 lg:py-32 px-4 sm:px-6 lg:px-8 z-10 relative">
        <div className="max-w-5xl mx-auto text-center">
          <div className={`rounded-[2.5rem] lg:rounded-[3.5rem] ${colors.cardBg} border ${colors.cardBorder} p-10 sm:p-16 lg:p-20 relative overflow-hidden transition-all duration-500 shadow-2xl hover:shadow-[0_0_50px_rgba(168,85,247,0.15)]`}>
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 via-transparent to-teal-500/10 pointer-events-none" />
            <div className="relative z-10">
              <div className="inline-flex p-4 lg:p-5 rounded-3xl bg-gradient-to-br from-purple-500/20 to-teal-500/20 dark:from-purple-900/30 dark:to-teal-900/30 mb-8 lg:mb-10 shadow-inner border border-white/40 dark:border-white/10">
                <Brain className="w-10 h-10 lg:w-12 lg:h-12 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-poppins font-extrabold mb-6 lg:mb-8 tracking-tight text-gray-900 dark:text-gray-100 leading-tight">
                Ready to Start Your Journey?
              </h2>
              <p className={`text-lg sm:text-xl lg:text-2xl mb-10 lg:mb-12 max-w-3xl mx-auto ${colors.textSecondary} font-medium leading-relaxed`}>
                Join a secure, intelligent ecosystem that adapts to your life, protects your thoughts, and engineers your success.
              </p>
              <Link
                to={isAuthenticated ? "/journal" : "/register"}
                className={`${colors.buttonPrimary} px-10 py-4 lg:px-12 lg:py-5 rounded-2xl lg:rounded-3xl font-bold text-lg lg:text-xl inline-flex items-center gap-3 transition-all hover:scale-105 shadow-xl`}
              >
                {isAuthenticated ? "Go to Dashboard" : "Create Free Account"}
                <ArrowRight className="w-5 h-5 lg:w-6 lg:h-6" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Global Animations */}
      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.05); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float 6s ease-in-out infinite 3s; }
        .animate-float-slow { animation: float 8s ease-in-out infinite 1.5s; }

        .animate-in { animation-duration: 0.8s; animation-fill-mode: both; }
        .fade-in { animation-name: fadeIn; }
        .slide-in-from-top-5 { animation-name: slideInFromTop; }
        .slide-in-from-bottom-5 { animation-name: slideInFromBottom; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInFromTop { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInFromBottom { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }

        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
      `}</style>
    </div>
  );
}

export default React.memo(HomePage);