// src/hooks/useJournalData.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { format } from 'date-fns';

const API_BASE_URL = 'http://localhost:8080/api';
// const FLASK_API_URL = 'http://localhost:5000'; // ⭐ REMOVED: No direct Flask API calls from frontend ⭐

const getToken = () => localStorage.getItem('jwtToken');

// --- Query for All Journal Entries ---
const fetchAllJournalEntries = async () => {
  const token = getToken();
  if (!token) throw new Error('Not authenticated.');

  const response = await axios.get(`${API_BASE_URL}/journal/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  // Ensure entries are sorted by creationTimestamp descending for consistency
  return response.data.sort(
    (a, b) => new Date(b.creationTimestamp).getTime() - new Date(a.creationTimestamp).getTime()
  );
};

export const useJournalEntries = () => {
  return useQuery({
    queryKey: ['journalEntries'],
    queryFn: fetchAllJournalEntries,
    // When switching tabs, we don't want to refetch *all* entries unnecessarily
    // if the user hasn't explicitly added/edited/deleted something.
    // We'll rely on explicit invalidation after mutations.
    staleTime: 10 * 60 * 1000, // Data considered fresh for 10 minutes
    // By default, refetchOnMount is true. For a list that's often viewed,
    // you might want to keep it true, or set a longer staleTime.
    // Keeping it true for now, as it ensures data is fresh on initial load/remount.
    refetchOnMount: true,
  });
};

// --- Query for Today's Reflection (Gemini Call) ---
const generateTodaysReflection = async (latestEntry) => {
  const token = getToken();
  if (!token) throw new Error('Not authenticated to generate reflection.');

  const today = format(new Date(), 'yyyy-MM-dd');
  if (!latestEntry || latestEntry.entryDate !== today) {
    // If no entry or not today's entry, return a specific message
    return "Journal an entry today to get your daily reflection!";
  }

  let parsedEmotions = {};
  try {
    parsedEmotions = typeof latestEntry.emotions === 'string' ? JSON.parse(latestEntry.emotions) : latestEntry.emotions;
    if (typeof parsedEmotions !== 'object' || parsedEmotions === null) parsedEmotions = {};
  } catch (e) {
    console.error("Error parsing entry.emotions for reflection prompt:", e);
    parsedEmotions = {};
  }

  let parsedCoreConcerns = [];
  try {
    parsedCoreConcerns = typeof latestEntry.coreConcerns === 'string' ? JSON.parse(latestEntry.coreConcerns) : latestEntry.coreConcerns;
    if (!Array.isArray(parsedCoreConcerns)) parsedCoreConcerns = [];
  } catch (e) {
    console.error("Error parsing entry.coreConcerns for reflection prompt:", e);
    parsedCoreConcerns = [];
  }

  const emotions_str = Object.entries(parsedEmotions)
    .filter(([, score]) => score > 0.01)
    .map(([label, score]) => `${label} (${(score * 100).toFixed(1)}%)`)
    .join(', ') || 'No specific emotions detected.';

  const concerns_str = parsedCoreConcerns.length > 0 ?
    parsedCoreConcerns.join(', ') : 'No specific concerns identified.';

  const prompt = `Based on the following journal entry, its detected emotions, and core concerns,
    generate a concise (1-2 sentences), empathetic, and insightful "Today's Reflection" or a short, encouraging thought.
    Focus on summarizing the emotional state and offering a gentle, positive perspective.

    Journal Entry: "${latestEntry.rawText}"
    Detected Emotions: ${emotions_str}
    Core Concerns: ${concerns_str}

    Today's Reflection:`;

  try {
    // ⭐ MODIFIED: Call Spring Boot API endpoint for reflection generation ⭐
    const springBootResponse = await axios.post(`${API_BASE_URL}/reflection/generate`, { prompt_text: prompt }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return springBootResponse.data?.reflection || "Couldn't generate a reflection today. Keep journaling!";
  } catch (err) {
    console.error('Error generating reflection:', err.response ? err.response.data : err.message);
    throw new Error('Failed to generate reflection.');
  }
};

export const useTodaysReflection = (latestEntry) => {
  // The query key should change only when the underlying journal entry that the reflection is based on changes.
  // We use latestEntry.id as part of the key. If latestEntry is null, or its ID is null, we use a static key.
  const queryKey = ['todaysReflection', latestEntry ? latestEntry.id : 'noEntry'];

  return useQuery({
    queryKey: queryKey,
    queryFn: () => generateTodaysReflection(latestEntry),
    // Only enable this query if latestEntry is provided AND it's for today's date.
    enabled: !!latestEntry && format(new Date(), 'yyyy-MM-dd') === latestEntry.entryDate,
    // This is a direct call to Flask (Gemini), so we want to cache its result aggressively.
    // If the latestEntry object (by ID) doesn't change, we should use the cached reflection.
    staleTime: Infinity, // Keep this reflection fresh indefinitely unless explicitly invalidated
    cacheTime: 30 * 60 * 1000, // Keep in cache for 30 minutes even if no observers
    refetchOnWindowFocus: false, // Prevent unnecessary re-runs on tab switch
    refetchOnMount: false, // Prevent unnecessary re-runs on component remount
  });
};


// --- Mutations (Add, Update, Delete) ---
export const useAddJournalEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newEntryData) => {
      const token = getToken();
      if (!token) throw new Error('Not authenticated.');
      return axios.post(`${API_BASE_URL}/journal`, newEntryData, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      // Invalidate all relevant queries to force re-fetch on next access
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      // Invalidate today's reflection because a new entry might make it the latest one
      queryClient.invalidateQueries({ queryKey: ['todaysReflection'] });
      // You might also want to invalidate 'weeklyEntries', 'moodData', etc. if they are separate queries
    },
  });
};

