// src/components/HeaderApiKeyStatus.jsx
import React from 'react';
import { Key, AlertTriangle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useApiKeyStatus } from '../hooks/useUserProfile';

function HeaderApiKeyStatus({ compact = true }) {
    const { theme } = useTheme();
    const { data, isLoading, error } = useApiKeyStatus();

    if (isLoading || error || !data) return null;

    const isUsingOwnKey = data.usingOwnKey;
    const isDarkMode = theme === 'dark';

    // Premium Gradient styling
    const colorClasses = isUsingOwnKey
        ? isDarkMode
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
        : isDarkMode
            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
            : 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm';

    // 💡 FIX: Upgraded non-compact icon to size 20 to match your other mobile menu icons
    const icon = isUsingOwnKey ? <Key size={compact ? 14 : 20} /> : <AlertTriangle size={compact ? 14 : 20} />;
    const tooltip = isUsingOwnKey ? 'Using your own Gemini API key' : 'Using shared key – add your own for privacy';
    const label = isUsingOwnKey ? 'Own key' : 'Shared key';

    if (compact) {
        // Desktop Header Version (Unchanged)
        return (
            <div
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border transition-all duration-300 hover:scale-105 cursor-help ${colorClasses}`}
                title={tooltip}
            >
                {icon}
                <span className="tracking-wide uppercase text-[10px]">{label}</span>
            </div>
        );
    }

    // 💡 FIX: Removed 'justify-center', added 'gap-3', 'py-3.5', and 'font-poppins' to perfectly match other sidebar links!
    return (
        <div
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-poppins font-semibold border transition-all duration-300 w-full shadow-md ${colorClasses}`}
            title={tooltip}
        >
            {icon}
            <span>{label}</span>
        </div>
    );
}

export default React.memo(HeaderApiKeyStatus);