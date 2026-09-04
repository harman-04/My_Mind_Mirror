// src/components/DownloadChartButton.jsx
import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { downloadChartAsPng } from '../utils/downloadChart';
import { toast } from 'sonner';

const DownloadChartButton = ({
  chartRef,
  filename,
  darkMode = false,
  className = '',
  onClick,
  isCustomDownloading // 💡 NEW: Allows parent components to control the spinner!
}) => {
  const [isInternalDownloading, setIsInternalDownloading] = useState(false);

  // 💡 Use parent's loading state if provided, otherwise use internal state
  const isDownloading = isCustomDownloading !== undefined ? isCustomDownloading : isInternalDownloading;

  const handleDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isDownloading) return;

    // If a custom onClick is passed (like from KeyPhraseCloud), let the parent handle the download logic
    if (onClick) {
      onClick(e);
      return;
    }

    // Default download behavior for standard ChartJS charts
    if (chartRef?.current) {
      setIsInternalDownloading(true);
      try {
        await downloadChartAsPng(chartRef.current, filename, darkMode);
        toast.success("Chart downloaded successfully!");
      } catch (error) {
        toast.error("Failed to download chart.");
      } finally {
        setIsInternalDownloading(false);
      }
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className={`p-2 flex items-center justify-center rounded-full bg-white/80 dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-black/40 active:scale-95 transition-all shadow-sm border border-transparent dark:border-white/5 disabled:opacity-50 group ${className}`}
      title="Download as PNG"
      aria-label={`Download ${filename} as PNG`}
    >
      {isDownloading ? (
        <Loader2 size={16} className="text-purple-500 animate-spin" />
      ) : (
        <Download size={16} className="text-gray-600 dark:text-gray-300 group-hover:-translate-y-0.5 transition-transform" />
      )}
    </button>
  );
};

export default React.memo(DownloadChartButton);