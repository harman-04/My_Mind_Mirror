import React from 'react';
import { Download } from 'lucide-react';
import { downloadChartAsPng } from '../utils/downloadChart';

const DownloadChartButton = ({ chartRef, filename, darkMode = false, className = '' }) => {
  const handleDownload = () => {
    if (chartRef?.current) {
      downloadChartAsPng(chartRef.current, filename, darkMode);
    }
  };

  return (
    <button
      onClick={handleDownload}
      className={`p-1.5 rounded-full bg-white/80 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 transition shadow-sm ${className}`}
      title="Download as PNG"
    >
      <Download size={16} className="text-gray-600 dark:text-gray-300" />
    </button>
  );
};

export default DownloadChartButton;