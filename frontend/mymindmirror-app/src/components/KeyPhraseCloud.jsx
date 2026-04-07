// src/components/KeyPhraseCloud.jsx
import React, { useMemo, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useKeyPhraseFrequencies } from '../hooks/useJournalData';
import DownloadChartButton from './DownloadChartButton';
import { Cloud, ChevronDown } from 'lucide-react';
import { toPng } from 'html-to-image';

const KeyPhraseCloud = ({ onWordClick }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { data: freqMap, isLoading, isError } = useKeyPhraseFrequencies();
  const cloudContainerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const originalStyleRef = useRef({ maxHeight: '', overflow: '' });

  const words = useMemo(() => {
    if (!freqMap) return [];
    const entries = Object.entries(freqMap);
    if (entries.length === 0) return [];

    const counts = entries.map(([_, v]) => v);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);

    return entries
      .map(([text, value], index) => {
        const size = entries.length === 1
          ? 36
          : 16 + ((value - minCount) / (Math.max(maxCount - minCount, 1))) * (56 - 16);

        const hue = (index * 137) % 360;
        const sat = isDarkMode ? 85 : 70;
        const light = isDarkMode ? 75 : 45;

        return {
          text,
          size,
          color: `hsl(${hue}, ${sat}%, ${light}%)`,
          delay: `${(index * 0.05).toFixed(2)}s`,
          duration: `${(4 + Math.random() * 3).toFixed(2)}s`,
        };
      })
      .sort(() => Math.random() - 0.5);
  }, [freqMap, isDarkMode]);

  // Custom download handler to capture full content
  const handleDownload = async () => {
    const element = cloudContainerRef.current;
    if (!element) return;

    // Store original styles
    originalStyleRef.current.maxHeight = element.style.maxHeight;
    originalStyleRef.current.overflow = element.style.overflow;

    // Expand to show full content
    element.style.maxHeight = 'none';
    element.style.overflow = 'visible';

    // Wait for reflow
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const dataUrl = await toPng(element, {
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `key_phrase_cloud.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Failed to download cloud:', error);
    } finally {
      // Restore original styles
      element.style.maxHeight = originalStyleRef.current.maxHeight;
      element.style.overflow = originalStyleRef.current.overflow;
    }
  };

  // Check if scroll is needed
  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const hasScroll = scrollContainerRef.current.scrollHeight > scrollContainerRef.current.clientHeight;
      // Could show/hide a fade indicator
    }
  };

  React.useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [words]);

  // Loading skeleton (same as before)
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden transition-all duration-300">
        <div className="flex justify-between items-center p-4 bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm">
          <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200">
            Key Phrase Cloud
          </h3>
          <div className="w-8 h-8 opacity-50">
            <DownloadChartButton
              chartRef={cloudContainerRef}
              filename="key_phrase_cloud"
              darkMode={isDarkMode}
              className="hover:scale-105 transition-transform pointer-events-none"
              customDownload={false}
            />
          </div>
        </div>
        <div
          ref={cloudContainerRef}
          className="p-6 flex items-center justify-center min-h-[300px]"
          style={{ backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }}
        >
          <div className="flex flex-wrap justify-center items-center gap-6 animate-pulse">
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className="bg-gray-200 dark:bg-gray-700 rounded-full"
                style={{
                  width: `${Math.floor(Math.random() * 60 + 60)}px`,
                  height: `${Math.floor(Math.random() * 15 + 20)}px`,
                  opacity: 1 - (i * 0.04),
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error or empty state (same as before)
  if (isError || words.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden transition-all duration-300">
        <div className="flex justify-between items-center p-4 bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm">
          <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200">
            Key Phrase Cloud
          </h3>
          <DownloadChartButton
            chartRef={cloudContainerRef}
            filename="key_phrase_cloud"
            darkMode={isDarkMode}
            className="hover:scale-105 transition-transform opacity-50 pointer-events-none"
            customDownload={false}
          />
        </div>
        <div
          ref={cloudContainerRef}
          className="p-8 flex flex-col items-center justify-center text-center"
          style={{ backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', minHeight: '300px' }}
        >
          <Cloud size={48} className="text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-300 font-medium">
            {isError ? "Couldn't load patterns" : "No patterns detected yet."}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Start journaling to see your key phrases appear here!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden transition-all duration-300">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm">
        <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200">
          Key Phrase Cloud
        </h3>
        <button
          onClick={handleDownload}
          className="p-1.5 rounded-full bg-white/80 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 transition shadow-sm hover:scale-105 transition-transform"
          title="Download as PNG"
        >
          <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      </div>

      {/* Scrollable cloud area with custom scrollbar */}
      <div
        ref={(el) => {
          cloudContainerRef.current = el;
          scrollContainerRef.current = el;
        }}
        className="p-6 overflow-y-auto"
        style={{
          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
          maxHeight: '400px',
          scrollbarWidth: 'thin',
          scrollbarColor: isDarkMode ? '#4B5563 #1f2937' : '#CBD5E1 #ffffff',
        }}
      >
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
                textShadow: isDarkMode ? '0 0 15px rgba(255,255,255,0.1)' : '0 2px 4px rgba(0,0,0,0.05)',
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
      </div>

      {/* Subtle scroll indicator */}
      {scrollContainerRef.current && scrollContainerRef.current.scrollHeight > scrollContainerRef.current.clientHeight && (
        <div className="relative bottom-0 left-0 right-0 flex justify-center pointer-events-none pb-2">
          <div className="bg-gradient-to-t from-gray-900/10 to-transparent w-full h-8 flex items-center justify-center">
            <ChevronDown size={16} className="text-gray-400 animate-bounce" />
          </div>
        </div>
      )}

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(1.5deg); }
        }
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
          background: ${isDarkMode ? '#374151' : '#F1F5F9'};
          border-radius: 10px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: ${isDarkMode ? '#6B7280' : '#94A3B8'};
          border-radius: 10px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: ${isDarkMode ? '#9CA3AF' : '#64748B'};
        }
      `}</style>
    </div>
  );
};

export default KeyPhraseCloud;