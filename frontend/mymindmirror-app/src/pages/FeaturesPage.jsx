// src/pages/FeaturesPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import {
  Brain, Target, Shield, Layers, PieChart, Notebook,
  Hash, Clock, Zap, BookOpen, Gauge, BarChart,
  TrendingUp, AlertTriangle, Folders, HeartPulse,
  Sparkles, ArrowRight, ChevronRight
} from 'lucide-react';

function FeaturesPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Consistent color system with HomePage
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

  // Expanded feature categories with more details
  const featureCategories = [
    {
      title: "AI-Powered Insights",
      description: "Discover deeper understanding with our intelligent analysis tools",
      icon: <Brain size={28} className={colors.iconPrimary} />,
      features: [
        {
          icon: <Layers size={20} className={colors.iconPrimary} />,
          title: "Deep Emotional Analysis",
          description: "Our AI examines your entries for emotional patterns, cognitive distortions, and hidden insights",
          benefits: [
            "Identify recurring thought patterns",
            "Recognize emotional triggers",
            "Gain objective perspective on your thoughts"
          ]
        },
        {
          icon: <PieChart size={20} className={colors.iconPrimary} />,
          title: "Sentiment Tracking",
          description: "Visualize your emotional journey with detailed charts and time-based analysis",
          benefits: [
            "See mood trends over time",
            "Correlate events with emotional states",
            "Track progress in emotional regulation"
          ]
        },
        {
          icon: <Notebook size={20} className={colors.iconPrimary} />,
          title: "Smart Summaries",
          description: "Get concise overviews of your journaling patterns and key themes",
          benefits: [
            "Weekly/monthly recap emails",
            "Highlight important insights",
            "Identify emerging topics"
          ]
        }
      ]
    },
    {
      title: "Productivity System",
      description: "Achieve your goals with our structured support framework",
      icon: <Target size={28} className={colors.iconPrimary} />,
      features: [
        {
          icon: <Hash size={20} className={colors.iconPrimary} />,
          title: "Goal Tracking",
          description: "Set and monitor personal objectives with measurable milestones",
          benefits: [
            "Break goals into actionable steps",
            "Visual progress tracking",
            "Celebration of small wins"
          ]
        },
        {
          icon: <Clock size={20} className={colors.iconPrimary} />,
          title: "Habit Formation",
          description: "Build positive routines with our science-backed tracking system",
          benefits: [
            "Habit streak counters",
            "Reminders and prompts",
            "Visual progress charts"
          ]
        },
        {
          icon: <Zap size={20} className={colors.iconPrimary} />,
          title: "Action Items",
          description: "Turn reflections into concrete next steps with our action system",
          benefits: [
            "Convert insights to actions",
            "Priority categorization",
            "Integration with calendars"
          ]
        }
      ]
    },
    {
      title: "Data & Security",
      description: "Your private thoughts are protected with enterprise-grade security",
      icon: <Shield size={28} className={colors.iconPrimary} />,
      features: [
        {
          icon: <Shield size={20} className={colors.iconPrimary} />,
          title: "End-to-End Encryption",
          description: "Military-grade protection for your most private entries",
          benefits: [
            "Zero-knowledge architecture",
            "Client-side encryption",
            "Secure cloud synchronization"
          ]
        },
        {
          icon: <BookOpen size={20} className={colors.iconPrimary} />,
          title: "Data Portability",
          description: "Export your data anytime in multiple formats",
          benefits: [
            "PDF, JSON, and CSV exports",
            "Complete data ownership",
            "Therapist-friendly formats"
          ]
        },
        {
          icon: <Gauge size={20} className={colors.iconPrimary} />,
          title: "Usage Analytics",
          description: "Understand your journaling habits with clear metrics",
          benefits: [
            "Writing frequency analysis",
            "Time-of-day patterns",
            "Session duration tracking"
          ]
        }
      ]
    }
  ];

  const allFeatures = [
    {
      icon: <TrendingUp size={20} className={colors.iconPrimary} />,
      title: "Mood Trend Visualization",
      description: "Interactive charts showing your emotional journey over time"
    },
    {
      icon: <AlertTriangle size={20} className={colors.iconPrimary} />,
      title: "Pattern Alerts",
      description: "Notifications when unusual writing patterns are detected"
    },
    {
      icon: <Folders size={20} className={colors.iconPrimary} />,
      title: "Automatic Tagging",
      description: "AI organizes entries into meaningful categories automatically"
    },
    {
      icon: <HeartPulse size={20} className={colors.iconPrimary} />,
      title: "Wellness Check-ins",
      description: "Periodic assessments of your mental and emotional state"
    },
    {
      icon: <BarChart size={20} className={colors.iconPrimary} />,
      title: "Progress Metrics",
      description: "Quantifiable measurements of your personal growth"
    },
    {
      icon: <Sparkles size={20} className={colors.iconPrimary} />,
      title: "Daily Prompts",
      description: "Thought-provoking questions to spark meaningful reflections"
    }
  ];

  return (
    <div className={`min-h-screen w-full ${colors.background} ${colors.textPrimary} transition-colors duration-300`}>
      
      {/* Hero Section */}
      <section className="w-full py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            Powerful Features for <span className="bg-gradient-to-r from-purple-400 to-teal-400 bg-clip-text text-transparent">Personal Growth</span>
          </h1>
          <p className={`text-xl max-w-3xl mx-auto mb-10 ${colors.textSecondary}`}>
            MyMindMirror combines cutting-edge technology with thoughtful design to create the ultimate journaling experience.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/register"
              className={`${colors.buttonPrimary} text-white px-8 py-3 rounded-full font-medium flex items-center justify-center space-x-2 transition-all hover:shadow-lg`}
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/demo"
              className={`px-8 py-3 rounded-full font-medium flex items-center justify-center space-x-2 transition-all hover:shadow-lg border ${colors.cardBorder} ${colors.textPrimary}`}
            >
              <span>Try Live Demo</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Main Features Section */}
      <section className="w-full py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {featureCategories.map((category, index) => (
            <div key={index} className={`mb-24 ${index % 2 === 0 ? '' : ''}`}>
              <div className={`flex flex-col lg:flex-row items-center gap-12 mb-12`}>
                <div className={`lg:w-2/5 ${index % 2 === 0 ? 'lg:order-1' : 'lg:order-2'}`}>
                  <div className={`w-16 h-16 rounded-xl mb-6 flex items-center justify-center ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                    {category.icon}
                  </div>
                  <h2 className="text-3xl font-bold mb-4">{category.title}</h2>
                  <p className={`text-lg mb-6 ${colors.textSecondary}`}>{category.description}</p>
                  <Link
                    to="/register"
                    className={`inline-flex items-center ${colors.primary} font-medium`}
                  >
                    Try this feature <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </div>
                <div className={`lg:w-3/5 ${index % 2 === 0 ? 'lg:order-2' : 'lg:order-1'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {category.features.map((feature, fIndex) => (
                      <div 
                        key={fIndex}
                        className={`rounded-xl ${colors.cardBg} ${colors.cardBorder} border p-6 hover:shadow-lg transition-all`}
                      >
                        <div className={`w-12 h-12 rounded-lg mb-4 flex items-center justify-center ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100'}`}>
                          {feature.icon}
                        </div>
                        <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                        <p className={`text-sm mb-4 ${colors.textSecondary}`}>{feature.description}</p>
                        <ul className="space-y-2">
                          {feature.benefits.map((benefit, bIndex) => (
                            <li key={bIndex} className="flex items-start">
                              <div className={`w-4 h-4 mt-1 mr-2 flex-shrink-0 rounded-full ${colors.iconSecondary}`}></div>
                              <span className={`text-sm ${colors.textSecondary}`}>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* All Features Grid */}
      <section className="w-full py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-transparent to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Complete <span className="bg-gradient-to-r from-purple-400 to-teal-400 bg-clip-text text-transparent">Feature Set</span>
            </h2>
            <p className={`text-lg max-w-3xl mx-auto ${colors.textSecondary}`}>
              Everything you need for meaningful self-reflection and personal growth.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {allFeatures.map((feature, index) => (
              <div 
                key={index}
                className={`rounded-xl ${colors.cardBg} ${colors.cardBorder} border p-6 hover:shadow-lg transition-all`}
              >
                <div className={`w-12 h-12 rounded-lg mb-4 flex items-center justify-center ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100'}`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className={`text-sm ${colors.textSecondary}`}>{feature.description}</p>
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
            
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Ready to Transform Your Journaling?
            </h2>
            <p className={`text-lg mb-8 max-w-2xl mx-auto ${colors.textSecondary}`}>
              Join thousands who have discovered deeper self-awareness with MyMindMirror.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/register"
                className={`${colors.buttonPrimary} text-white px-8 py-3 rounded-full font-medium flex items-center justify-center space-x-2 transition-all hover:shadow-lg`}
              >
                <span>Start Free Trial</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/pricing"
                className={`px-8 py-3 rounded-full font-medium flex items-center justify-center space-x-2 transition-all hover:shadow-lg border ${colors.cardBorder} ${colors.textPrimary}`}
              >
                <span>View Pricing</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default FeaturesPage;