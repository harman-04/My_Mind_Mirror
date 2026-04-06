import { toPng } from 'html-to-image';

/**
 * Downloads a DOM element as a PNG image.
 * @param {HTMLElement} element - The DOM element to capture.
 * @param {string} filename - Name of the downloaded file (without extension).
 * @param {boolean} isDarkMode - Whether the current theme is dark mode.
 */
export const downloadChartAsPng = async (element, filename, isDarkMode = false) => {
  if (!element) {
    console.error('No element provided for download');
    return;
  }
  try {
    const dataUrl = await toPng(element, {
      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', // solid background
      cacheBust: true,
    });
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Failed to download chart:', error);
  }
};