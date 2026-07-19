// src/components/AnomalyAlerts.jsx
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';
import { useAnomalies } from '../hooks/useAnomalyData';
import {
  AlertCircle, CheckCircle, ChevronDown, ChevronUp,
  TrendingDown, TrendingUp, Activity, Calendar as CalendarIcon,
  XCircle, Trash2, Sparkles
} from 'lucide-react';

const DISMISSED_ANOMALIES_KEY = 'dismissedAnomalies';

function AnomalyAlerts() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [showAllAnomalies, setShowAllAnomalies] = useState(false);
  const [dismissedKeys, setDismissedKeys] = useState(new Set());

  const { data: anomalies = [], isLoading, isError } = useAnomalies();

  // Load dismissed anomalies from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(DISMISSED_ANOMALIES_KEY);
    if (stored) {
      try {
        setDismissedKeys(new Set(JSON.parse(stored)));
      } catch (e) {
        console.error('Failed to parse dismissed anomalies', e);
      }
    }
  }, []);

  // Save dismissed keys to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(DISMISSED_ANOMALIES_KEY, JSON.stringify([...dismissedKeys]));
  }, [dismissedKeys]);

  const getAnomalyKey = (anomaly) => `${anomaly.date}-${anomaly.type?.join(',') || 'unknown'}`;

  const dismissAnomaly = (anomaly) => {
    const key = getAnomalyKey(anomaly);
    setDismissedKeys(prev => new Set([...prev, key]));
  };

  const dismissAll = () => {
    const allKeys = anomalies.map(a => getAnomalyKey(a));
    setDismissedKeys(prev => new Set([...prev, ...allKeys]));
  };

  const visibleAnomalies = anomalies.filter(a => !dismissedKeys.has(getAnomalyKey(a)));

  const getSeverityInfo = (message, type) => {
    const lower = message.toLowerCase();
    if (lower.includes('significantly lower') || lower.includes('significantly higher') || (type?.includes('mood') && (message.includes('-0.') || message.includes('+0.')))) {
      return {
        level: 'high', label: 'High Impact',
        bg: 'bg-rose-50 dark:bg-rose-500/10', border: 'border-rose-200 dark:border-rose-500/20',
        text: 'text-rose-800 dark:text-rose-200', icon: 'text-rose-500', tag: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
      };
    }
    if (lower.includes('lower') || lower.includes('higher')) {
      return {
        level: 'medium', label: 'Moderate',
        bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/20',
        text: 'text-amber-800 dark:text-amber-200', icon: 'text-amber-500', tag: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
      };
    }
    return {
      level: 'low', label: 'Noticeable',
      bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/20',
      text: 'text-blue-800 dark:text-blue-200', icon: 'text-blue-500', tag: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
    };
  };

  const MAX_INITIAL_ANOMALIES = 3;
  const displayedAnomalies = showAllAnomalies ? visibleAnomalies : visibleAnomalies.slice(0, MAX_INITIAL_ANOMALIES);

  // 💡 Shared Premium Base Container Classes (Matches the new App/JournalPage Theme)
  const baseCardClasses = "rounded-2xl lg:rounded-3xl border bg-white/70 dark:bg-[#1A162F]/60 backdrop-blur-xl border-white/50 dark:border-white/10 shadow-lg ring-1 ring-black/5 dark:ring-white/5 overflow-hidden transition-all duration-300";

  if (isLoading) {
    return (
      <div className={`${baseCardClasses} p-4 sm:p-6 lg:p-8 animate-pulse`}>
        <div className="flex items-center justify-center mb-4 lg:mb-6">
          <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-purple-500/20" />
        </div>
        <div className="h-6 lg:h-8 bg-gray-200 dark:bg-gray-700/50 rounded-full w-1/3 mx-auto mb-4" />
        <div className="h-4 lg:h-5 bg-gray-200 dark:bg-gray-700/50 rounded-full w-1/2 mx-auto mb-6 lg:mb-8" />
        <div className="space-y-3 lg:space-y-4">
          <div className="h-20 lg:h-24 bg-gray-200 dark:bg-gray-700/50 rounded-xl lg:rounded-2xl w-full" />
          <div className="h-20 lg:h-24 bg-gray-200 dark:bg-gray-700/50 rounded-xl lg:rounded-2xl w-full" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={`${baseCardClasses} p-6 lg:p-10 text-center`}>
        <div className="inline-flex p-3 lg:p-4 rounded-full bg-rose-500/10 mb-4 lg:mb-5">
          <AlertCircle className="w-8 h-8 lg:w-10 lg:h-10 text-rose-500" />
        </div>
        <h3 className="text-lg lg:text-xl font-bold text-rose-600 dark:text-rose-400">Failed to analyze patterns</h3>
        <p className="text-sm lg:text-base text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
          Anomaly detection requires the machine learning service to be active.
        </p>
      </div>
    );
  }

  if (visibleAnomalies.length === 0) {
    return (
      <div className={`${baseCardClasses} p-6 sm:p-8 lg:p-10 text-center hover:shadow-xl`}>
        <div className="relative inline-flex p-4 lg:p-5 rounded-full bg-emerald-500/10 mb-4 lg:mb-5">
          <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-xl" />
          <CheckCircle className="relative w-9 h-9 lg:w-12 lg:h-12 text-emerald-500" />
        </div>
        <h3 className="text-xl lg:text-2xl font-poppins font-bold text-emerald-600 dark:text-emerald-400 mb-2">
          Patterns Look Steady
        </h3>
        <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto text-sm lg:text-base">
          No unusual emotional shifts detected recently. You're maintaining a great emotional balance!
        </p>
      </div>
    );
  }

  return (
    <div className={baseCardClasses}>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header - Flex wrap ensures no squishing on mobile */}
        <div className="flex flex-wrap items-center justify-between mb-5 lg:mb-6 gap-4">
          <div className="flex items-center gap-3 lg:gap-4">
            <div className="p-2.5 lg:p-3 rounded-full bg-rose-500/10 text-rose-500 shadow-sm border border-rose-500/20">
              <Activity className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-poppins font-extrabold text-rose-600 dark:text-rose-400 leading-tight tracking-tight">
                Insights & Anomalies
              </h2>
              <p className="text-[11px] sm:text-xs lg:text-sm text-gray-500 dark:text-gray-400 mt-0.5 lg:mt-1 font-medium">
                Significant shifts in your journal
              </p>
            </div>
          </div>
          <button
            onClick={dismissAll}
            className="flex items-center gap-1.5 px-3 py-1.5 lg:px-4 lg:py-2 rounded-full text-xs lg:text-sm font-semibold text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-700 active:scale-95 transition-all shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> Clear All
          </button>
        </div>

        {/* Anomalies List */}
        <div className="space-y-3 lg:space-y-4">
          {displayedAnomalies.map((anomaly, index) => {
            const severity = getSeverityInfo(anomaly.message, anomaly.type);
            return (
              <div
                key={index}
                className={`relative p-3.5 sm:p-4 lg:p-5 rounded-xl lg:rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-md lg:hover:shadow-lg ${severity.bg} ${severity.border}`}
              >
                <div className="flex items-start gap-3 sm:gap-4 lg:gap-5">

                  {/* Icon */}
                  <div className="mt-1 shrink-0 bg-white/60 dark:bg-black/20 p-2 lg:p-2.5 rounded-full shadow-sm">
                    {anomaly.type?.includes('mood') ? (
                      <TrendingDown className={`w-4 h-4 lg:w-5 lg:h-5 ${severity.icon}`} />
                    ) : (
                      <Sparkles className={`w-4 h-4 lg:w-5 lg:h-5 ${severity.icon}`} />
                    )}
                  </div>

                  {/* Text Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 lg:gap-3 mb-1.5 lg:mb-2">
                      <div className="flex items-center gap-1.5 text-[11px] lg:text-xs font-bold text-gray-600 dark:text-gray-300 bg-white/60 dark:bg-black/20 px-2 lg:px-2.5 py-1 rounded-md shadow-sm">
                        <CalendarIcon className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                        {format(new Date(anomaly.date), 'MMM d, yyyy')}
                      </div>
                      <span className={`text-[9px] lg:text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-md shadow-sm ${severity.tag}`}>
                        {severity.label}
                      </span>
                    </div>
                    <p className={`text-sm lg:text-base font-medium leading-relaxed ${severity.text}`}>
                      {anomaly.message}
                    </p>

                    {/* Tags */}
                    {anomaly.type && anomaly.type.length > 0 && (
                      <div className="mt-2.5 lg:mt-3 flex flex-wrap gap-1.5 lg:gap-2">
                        {anomaly.type.map(t => (
                          <span key={t} className={`text-[10px] lg:text-xs font-bold px-2.5 py-0.5 lg:py-1 rounded-full bg-white/70 dark:bg-black/40 ${severity.text} border ${severity.border} shadow-sm`}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dismiss Single Button */}
                  <button
                    onClick={() => dismissAnomaly(anomaly)}
                    className="shrink-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 active:scale-90 transition p-1.5 lg:p-2 bg-white/40 dark:bg-black/10 hover:bg-white/80 dark:hover:bg-black/30 rounded-full"
                    title="Dismiss"
                  >
                    <XCircle className="w-4 h-4 lg:w-5 lg:h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Show More/Less Toggle */}
        {visibleAnomalies.length > MAX_INITIAL_ANOMALIES && (
          <div className="flex justify-center mt-5 lg:mt-6 pt-4 lg:pt-5 border-t border-gray-200/50 dark:border-gray-700/50">
            <button
              onClick={() => setShowAllAnomalies(!showAllAnomalies)}
              className="flex items-center gap-1.5 px-4 py-2 lg:px-5 lg:py-2.5 rounded-full text-xs lg:text-sm font-bold text-gray-700 dark:text-gray-200 bg-white/60 dark:bg-[#1A162F]/80 border border-gray-200 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-800 active:scale-95 transition-all shadow-sm"
            >
              {showAllAnomalies ? (
                <>Show Less <ChevronUp className="w-3.5 h-3.5 lg:w-4 lg:h-4" /></>
              ) : (
                <>Show All ({visibleAnomalies.length - MAX_INITIAL_ANOMALIES} more) <ChevronDown className="w-3.5 h-3.5 lg:w-4 lg:h-4" /></>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(AnomalyAlerts);