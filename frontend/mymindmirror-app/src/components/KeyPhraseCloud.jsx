// src/components/KeyPhraseCloud.jsx
import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useKeyPhraseFrequencies } from '../hooks/useJournalData';
import { Cloud, ChevronDown } from 'lucide-react';
import { toPng } from 'html-to-image';
import DownloadChartButton from './DownloadChartButton';

const KeyPhraseCloud = ({ onWordClick }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { data: freqMap, isLoading, isError } = useKeyPhraseFrequencies();
  const cardRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Track window size for responsive font sizing
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
      const handleResize = () => setIsMobile(window.innerWidth < 640);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Premium Glassmorphism Theme Sync
  const cardBg = isDarkMode ? 'bg-[#1A162F]/60 backdrop-blur-xl' : 'bg-white/70 backdrop-blur-xl';
  const cardBorder = isDarkMode ? 'border-white/10' : 'border-white/50';

  const words = useMemo(() => {
    if (!freqMap) return [];
    const entries = Object.entries(freqMap);
    if (entries.length === 0) return [];

    const counts = entries.map(([_, v]) => v);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);

    // 💡 FIX: Scale down font sizes on mobile to prevent overflow
    const minFontSize = isMobile ? 12 : 16;
    const maxFontSize = isMobile ? 40 : 56;

    return entries
      .map(([text, value], index) => {
        const size = entries.length === 1
          ? (isMobile ? 24 : 36)
          : minFontSize + ((value - minCount) / (Math.max(maxCount - minCount, 1))) * (maxFontSize - minFontSize);

        const hue = (index * 137) % 360;
        const sat = isDarkMode ? 90 : 75;
        // 💡 Adjusted Lightness so neon colors pop on the new #131127 background
        const light = isDarkMode ? 70 : 45;

        return {
          text,
          size,
          color: `hsl(${hue}, ${sat}%, ${light}%)`,
          delay: `${(index * 0.05).toFixed(2)}s`,
          duration: `${(4 + Math.random() * 3).toFixed(2)}s`,
        };
      })
      .sort(() => Math.random() - 0.5);
  }, [freqMap, isDarkMode, isMobile]);

  // Handle custom image download (since this isn't a ChartJS canvas)
  const handleDownload = async (e) => {
    e?.stopPropagation();
    if (isDownloading) return;

    const cardEl = cardRef.current;
    const scrollEl = scrollContainerRef.current;
    if (!cardEl || !scrollEl) return;

    setIsDownloading(true);

    const originalMaxHeight = scrollEl.style.maxHeight;
    const originalOverflow = scrollEl.style.overflow;

    // Temporarily expand to capture full content
    scrollEl.style.maxHeight = 'none';
    scrollEl.style.overflow = 'visible';

    await new Promise(resolve => setTimeout(resolve, 150));

    try {
      const dataUrl = await toPng(cardEl, {
        backgroundColor: isDarkMode ? '#131127' : '#ffffff',
        cacheBust: true,
        fontEmbedCSS: '',
        style: { margin: '0' }
      });
      const link = document.createElement('a');
      link.download = `key_phrase_cloud.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Failed to download cloud:', error);
    } finally {
      // Restore styles
      scrollEl.style.maxHeight = originalMaxHeight;
      scrollEl.style.overflow = originalOverflow;
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`w-full rounded-2xl lg:rounded-3xl border ${cardBorder} shadow-lg ring-1 ring-black/5 dark:ring-white/5 overflow-hidden ${cardBg} flex flex-col`}>
        <div className="flex justify-between items-center p-4 lg:p-6 border-b border-gray-200/50 dark:border-gray-700/50">
          <h3 className="text-lg lg:text-xl font-poppins font-extrabold text-gray-800 dark:text-gray-100">
            Key Phrase Cloud
          </h3>
          <DownloadChartButton filename="key_phrase_cloud" darkMode={isDarkMode} className="opacity-50 pointer-events-none" />
        </div>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-[300px]" style={{ backgroundColor: isDarkMode ? '#131127' : '#ffffff' }}>
          <div className="flex flex-wrap justify-center items-center gap-4 lg:gap-6 animate-pulse">
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className="bg-gray-300 dark:bg-gray-700/50 rounded-full"
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

  if (isError || words.length === 0) {
    return (
      <div className={`w-full rounded-2xl lg:rounded-3xl border ${cardBorder} shadow-lg ring-1 ring-black/5 dark:ring-white/5 overflow-hidden ${cardBg} flex flex-col h-full`}>
        <div className="flex flex-wrap justify-between items-center gap-4 p-4 lg:p-6 border-b border-gray-200/50 dark:border-gray-700/50">
          <h3 className="text-lg lg:text-xl font-poppins font-extrabold text-gray-800 dark:text-gray-100">
            Key Phrase Cloud
          </h3>
          <DownloadChartButton filename="key_phrase_cloud" darkMode={isDarkMode} className="opacity-50 pointer-events-none shrink-0" />
        </div>
        <div className="p-6 lg:p-10 flex-grow flex flex-col items-center justify-center text-center" style={{ backgroundColor: isDarkMode ? '#131127' : '#ffffff', minHeight: '300px' }}>
          <div className="relative mb-4 lg:mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-teal-400/20 rounded-full blur-2xl" />
              <Cloud className="w-12 h-12 lg:w-16 lg:h-16 relative text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-lg lg:text-xl font-bold text-gray-700 dark:text-gray-300">
            {isError ? "Couldn't load patterns" : "No patterns detected yet."}
          </p>
          <p className="text-sm lg:text-base text-gray-500 dark:text-gray-400 mt-2">
            Start journaling to see your key phrases appear here!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={cardRef} className={`w-full rounded-2xl lg:rounded-3xl border ${cardBorder} shadow-lg ring-1 ring-black/5 dark:ring-white/5 overflow-hidden ${cardBg} flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5`}>

      {/* Header */}
      <div className={`flex flex-wrap justify-between items-center gap-4 p-4 lg:p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/30 dark:bg-black/10`}>
          <div className="flex-1 min-w-[200px]">
              <h3 className="text-lg lg:text-xl font-poppins font-extrabold text-gray-800 dark:text-gray-100 tracking-tight flex items-center gap-2">
                  <Cloud className="w-5 h-5 lg:w-6 lg:h-6 text-indigo-400" />
                  Key Phrase Cloud
              </h3>
              <p className="text-[11px] lg:text-xs text-gray-500 dark:text-gray-400 mt-0.5 lg:mt-1 font-medium">
                 Common themes from your journaling. Click words to filter your history.
              </p>
          </div>

          <DownloadChartButton
              onClick={handleDownload}
              isCustomDownloading={isDownloading}
              filename="key_phrase_cloud"
              darkMode={isDarkMode}
              className="hover:scale-105 transition-transform shrink-0"
          />
      </div>

      <div
        ref={scrollContainerRef}
        className="p-4 sm:p-6 lg:p-8 overflow-y-auto relative"
        style={{
          backgroundColor: isDarkMode ? '#131127' : '#ffffff',
          maxHeight: isMobile ? '350px' : '450px',
          scrollbarWidth: 'thin',
          scrollbarColor: isDarkMode ? '#4B5563 #131127' : '#CBD5E1 #ffffff',
        }}
      >
        <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-4 lg:gap-6 z-10 pb-4">
          {words.map((word) => (
            <button
              key={word.text}
              onClick={() => onWordClick?.(word.text)}
              className="transition-all duration-700 ease-out hover:scale-125 active:scale-90 hover:z-20 cursor-pointer focus:outline-none"
              style={{
                fontSize: `${word.size}px`,
                color: word.color,
                fontWeight: word.size > (isMobile ? 24 : 36) ? '800' : '600',
                textShadow: isDarkMode ? '0 0 15px rgba(255,255,255,0.05)' : '0 2px 4px rgba(0,0,0,0.05)',
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

      {scrollContainerRef.current && scrollContainerRef.current.scrollHeight > scrollContainerRef.current.clientHeight && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-center pointer-events-none pb-2">
          <div className="bg-gradient-to-t from-white/90 via-white/50 dark:from-[#131127]/90 dark:via-[#131127]/50 to-transparent w-full h-12 flex items-end justify-center pb-2">
            <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500 animate-bounce" />
          </div>
        </div>
      )}

    </div>
  );
};

export default React.memo(KeyPhraseCloud);