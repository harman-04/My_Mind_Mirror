// src/hooks/useJournalData.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { format } from 'date-fns';
import { useState } from 'react';
import { toast } from 'sonner';
import { useInfiniteQuery } from '@tanstack/react-query';

const API_BASE_URL = 'http://localhost:8080/api';
// const FLASK_API_URL = 'http://localhost:5000'; // ⭐ REMOVED: No direct Flask API calls from frontend ⭐

const getToken = () => localStorage.getItem('jwtToken');

const clearTodayReflectionCache = () => {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  localStorage.removeItem(`reflection_${todayStr}`);
};

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
const generateTodaysReflection = async (todayEntries, forceRefresh = false) => {
  const token = getToken();
  if (!token) throw new Error('Not authenticated to generate reflection.');

  if (!todayEntries || todayEntries.length === 0) {
    return "Journal an entry today to get your daily reflection!";
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const cacheKey = `reflection_${todayStr}`;

  // Check localStorage unless forced refresh
  if (!forceRefresh) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Combine all raw texts from today's entries
  const combinedRawText = todayEntries.map(e => e.rawText).join('\n\n---\n\n');

  // Aggregate emotions (average)
  const aggregatedEmotions = {};
  let aggregatedConcerns = new Set();
  let totalEntries = todayEntries.length;

  todayEntries.forEach(entry => {
    let parsedEmotions = {};
    try {
      parsedEmotions = typeof entry.emotions === 'string' ? JSON.parse(entry.emotions) : entry.emotions;
      if (typeof parsedEmotions !== 'object' || parsedEmotions === null) parsedEmotions = {};
    } catch (e) { parsedEmotions = {}; }

    Object.entries(parsedEmotions).forEach(([emotion, score]) => {
      aggregatedEmotions[emotion] = (aggregatedEmotions[emotion] || 0) + score;
    });

    let concerns = [];
    try {
      concerns = typeof entry.coreConcerns === 'string' ? JSON.parse(entry.coreConcerns) : entry.coreConcerns;
      if (!Array.isArray(concerns)) concerns = [];
    } catch (e) { concerns = []; }
    concerns.forEach(c => aggregatedConcerns.add(c));
  });

  Object.keys(aggregatedEmotions).forEach(emotion => {
    aggregatedEmotions[emotion] = aggregatedEmotions[emotion] / totalEntries;
  });

  const emotions_str = Object.entries(aggregatedEmotions)
    .filter(([, score]) => score > 0.01)
    .map(([label, score]) => `${label} (${(score * 100).toFixed(1)}%)`)
    .join(', ') || 'No specific emotions detected.';

  const concerns_str = Array.from(aggregatedConcerns).join(', ') || 'No specific concerns identified.';

  const prompt = `Based on the following journal entries from today, their detected emotions, and core concerns,
   generate a concise (1-3 sentences), empathetic, and insightful "Today's Reflection" or a short, encouraging thought.

  **Language & Style Instruction:**
  - Detect the language(s) and style (casual, formal, emotional) of the journal entries.
  - Generate the reflection in the **same language(s) and style** as the entries. If the entries mix languages (e.g., Hinglish), respond in that same mix.
  - Focus on summarizing the overall emotional state and offering a gentle, positive perspective.

  Journal Entries (combined): "${combinedRawText}"
  Detected Emotions (averaged): ${emotions_str}
  Core Concerns: ${concerns_str}

  Today's Reflection:`;

  try {
    const springBootResponse = await axios.post(`${API_BASE_URL}/reflection/generate`, { prompt_text: prompt }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const reflection = springBootResponse.data?.reflection || "Couldn't generate a reflection today. Keep journaling!";
    // Save to localStorage
    localStorage.setItem(cacheKey, reflection);
    return reflection;
  } catch (err) {
    console.error('Error generating reflection:', err.response ? err.response.data : err.message);
    throw new Error('Failed to generate reflection.');
  }
};

export const useTodaysReflection = (todayEntries) => {
  const [forceRefresh, setForceRefresh] = useState(false);

  const queryKey = ['todaysReflection', format(new Date(), 'yyyy-MM-dd'), forceRefresh];

  const query = useQuery({
    queryKey: queryKey,
    queryFn: () => generateTodaysReflection(todayEntries, forceRefresh),
    enabled: !!todayEntries && todayEntries.length > 0,
    staleTime: Infinity,
    cacheTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    onSettled: () => setForceRefresh(false),
  });

  const refresh = () => {
    setForceRefresh(true);
    // Reset after the query completes
  };

  return { ...query, refresh };
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

            queryClient.invalidateQueries({ queryKey: ['journalEntries', 'paginated'] });


        clearTodayReflectionCache();
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
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      queryClient.invalidateQueries({ queryKey: ['journalEntries', 'paginated'] });

      clearTodayReflectionCache();
      // Invalidate the reflection query (base key)
      queryClient.invalidateQueries({ queryKey: ['todaysReflection'] });
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
            queryClient.invalidateQueries({ queryKey: ['journalEntries', 'paginated'] });

        clearTodayReflectionCache();
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

export const useKeyPhraseFrequencies = () => {
    return useQuery({
        queryKey: ['keyPhraseFrequencies'],
        queryFn: async () => {
            const token = getToken();
            if (!token) throw new Error('Not authenticated');
            const response = await axios.get(`${API_BASE_URL}/journal/key-phrases`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        },
        staleTime: 10 * 60 * 1000,
    });
};


/**
 * Fetches paginated journal entries using the new /history/paginated endpoint.
 * @param {number} pageSize - Number of entries per page (default 20).
 */
export const usePaginatedJournalEntries = (pageSize = 20) => {
  return useInfiniteQuery({
    queryKey: ['journalEntries', 'paginated', pageSize],
    queryFn: async ({ pageParam = 0 }) => {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');
      const response = await axios.get(
        `${API_BASE_URL}/journal/history/paginated?page=${pageParam}&size=${pageSize}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data; // expects { content: [], pageable, totalPages, ... }
    },
    getNextPageParam: (lastPage) => {
      // Return next page number if available
      if (lastPage.pageable && lastPage.pageable.pageNumber < lastPage.totalPages - 1) {
        return lastPage.pageable.pageNumber + 1;
      }
      return undefined;
    },
    staleTime: 10 * 60 * 1000,
    cacheTime: 15 * 60 * 1000,
  });
};


/**
 * Fetches only today's journal entries.
 */
export const useTodayEntries = () => {
  const today = format(new Date(), 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['journalEntries', 'today', today],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');
      const response = await axios.get(`${API_BASE_URL}/journal/history?startDate=${today}&endDate=${today}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data; // already sorted descending
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Fetches journal entries for a specific week (date range).
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 */
export const useWeeklyEntries = (startDate, endDate) => {
  return useQuery({
    queryKey: ['journalEntries', 'weekly', startDate, endDate],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');
      const response = await axios.get(`${API_BASE_URL}/journal/history?startDate=${startDate}&endDate=${endDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!startDate && !!endDate,
  });
};


export const useImportGrowthTip = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tipText) => {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');
      const response = await axios.post(
        `${API_BASE_URL}/milestones/import-growth-tip`,
        { tipText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: (data) => {
      const message = data?.message || 'Growth tip added to Milestones!';
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
    },
    onError: (error) => {
      toast.error('Failed to add growth tip: ' + (error.response?.data?.message || error.message));
    },
  });
};