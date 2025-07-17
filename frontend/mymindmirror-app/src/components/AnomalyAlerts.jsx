// src/components/AnomalyAlerts.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';
import { AlertCircle, CheckCircle, Loader, ChevronDown, ChevronUp } from 'lucide-react'; // Added Chevron icons

function AnomalyAlerts() {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAllAnomalies, setShowAllAnomalies] = useState(false); // New state for expanding/collapsing

  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Define dynamic colors based on theme
  const colors = {
    light: {
      cardBg: 'bg-white/60',
      cardShadow: 'shadow-lg',
      textColor: 'text-gray-700',
      accentColor: 'text-[#FF8A7A]',
      positiveColor: 'text-[#5CC8C2]',
      borderColor: 'border-white/30',
      alertBg: 'bg-red-50',
      alertBorder: 'border-red-200',
      alertText: 'text-red-700',
      alertIcon: 'text-red-600',
      noAnomalyBg: 'bg-green-50',
      noAnomalyBorder: 'border-green-200',
      noAnomalyText: 'text-green-700',
      noAnomalyIcon: 'text-green-600',
      loadingText: 'text-gray-700',
      buttonBg: 'bg-gradient-to-br from-gray-100 to-gray-200',
      buttonHover: 'hover:from-gray-200 hover:to-gray-300',
      buttonText: 'text-gray-700',
      buttonBorder: 'border-gray-300',
    },
    dark: {
      cardBg: 'bg-black/40',
      cardShadow: 'shadow-lg',
      textColor: 'text-gray-300',
      accentColor: 'text-[#FF6C5A]',
      positiveColor: 'text-[#8DE2DD]',
      borderColor: 'border-white/10',
      alertBg: 'bg-red-950/40',
      alertBorder: 'border-red-800',
      alertText: 'text-red-300',
      alertIcon: 'text-red-400',
      noAnomalyBg: 'bg-green-950/40',
      noAnomalyBorder: 'border-green-800',
      noAnomalyText: 'text-green-300',
      noAnomalyIcon: 'text-green-400',
      loadingText: 'text-gray-300',
      buttonBg: 'bg-gradient-to-br from-gray-700 to-gray-800',
      buttonHover: 'hover:from-gray-800 hover:to-gray-900',
      buttonText: 'text-gray-200',
      buttonBorder: 'border-gray-600',
    },
  };

  const currentColors = isDarkMode ? colors.dark : colors.light;

  const MAX_INITIAL_ANOMALIES = 3; // Number of anomalies to show initially

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
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        const aggregatedData = aggregatedDataResponse.data;
        console.log("Fetched aggregated data for anomaly detection:", aggregatedData);

        if (!aggregatedData || aggregatedData.length < 7) {
          setAnomalies([]);
          setLoading(false);
          return;
        }

        const anomalyDetectionResponse = await axios.post(
          'http://localhost:8080/api/ml/anomaly-detection',
          aggregatedData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (anomalyDetectionResponse.data && anomalyDetectionResponse.data.anomalies) {
          setAnomalies(anomalyDetectionResponse.data.anomalies);
          console.log("Anomaly detection results:", anomalyDetectionResponse.data.anomalies);
        } else {
          setError('Anomaly detection response was malformed or empty.');
        }

      } catch (err) {
        console.error('Error during anomaly detection process:', err.response ? err.response.data : err.message);
        setError('Failed to run anomaly detection. Ensure all services are running and you are logged in. Check console for details.');
      } finally {
        setLoading(false);
      }
    };

    fetchAndDetectAnomalies();
  }, []);

  const displayedAnomalies = showAllAnomalies ? anomalies : anomalies.slice(0, MAX_INITIAL_ANOMALIES);

  if (loading) {
    return (
      <div className={`p-6 rounded-xl ${currentColors.cardBg} ${currentColors.cardShadow} transition-all duration-500
                       flex flex-col items-center justify-center font-inter ${currentColors.loadingText}
                       min-h-[120px]`}>
        <Loader className="animate-spin-slow w-8 h-8 mb-3" style={{ color: currentColors.positiveColor }} />
        <p className="text-lg">Analyzing your journaling patterns...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 rounded-xl ${currentColors.cardBg} ${currentColors.cardShadow} transition-all duration-500
                       flex flex-col items-center justify-center font-inter ${currentColors.accentColor}
                       min-h-[120px]`}>
        <AlertCircle className="w-8 h-8 mb-3" />
        <p className="text-lg">{error}</p>
      </div>
    );
  }

  if (anomalies.length === 0) {
    return (
      <div className={`p-6 rounded-xl ${currentColors.cardBg} ${currentColors.cardShadow} transition-all duration-500
                       flex flex-col items-center justify-center font-inter ${currentColors.textColor}
                       min-h-[120px]`}>
        <CheckCircle className="w-8 h-8 mb-3" style={{ color: currentColors.noAnomalyIcon }} />
        <p className="text-lg font-semibold" style={{ color: currentColors.noAnomalyText }}>
          No unusual journaling patterns detected recently.
        </p>
        <p className="text-md mt-1" style={{ color: currentColors.textColor }}>
          Keep up the good work! Your patterns seem consistent.
        </p>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-xl ${currentColors.cardBg} ${currentColors.cardShadow} transition-all duration-500`}>
      <h2 className={`text-2xl font-poppins font-semibold ${currentColors.accentColor} mb-4 text-center`}>
        <AlertCircle className="inline-block w-7 h-7 mr-2 -mt-1" />
        Unusual Journaling Patterns Detected!
      </h2>
      <div className="space-y-4">
        {displayedAnomalies.map((anomaly, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg shadow-md transition-all duration-300
                        ${currentColors.alertBg} ${currentColors.alertBorder} border`}
          >
            <p className={`font-poppins font-semibold ${currentColors.alertText}`}>
              On {format(new Date(anomaly.date), 'MMMM d, yyyy')}:
            </p>
            <p className={`font-inter ${currentColors.alertText} mt-1`}>
              {anomaly.message}
            </p>
            {anomaly.type && anomaly.type.length > 0 && (
              <p className={`font-inter ${currentColors.alertText} text-sm mt-2 opacity-80`}>
                Impacted areas: {anomaly.type.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}
              </p>
            )}
          </div>
        ))}
      </div>

      {anomalies.length > MAX_INITIAL_ANOMALIES && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => setShowAllAnomalies(!showAllAnomalies)}
            className={`flex items-center px-6 py-2 rounded-full font-semibold text-lg
                        ${currentColors.buttonBg} ${currentColors.buttonHover} ${currentColors.buttonText}
                        border ${currentColors.buttonBorder} shadow-md transition-all duration-300 ease-in-out
                        transform hover:-translate-y-0.5 active:translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-opacity-75`}
          >
            {showAllAnomalies ? (
              <>
                Show Less <ChevronUp className="ml-2 w-5 h-5" />
              </>
            ) : (
              <>
                Show All ({anomalies.length - MAX_INITIAL_ANOMALIES} more) <ChevronDown className="ml-2 w-5 h-5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default AnomalyAlerts;
