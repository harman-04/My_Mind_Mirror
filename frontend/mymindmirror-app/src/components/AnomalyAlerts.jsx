import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns'; // For date formatting

function AnomalyAlerts() {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        // Step 1: Fetch daily aggregated data from Spring Boot
        // Default to last 30 days for anomaly detection window
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

        // Anomaly detection requires at least 7 days of data for meaningful calculation
        if (!aggregatedData || aggregatedData.length < 7) {
          setAnomalies([]); // Not enough data for meaningful anomaly detection
          setLoading(false);
          return;
        }

        // Step 2: Send aggregated data to Spring Boot's anomaly detection endpoint
        // Spring Boot will then forward this to Flask ML service
        const anomalyDetectionResponse = await axios.post(
          'http://localhost:8080/api/ml/anomaly-detection',
          aggregatedData, // Send the list of aggregated data
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
  }, []); // Run once on component mount

  if (loading) {
    return (
      <div className="p-6 rounded-lg bg-white/60 dark:bg-black/40 shadow-inner transition-all duration-500
                      flex items-center justify-center font-inter text-gray-700 dark:text-gray-300">
        Analyzing your journaling patterns...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-lg bg-white/60 dark:bg-black/40 shadow-inner transition-all duration-500
                      flex items-center justify-center font-inter text-[#FF8A7A]">
        {error}
      </div>
    );
  }

  if (anomalies.length === 0) {
    return (
      <div className="p-6 rounded-lg bg-white/60 dark:bg-black/40 shadow-inner transition-all duration-500
                      flex items-center justify-center font-inter text-gray-700 dark:text-gray-300">
        No unusual journaling patterns detected recently. Keep up the good work!
      </div>
    );
  }

  return (
    <div className="p-6 rounded-lg bg-white/60 dark:bg-black/40 shadow-inner transition-all duration-500">
      <h2 className="text-2xl font-poppins font-semibold text-[#FF8A7A] dark:text-[#FF6C5A] mb-4 text-center">
        Unusual Journaling Patterns Detected!
      </h2>
      <div className="space-y-4">
        {anomalies.map((anomaly, index) => (
          <div key={index} className="bg-red-100 dark:bg-red-900/40 p-4 rounded-lg shadow-md border border-red-200 dark:border-red-700">
            <p className="font-poppins font-semibold text-red-700 dark:text-red-300">
              On {format(new Date(anomaly.date), 'MMMM d,yyyy')}:
            </p>
            <p className="font-inter text-red-600 dark:text-red-400 mt-1">
              {anomaly.message}
            </p>
            {anomaly.type && anomaly.type.length > 0 && (
              <p className="font-inter text-red-500 dark:text-red-500 text-sm mt-2">
                Impacted areas: {anomaly.type.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default AnomalyAlerts;
