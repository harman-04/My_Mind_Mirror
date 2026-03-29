// src/pages/HomePage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import {
  Sparkles, Brain, AlertTriangle, Folders, Target, Lightbulb, 
  ShieldCheck, CalendarCheck, BarChart, TrendingUp, Hand, 
  Feather, ArrowRight, ChevronRight, Layers, Gauge, BookOpen,
  HeartPulse, PieChart, Notebook, Shield, Zap, Clock, Hash
} from 'lucide-react';

function HomePage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Enhanced color system with semantic naming
  const colors = {
    primary: isDarkMode ? 'text-purple-300' : 'text-purple-600',
    secondary: isDarkMode ? 'text-teal-300' : 'text-teal-600',
    accent: isDarkMode ? 'text-rose-400' : 'text-rose-500',
    background: isDarkMode ? 'bg-gray-900' : 'bg-gray-50',
    cardBg: isDarkMode ? 'bg-gray-800/80' : 'bg-white/90',
    cardBorder: isDarkMode ? 'border-gray-700' : 'border-gray-200',
    textPrimary: isDarkMode ? 'text-gray-100' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-gray-300' : 'text-gray-600',
    buttonPrimary: isDarkMode ? 
      'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600' : 
      'bg-gradient-to-r from-purple-500 to-purple-400 hover:from-purple-600 hover:to-purple-500',
    buttonSecondary: isDarkMode ? 
      'bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600' : 
      'bg-gradient-to-r from-teal-500 to-teal-400 hover:from-teal-600 hover:to-teal-500',
    iconPrimary: isDarkMode ? 'text-purple-300' : 'text-purple-500',
    iconSecondary: isDarkMode ? 'text-teal-300' : 'text-teal-500',
  };

  // Structured feature categories
  const featureCategories = [
    {
      title: "AI-Powered Insights",
      description: "Discover deeper understanding with our intelligent analysis",
      icon: <Brain size={24} className={colors.iconPrimary} />,
      features: [
        {
          icon: <Layers size={20} className={colors.iconPrimary} />,
          title: "Deep Analysis",
          description: "AI examines your entries for emotional patterns and hidden insights"
        },
        {
          icon: <PieChart size={20} className={colors.iconPrimary} />,
          title: "Sentiment Tracking",
          description: "Visualize your emotional journey with detailed charts"
        },
        {
          icon: <Notebook size={20} className={colors.iconPrimary} />,
          title: "Smart Summaries",
          description: "Get concise overviews of your journaling patterns"
        }
      ]
    },
    {
      title: "Productivity Tools",
      description: "Achieve your goals with structured support",
      icon: <Target size={24} className={colors.iconPrimary} />,
      features: [
        {
          icon: <Hash size={20} className={colors.iconPrimary} />,
          title: "Goal Tracking",
          description: "Set and monitor personal objectives with milestones"
        },
        {
          icon: <Clock size={20} className={colors.iconPrimary} />,
          title: "Habit Formation",
          description: "Build positive routines with our tracking system"
        },
        {
          icon: <Zap size={20} className={colors.iconPrimary} />,
          title: "Action Items",
          description: "Turn reflections into concrete next steps"
        }
      ]
    },
    {
      title: "Data & Security",
      description: "Your thoughts are always protected",
      icon: <Shield size={24} className={colors.iconPrimary} />,
      features: [
        {
          icon: <ShieldCheck size={20} className={colors.iconPrimary} />,
          title: "End-to-End Encryption",
          description: "Military-grade protection for your private entries"
        },
        {
          icon: <BookOpen size={20} className={colors.iconPrimary} />,
          title: "Export Options",
          description: "Download your data anytime in multiple formats"
        },
        {
          icon: <Gauge size={20} className={colors.iconPrimary} />,
          title: "Usage Analytics",
          description: "Understand your journaling habits with clear metrics"
        }
      ]
    }
  ];

  const testimonials = [
    {
      quote: "This app helped me recognize patterns in my thinking that I'd never noticed before. The AI insights are remarkably accurate.",
      author: "Lisa K."
    },
    {
      quote: "As someone who struggled with journaling consistency, the smart prompts and progress tracking have transformed my practice.",
      author: "Michael T."
    },
    {
      quote: "The semantic clustering feature gives me a bird's-eye view of my mental landscape that's incredibly valuable for self-growth.",
      author: "Sarah J."
    }
  ];

  return (
    <div className={`min-h-screen w-full flex flex-col items-center ${colors.background} ${colors.textPrimary} transition-colors duration-300`}>
      
      {/* Hero Section */}
      <section className="w-full py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className={`absolute inset-0 bg-gradient-to-br ${isDarkMode ? 'from-purple-900/20 via-gray-900 to-gray-900' : 'from-purple-50 via-white to-white'}`}></div>
          <div className={`absolute inset-0 opacity-20 ${isDarkMode ? 'bg-[url(/grid-dark.svg)]' : 'bg-[url(/grid-light.svg)]'}`}></div>
        </div>
        
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
          <div className="lg:w-1/2 space-y-8">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-purple-400 text-white text-sm font-medium">
              <Sparkles className="w-4 h-4 mr-2" />
              Introducing MyMindMirror
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
              The Future of <span className="bg-gradient-to-r from-purple-400 to-teal-400 bg-clip-text text-transparent">Self-Reflection</span>
            </h1>
            <p className={`text-lg ${colors.textSecondary} max-w-2xl`}>
              An intelligent journaling platform that helps you uncover patterns, track growth, 
              and achieve your personal goals through AI-powered insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                to="/register"
                className={`${colors.buttonPrimary} text-white px-8 py-3 rounded-full font-medium flex items-center justify-center space-x-2 transition-all hover:shadow-lg`}
              >
                <span>Start Your Journey</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/journal"
                className={`px-8 py-3 rounded-full font-medium flex items-center justify-center space-x-2 transition-all hover:shadow-lg border ${colors.cardBorder} ${colors.textPrimary}`}
              >
                <span>Explore Features</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="lg:w-1/2 relative">
            <div className={`relative rounded-3xl overflow-hidden ${colors.cardBorder} border shadow-2xl`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${isDarkMode ? 'from-purple-900/30 to-gray-800' : 'from-purple-100/50 to-gray-100'}`}></div>
              <div className="relative z-10 p-6">
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-inner">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="text-sm font-mono text-gray-400">insight_dashboard.jsx</div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-purple-500/10 to-teal-500/10 p-4 rounded-lg border border-purple-500/20">
                      <div className="flex items-center space-x-2">
                        <Lightbulb className="w-5 h-5 text-purple-400" />
                        <h3 className="font-medium text-purple-300">Weekly Insight</h3>
                      </div>
                      <p className="mt-2 text-sm text-gray-300">You've shown consistent focus on productivity goals. Consider balancing with self-care reflections.</p>
                    </div>
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <h3 className="font-medium text-gray-200">Mood Trend</h3>
                      <div className="mt-2 h-32 bg-gradient-to-b from-gray-700/50 to-gray-800/30 rounded border border-gray-700 flex items-end">
                        {[30, 60, 45, 80, 65, 90, 75].map((height, i) => (
                          <div 
                            key={i}
                            style={{ height: `${height}%` }}
                            className={`flex-1 ${i % 2 === 0 ? 'bg-teal-500' : 'bg-purple-500'} rounded-t mx-0.5`}
                          ></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Structured */}
      <section className="w-full py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Structured <span className="bg-gradient-to-r from-purple-400 to-teal-400 bg-clip-text text-transparent">Self-Discovery</span>
            </h2>
            <p className={`text-lg max-w-3xl mx-auto ${colors.textSecondary}`}>
              Our carefully designed features work together to provide comprehensive support for your personal growth journey.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {featureCategories.map((category, index) => (
              <div 
                key={index}
                className={`rounded-2xl ${colors.cardBg} ${colors.cardBorder} border p-6 hover:shadow-lg transition-all duration-300`}
              >
                <div className="flex items-center mb-6">
                  <div className={`w-10 h-10 rounded-lg mr-4 flex items-center justify-center ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                    {category.icon}
                  </div>
                  <div>
                    <h3 className={`text-xl font-semibold ${colors.primary}`}>{category.title}</h3>
                    <p className={`text-sm ${colors.textSecondary}`}>{category.description}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {category.features.map((feature, fIndex) => (
                    <div key={fIndex} className="flex items-start">
                      <div className={`w-8 h-8 rounded-md mr-3 mt-1 flex items-center justify-center ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100'}`}>
                        {feature.icon}
                      </div>
                      <div>
                        <h4 className="font-medium">{feature.title}</h4>
                        <p className={`text-sm ${colors.textSecondary}`}>{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="w-full py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-transparent to-transparent">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Voices from Our <span className="bg-gradient-to-r from-purple-400 to-teal-400 bg-clip-text text-transparent">Community</span>
            </h2>
            <p className={`text-lg max-w-3xl mx-auto ${colors.textSecondary}`}>
              Hear how MyMindMirror is helping people like you achieve meaningful growth.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                className={`rounded-2xl ${colors.cardBg} ${colors.cardBorder} border p-6 flex flex-col`}
              >
                <div className="mb-4">
                  <Hand className={`w-6 h-6 ${colors.iconSecondary}`} />
                </div>
                <p className={`italic mb-6 flex-grow ${colors.textSecondary}`}>"{testimonial.quote}"</p>
                <p className={`text-sm font-medium ${colors.primary}`}>{testimonial.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="w-full py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className={`rounded-3xl ${colors.cardBg} ${colors.cardBorder} border p-12 relative overflow-hidden`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${isDarkMode ? 'from-purple-900/20 via-gray-900/50 to-gray-900/20' : 'from-purple-50/70 via-white/90 to-white/70'} -z-10`}></div>
            <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full bg-gradient-to-r from-purple-500 to-teal-500 opacity-10 blur-3xl -z-10`}></div>
            
            <Feather className={`w-12 h-12 mx-auto mb-6 ${colors.iconPrimary}`} />
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Begin Your <span className="bg-gradient-to-r from-purple-400 to-teal-400 bg-clip-text text-transparent">Transformation</span> Today
            </h2>
            <p className={`text-lg mb-8 max-w-2xl mx-auto ${colors.textSecondary}`}>
              Join MyMindMirror and start your journey toward deeper self-awareness and personal growth.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/register"
                className={`${colors.buttonPrimary} text-white px-8 py-3 rounded-full font-medium flex items-center justify-center space-x-2 transition-all hover:shadow-lg`}
              >
                <span>Create Free Account</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
             
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;