// src/components/JournalInput.js

import React, { useState } from 'react';
import { useAddJournalEntry } from '../hooks/useJournalData';
import { useTheme } from '../contexts/ThemeContext';

function JournalInput() {
    const [text, setText] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const { theme } = useTheme();

    const addEntryMutation = useAddJournalEntry();

    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevent default form submission
        setMessage('');
        setError('');

        if (!text.trim()) {
            setError('Journal entry cannot be empty.');
            return;
        }

        try {
            await addEntryMutation.mutateAsync({ rawText: text });
            setMessage('Entry saved and analyzed successfully!');
            setText(''); // Clear textarea after successful submission
        } catch (err) {
            console.error('JournalInput: Error saving entry:', err.response ? err.response.data : err.message);
            setError('Failed to save entry. Please ensure backend services are running and you are logged in.');
        }
    };

    // ⭐ NEW: Handle key down events for Enter and Shift+Enter ⭐
    const handleKeyDown = (e) => {
        // If Enter is pressed WITHOUT Shift
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent default newline behavior
            handleSubmit(e); // Trigger submission
        }
        // If Shift+Enter is pressed, allow default behavior (new line)
        // No 'else if' needed, as default behavior for Shift+Enter is already newline
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4 p-6 rounded-lg
                                         bg-white/60 dark:bg-black/40 shadow-inner transition-all duration-500">
            <h2 className="text-2xl font-poppins font-semibold text-[#B399D4] dark:text-[#5CC8C2]">
                What's on your mind today?
            </h2>
            {message && <p className="text-green-600 dark:text-green-400 font-inter">{message}</p>}
            {addEntryMutation.isError && <p className="text-[#FF8A7A] font-inter">{addEntryMutation.error.message || 'An error occurred.'}</p>}
            {error && <p className="text-[#FF8A7A] font-inter">{error}</p>}
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown} // ⭐ ADDED: Key down handler ⭐
                placeholder="Write your thoughts here... Press Enter to save, Shift+Enter for a new line. The AI will help you understand them."
                rows="10"
                className={`w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600
                            bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200
                            focus:outline-none focus:ring-2 focus:ring-[#B399D4] dark:focus:ring-[#5CC8C2]
                            font-inter resize-y transition-colors duration-300`}
                aria-label="Journal Entry Text Area"
                disabled={addEntryMutation.isPending}
            ></textarea>
            <div className="flex space-x-4">
                <button
                    type="submit"
                    className="flex-grow rounded-full font-poppins font-semibold text-white
                                 bg-[#FF8A7A] hover:bg-[#FF6C5A] active:bg-[#D45E4D]
                                 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#FF8A7A] focus:ring-opacity-75
                                 transition-all duration-300
                                 disabled:opacity-50 disabled:cursor-not-allowed
                                 py-2 px-4 text-base sm:py-3 sm:px-6 sm:text-lg md:py-4 md:px-8 md:text-xl"
                    disabled={addEntryMutation.isPending}
                >
                    {addEntryMutation.isPending ? 'Analyzing & Saving...' : 'Analyze & Save Entry'}
                </button>
            </div>
        </form>
    );
}

export default JournalInput;
