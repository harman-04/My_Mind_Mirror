// src/hooks/useUserProfile.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const getAuthHeader = () => {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error("Authentication token missing.");
        return null;
    }
    return { Authorization: `Bearer ${token}` };
};

const fetchUserProfile = async () => {
    const headers = getAuthHeader();
    if (!headers) throw new Error("Authentication required.");
    const response = await axios.get(`${API_BASE_URL}/users/profile`, { headers });
    return response.data;
};

const fetchApiKeyStatus = async () => {
    const headers = getAuthHeader();
    if (!headers) throw new Error("Authentication required.");
    const response = await axios.get(`${API_BASE_URL}/users/api-key/status`, { headers });
    return response.data;
};

const updateUserProfile = async (updatedData) => {
    const headers = getAuthHeader();
    if (!headers) throw new Error("Authentication required.");
    const response = await axios.put(`${API_BASE_URL}/users/profile`, updatedData, { headers });
    return response.data;
};

const changeUserPassword = async (passwordData) => {
    const headers = getAuthHeader();
    if (!headers) throw new Error("Authentication required.");
    const response = await axios.put(`${API_BASE_URL}/users/profile/password`, passwordData, { headers });
    return response.data;
};

const deleteUserProfile = async () => {
    const headers = getAuthHeader();
    if (!headers) throw new Error("Authentication required.");
    const response = await axios.delete(`${API_BASE_URL}/users/profile`, { headers });
    return response.data;
};

const updateApiKey = async (apiKey) => {
    const headers = getAuthHeader();
    if (!headers) throw new Error("Authentication required.");
    await axios.put(`${API_BASE_URL}/users/api-key`, { apiKey }, { headers });
};

const fetchRoadmapPreferences = async () => {
    const headers = getAuthHeader();
    if (!headers) throw new Error("Authentication required.");
    const response = await axios.get(`${API_BASE_URL}/users/roadmap-preferences`, { headers });
    return response.data;
};

const updateRoadmapPreferences = async (preferences) => {
    const headers = getAuthHeader();
    if (!headers) throw new Error("Authentication required.");
    const response = await axios.put(`${API_BASE_URL}/users/roadmap-preferences`, preferences, { headers });
    return response.data;
};

export function useUserProfile() {
    const queryClient = useQueryClient();

    // --- All hook calls at the top level ---
    const profileQuery = useQuery({
        queryKey: ['userProfile'],
        queryFn: fetchUserProfile,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,      // React Query v5 uses gcTime (was cacheTime)
        retry: 1,
    });

    const updateProfileMutation = useMutation({
        mutationFn: updateUserProfile,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userProfile'] });
        },
    });

    const changePasswordMutation = useMutation({
        mutationFn: changeUserPassword,
    });

    const deleteProfileMutation = useMutation({
        mutationFn: deleteUserProfile,
        onSuccess: () => {
            queryClient.removeQueries({ queryKey: ['userProfile'] });
            localStorage.removeItem('jwtToken');
            window.location.href = '/login';
        },
    });

    const apiKeyStatusQuery = useQuery({
        queryKey: ['apiKeyStatus'],
        queryFn: fetchApiKeyStatus,
        staleTime: 5 * 60 * 1000,
    });

    const updateApiKeyMutation = useMutation({
        mutationFn: updateApiKey,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['apiKeyStatus'] }),
    });

    const roadmapPreferencesQuery = useQuery({
        queryKey: ['roadmapPreferences'],
        queryFn: fetchRoadmapPreferences,
        staleTime: 5 * 60 * 1000,
    });

    const updateRoadmapPreferencesMutation = useMutation({
        mutationFn: updateRoadmapPreferences,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roadmapPreferences'] }),
    });

    // --- Return object with all the data and functions ---
    return {
        profile: profileQuery.data,
        isLoading: profileQuery.isLoading,
        isError: profileQuery.isError,
        error: profileQuery.error,
        updateProfile: updateProfileMutation.mutateAsync,
        deleteProfile: deleteProfileMutation.mutateAsync,
        changePassword: changePasswordMutation.mutateAsync,
        isUpdating: updateProfileMutation.isPending,
        isDeleting: deleteProfileMutation.isPending,
        isChangingPassword: changePasswordMutation.isPending,
        apiKeyStatus: apiKeyStatusQuery,
        updateApiKey: updateApiKeyMutation,

        // Roadmap preferences
        roadmapPreferences: roadmapPreferencesQuery,
        updateRoadmapPreferences: updateRoadmapPreferencesMutation,
    };
}