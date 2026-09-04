// src/components/WritingPrompt.jsx
import React, { useState, useEffect } from 'react';
import { WandSparkles, RefreshCw } from 'lucide-react';
import { getRandomPrompt } from '../data/writingPrompts';

const STORAGE_KEY = 'usedPrompts';

function WritingPrompt() {
  const [prompt, setPrompt] = useState('');
  const [usedPrompts, setUsedPrompts] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);

  // Load used prompts from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setUsedPrompts(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse usedPrompts", e);
      }
    }
  }, []);

  // Generate a random prompt with a smooth fade/slide transition
  const generateNewPrompt = () => {
    setIsAnimating(true);

    // Wait for the fade-out before swapping text
    setTimeout(() => {
      const newPrompt = getRandomPrompt(usedPrompts);
      setPrompt(newPrompt);

      const updated = [newPrompt, ...usedPrompts].slice(0, 10);
      setUsedPrompts(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      setIsAnimating(false);
    }, 300);
  };

  // Initial prompt on mount
  useEffect(() => {
    if (!prompt) {
      generateNewPrompt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-4 sm:p-5 lg:p-6 rounded-2xl lg:rounded-3xl border bg-white/70 dark:bg-[#1A162F]/60 backdrop-blur-xl border-white/50 dark:border-white/10 shadow-lg ring-1 ring-black/5 dark:ring-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 lg:gap-6 transition-all duration-300 hover:shadow-xl">

      {/* Icon & Text Section */}
      <div className="flex gap-3 lg:gap-4 items-start sm:items-center w-full">
        <div className="p-2 lg:p-2.5 rounded-xl lg:rounded-2xl bg-gradient-to-br from-purple-100 to-purple-50 dark:from-teal-900/40 dark:to-teal-800/20 text-purple-600 dark:text-teal-400 shrink-0 mt-1 sm:mt-0 shadow-sm border border-purple-200/50 dark:border-teal-700/30">
          <WandSparkles className="w-5 h-5 lg:w-6 lg:h-6" />
        </div>

        <div className="flex-grow">
          <h3 className="text-[10px] sm:text-[11px] lg:text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1 lg:mb-1.5 font-poppins">
            Daily Inspiration
          </h3>
          <p className={`text-sm sm:text-base lg:text-lg text-gray-800 dark:text-gray-100 font-medium italic font-playfair leading-relaxed transition-all duration-300 ${isAnimating ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}`}>
            "{prompt || "Finding inspiration..."}"
          </p>
        </div>
      </div>

      {/* Action Buttons Section */}
      <div className="flex items-center justify-end gap-2 lg:gap-3 self-end sm:self-auto shrink-0 w-full sm:w-auto mt-1 sm:mt-0 pt-3 sm:pt-0 border-t border-gray-200/50 dark:border-gray-700/50 sm:border-t-0">

        {/* Refresh Prompt Button */}
        <button
          onClick={generateNewPrompt}
          disabled={isAnimating}
          className="p-2 lg:p-2.5 rounded-full bg-gray-100 dark:bg-black/20 hover:bg-gray-200 dark:hover:bg-black/40 border border-transparent dark:border-white/5 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400/50 active:scale-95 w-full sm:w-auto flex justify-center"
          title="Get a new prompt"
        >
          <RefreshCw className={`w-4 h-4 lg:w-5 lg:h-5 text-gray-600 dark:text-gray-300 ${isAnimating ? 'animate-spin text-purple-500 dark:text-teal-400' : ''}`} />
        </button>
      </div>

    </div>
  );
}

export default React.memo(WritingPrompt);