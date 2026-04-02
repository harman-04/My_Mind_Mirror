import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, PenTool } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { getRandomPrompt } from '../data/writingPrompts';

const STORAGE_KEY = 'usedPrompts';

function WritingPrompt({ onUsePrompt }) {
  const { theme } = useTheme();
  const [prompt, setPrompt] = useState('');
  const [usedPrompts, setUsedPrompts] = useState([]);

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

  // Generate a random prompt that hasn't been used recently
  const generateNewPrompt = () => {
    const newPrompt = getRandomPrompt(usedPrompts);
    setPrompt(newPrompt);
    // Update used prompts (keep last 10 to avoid endless exclusion)
    const updated = [newPrompt, ...usedPrompts].slice(0, 10);
    setUsedPrompts(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  // Initial prompt on mount
  useEffect(() => {
    if (!prompt) {
      generateNewPrompt();
    }
  }, []);

  const handleUsePrompt = () => {
    if (onUsePrompt && prompt) {
      onUsePrompt(prompt);
    }
  };

  const colors = {
    light: {
      bg: 'bg-white/60',
      text: 'text-gray-800',
      accent: 'text-purple-500',
      button: 'bg-purple-500 hover:bg-purple-600',
      border: 'border-purple-200',
    },
    dark: {
      bg: 'bg-black/40',
      text: 'text-gray-200',
      accent: 'text-teal-400',
      button: 'bg-teal-500 hover:bg-teal-600',
      border: 'border-teal-800',
    },
  };
  const currentColors = theme === 'dark' ? colors.dark : colors.light;

  return (
    <div className={`p-4 rounded-lg ${currentColors.bg} border ${currentColors.border} shadow-sm transition-all duration-300`}>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={18} className={currentColors.accent} />
        <h3 className="text-sm font-semibold font-poppins text-gray-600 dark:text-gray-300">
          Daily Writing Prompt
        </h3>
      </div>
      <p className={`text-md italic ${currentColors.text} mb-3`}>
        “{prompt || "Loading..."}”
      </p>
      <div className="flex gap-2">
        <button
          onClick={generateNewPrompt}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium
                     bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200
                     hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          title="New prompt"
        >
          <RefreshCw size={14} />
          New
        </button>
        <button
          onClick={handleUsePrompt}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-white
                     ${currentColors.button} transition`}
          title="Use this prompt"
        >
          <PenTool size={14} />
          Use
        </button>
      </div>
    </div>
  );
}

export default WritingPrompt;