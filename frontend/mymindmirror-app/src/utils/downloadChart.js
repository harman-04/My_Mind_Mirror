// src/utils/downloadChart.js
import { toPng } from 'html-to-image';

/**
 * Downloads a DOM element as a PNG image, capturing full scrollable content.
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
    // 1. Save the original styles before we stretch it
    const originalOverflow = element.style.overflow;
    const originalWidth = element.style.width;
    const scrollWidth = element.scrollWidth;

    // 2. Temporarily stretch the element to reveal all hidden/scrolled content
    element.style.overflow = 'visible';
    element.style.width = `${scrollWidth}px`;

    // Wait 50ms for the browser layout to register the stretch
    await new Promise(resolve => setTimeout(resolve, 50));

    // 3. Take the picture at full resolution
    const dataUrl = await toPng(element, {
      // 💡 FIX: Updated to match the new deep indigo dark theme (#131127)
      backgroundColor: isDarkMode ? '#131127' : '#ffffff',
      cacheBust: true,
      fontEmbedCSS: '', // Stops Google Fonts security crash
      pixelRatio: 2,    // Forces Retina/4K quality for crystal clear text!
      width: scrollWidth,
      height: element.scrollHeight,
      style: {
        margin: '0',
      }
    });

    // 4. Instantly revert the styles back to normal so the user can scroll again
    element.style.overflow = originalOverflow;
    element.style.width = originalWidth;

    // 5. Trigger the download
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = dataUrl;
    link.click();

  } catch (error) {
    console.error('Failed to download chart:', error);
    // Ensure we revert styles even if it crashes
    element.style.overflow = 'auto';
    element.style.width = '100%';
    throw error; // Throw the error so the button can trigger the error toast
  }
};