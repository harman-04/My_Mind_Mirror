// src/hooks/useUserProfile.js

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = 'http://localhost:8080/api';

const getAuthHeader = () => {
    const token = localStorage.getItem('jwtToken');
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
};

const fetchUserFullProfile = async () => {
    const headers = getAuthHeader();
    if (!headers) throw new Error("Authentication required.");
    const response = await axios.get(`${API_BASE_URL}/users/profile-full`, { headers });
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

const updateRoadmapPreferences = async (preferences) => {
    const headers = getAuthHeader();
    if (!headers) throw new Error("Authentication required.");
    const response = await axios.put(`${API_BASE_URL}/users/roadmap-preferences`, preferences, { headers });
    return response.data;
};

// 💡 UPDATED: Now accepts the full preferences object dynamically
const updateUserPreferences = async (preferencesData) => {
    const headers = getAuthHeader();
    if (!headers) throw new Error("Authentication required.");
    const response = await axios.put(`${API_BASE_URL}/users/preferences`,
        preferencesData,
        { headers }
    );
    return response.data;
};

export function useUserProfile() {
    const queryClient = useQueryClient();

    const profileQuery = useQuery({
        queryKey: ['userFullProfile'],
        queryFn: fetchUserFullProfile,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    const updateProfileMutation = useMutation({
        mutationFn: updateUserProfile,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userFullProfile'] });
        },
    });

    const changePasswordMutation = useMutation({
        mutationFn: changeUserPassword,
        onSuccess: () => {},
    });

    const deleteProfileMutation = useMutation({
        mutationFn: deleteUserProfile,
        onSuccess: () => {
            queryClient.removeQueries({ queryKey: ['userFullProfile'] });
            localStorage.removeItem('jwtToken');
            window.location.href = '/login';
        },
    });

    const updateApiKeyMutation = useMutation({
        mutationFn: updateApiKey,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userFullProfile'] }),
    });

    const updateRoadmapPreferencesMutation = useMutation({
        mutationFn: updateRoadmapPreferences,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userFullProfile'] }),
    });

    const updatePreferencesMutation = useMutation({
        mutationFn: updateUserPreferences,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userFullProfile'] }),
    });

    const apiKeyStatus = profileQuery.data
        ? {
              usingOwnKey: profileQuery.data.usingOwnKey,
              maskedKey: profileQuery.data.maskedKey,
              message: profileQuery.data.usingOwnKey
                  ? "Using your own Gemini API key."
                  : "Using shared key – add your own for privacy",
          }
        : null;

    const roadmapPreferences = profileQuery.data?.roadmapPreferences;

    return {
        profile: profileQuery.data,
        isLoading: profileQuery.isLoading,
        isError: profileQuery.isError,
        error: profileQuery.error,

        apiKeyStatus: { data: apiKeyStatus, isLoading: profileQuery.isLoading },
        roadmapPreferences: { data: roadmapPreferences, isLoading: profileQuery.isLoading },

        updateProfile: updateProfileMutation.mutateAsync,
        deleteProfile: deleteProfileMutation.mutateAsync,
        changePassword: changePasswordMutation.mutateAsync,
        updateApiKey: updateApiKeyMutation.mutateAsync,
        updateRoadmapPreferences: updateRoadmapPreferencesMutation.mutateAsync,
        updatePreferences: updatePreferencesMutation.mutateAsync,

        isUpdating: updateProfileMutation.isLoading,
        isDeleting: deleteProfileMutation.isLoading,
        isChangingPassword: changePasswordMutation.isLoading,
        isUpdatingPreferences: updatePreferencesMutation.isLoading,
    };
}