export const useUpdateJournalEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, updatedText }) => {
      const token = getToken();
      if (!token) throw new Error('Not authenticated.');
      return axios.put(`${API_BASE_URL}/journal/${entryId}`, { rawText: updatedText }, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate the main list of journal entries
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      // If the updated entry is the latest one for today, invalidate today's reflection
      // We need to check if the updated entry's ID matches the current latest entry's ID
      // and if its date is today.
      const latestEntryInCache = queryClient.getQueryData(['journalEntries'])?.[0];
      if (latestEntryInCache && latestEntryInCache.id === data.data.id && // Use data.data.id from response
          format(new Date(), 'yyyy-MM-dd') === latestEntryInCache.entryDate) {
        queryClient.invalidateQueries({ queryKey: ['todaysReflection', latestEntryInCache.id] });
      }
    },
  });
};

export const useDeleteJournalEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId) => {
      const token = getToken();
      if (!token) throw new Error('Not authenticated.');
      return axios.delete(`${API_BASE_URL}/journal/${entryId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: (data, entryIdToDelete) => {
      // Optimistically update the cache to remove the deleted entry immediately
      queryClient.setQueryData(['journalEntries'], (oldEntries) =>
        oldEntries ? oldEntries.filter((entry) => entry.id !== entryIdToDelete) : []
      );
      // Invalidate today's reflection to force it to re-evaluate (it might now be based on a different entry or no entry)
      queryClient.invalidateQueries({ queryKey: ['todaysReflection'] });
    },
  });
};

// --- Search Queries (New) ---

export const useSearchJournalEntries = (searchParams) => {
  return useQuery({
    queryKey: ['journalSearchResults', searchParams],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error('Not authenticated.');

      let url = `${API_BASE_URL}/journal/history`; // Default for date search

      const params = {};
      if (searchParams.searchType === 'keyword') {
        if (!searchParams.keyword.trim()) throw new Error('Please enter a keyword to search.');
        url = `${API_BASE_URL}/journal/search/keyword`;
        params.keyword = searchParams.keyword.trim();
      } else if (searchParams.searchType === 'mood') {
        const parsedMinMood = searchParams.minMood === '' ? null : parseFloat(searchParams.minMood);
        const parsedMaxMood = searchParams.maxMood === '' ? null : parseFloat(searchParams.maxMood);

        if (isNaN(parsedMinMood) && isNaN(parsedMaxMood)) {
          throw new Error('Please enter at least a minimum or maximum mood score.');
        }
        if (parsedMinMood !== null && parsedMaxMood !== null && parsedMinMood > parsedMaxMood) {
          throw new Error('Minimum mood score cannot be greater than maximum mood score.');
        }
        url = `${API_BASE_URL}/journal/search/mood`;
        if (parsedMinMood !== null) params.minMood = parsedMinMood;
        if (parsedMaxMood !== null) params.maxMood = parsedMaxMood;
      } else if (searchParams.searchType === 'date') {
        if (!searchParams.startDate && !searchParams.endDate) {
          throw new Error('Please select at least a start date or an end date.');
        }
        if (searchParams.startDate && searchParams.endDate && new Date(searchParams.startDate) > new Date(searchParams.endDate)) {
          throw new Error('Start date cannot be after end date.');
        }
        if (searchParams.startDate) params.startDate = searchParams.startDate;
        if (searchParams.endDate) params.endDate = searchParams.endDate;
      } else {
        throw new Error('Invalid search type.');
      }

      const response = await axios.get(url, {
        params: params,
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    // Only enable the query if searchParams indicate a valid search is intended
    enabled: !!searchParams && (
      (searchParams.searchType === 'keyword' && !!searchParams.keyword.trim()) ||
      (searchParams.searchType === 'mood' && (searchParams.minMood !== '' || searchParams.maxMood !== '')) ||
      (searchParams.searchType === 'date' && (searchParams.startDate !== '' || searchParams.endDate !== ''))
    ),
    staleTime: 5 * 60 * 1000, // Cache search results for 5 minutes
    cacheTime: 10 * 60 * 1000,
  });
};
