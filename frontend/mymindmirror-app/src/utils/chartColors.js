// src/utils/chartColors.js

// Define a consistent color palette for emotions in Light Mode
export const EMOTION_COLORS_LIGHT = {
    'overall mood score': '#B399D4', // Gentle Lavender for overall mood
    'joy': '#5CC8C2',         // Serene Teal
    'sadness': '#FF8A7A',     // Warm Coral (Distinct from mood score)
    'anger': '#A93226',       // Darker Red
    'anxiety': '#F7DC6F',     // Yellowish for caution
    'fear': '#6C3483',        // Purple-ish
    'surprise': '#85C1E9',    // Light Blue for surprise
    'neutral': '#E0E0E0',     // Soft Gray
    'disgust': '#D35400',     // Dark Orange
    'disappointment': '#283747', // Dark blue-gray
    'remorse': '#7F8C8D',     // Gray
    'grief': '#17202A',       // Very dark blue-gray
    'optimism': '#F1C40F',    // Golden yellow
    'caring': '#2ECC71',      // Green
    'curiosity': '#AF7AC5',   // Light purple
    'relief': '#58D68D',      // Light green
    'love': '#E74C3C',        // Red
    'pride': '#F39C12',       // Orange
    'annoyance': '#E67E22',   // Orange
    'excitement': '#FFD700',  // Gold
    'contentment': '#90EE90', // Light Green
    'frustration': '#FF4500', // Orange-Red
    'gratitude': '#ADFF2F',   // Green-Yellow
    'hope': '#ADD8E6',        // Light Blue
    // Add more as needed, ensuring distinctness
    'trust': '#4CAF50', // Another green shade
    'anticipation': '#FFC107', // Another amber shade
    'shame': '#8B0000', // Dark red
    'guilt': '#4B0082', // Indigo
};

// Define a consistent color palette for emotions in Dark Mode
export const EMOTION_COLORS_DARK = {
    'overall mood score': '#C7B3E6', // Lighter Gentle Lavender for dark mode mood
    'joy': '#8DE2DD',
    'sadness': '#FFB0A4',     // Lighter Warm Coral
    'anger': '#D45E4D',
    'anxiety': '#FFF0B3',
    'fear': '#9B6EB4',
    'surprise': '#B0D9F7',
    'neutral': '#A0A0A0',
    'disgust': '#FF8C40',
    'disappointment': '#506A80',
    'remorse': '#B0B8B8',
    'grief': '#404040',
    'optimism': '#FFD750',
    'caring': '#58D68D',
    'curiosity': '#C79BE0',
    'relief': '#8CE0B0',
    'love': '#FF7F7F',
    'pride': '#FFC050',
    'annoyance': '#FFAB66',
    'excitement': '#FFE680',
    'contentment': '#C0FFC0',
    'frustration': '#FF7F50',
    'gratitude': '#D0FF80',
    'hope': '#C0E0FF',
    // Add more as needed, ensuring distinctness
    'trust': '#6EE7B7', // Lighter green shade
    'anticipation': '#FCD34D', // Lighter amber shade
    'shame': '#FF6347', // Lighter dark red
    'guilt': '#A78BFA', // Lighter indigo
};

// General chart colors (e.g., for background, borders, text)
export const CHART_THEME_COLORS = {
    light: {
        textColor: '#2D3748',
        secondaryTextColor: '#718096',
        gridColor: 'rgba(200, 200, 200, 0.2)',
        backgroundColor: 'rgba(255, 255, 255, 0.6)', // For chart container background
        borderColor: 'rgba(255, 255, 255, 0.3)', // For chart container border
    },
    dark: {
        textColor: '#E2E8F0',
        secondaryTextColor: '#A0AEC0',
        gridColor: 'rgba(100, 100, 100, 0.2)',
        backgroundColor: 'rgba(0, 0, 0, 0.4)', // For chart container background
        borderColor: 'rgba(255, 255, 255, 0.1)', // For chart container border
    }
};
