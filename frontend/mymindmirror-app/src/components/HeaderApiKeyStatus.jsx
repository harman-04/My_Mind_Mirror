import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Key, AlertTriangle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const getAuthHeader = () => {
    const token = localStorage.getItem('jwtToken');
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
};

const fetchApiKeyStatus = async () => {
    const headers = getAuthHeader();
    if (!headers) throw new Error('Not authenticated');
    const res = await axios.get('http://localhost:8080/api/users/api-key/status', { headers });
    return res.data;
};

function HeaderApiKeyStatus() {
    const { theme } = useTheme();
    const { data, isLoading, error } = useQuery({
        queryKey: ['apiKeyStatus'],
        queryFn: fetchApiKeyStatus,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    if (isLoading) return null;
    if (error || !data) return null;

    const isUsingOwnKey = data.usingOwnKey;
    const bgColor = isUsingOwnKey
        ? (theme === 'dark' ? 'bg-green-900/60' : 'bg-green-100')
        : (theme === 'dark' ? 'bg-yellow-900/60' : 'bg-yellow-100');
    const textColor = isUsingOwnKey
        ? (theme === 'dark' ? 'text-green-300' : 'text-green-800')
        : (theme === 'dark' ? 'text-yellow-300' : 'text-yellow-800');
    const icon = isUsingOwnKey ? <Key size={14} /> : <AlertTriangle size={14} />;
    const tooltip = isUsingOwnKey ? 'Using your own Gemini API key' : 'Using shared key – add your own for privacy';

    return (
        <div
            className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${bgColor} ${textColor}`}
            title={tooltip}
        >
            {icon}
            <span className="hidden sm:inline">
                {isUsingOwnKey ? 'Own key' : 'Shared key'}
            </span>
        </div>
    );
}

export default HeaderApiKeyStatus;