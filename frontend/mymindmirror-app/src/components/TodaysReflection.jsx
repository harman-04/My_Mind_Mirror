import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns'; // For date formatting

function TodaysReflection({ latestEntry }) {
  const [reflection, setReflection] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Function to generate reflection using Gemini
  const generateReflection = async (entry) => {
    setLoading(true);
    setError('');
    setReflection(''); // Clear previous reflection

    const token = localStorage.getItem('jwtToken');
    if (!token) {
      setError('Not authenticated to generate reflection.');
      setLoading(false);
      return;
    }

    // Check if the latest entry is for today
    const today = format(new Date(), 'yyyy-MM-dd');
    if (!entry || entry.entryDate !== today) {
      setReflection("Journal an entry today to get your daily reflection!");
      setLoading(false);
      return;
    }

    // Defensive parsing for emotions and coreConcerns
    let parsedEmotions = {};
    try {
      parsedEmotions = typeof entry.emotions === 'string' ? JSON.parse(entry.emotions) : entry.emotions;
      if (typeof parsedEmotions !== 'object' || parsedEmotions === null) parsedEmotions = {};
    } catch (e) {
      console.error("Error parsing entry.emotions for reflection prompt:", e);
      parsedEmotions = {};
    }

    let parsedCoreConcerns = [];
    try {
      parsedCoreConcerns = typeof entry.coreConcerns === 'string' ? JSON.parse(entry.coreConcerns) : entry.coreConcerns;
      if (!Array.isArray(parsedCoreConcerns)) parsedCoreConcerns = [];
    } catch (e) {
      console.error("Error parsing entry.coreConcerns for reflection prompt:", e);
      parsedCoreConcerns = [];
    }

    const emotions_str = Object.entries(parsedEmotions)
      .filter(([, score]) => score > 0.01) // Filter out very low scores
      .map(([label, score]) => `${label} (${(score * 100).toFixed(1)}%)`)
      .join(', ') || 'No specific emotions detected.';
      
    const concerns_str = parsedCoreConcerns.length > 0 ? 
      parsedCoreConcerns.join(', ') : 'No specific concerns identified.';

    const prompt = `Based on the following journal entry, its detected emotions, and core concerns,
    generate a concise (1-2 sentences), empathetic, and insightful "Today's Reflection" or a short, encouraging thought.
    Focus on summarizing the emotional state and offering a gentle, positive perspective.

    Journal Entry: "${entry.rawText}"
    Detected Emotions: ${emotions_str}
    Core Concerns: ${concerns_str}

    Today's Reflection:`;

    try {
      const flaskResponse = await axios.post('http://localhost:5000/generate_reflection', { prompt_text: prompt }, {
        headers: { Authorization: `Bearer ${token}` } // Not strictly needed for Flask, but good practice if Flask had auth
      });

      if (flaskResponse.data && flaskResponse.data.reflection) {
        setReflection(flaskResponse.data.reflection);
      } else {
        setReflection("Couldn't generate a reflection today. Keep journaling!");
      }

    } catch (err) {
      console.error('Error generating reflection:', err.response ? err.response.data : err.message);
      setError('Failed to generate reflection.');
      setReflection("Couldn't generate a reflection today. Keep journaling!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (latestEntry) {
      generateReflection(latestEntry);
    } else {
      setReflection("Journal an entry today to get your daily reflection!");
    }
  }, [latestEntry]); // Regenerate when the latest entry changes

  return (
    <div className="p-6 rounded-lg bg-white/60 dark:bg-black/40 shadow-inner transition-all duration-500">
      <h3 className="text-2xl font-poppins font-semibold mb-3 text-[#5CC8C2] dark:text-[#B399D4]">
        Today's Reflection
      </h3>
      {loading ? (
        <p className="font-inter text-gray-700 dark:text-gray-300">Generating your reflection...</p>
      ) : error ? (
        <p className="font-inter text-[#FF8A7A]">{error}</p>
      ) : (
        <p className="font-playfair italic text-lg text-gray-800 dark:text-gray-200">
          "{reflection}"
        </p>
      )}
    </div>
  );
}

export default TodaysReflection;
