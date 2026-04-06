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

function HeaderApiKeyStatus({ compact = true }) {
    const { theme } = useTheme();
    const { data, isLoading, error } = useQuery({
        queryKey: ['apiKeyStatus'],
        queryFn: fetchApiKeyStatus,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    if (isLoading || error || !data) return null;

    const isUsingOwnKey = data.usingOwnKey;

    const colorClasses = isUsingOwnKey
        ? theme === 'dark'
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'bg-emerald-100 text-emerald-700'
        : theme === 'dark'
            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            : 'bg-amber-100 text-amber-700';

    const icon = isUsingOwnKey ? <Key size={compact ? 14 : 18} /> : <AlertTriangle size={compact ? 14 : 18} />;
    const tooltip = isUsingOwnKey ? 'Using your own Gemini API key' : 'Using shared key – add your own for privacy';
    const label = isUsingOwnKey ? 'Own key' : 'Shared key';

    // Desktop / compact version (pill)
    if (compact) {
        return (
            <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors duration-300 ${colorClasses}`}
                title={tooltip}
            >
                {icon}
                <span>{label}</span>
            </div>
        );
    }

    // Mobile sidebar version – full width, same as other links
    return (
        <div
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors duration-300 w-full ${colorClasses}`}
            title={tooltip}
        >
            {icon}
            <span>{label}</span>
        </div>
    );
}

export default HeaderApiKeyStatus;