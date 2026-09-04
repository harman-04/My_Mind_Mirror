// src/components/JournalInput.js
import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { useAddJournalEntry } from '../hooks/useJournalData';
import { useTheme } from '../contexts/ThemeContext';
import { Sparkles,NotebookPen, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const JournalInput = forwardRef((props, ref) => {
    const [text, setText] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const addEntryMutation = useAddJournalEntry();

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setMessage('');
        setError('');

        if (!text.trim()) {
            setError('Journal entry cannot be empty.');
            return;
        }

        try {
            await addEntryMutation.mutateAsync({ rawText: text });
            setMessage('Entry saved and analyzed successfully!');
            setText('');
        } catch (err) {
            console.error('JournalInput: Error saving entry:', err.response ? err.response.data : err.message);
            setError('Failed to save entry. Please ensure backend services are running.');
        }
    };

    const handleKeyDown = (e) => {
        // Submit on Ctrl+Enter (Mac: Cmd+Enter) to prevent accidental submits while writing paragraphs
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    // 💡 This is crucial: we are exposing these methods to the parent
    // so the upcoming VoiceRecorder can inject transcribed text directly into this box!
    useImperativeHandle(ref, () => ({
        setText: (newText) => setText(newText),
        clearText: () => setText('')
    }));

    return (
        <form
            onSubmit={handleSubmit}
            className="flex flex-col space-y-4 lg:space-y-5 p-4 sm:p-6 lg:p-8 rounded-2xl lg:rounded-3xl border bg-white/70 dark:bg-[#1A162F]/60 backdrop-blur-xl border-white/50 dark:border-white/10 shadow-lg ring-1 ring-black/5 dark:ring-white/5 transition-all duration-300"
        >
            <div className="flex items-center gap-3 lg:gap-4 mb-2 lg:mb-3">
                {/* Icon Container: Purple in light mode, Teal in dark mode */}
                <div className="p-2 lg:p-2.5 rounded-xl lg:rounded-2xl bg-gradient-to-br from-purple-100 to-purple-50 dark:from-teal-900/40 dark:to-teal-800/20 text-purple-600 dark:text-teal-400 shrink-0 shadow-sm border border-purple-200/50 dark:border-teal-700/30">
                    <NotebookPen className="w-5 h-5 lg:w-6 lg:h-6" />
                </div>

                <div>

                    <h2 className="text-lg sm:text-xl lg:text-2xl font-poppins font-extrabold text-gray-800 dark:text-gray-100 tracking-tight leading-none">
                        What's on your mind today?
                    </h2>
                </div>
            </div>

            {/* Status Messages */}
            {message && (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 p-3 lg:p-4 rounded-xl border border-emerald-200 dark:border-emerald-500/20 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <CheckCircle2 size={18} className="shrink-0" />
                    <p className="font-inter text-sm lg:text-base font-medium">{message}</p>
                </div>
            )}

            {(addEntryMutation.isError || error) && (
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 p-3 lg:p-4 rounded-xl border border-rose-200 dark:border-rose-500/20 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={18} className="shrink-0" />
                    <p className="font-inter text-sm lg:text-base font-medium">
                        {error || addEntryMutation.error?.message || 'An error occurred.'}
                    </p>
                </div>
            )}

            {/* Input Area */}
            <div className="relative group">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Write your thoughts here... Press Ctrl+Enter to save."
                    rows={window.innerWidth < 640 ? 5 : window.innerWidth < 1024 ? 6 : 8}
                    className={`w-full p-4 lg:p-5 rounded-xl lg:rounded-2xl border border-gray-300 dark:border-gray-600/80
                                bg-white/80 dark:bg-gray-900/50 text-gray-800 dark:text-gray-100
                                placeholder-gray-400 dark:placeholder-gray-500
                                focus:outline-none focus:ring-2 focus:ring-[#FF8A7A]/50 dark:focus:ring-[#FF8A7A]/50
                                font-inter text-sm sm:text-base resize-y transition-all duration-300 custom-scrollbar shadow-inner`}
                    aria-label="Journal Entry Text Area"
                    disabled={addEntryMutation.isPending}
                />

                {/* Subtle border glow on hover/focus */}
                <div className="absolute inset-0 rounded-xl lg:rounded-2xl border border-transparent group-hover:border-[#FF8A7A]/20 pointer-events-none transition-colors duration-300"></div>
            </div>

            {/* Actions Bar (Flex-wrap ensures elements don't crush each other on mobile) */}
            <div className="flex flex-wrap items-center justify-end gap-3 lg:gap-4 pt-2 lg:pt-3">

                {/* 💡 The Voice Recorder button will eventually go here! */}

                <button
                    type="submit"
                    className="flex items-center justify-center gap-2 rounded-full font-poppins font-semibold text-white
                               bg-gradient-to-r from-[#FF8A7A] to-[#FF6C5A] hover:from-[#FF7B6A] hover:to-[#FF5C4A]
                               active:scale-95 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#FF8A7A] focus:ring-opacity-75
                               transition-all duration-200 shrink-0
                               disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100
                               py-2.5 sm:py-3 px-6 sm:px-8 text-sm sm:text-base"
                    disabled={addEntryMutation.isPending || !text.trim()}
                >
                    {addEntryMutation.isPending ? (
                        <>
                            <Loader2 size={18} className="animate-spin sm:w-5 sm:h-5" />
                            <span>Analyzing...</span>
                        </>
                    ) : (
                        <>
                            <Sparkles size={18} className="sm:w-5 sm:h-5" />
                            <span>Analyze & Save</span>
                        </>
                    )}
                </button>
            </div>
        </form>
    );
});

export default React.memo(JournalInput);