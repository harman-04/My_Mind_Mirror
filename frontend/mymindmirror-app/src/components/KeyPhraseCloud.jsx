import React, { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useKeyPhraseFrequencies } from '../hooks/useJournalData';

const KeyPhraseCloud = ({ onWordClick }) => {
  const { theme } = useTheme();
  const { data: freqMap, isLoading, isError, error } = useKeyPhraseFrequencies();

  const words = useMemo(() => {
    if (!freqMap) return [];
    const entries = Object.entries(freqMap);
    if (entries.length === 0) return [];

    const counts = entries.map(([_, v]) => v);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);

    return entries
      .map(([text, value], index) => {
        // Dynamic sizing 16px to 56px
        const size = entries.length === 1
          ? 36
          : 16 + ((value - minCount) / (Math.max(maxCount - minCount, 1))) * (56 - 16);

        // Golden Angle Hue distribution for maximum beauty
        const hue = (index * 137) % 360;
        const sat = theme === 'dark' ? 85 : 70;
        const light = theme === 'dark' ? 75 : 45;

        return {
          text,
          size,
          color: `hsl(${hue}, ${sat}%, ${light}%)`,
          delay: `${(index * 0.05).toFixed(2)}s`,
          duration: `${(4 + Math.random() * 3).toFixed(2)}s`,
        };
      })
      .sort(() => Math.random() - 0.5); // Shuffle for cloud layout
  }, [freqMap, theme]);

  // ⭐ THE MASTER SKELETON: Organic & Seamless
  if (isLoading) {
    return (
      <div className="relative w-full min-h-[350px] flex items-center justify-center p-10 rounded-[2.5rem] bg-white/40 dark:bg-slate-900/40 border border-white/20 dark:border-slate-800 backdrop-blur-2xl shadow-2xl overflow-hidden">
        <div className="flex flex-wrap justify-center items-center gap-6 animate-pulse z-10 max-w-2xl">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="bg-slate-200 dark:bg-slate-700/50 rounded-full"
              style={{
                width: `${Math.floor(Math.random() * 60 + 60)}px`,
                height: `${Math.floor(Math.random() * 15 + 20)}px`,
                opacity: 1 - (i * 0.04),
              }}
            />
          ))}
        </div>
        <div className="absolute bottom-10 flex flex-col items-center gap-2">
          <p className="text-slate-400 dark:text-slate-500 font-medium tracking-[0.2em] text-[10px] uppercase animate-pulse">
            Analyzing your mental patterns
          </p>
        </div>
      </div>
    );
  }

  if (isError || words.length === 0) {
    return (
      <div className="h-80 flex flex-col items-center justify-center text-slate-400 italic text-center px-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem]">
        <span className="text-2xl mb-2 opacity-50">☁️</span>
        <p>{isError ? "Couldn't load patterns" : "No patterns detected yet. Start journaling!"}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-[350px] flex items-center justify-center p-10 rounded-[2.5rem] bg-white/40 dark:bg-slate-900/40 border border-white/20 dark:border-slate-800 backdrop-blur-2xl shadow-2xl overflow-hidden">

      {/* Aurora Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 z-10">
        {words.map((word) => (
          <button
            key={word.text}
            onClick={() => onWordClick?.(word.text)}
            className="transition-all duration-700 ease-out hover:scale-125 active:scale-90 hover:z-20 cursor-pointer focus:outline-none"
            style={{
              fontSize: `${word.size}px`,
              color: word.color,
              fontWeight: word.size > 36 ? '700' : '500',
              textShadow: theme === 'dark' ? '0 0 15px rgba(255,255,255,0.1)' : '0 2px 4px rgba(0,0,0,0.05)',
              // React 19 safe animation properties
              animationName: 'float',
              animationDuration: word.duration,
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
              animationDelay: word.delay,
            }}
          >
            {word.text}
          </button>
        ))}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(1.5deg); }
        }
      `}</style>
    </div>
  );
};

export default KeyPhraseCloud;