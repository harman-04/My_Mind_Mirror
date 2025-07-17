// src/hooks/useUserProfile.js

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

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

const updateUserProfile = async (updatedData) => {
    const headers = getAuthHeader();
    if (!headers) throw new Error("Authentication required.");

    const response = await axios.put(`${API_BASE_URL}/users/profile`, updatedData, { headers });
    return response.data;
};

// ⭐ NEW: Function to change user password ⭐
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

export function useUserProfile() {
    const queryClient = useQueryClient();

    const profileQuery = useQuery({
        queryKey: ['userProfile'],
        queryFn: fetchUserProfile,
        staleTime: 5 * 60 * 1000,
        cacheTime: 10 * 60 * 1000,
        retry: 1,
        onError: (error) => {
            console.error("Failed to fetch user profile:", error);
            if (error.response && error.response.status === 401) {
                localStorage.removeItem('jwtToken');
                window.location.href = '/login';
            }
        },
    });

    const updateProfileMutation = useMutation({
        mutationFn: updateUserProfile,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['userProfile'] });
        },
        onError: (error) => {
            console.error("Failed to update user profile:", error.response?.data || error.message);
            throw new Error(error.response?.data?.message || "Failed to update profile.");
        },
    });

    // ⭐ NEW: Mutation for changing user password ⭐
    const changePasswordMutation = useMutation({
        mutationFn: changeUserPassword,
        onSuccess: () => {
            // No need to invalidate userProfile, as password change doesn't alter profile data
        },
        onError: (error) => {
            console.error("Failed to change password:", error.response?.data || error.message);
            throw new Error(error.response?.data?.message || "Failed to change password.");
        },
    });

    const deleteProfileMutation = useMutation({
        mutationFn: deleteUserProfile,
        onSuccess: () => {
            queryClient.removeQueries({ queryKey: ['userProfile'] });
            localStorage.removeItem('jwtToken');
            window.location.href = '/login';
        },
        onError: (error) => {
            console.error("Failed to delete user profile:", error.response?.data || error.message);
            throw new Error(error.response?.data?.message || "Failed to delete profile.");
        },
    });

    return {
        profile: profileQuery.data,
        isLoading: profileQuery.isLoading,
        isError: profileQuery.isError,
        error: profileQuery.error,
        updateProfile: updateProfileMutation.mutateAsync,
        deleteProfile: deleteProfileMutation.mutateAsync,
        changePassword: changePasswordMutation.mutateAsync, // Expose the new mutation
        isUpdating: updateProfileMutation.isLoading,
        isDeleting: deleteProfileMutation.isLoading,
        isChangingPassword: changePasswordMutation.isLoading, // Expose loading state
    };
}
