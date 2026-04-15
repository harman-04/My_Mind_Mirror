import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';
import {
  AlertCircle, CheckCircle, Loader, ChevronDown, ChevronUp,
  TrendingDown, TrendingUp, Activity, Calendar as CalendarIcon,
  XCircle, Trash2
} from 'lucide-react';

const DISMISSED_ANOMALIES_KEY = 'dismissedAnomalies';

function AnomalyAlerts() {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAllAnomalies, setShowAllAnomalies] = useState(false);
  const [dismissedKeys, setDismissedKeys] = useState(new Set());

  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

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

  // Filter out dismissed anomalies
  const visibleAnomalies = anomalies.filter(a => !dismissedKeys.has(getAnomalyKey(a)));

  // Determine severity based on message text
  const getSeverity = (message, type) => {
    const lower = message.toLowerCase();
    if (lower.includes('significantly lower') || lower.includes('significantly higher')) {
      return 'high';
    }
    if (lower.includes('lower') || lower.includes('higher')) {
      return 'medium';
    }
    if (type?.includes('mood') && (message.includes('-0.') || message.includes('+0.'))) {
      return 'high';
    }
    return 'low';
  };

  const severityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      case 'medium': return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30';
      default: return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
    }
  };

  // Theme-based colors (glass‑morphic)
  const colors = {
    background: isDarkMode ? 'bg-gray-900' : 'bg-gray-50',
    cardBg: isDarkMode ? 'bg-gray-800/60 backdrop-blur-md' : 'bg-white/80 backdrop-blur-md',
    cardBorder: isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50',
    textPrimary: isDarkMode ? 'text-gray-100' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-gray-300' : 'text-gray-600',
    alertBg: isDarkMode ? 'bg-red-950/40' : 'bg-red-50/80',
    alertBorder: isDarkMode ? 'border-red-800/50' : 'border-red-300/50',
    alertText: isDarkMode ? 'text-red-300' : 'text-red-800',
    alertIcon: isDarkMode ? 'text-red-400' : 'text-red-500',
    noAnomalyBg: isDarkMode ? 'bg-green-950/40' : 'bg-green-50/80',
    noAnomalyBorder: isDarkMode ? 'border-green-800/50' : 'border-green-300/50',
    noAnomalyText: isDarkMode ? 'text-green-300' : 'text-green-800',
    noAnomalyIcon: isDarkMode ? 'text-green-400' : 'text-green-500',
    buttonBg: isDarkMode ? 'bg-gray-800/80' : 'bg-white/80',
    buttonHover: isDarkMode ? 'hover:bg-gray-700/80' : 'hover:bg-gray-100/80',
    buttonBorder: isDarkMode ? 'border-gray-600' : 'border-gray-300',
  };

  const MAX_INITIAL_ANOMALIES = 3;

  useEffect(() => {
    const fetchAndDetectAnomalies = async () => {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('jwtToken');
      if (!token) {
        setError('Authentication token not found. Please log in.');
        setLoading(false);
        return;
      }

      try {
        const thirtyDaysAgo = format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
        const today = format(new Date(), 'yyyy-MM-dd');

        const aggregatedDataResponse = await axios.get(
          `http://localhost:8080/api/ml/daily-aggregated-data?startDate=${thirtyDaysAgo}&endDate=${today}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const aggregatedData = aggregatedDataResponse.data;

        if (!aggregatedData || aggregatedData.length < 7) {
          setAnomalies([]);
          setLoading(false);
          return;
        }

        const anomalyDetectionResponse = await axios.post(
          'http://localhost:8080/api/ml/anomaly-detection',
          aggregatedData,
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );

        if (anomalyDetectionResponse.data && anomalyDetectionResponse.data.anomalies) {
          setAnomalies(anomalyDetectionResponse.data.anomalies);
        } else {
          setError('Anomaly detection response was malformed or empty.');
        }
      } catch (err) {
        console.error('Error during anomaly detection:', err.response?.data || err.message);
        setError('Failed to run anomaly detection. Ensure all services are running.');
      } finally {
        setLoading(false);
      }
    };

    fetchAndDetectAnomalies();
  }, []);

  const displayedAnomalies = showAllAnomalies ? visibleAnomalies : visibleAnomalies.slice(0, MAX_INITIAL_ANOMALIES);

  // Loading Skeleton
  if (loading) {
    return (
      <div className={`rounded-2xl ${colors.cardBg} border ${colors.cardBorder} shadow-xl backdrop-blur-sm overflow-hidden`}>
        <div className="p-6 animate-pulse">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-purple-500/20" />
          </div>
          <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mx-auto mb-3" />
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mx-auto mb-6" />
          <div className="space-y-3">
            <div className="h-20 bg-gray-300 dark:bg-gray-700 rounded-xl" />
            <div className="h-20 bg-gray-300 dark:bg-gray-700 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className={`rounded-2xl ${colors.cardBg} border ${colors.cardBorder} shadow-xl backdrop-blur-sm p-6 text-center`}>
        <div className="inline-flex p-3 rounded-full bg-red-500/10 mb-4">
          <AlertCircle size={32} className="text-red-500" />
        </div>
        <p className="text-red-500 font-medium">{error}</p>
        <p className={`text-sm ${colors.textSecondary} mt-2`}>
          Anomaly detection requires the ML service to be running. Check your connection.
        </p>
      </div>
    );
  }

  // No Anomalies (or all dismissed)
  if (visibleAnomalies.length === 0) {
    return (
      <div className={`rounded-2xl ${colors.cardBg} border ${colors.cardBorder} shadow-xl backdrop-blur-sm p-6 text-center transition-all duration-300 hover:shadow-2xl`}>
        <div className="inline-flex p-3 rounded-full bg-green-500/10 mb-4">
          <CheckCircle size={32} className="text-green-500" />
        </div>
        <h3 className="text-xl font-semibold text-green-600 dark:text-green-400 mb-2">
          All Clear!
        </h3>
        <p className={`${colors.textSecondary}`}>
          No unusual journaling patterns detected recently. Keep up the great work!
        </p>
      </div>
    );
  }

  // Anomalies Found
  return (
    <div className={`rounded-2xl ${colors.cardBg} border ${colors.cardBorder} shadow-xl backdrop-blur-sm overflow-hidden transition-all duration-300`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-red-500/10">
              <Activity size={24} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-poppins font-semibold text-red-600 dark:text-red-400">
              Unusual Patterns Detected
            </h2>
          </div>
          <button
            onClick={dismissAll}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                        ${colors.buttonBg} ${colors.buttonHover} border ${colors.buttonBorder}`}
          >
            <Trash2 size={14} /> Clear all
          </button>
        </div>
        <p className={`text-center text-sm ${colors.textSecondary} mb-6`}>
          We've noticed some significant changes in your journaling patterns.
        </p>

        <div className="space-y-4">
          {displayedAnomalies.map((anomaly, index) => {
            const severity = getSeverity(anomaly.message, anomaly.type);
            return (
              <div
                key={index}
                className={`p-4 rounded-xl ${colors.alertBg} border ${colors.alertBorder} transition-all duration-300 hover:scale-[1.02] hover:shadow-md`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {anomaly.type?.includes('mood') ? (
                      <TrendingDown size={18} className="text-red-500" />
                    ) : (
                      <TrendingUp size={18} className="text-orange-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                      <div className="flex items-center gap-1 text-sm text-red-600 dark:text-red-300">
                        <CalendarIcon size={14} />
                        <span className="font-medium">{format(new Date(anomaly.date), 'MMMM d, yyyy')}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${severityColor(severity)}`}>
                        {severity === 'high' ? 'High impact' : severity === 'medium' ? 'Moderate' : 'Noticeable'}
                      </span>
                    </div>
                    <p className={`${colors.alertText} text-sm leading-relaxed`}>
                      {anomaly.message}
                    </p>
                    {anomaly.type && anomaly.type.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {anomaly.type.map(t => (
                          <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-600 dark:text-red-300">
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => dismissAnomaly(anomaly)}
                    className="text-gray-500 hover:text-red-500 transition"
                    title="Dismiss"
                  >
                    <XCircle size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {visibleAnomalies.length > MAX_INITIAL_ANOMALIES && (
          <div className="flex justify-center mt-6">
            <button
              onClick={() => setShowAllAnomalies(!showAllAnomalies)}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all duration-300
                          ${colors.buttonBg} ${colors.buttonHover} border ${colors.buttonBorder} shadow-sm
                          hover:shadow-md active:scale-95`}
            >
              {showAllAnomalies ? (
                <>Show Less <ChevronUp size={16} /></>
              ) : (
                <>Show All ({visibleAnomalies.length - MAX_INITIAL_ANOMALIES} more) <ChevronDown size={16} /></>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AnomalyAlerts;