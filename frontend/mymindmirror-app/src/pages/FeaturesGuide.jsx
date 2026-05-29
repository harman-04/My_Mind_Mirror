// src/components/FeaturesGuide.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import {
  Sparkles, Brain, Target, Shield, Feather, ArrowRight, ChevronRight,
  Layers, PieChart, Notebook, Hash, Clock, Zap, BookOpen, Gauge,
  TrendingUp, Folders, HeartPulse, BarChart, Lightbulb, Trophy, Flame,
  Cloud, LineChart, ListChecks, MapPin, Lock, Key, Download, Search,
  Filter, AlertTriangle, CheckCircle, RefreshCw, Calendar, HelpCircle,
  ChevronDown, ChevronUp, Activity, Smile, Frown, CircleDot, FileSpreadsheet,
  FileText, Sparkle, Star, Award, CalendarDays, ListTree, Sigma, ScatterChart,
  Menu, X, Video, GraduationCap, Languages, Settings, Clock as ClockIcon,
  Loader, Calendar as CalendarIcon, Check
} from 'lucide-react';

const formatText = (text) => {
  if (!text) return '';
  const escapeHtml = (str) => {
    return str.replace(/[&<>]/g, (m) => {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  };
  const lines = text.split('\n');
  const result = [];
  let i = 0;
  const total = lines.length;
  while (i < total) {
    const line = lines[i];

    const bulletMatch = line.match(/^\s*(\*|\-)\s+(.*)/);
    const numberMatch = line.match(/^\s*(\d+)\.\s+(.*)/);
    if (bulletMatch || numberMatch) {
      const isOrdered = !!numberMatch;
      const listItems = [];
      while (i < total) {
        const currentLine = lines[i];
        const bullet = currentLine.match(/^\s*(\*|\-)\s+(.*)/);
        const number = currentLine.match(/^\s*(\d+)\.\s+(.*)/);
        if (bullet || number) {
          const content = bullet ? bullet[2] : number[2];
          let formatted = escapeHtml(content);
          formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
          listItems.push(`<li>${formatted}</li>`);
          i++;
        } else break;
      }
      const listTag = isOrdered ? 'ol' : 'ul';
      result.push(`<${listTag} class="guide-list">${listItems.join('')}</${listTag}>`);
    } else {
      let formatted = escapeHtml(line);
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
      if (formatted.trim()) {
        result.push(`<p class="guide-paragraph">${formatted}</p>`);
      } else if (line === '') {
        result.push('<br/>');
      }
      i++;
    }
  }
  return result.join('');
};

function FeaturesGuide() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [openSection, setOpenSection] = useState('journal');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const sectionRefs = useRef({});

  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section);
    if (mobileMenuOpen) setMobileMenuOpen(false);
    const element = sectionRefs.current[section];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const colors = {
    primary: isDarkMode ? 'text-purple-300' : 'text-purple-600',
    secondary: isDarkMode ? 'text-teal-300' : 'text-teal-600',
    background: isDarkMode ? 'bg-gray-900' : 'bg-gray-50',
    cardBg: isDarkMode ? 'bg-gray-800/80 backdrop-blur-sm' : 'bg-white/90 backdrop-blur-sm',
    cardBorder: isDarkMode ? 'border-gray-700' : 'border-gray-200',
    textPrimary: isDarkMode ? 'text-gray-100' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-gray-300' : 'text-gray-600',
    sidebarBg: isDarkMode ? 'bg-gray-900/40 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm border-gray-200',
    sidebarText: isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900',
    sidebarActiveBg: isDarkMode ? 'bg-white/10' : 'bg-gray-200/70',
    sidebarActiveText: isDarkMode ? 'text-purple-300 font-medium' : 'text-purple-700 font-medium',
    drawerBg: isDarkMode ? 'bg-gray-900/95 backdrop-blur-xl' : 'bg-white/95 backdrop-blur-xl',
    drawerBorder: isDarkMode ? 'border-gray-700' : 'border-gray-200',
  };

  const sections = [
    {
      id: 'journal',
      title: 'Journaling & AI Analysis',
      icon: <Brain size={24} />,
      color: 'text-purple-400',
      content: `
        **How to use:**
        - Write your thoughts in the textarea on the Journal page.
        - Click "Analyze & Save Entry". The entry saves instantly – AI analysis runs **asynchronously** in the background, so you can continue using the app without waiting.
        - The AI will process your entry and provide:
          - **Mood score** (from -1 = very negative to +1 = very positive)
          - **Emotion breakdown** (percentages for joy, sadness, anger, fear, surprise, love, anxiety, etc.)
          - **Core concerns** identified (e.g., "work stress", "relationship issues")
          - **Concise summary** of the entry
          - **Actionable growth tips** (rich markdown) to improve well-being
          - **Key phrases** extracted (used for word cloud and trends)
        - While analysis is in progress, a toast notification keeps you informed, and the dashboard updates automatically as soon as analysis completes (polling every 2–3 seconds).
        - You can edit or delete entries anytime. Editing triggers a re‑analysis.

        **How it works:**
        - Your entry is encrypted on the backend using AES‑CBC with a key derived from your password hash.
        - The raw text is sent to our Flask ML service, which calls Google's Gemini AI with a structured prompt.
        - Gemini returns a JSON object containing emotions, concerns, summary, tips, and key phrases.
        - Results are stored encrypted in the database.
        - When you view entries, they are decrypted on the fly.
        - **Performance:** A pre‑aggregated summary table (\`daily_journal_summary\`) and triggers ensure that mood charts and anomaly detection queries run in milliseconds, even with thousands of entries.
      `,
    },
    {
      id: 'roadmap',
      title: 'AI Roadmap Generator (Chunked)',
      icon: <MapPin size={24} />,
      color: 'text-teal-400',
      content: `
        **How to use:**
        - Go to the Roadmap tab (next to Milestones).
        - Enter a goal, select duration (number + unit: days/weeks/months/years), and optionally override personal preferences (difficulty, language, learning style, hours per week, avoid weekends).
        - Click **"Generate Roadmap"**. The AI creates a **detailed plan for the first 12 weeks** (or all weeks if less than 12). For longer durations (e.g., 26 weeks), the remaining weeks appear as placeholders.
        - **Load Next Weeks** – Click the button below the tasks list to generate the next 6 weeks (e.g., weeks 13‑18). The AI continues exactly where it left off, using the summary of previous weeks to avoid repetition. You can keep clicking until the roadmap is fully generated.
        - **Expand/Collapse All** – Use buttons to quickly expand or collapse all weeks.

        Each week's tasks are displayed with:
        - **Detailed instructions** (markdown with headings, lists, links)
        - **Subtasks** (array of actionable steps)
        - **Resources** (articles, videos, courses) – AI can also provide these; otherwise fallback resources appear.
        - **Mark as complete** (syncs with Milestones if imported)
        - **Add to Milestones** – imports the task into the MilestoneTracker, preserving details and subtasks.
        - **Elaborate / Enhance** – generate a deeper, example‑rich explanation for any task.

        Additional actions:
        - **Continue (based on progress)** – only works after completing some tasks; adds a few extra tasks to keep you moving.
        - **Smart Reschedule** – if you fall behind, AI re‑plans the remaining weeks.

        **How it works:**
        - The first generation requests at most 12 weeks (chunk size). The backend stores \`generatedWeeks\` = number of weeks with AI content.
        - Each continuation call sends a list of already covered weeks (summarised) to the AI, ensuring logical progression without repetition.
        - The frontend lazy‑loads weeks gradually, showing only generated weeks initially, with a “Load Next Weeks” button.
        - Personalisation preferences (difficulty, language, learning style, hours/week, avoid weekends) are stored in \`UserRoadmapPreferences\` and applied to every generation.
        - The AI returns a flat JSON tasks array – no complex nesting – making parsing robust.
      `,
    },
    {
      id: 'milestones',
      title: 'Milestones & Tasks (with Subtasks & Details)',
      icon: <Target size={24} />,
      color: 'text-rose-400',
      content: `
        **How to use:**
        - In the Milestones tab, create milestones (long‑term goals) with a title, description, and due date.
        - Under each milestone, add tasks – now you can include **detailed instructions** (textarea) and a **list of subtasks** (dynamic add/remove).
        - When you add a task, you can also specify \`details\` and \`subtasks\` directly, just like imported roadmap tasks.
        - Edit any task to update its details, subtasks, status, or due date.
        - The milestone progress bar updates automatically based on completed tasks.
        - Tasks imported from roadmaps appear with a **"from Roadmap"** badge, and their details/subtasks are preserved.
        - When you complete an imported task, the corresponding roadmap task is also marked complete (two‑way sync).

        **How it works:**
        - Milestones and tasks are stored with separate columns for \`details\` (TEXT) and \`subtasksJson\` (JSON array).
        - When a roadmap task is imported, its \`details\` and \`subtasks\` are copied to the new milestone task.
        - Completion percentage is calculated dynamically: (completed tasks / total tasks) * 100.
        - Status (PENDING, IN_PROGRESS, COMPLETED, OVERDUE) is automatically updated based on tasks and due dates.
      `,
    },
    {
      id: 'gamification',
      title: 'Gamification & Achievements',
      icon: <Trophy size={24} />,
      color: 'text-amber-400',
      content: `
        **How to use:**
        - As you complete tasks (from roadmaps or milestones), you automatically earn:
          - **Streaks:** Consecutive days with at least one completed task.
          - **Badges:**
            - First Step – Complete your first task.
            - 3‑Day Streak – Maintain a 3‑day streak.
            - 7‑Day Streak – Maintain a 7‑day streak.
            - Task Master – Complete 10 tasks total.
            - Roadmap Finisher – Complete all tasks in any roadmap.
        - View your progress on the Achievements page (link in header) or the widget on the Journal page.
        - The widget shows your current streak, earned badges, and next badge to unlock.

        **How it works:**
        - A \`UserStats\` table stores \`currentStreak\`, \`longestStreak\`, \`lastActiveDate\`, \`badges\` (JSON), and \`totalTasksCompleted\`.
        - Each time you complete a task, the backend updates the streak (checks if lastActiveDate was yesterday) and checks badge conditions.
        - Badges are stored as a JSON array (e.g., ["FIRST_STEP", "THREE_DAY_STREAK"]).
        - The frontend displays badges with icons and tooltips.
        - **Caching:** Gamification stats are cached in Redis for 5 minutes to reduce database load.
      `,
    },
    {
      id: 'insights',
      title: 'Visual Insights (Charts)',
      icon: <LineChart size={24} />,
      color: 'text-blue-400',
      content: `
        **How to use:**
        - Navigate to the Journal page and switch between tabs:
          - **Today Dashboard:** Shows today's AI reflection, emotion snapshot (doughnut chart), and all today's entries.
          - **Weekly Dashboard:** Shows mood trends, emotion intensity, concerns, and entries for the current week.
          - **All Entries Dashboard:** Shows overall charts, word cloud, clustering, paginated entry list, and anomaly alerts.

        **Chart Details:**

        1. **Mood & Emotion Trends (Line Chart)**
           - X‑axis: Date
           - Y‑axis: Score / Intensity (-1 to 1 for mood, 0 to 1 for emotions)
           - Plots your overall mood score and selected emotions (joy, sadness, anger, anxiety, fear, neutral) over time.
           - Helps identify patterns (e.g., low mood on Mondays, high anxiety before exams).

        2. **Average Emotion Intensity (Bar Chart)**
           - Shows the average intensity of each emotion across all your entries.
           - Useful to see which emotions dominate your journaling overall.

        3. **Most Frequent Journal Concerns (Bar Chart)**
           - Counts how many times each core concern appears across entries.
           - Helps identify recurring themes (e.g., "work stress" appears in 70% of entries).

        4. **Mood vs. Word Count Correlation (Scatter Plot + Trend Line)**
           - Each dot represents a journal entry: X = word count, Y = mood score.
           - A trend line (linear regression) shows the relationship.
           - The correlation coefficient (r) is displayed (e.g., r = 0.42).
           - Positive r means longer entries tend to be more positive; negative r means longer entries are more negative.
           - Tooltip on each dot shows date, word count, mood, and summary preview.

        5. **Key Phrase Cloud**
           - Words are sized by frequency – the more often a phrase appears, the larger it is.
           - Click any phrase to filter the entry list to entries containing that phrase.
           - Colors are generated using a golden angle distribution for maximum beauty.

        6. **Journal Clustering**
           - Groups entries into themes (e.g., "work", "relationships", "health") using semantic similarity.
           - Click "Find My Themes" to run the clustering (requires at least 2 entries).
           - You can then filter entries by theme.
           - The algorithm uses Sentence Transformers (all-MiniLM-L6-v2) and KMeans clustering.

        7. **Anomaly Alerts**
           - Detects unusual mood or word count patterns using EWMA (Exponentially Weighted Moving Average) directly in the Flask service.
           - Alerts appear when your mood drops significantly or you write much more/less than usual.
           - Helps you notice emotional shifts early.

        **Performance Optimisations:**
        - A pre‑aggregated summary table (\`daily_journal_summary\`) and database triggers keep daily averages pre‑computed. Queries for mood charts and anomaly detection run in <10ms.
        - Redis caching caches key phrase frequencies and gamification stats.
        - Frontend lazy‑loads the “All Entries” tab only when selected, reducing initial page load.
      `,
    },
    {
      id: 'radar',
      title: 'Emotional Profile Radar Chart',
      icon: <Activity size={24} />,
      color: 'text-indigo-400',
      content: `
        **What it shows:**
        - A spider/web chart that plots the average intensity of **all 14 emotions** (joy, sadness, anger, fear, surprise, love, anxiety, relief, neutral, excitement, contentment, frustration, gratitude, hope) on a single circular graph.
        - Each spoke represents one emotion; the distance from the center indicates average intensity (0 = never, 1 = very strong).

        **How to interpret:**
        - **Dominant emotion:** The longest spoke shows which emotion appears most strongly in your journal entries.
        - **Emotional blunting:** If most spokes are very short and "Neutral" is long, it may indicate low emotional arousal (calm or stagnant state).
        - **Secondary emotions:** Look for second‑longest spokes – they reveal underlying feelings (e.g., frustration alongside sadness).
        - **Balance:** A roughly circular shape means all emotions are present at similar levels; a spiky shape means a few emotions dominate.

        **Why it's useful:**
        - Unlike the bar chart (which only shows the top 7 emotions), the radar displays **all emotions at once**, revealing the "shape" of your emotional profile.
        - Helps identify subtle patterns, such as a mix of joy and anxiety, or a flat line indicating burnout.
        - Common in personality assessments and mental health apps – adds a professional, advanced visualization.

        **Where to find it:**
        - On the **All Entries** tab of the Journal page, below the Average Emotion Intensity bar chart.
      `,
    },
    {
      id: 'export-charts',
      title: 'Download Charts as Images',
      icon: <Download size={24} />,
      color: 'text-emerald-400',
      content: `
        **How to use:**
        - Every chart on the All Entries dashboard has a small **download button** (↓) in the top‑right corner.
        - Click the button to save the chart as a PNG image.
        - The image is downloaded instantly to your device with a descriptive filename (e.g., "mood_trend_chart.png").

        **Which charts support this?**
        - Mood & Emotion Trends (line chart)
        - Average Emotion Intensity (bar chart)
        - Most Frequent Concerns (bar chart)
        - Mood vs. Word Count Correlation (scatter plot)
        - Emotional Profile Radar Chart
        - Key Phrase Cloud (optional)

        **Why it's useful:**
        - Share your emotional journey on social media, in presentations, or with a therapist.
        - Keep a visual record of your progress over time.
        - No need for screenshot tools – one click, and the chart is saved with a clean background.

        **How it works:**
        - Uses the \`html-to-image\` library to capture the chart's DOM element.
        - Converts it to a PNG data URL and triggers a download.
        - The background adapts to light/dark mode for a clean image.
      `,
    },
    {
      id: 'search',
      title: 'Search & Filter',
      icon: <Search size={24} />,
      color: 'text-cyan-400',
      content: `
        **How to use:**
        - In the Search tab, you can search by:
          - **Keyword** – find entries containing a specific word or phrase.
          - **Mood Score** – filter entries within a mood range (e.g., -0.5 to 0.5).
          - **Date Range** – select start and end dates.
        - In the "All Entries" tab, you can also filter by:
          - **Key phrase** – click any word in the word cloud.
          - **Cluster theme** – after running clustering, click a theme button.
        - Clear filters with the "Clear Filter" button.

        **How it works:**
        - Keyword search fetches all entries and decrypts them in memory (due to encryption), then filters client‑side.
        - Mood and date searches use database queries (mood score is stored as a number, date as a date).
        - Clustering filter uses the clusterId stored on each entry.
      `,
    },
    {
      id: 'export',
      title: 'Export Data to CSV/PDF',
      icon: <Download size={24} />,
      color: 'text-green-400',
      content: `
        **How to use:**
        - On the Journal page, click the **CSV** button to download all entries as a CSV file.
        - Click the **PDF** button to download a formatted PDF with a table of entries (date, mood, truncated summary, key phrases).
        - The export includes all your entries, regardless of the current tab or filters.

        **How it works:**
        - The frontend fetches all entries via the /api/journal/history endpoint.
        - CSV generation: creates a Blob with UTF‑8 BOM and triggers download using file‑saver.
        - PDF generation: uses jspdf and jspdf‑autotable to create a landscape PDF with a table and metadata.
      `,
    },
    {
      id: 'schedule',
      title: 'Smart Timetable (AI Scheduling)',
      icon: <CalendarIcon size={24} />,
      color: 'text-orange-400',
      content: `
        **How to use:**
        - Go to the **Schedule** tab (calendar icon in the Journal page navigation).
        - First, define your **available hours** in Profile → “Your Available Hours”. Set time slots for each day of the week (e.g., Monday 9:00‑12:00, 13:00‑18:00). These hours are used by the AI scheduler.
        - Select a mode:
          - **All Tasks** – schedules every pending task (from roadmaps, milestones, and custom tasks).
          - **Custom Tasks** – schedules only tasks you created manually in the Custom Tasks section.
        - Click **Generate** – the AI (or a fallback deterministic scheduler) will place your tasks into your available time slots, respecting priorities, due dates, and task durations.
        - You can **drag and drop** any task to a different day/time directly on the calendar.
        - Mark tasks as complete from the calendar – they will be checked off and sync with the original task (custom tasks, milestones, or roadmaps).
        - Add **custom tasks** using the “Add Task” button (title, description, due date, estimated hours, priority). These tasks appear in the custom tasks list and can be dragged onto the calendar.

        **How it works:**
        - The backend collects unscheduled tasks (based on mode) and sends them to the Flask ML service with the user’s available hours.
        - The AI returns a schedule JSON (or fallback if AI fails). The schedule is saved in the \`scheduled_tasks\` table.
        - Drag‑and‑drop updates are sent via \`PUT /api/schedule/task/{id}/move\`.
        - Completion toggles are sent via \`PATCH /api/schedule/task/{id}/complete\` and sync back to the original task (roadmap/milestone/custom).
        - Custom tasks can be edited or deleted; changes are reflected in the calendar automatically.
      `,
    },
    {
      id: 'ai-coach',
      title: 'AI Reflection Coach',
      icon: <Sparkles size={24} />,
      color: 'text-pink-400',
      content: `
        **How to use:**
        - Go to the **AI Coach** tab in the Journal page.
        - A reflective question is automatically generated based on your recent journal entries. You can answer it, or ask your own question.
        - Type your message and press Enter (or click Send). The AI, using the context of your past entries, will provide a thoughtful, personalised response.
        - Use the **refresh button** to get a new reflective question.
        - You can choose **Append** (adds new answer after existing) or **Replace** (overwrites the last AI response) mode.
        - Copy any message with the copy button.

        **How it works:**
        - The backend fetches the last 30 days of journal entries (summaries and emotions), builds a context string, and sends it to Gemini API via the Flask service.
        - The response is returned as plain text and displayed with markdown formatting (headings, lists, code blocks, blockquotes).
        - Reflective questions are cached for 5 minutes to avoid repeated calls.
      `,
    },
    {
      id: 'personalization',
      title: 'Roadmap Personalization & User Preferences',
      icon: <Settings size={24} />,
      color: 'text-teal-400',
      content: `
        **How to use:**
        - In the Profile page, under **“Roadmap Preferences”**, you can set:
          - **Difficulty** – Beginner (explain basics), Intermediate, Advanced (skip fundamentals)
          - **Preferred Language** – English, Hindi, Spanish, French, German, Chinese, Arabic (output text will be in that language)
          - **Learning Style** – Reading (articles, docs), Visual (videos, diagrams), Hands‑on (exercises, projects)
          - **Hours per Week** – Used to spread tasks realistically.
          - **Avoid Weekends** – Schedule tasks only on weekdays.
        - These preferences are used as defaults when generating a new roadmap. You can **override** them per roadmap in the generation form.
        - Additionally, under **“Your Available Hours”**, you can set custom time slots for each day (e.g., Monday 9‑12, 13‑18). The Smart Timetable will use these hours for scheduling.

        **How it works:**
        - The \`UserRoadmapPreferences\` and \`UserPreferences\` tables store these settings.
        - They are loaded via the combined \`/profile-full\` endpoint in a single request, then cached in Redis.
        - When generating a roadmap, the preferences are sent to the ML service and incorporated into the AI prompt.
        - When generating a schedule, the available hours are sent to the AI scheduler.
      `,
    },
    {
      id: 'performance',
      title: 'Performance Optimizations',
      icon: <Zap size={24} />,
      color: 'text-yellow-400',
      content: `
        **What we did to make the app fast:**

        - **Database indexes** – Added indexes on foreign keys and frequently filtered columns (e.g., \`user_id\`, \`entry_date\`, \`created_at\`).
        - **N+1 query elimination** – Used \`@EntityGraph\` to fetch tasks, resources, and milestones in a single query.
        - **Pre‑aggregated summary table** – \`daily_journal_summary\` maintains daily average mood and total words via triggers, making mood charts and anomaly detection instant.
        - **Redis caching** – Caches user preferences, gamification stats, key phrase frequencies, API key status, and combined profile. Cache invalidation is automatic on update.
        - **Lazy‑loaded routes** – JournalPage, ProfilePage, AchievementsPage, etc., are split into separate chunks and loaded only when needed.
        - **Deferred “All Entries” tab** – The paginated journal history is only fetched when the user switches to the History tab.
        - **Asynchronous journal analysis** – Saving an entry does not block the UI. Analysis runs in background, and the frontend polls for completion.
        - **Frontend memoisation** – Used \`React.memo\` on heavy components (\`JournalHistory\`, \`MoodChart\`, \`RoadmapTimeline\`) and \`useCallback\`/\`useMemo\` for derived data.
        - **Gzip compression** – Enabled for API responses (size reduced by 70‑80%).
        - **Lazy‑loading of weeks** – Roadmap weeks are loaded incrementally; initially only generated weeks are shown, and “Load Next Weeks” fetches more.
        - **Debounced search** – Prevents excessive API calls while typing.
        - **Virtualised lists** – Not needed because pagination is already used.

        These optimisations result in sub‑second initial load, smooth scrolling, and minimal database load even with thousands of entries.
      `,
    },
    {
      id: 'security-privacy',
      title: 'Security, Encryption & Bring‑Your‑Own‑Key',
      icon: <Shield size={24} />,
      color: 'text-indigo-400',
      content: `
        **How it works:**
        - All journal entries are encrypted using AES‑CBC with a 256‑bit key derived from your password hash using PBKDF2.
        - Encryption happens on the backend before storage; decryption happens on retrieval.
        - Your Gemini API key (if you provide your own) is encrypted using AES‑GCM with a master key stored in environment variables.
        - Passwords are hashed using BCrypt.
        - Communication between frontend and backend uses HTTPS (in production) and JWT tokens (stored in localStorage – we recommend switching to httpOnly cookies for production).
        - **Privacy:**
          - Your data is never shared with third parties.
          - If you use your own Gemini API key, your journal entries are sent directly to Google Gemini using your key – the app's backend never sees your key or the unencrypted content.
          - You can delete your account and all data at any time (cascading delete handles all related tables).
        - **Bring Your Own Key (BYOK):**
          - In the Profile page, you can paste your own Gemini API key. It is encrypted and stored in the database.
          - When AI features are used, the Flask service will use your key instead of the shared one, improving privacy and avoiding shared quota exhaustion.
          - You can test and manage your key at any time.
      `,
    },
    {
      id: 'ai-tech-stack',
      title: 'AI Technology Stack',
      icon: <Brain size={24} />,
      color: 'text-pink-400',
      content: `
        **How it works:**
        - This app uses Google's **Gemini 2.5 Flash** model for all generative AI features:
          - Journal analysis (emotions, concerns, summary, tips, key phrases)
          - Roadmap generation (chunked, with personalisation)
          - Task elaboration and enhancement
          - Continuous roadmap suggestions
          - Smart rescheduling
          - Reflection chat and question generation
        - The AI is accessed via a **Flask ML service** (separate container) that handles:
          - Rate limiting (RPM and TPM)
          - Exponential backoff retries
          - Fallback responses (if AI fails, return default/empty data)
          - Support for user‑provided API keys (better privacy and quota control)
        - The ML service also runs **data science** tasks:
          - Semantic clustering (sentence-transformers \`all-MiniLM-L6-v2\` + KMeans)
          - Anomaly detection (EWMA using pandas)
        - **Model details:**
          - Gemini 2.5 Flash is chosen for its low latency, high throughput, and excellent instruction‑following capabilities.
          - Sentence‑transformers (all-MiniLM-L6-v2) is a lightweight model (80 MB) that creates 384‑dimensional embeddings for clustering.
          - All models run on CPU (no GPU required), making deployment simple.
        - **Performance:**
          - The ML service uses caching for reflective questions (5 minutes) and Redis for Gemini rate limiting.
          - Journal analysis is fully asynchronous, so the user never waits.
      `,
    },
  ];

  return (
    <div className={`min-h-screen w-full ${colors.background} ${colors.textPrimary} transition-colors duration-300 relative`}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-teal-500/5" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Hero Section */}
      <section className="relative w-full py-20 px-4 sm:px-6 lg:px-8 text-center z-10">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-teal-500/20 border border-purple-500/30 mb-6 animate-in fade-in slide-in-from-top-5 duration-700">
            <Sparkles className="w-4 h-4 text-purple-400 mr-2" />
            <span className="text-sm font-medium">Everything you need to know</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold mb-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
            Features &{" "}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-teal-400 bg-clip-text text-transparent">
              How It Works
            </span>
          </h1>
          <p className={`text-xl ${colors.textSecondary} max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100`}>
            Explore every feature in detail – from AI analysis to gamification, smart scheduling, and enterprise‑grade performance.
          </p>
          <div className="absolute top-20 left-5 opacity-30 animate-float hidden lg:block">
            <Sparkles size={32} className="text-purple-400" />
          </div>
          <div className="absolute top-40 right-10 opacity-30 animate-float-delayed hidden lg:block">
            <Brain size={32} className="text-teal-400" />
          </div>
          <div className="absolute bottom-20 left-1/3 opacity-30 animate-float-slow hidden lg:block">
            <Trophy size={32} className="text-amber-400" />
          </div>
        </div>
      </section>

      {/* Main Content with Sidebar + Accordion */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="hidden lg:block w-80 shrink-0">
            <div className={`sticky top-24 rounded-xl ${colors.sidebarBg} border ${colors.cardBorder} p-5 shadow-sm`}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Menu size={18} /> Contents
              </h3>
              <nav className="space-y-1 max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => toggleSection(section.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition flex items-center gap-2 text-sm ${
                      openSection === section.id
                        ? `${colors.sidebarActiveText} ${colors.sidebarActiveBg}`
                        : `${colors.sidebarText} hover:bg-white/5`
                    }`}
                  >
                    <span className="shrink-0">{section.icon}</span>
                    <span className="truncate">{section.title}</span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          <div className="lg:hidden fixed bottom-6 right-6 z-40">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-3 rounded-full bg-gradient-to-r from-purple-500 to-teal-500 text-white shadow-lg hover:shadow-xl transition"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm lg:hidden" onClick={() => setMobileMenuOpen(false)}>
              <div className={`absolute right-0 top-0 bottom-0 w-80 ${colors.drawerBg} border-l ${colors.drawerBorder} shadow-xl p-5 overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold">Contents</h3>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800">
                    <X size={20} />
                  </button>
                </div>
                <nav className="space-y-2">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => toggleSection(section.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition flex items-center gap-2 ${
                        openSection === section.id
                          ? `${colors.sidebarActiveText} ${colors.sidebarActiveBg}`
                          : `${colors.sidebarText} hover:bg-white/5`
                      }`}
                    >
                      {section.icon}
                      <span>{section.title}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          )}

          <div className="flex-1 space-y-5">
            {sections.map((section) => (
              <div
                key={section.id}
                ref={(el) => (sectionRefs.current[section.id] = el)}
                className={`rounded-2xl ${colors.cardBg} border ${colors.cardBorder} overflow-hidden transition-all duration-300 hover:shadow-xl group`}
              >
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex justify-between items-center p-6 text-left hover:bg-white/5 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${section.color.replace('text', 'bg')}/20 ${section.color}`}>
                      {section.icon}
                    </div>
                    <h2 className="text-xl font-semibold">{section.title}</h2>
                  </div>
                  <div className={`transition-transform duration-300 ${openSection === section.id ? 'rotate-180' : ''}`}>
                    <ChevronDown size={20} className="text-gray-500" />
                  </div>
                </button>
                {openSection === section.id && (
                  <div className="p-6 pt-0 border-t border-gray-200 dark:border-gray-700 animate-in slide-in-from-top-2 duration-300">
                    <div className="guide-content prose prose-sm dark:prose-invert max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: formatText(section.content) }} />
                    </div>
                    <div className="mt-4 text-right">
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="text-xs text-gray-500 hover:text-purple-400 transition"
                      >
                        Collapse
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .guide-content p.guide-paragraph {
          margin-bottom: 1rem;
          line-height: 1.6;
        }
        .guide-content ul.guide-list,
        .guide-content ol.guide-list {
          margin: 0.75rem 0 1rem 1.5rem;
        }
        .guide-content li {
          margin-bottom: 0.25rem;
          line-height: 1.6;
        }
        .guide-content strong {
          font-weight: 700;
          color: ${isDarkMode ? '#C7B3E6' : '#B399D4'};
        }
        .guide-content em {
          font-style: italic;
          color: ${isDarkMode ? '#8DE2DD' : '#5CC8C2'};
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'};
          border-radius: 10px;
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 4s ease-in-out infinite 2s;
        }
        .animate-float-slow {
          animation: float 6s ease-in-out infinite 1s;
        }
      `}</style>

      {/* Call to Action */}
      <section className="relative w-full py-20 px-4 sm:px-6 lg:px-8 z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className={`rounded-3xl ${colors.cardBg} border ${colors.cardBorder} p-8 md:p-12 backdrop-blur-sm relative overflow-hidden group`}>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition duration-700" />
            <div className="relative">
              <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-teal-500/20 mb-6">
                <Feather className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to experience it yourself?</h2>
              <p className={`text-lg mb-8 ${colors.textSecondary}`}>
                Start journaling today and unlock the power of AI-driven self-reflection.
              </p>
              <Link
                to={localStorage.getItem('jwtToken') ? "/journal" : "/register"}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-teal-500 text-white px-8 py-3 rounded-full font-semibold hover:shadow-lg hover:scale-105 transition transform"
              >
                {localStorage.getItem('jwtToken') ? "Go to Journal" : "Create Free Account"}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default FeaturesGuide;