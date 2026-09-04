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

    // 🌟 FIX: Removed aggressive glowing shadows in dark mode and softened light mode borders to match Enterprise UI
    const colorClasses = isUsingOwnKey
        ? isDarkMode
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-sm'
        : isDarkMode
            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-sm'
            : 'bg-amber-50 text-amber-700 border-amber-200/80 shadow-sm';

    const icon = isUsingOwnKey ? <Key size={compact ? 14 : 20} /> : <AlertTriangle size={compact ? 14 : 20} />;
    const tooltip = isUsingOwnKey ? 'Using your own Gemini API key' : 'Using shared key – add your own for privacy';
    const label = isUsingOwnKey ? 'Own key' : 'Shared key';

    if (compact) {
        // Desktop Header Version
        return (
            <div
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border transition-transform duration-200 hover:-translate-y-0.5 cursor-help ${colorClasses}`}
                title={tooltip}
            >
                {icon}
                <span className="tracking-wide uppercase text-[10px]">{label}</span>
            </div>
        );
    }

    // 🌟 FIX: Mobile Drawer Version - Padding changed to py-4 px-5 to perfectly flush with App.jsx buttons
    return (
        <div
            className={`flex items-center gap-3 py-4 px-5 rounded-xl font-poppins font-semibold border w-full ${colorClasses}`}
            title={tooltip}
        >
            {icon}
            <span>{label}</span>
        </div>
    );
}

export default React.memo(HeaderApiKeyStatus);