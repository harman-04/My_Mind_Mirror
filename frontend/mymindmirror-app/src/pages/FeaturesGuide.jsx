// src/pages/FeaturesGuide.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
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
  Loader, Calendar as CalendarIcon, Check, Database, Cpu, Server, LockKeyhole
} from 'lucide-react';

/**
 * Enterprise Markdown Parser
 * Optimized to handle bold, italics, ordered/unordered lists, and inline code blocks.
 */
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
          formatted = formatted.replace(/`(.*?)`/g, '<code class="guide-code">$1</code>');

          listItems.push(`<li>${formatted}</li>`);
          i++;
        } else {
          break;
        }
      }
      const listTag = isOrdered ? 'ol' : 'ul';
      result.push(`<${listTag} class="guide-list">${listItems.join('')}</${listTag}>`);

    } else {
      let formatted = escapeHtml(line);

      formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
      formatted = formatted.replace(/`(.*?)`/g, '<code class="guide-code">$1</code>');

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

const FeatureSectionCard = React.memo(React.forwardRef(({ section, isOpen, onToggle, colors }, ref) => {
  return (
    <div
      ref={ref}
      className={`rounded-2xl lg:rounded-3xl ${colors.cardBg} border ${colors.cardBorder} overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-purple-500/30 dark:hover:border-teal-500/30 group scroll-mt-24 lg:scroll-mt-32`}
    >
      <button
        onClick={() => onToggle(section.id)}
        aria-expanded={isOpen}
        className="w-full flex justify-between items-center p-5 lg:p-8 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-4 lg:gap-6 pr-4">
          <div className={`p-3 lg:p-4 rounded-xl lg:rounded-2xl bg-white/60 dark:bg-black/20 shadow-sm border border-white/40 dark:border-white/5 ${section.color}`}>
            {React.cloneElement(section.icon, { className: "w-6 h-6 lg:w-8 lg:h-8" })}
          </div>
          <h2 className="text-xl lg:text-2xl font-poppins font-extrabold tracking-tight text-gray-800 dark:text-gray-100 leading-tight">
            {section.title}
          </h2>
        </div>
        <div className={`shrink-0 p-2 lg:p-2.5 rounded-full transition-all duration-300 shadow-sm ${isOpen ? 'bg-purple-500 dark:bg-teal-500 text-white rotate-180' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-white/10'}`}>
          <ChevronDown className="w-5 h-5 lg:w-6 lg:h-6" />
        </div>
      </button>

      {isOpen && (
        <div className="p-5 lg:p-8 pt-0 lg:pt-0 border-t border-gray-200/50 dark:border-white/5 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="guide-content prose prose-sm md:prose-base lg:prose-lg dark:prose-invert max-w-none mt-6 lg:mt-8 text-gray-700 dark:text-gray-300">
            <div dangerouslySetInnerHTML={{ __html: formatText(section.content) }} />
          </div>
          <div className="mt-8 lg:mt-10 text-right border-t border-gray-200/50 dark:border-white/5 pt-4 lg:pt-6">
            <button
              onClick={() => onToggle(section.id)}
              className="inline-flex items-center gap-2 text-sm lg:text-base font-bold text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-teal-400 transition-colors px-5 py-2.5 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-purple-50 dark:hover:bg-teal-900/20 shadow-sm"
            >
              <ChevronUp className="w-4 h-4 lg:w-5 lg:h-5" /> Close Section
            </button>
          </div>
        </div>
      )}
    </div>
  );
}));

FeatureSectionCard.displayName = 'FeatureSectionCard';

function FeaturesGuide() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [openSection, setOpenSection] = useState('journal-and-analysis');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const sectionRefs = useRef({});

  const toggleSection = useCallback((sectionId) => {
    setOpenSection((prevSection) => {
      const isOpening = prevSection !== sectionId;

      if (isOpening) {
        setTimeout(() => {
          const element = sectionRefs.current[sectionId];
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 50);
      }
      return isOpening ? sectionId : null;
    });
    setMobileMenuOpen(false);
  }, []);

  const colors = useMemo(() => ({
    background: 'bg-transparent', // We rely on global background now
    cardBg: isDarkMode ? 'bg-[#1A162F]/60 backdrop-blur-xl' : 'bg-white/70 backdrop-blur-xl',
    cardBorder: isDarkMode ? 'border-white/10' : 'border-gray-200/50',
    textPrimary: isDarkMode ? 'text-gray-100' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-gray-400' : 'text-gray-500',
    sidebarBg: isDarkMode ? 'bg-[#131127]/60 backdrop-blur-xl' : 'bg-white/80 backdrop-blur-xl border-gray-200/50',
    sidebarText: isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900',
    sidebarActiveBg: isDarkMode ? 'bg-white/10 shadow-sm' : 'bg-white shadow-sm',
    sidebarActiveText: isDarkMode ? 'text-teal-400 font-bold' : 'text-purple-700 font-bold',
    drawerBg: isDarkMode ? 'bg-[#1A162F]/95 backdrop-blur-xl' : 'bg-white/95 backdrop-blur-xl',
    drawerBorder: isDarkMode ? 'border-white/10' : 'border-gray-200/50',
  }), [isDarkMode]);

  const sections = useMemo(() => [
      {
        id: 'journal-and-analysis',
        title: 'Journaling, Real-Time Polling & Asynchronous AI Analysis',
        icon: <Database />,
        color: 'text-purple-500 dark:text-purple-400',
        content: `
          **How to use:**
          - Write your deepest thoughts in the textarea on the Journal page.
          - Click "Analyze & Save Entry". The entry saves to your database instantly.
          - **Zero-Wait Workflow:** AI analysis runs entirely asynchronously in the background. You do not have to stare at a loading spinner. You can immediately navigate away, create tasks, or log out.
          - While the AI processes your entry, a toast notification keeps you informed. The frontend dashboard automatically polls the server every 2–3 seconds and will instantly pop the results onto your screen the second they are ready.
          - The AI processes your raw text and provides:
            - **Calculated Mood Score:** (ranging from -1.0 = very negative to +1.0 = very positive).
            - **High-Fidelity Emotion Breakdown:** Radar-ready percentage intensities for 14 specific emotional states (e.g., joy, sadness, anger, fear, surprise, love, anxiety, relief, neutral, excitement, contentment, frustration, gratitude, hope).
            - **Core Concerns:** Key themes identified and categorized (e.g., "work stress", "academic pressure").
            - **Concise Summary:** A short, scan-friendly summary of the entry for timeline reading.
            - **Actionable Growth Tips:** Highly formatted rich markdown offering therapeutic or productive advice.
            - **Key Phrases:** Extracted conceptual phrases utilized to build your semantic word cloud.

          **Enterprise Architecture (How it works):**
          - **Zero-Knowledge Encryption:** Your raw text is encrypted immediately on the backend before ever touching a disk. We use AES-CBC with a 256-bit cryptographic key derived via PBKDF2 from your BCrypt password hash.
          - **Asynchronous Spring AI & Polling:** The \`AsyncJournalAnalysisService\` takes over post-commit, offloading the heavy HTTP request to the \`DynamicAiClientService\`. The frontend uses a reactive polling hook to fetch the \`analysis_status\` flag until it turns to \`COMPLETED\`.
          - **pgvector Integration:** Once analyzed, the \`EmbeddingGenerationService\` automatically generates a 3072-dimensional vector embedding of your entry's summary and key phrases, storing it in a secondary PostgreSQL database for ultra-fast semantic similarity searches.
          - **O(1) Chart Performance:** A pre-aggregated MySQL table (\`daily_journal_summary\`) is maintained via database triggers. It calculates your daily mood and word averages on the fly as entries are inserted, allowing analytics charts to render in <10ms even with thousands of rows.
        `,
      },
      {
        id: 'rag-ai-coach',
        title: 'AI Reflection Coach (RAG & Redis Session Memory)',
        icon: <Brain />,
        color: 'text-pink-500 dark:text-pink-400',
        content: `
          **How to use:**
          - Navigate to the **AI Coach** tab on your Journal page.
          - The system will automatically greet you with a deeply personalized reflective question. This isn't random—it is synthetically generated based on a mathematical synthesis of your recent journal entries.
          - Chat with the AI naturally. Ask for advice, seek emotional clarity, or request pattern recognition (e.g., "Why do I always feel anxious on Sunday nights?").
          - **Continuous Memory:** The AI remembers what you just said! You can have a flowing, multi-turn conversation without having to repeat your context.
          - **Append vs. Replace:** Toggle between **Append** (keeps the full chat history visible like a messaging app) or **Replace** (clears the screen for a fresh thought, overwriting the last UI block).
          - Use the **refresh button** to generate a completely new reflective question.
          - Easily extract insights using the quick-copy button on any message.

          **Enterprise Architecture (How it works):**
          - **Retrieval-Augmented Generation (RAG):** Standard chatbots suffer from immediate amnesia or generic advice. MyMindMirror utilizes advanced RAG. When you ask a question, the backend queries the PostgreSQL \`pgvector\` database to find your most highly relevant past entries (Cosine similarity threshold > 0.50).
          - **Context Injection & Decryption:** These past memories are fetched, decrypted safely in active memory, and injected directly into the LLM system prompt. This forces the AI to ground its advice purely on your actual lived experiences rather than generic internet training data.
          - **Redis Session Memory TTL:** Powered by the \`ChatMemoryService\`, your active conversation is maintained in a lightning-fast Redis cache using a rolling window of the last 10 messages with a strict 1-hour Time-To-Live (TTL) eviction policy.
          - **High-Reasoning Models:** The chat engine dynamically routes these complex memory tasks through premium instruction-following models (like \`gemini-3.5-flash\` or \`gemma-4\`) ensuring the psychological tone perfectly matches the emotional state of your journal.
        `,
      },
      {
        id: 'roadmap-and-milestones',
        title: 'AI Roadmap Generator & Milestone Tracker (Chunked Architecture)',
        icon: <MapPin />,
        color: 'text-teal-500 dark:text-teal-400',
        content: `
          **How to use:**
          - Navigate to the **Roadmaps** panel to establish long-term personal or professional objectives.
          - Input your primary target goal, define the expected total lifecycle duration (days, weeks, months, or years), and apply granular overrides if you wish to bypass your default profile settings.
          - Click **"Generate Roadmap"** to launch the initialization engine. The interface immediately renders a beautifully grouped layout mapping out the **first 12 structural weeks** (or the absolute duration if shorter).
          - For extensive durations (e.g., a 6-month master plan), the remaining track is safely initialized with sleek placeholder segments to maintain visual scale.
          - **Dynamic Continuation (Load Next Weeks):** Click the pagination trigger at the foot of your timeline to request the subsequent block of 6 weeks. The engine computes your exact sequential coordinates, maintaining logical progression without ever duplicating previously generated items.
          - **Bidirectional Milestone Import:** Select "Import to Milestones" to map an entire roadmap phase (or individual task) directly into your persistent tracking board. It carries over all instructions, details, and subtasks. Marking an imported task as complete automatically transmits a synchronization callback to update your master roadmap timeline state simultaneously.
          - **Expand/Collapse Controls:** Utilize global toggle buttons to quickly expand or collapse all weeks for rapid scanning.

          **Enterprise Architecture (How it works):**
          - **Context-Preserving Chunked Generation:** To eliminate LLM context-window overflow and minimize network latency, the \`RoadmapGenerationService\` processes roadmaps incrementally. Initial requests strictly cap payload size to a clean 12-week layout.
          - **Stateful Progression Tracking:** The database column \`generated_weeks\` registers the current terminal point of concrete generation. When a user requests an expansion, the backend bundles a state vector of previously produced items into a compressed summary contextual frame, feeding it back into the LLM to guarantee logical continuity.
          - **Subtask and Asset Serialization:** Tasks are stored with explicit mappings for \`details\` (TEXT) and \`subtasks_json\` (JSON data type array) right inside the relational MySQL schema, preventing brittle nested array string splitting.
          - **Transactional Synchronization Listener:** A dedicated database-level mapping links \`milestone_tasks\` to their respective \`roadmap_tasks\`. When a PATCH request alters a status flag, an asynchronous application event triggers, forcing an atomic dual-write operation across your schemas to maintain 100% accurate system consistency.
        `,
      },
      {
        id: 'task-elaboration-milestone-insights',
        title: 'Deep-Dive Task Elaboration & Smart Milestone Insights',
        icon: <Lightbulb />,
        color: 'text-amber-500 dark:text-amber-400',
        content: `
          **How to use:**
          - **Task Elaboration:** Sometimes a roadmap task like "Learn Context API" isn't enough. Click the **"Elaborate"** button on any roadmap task, and the AI will dynamically expand that single line into a massive, comprehensive guide. It breaks the concept down into 4–6 actionable micro-subtasks, warns you about common pitfalls, and provides an exact hourly time estimate.
          - **Milestone Performance Insights:** When tracking a long-term Milestone, click **"AI Insights"**. The system mathematically evaluates your pending vs. completed tasks, your approaching due dates, and your overall completion percentage. It then generates a custom performance assessment, highlighting remaining work and offering tactical advice to cross the finish line on time.
          - **Growth Tip Parsing:** Read a great self-help post, article, or received advice? Paste the raw text into the Growth Tip Parser. The AI will read the unstructured text, extract the core actionable advice, and automatically convert it into structured, checkable tasks nested under a dedicated "AI Growth Tips" milestone.

          **Enterprise Architecture (How it works):**
          - **Advanced Style & Language Mirroring:** The prompts for these features perform active linguistic analysis. The system explicitly detects if your tasks are written in English, Spanish, or even mixed code-switching languages like *Hinglish*. It forces the LLM to generate the elaborate guides and insights in the exact same language and stylistic tone (casual, formal, or motivational) as your original input.
          - **Reactive Non-Blocking Execution:** AI insight generation can take several seconds. To prevent freezing the Tomcat worker threads and blocking other API calls, the \`MilestoneInsightService\` wraps the synchronous Spring AI call inside a Project Reactor \`Mono.fromCallable(...).subscribeOn(Schedulers.boundedElastic())\`. This offloads the heavy AI processing to a bounded background thread pool, maintaining pristine application responsiveness.
          - **Robust Structural Extraction:** Parsing unstructured raw text (like a pasted growth tip) into highly structured database rows is notoriously difficult. We utilize Spring AI's \`BeanOutputConverter\` mapped to a strict \`GrowthTipParseResponse\` Java Record. The AI is forced to output a JSON array of objects containing a title, description, and subtasks array, which the backend then instantly persists to the MySQL \`tasks\` table.
        `,
      },
      {
        id: 'smart-timetable-scheduling',
        title: 'Smart Timetable Engine & "Re-optimize Today" Control',
        icon: <CalendarIcon />,
        color: 'text-orange-500 dark:text-orange-400',
        content: `
          **How to use:**
          - Access the interactive **Schedule & Calendar** ecosystem directly from your Journal or Dashboard navigation.
          - **Define Boundaries:** First, ensure your base constraints are configured by specifying your weekly operational allocations under Profile → "Your Available Hours" (e.g., configuring exact active intervals such as Monday 09:00–12:00 and 13:00–17:00).
          - **Routing Modes:** Choose your optimization routing mode:
            - *All Tasks:* Pools all open entries across active roadmaps, milestones, and isolated custom tasks.
            - *Custom Tasks Only:* Restricts allocation logic to isolated standalone activities created directly on your calendar interface.
          - Click **"Generate Intelligent Schedule"** to invoke the engine. The system automates the layout of your agenda items, populating your calendar views while respecting defined deadlines, item weight, and priorities.
          - **Fluid Drag-and-Drop Adjustment:** Directly adjust your daily distribution by dragging event blocks into new time slots or different target days across your timeline.
          - **In-Line Completion Checkboxes:** Click the check action directly on any calendar node to instantaneously close an event, propagating completion triggers down to its source origin task.
          - **"Re-optimize Rest of Today":** Life happens. If you fall behind schedule, click the Re-optimize button. The AI recalculates your remaining daylight hours and instantly shifts and reprioritizes your pending tasks without destroying tomorrow's schedule.
          - **Custom Calendar Tasks:** Add standalone custom tasks using the “Add Task” button (title, description, due date, estimated hours, priority) which can be injected straight into the AI scheduling pool.

          **Enterprise Architecture (How it works):**
          - **Constraint-Satisfaction Engine:** The schedule processor compiles your availability patterns along with open items into a structured contextual array. It forwards this data payload to your ML routing service to resolve optimal temporal distribution via an automated scheduling controller.
          - **Deterministic Fallback Loop:** If upstream AI rate limits are tripped or the LLM prompt formatting breaks validation rules, the backend drops down seamlessly to a localized, high-speed deterministic greedy scheduler. This fallback maps out items sequentially based on immediate deadline weight and priority scores to ensure zero runtime interruptions.
          - **REST Optimization & Partial Updates:** Modifying a task's temporal coordinates via dragging invokes a highly optimized \`PUT /api/schedule/task/{id}/move\` endpoint. This passes clean delta payloads containing only the modified timestamp coordinates rather than heavy, full-object representations, saving massive network bandwidth.
          - **Real-Time Synchronous Mutation:** The underlying \`scheduled_tasks\` relational table maintains loose-coupling references to source tasks. This enables a single mutations class to execute cascade event dispatches, updating state across custom tasks, roadmap structures, or milestone components cleanly.
        `,
      },
   {
         id: 'lifestyle-personalization-engine',
         title: 'Lifestyle Engine & Global AI Personalization',
         icon: <Settings />,
         color: 'text-cyan-500 dark:text-cyan-400',
         content: `
           **How to use:**
           - Navigate to your **Account Settings** to configure your core AI generation parameters. The system is divided into two deeply integrated personalization engines:
           - **1. Roadmap & Engine Defaults:**
             - *Difficulty Matrix:* Choose from Beginner (explains foundational terms, provides absolute basics), Intermediate, or Advanced (completely bypasses fundamentals, skips straight to production-grade architectures).
             - *Learning Style Profile:* Select Reading (prioritizes documentation links, academic papers, and articles), Visual (prioritizes architectural diagrams, flowcharts, and curated video resources), or Hands-on (prioritizes building concrete projects, repo links, and code-along exercises).
             - *Preferred System Language:* Set your global language target (e.g., English, Hindi, Spanish, French, German, Chinese, Arabic). The system instantly commands the underlying LLMs to translate all roadmap text, insights, subtasks, and advice nodes into the selected language natively.
             - *Pace & Boundaries:* Define your target hours per week and toggle the "Avoid Weekends" strict policy to prevent the planner from overscheduling your personal rest windows.
           - **2. The Lifestyle Engine Controls:**
             - *Bio-Rhythms:* Set your exact Wake Time, Sleep Time, and Lunch Break intervals, along with your primary "Energy Peak" (Morning, Afternoon, or Night Owl).
             - *Daily Non-Negotiable Habits:* Enter your persistent daily routines (e.g., "15 mins meditation", "Read 10 pages of a book", "Leetcoding").
             - *Availability Matrix:* Define your exact available working blocks for every single day of the week (e.g., Monday 09:00-12:00, 13:00-17:00).

           **The AI Integration (What it does):**
           - Every time you execute a roadmap generation, the system injects your defaults directly into the foundational context window. An "Advanced" roadmap skips standard definitions entirely, while a "Visual" setting mandates the compilation of structured markup schemas or visual asset pathways.
           - When the Smart Timetable runs, it reads your complete Lifestyle Matrix. It will automatically invent and inject specialized "ROUTINE" blocks for your daily habits, safely quarantine your lunch break, strictly avoid scheduling past your sleep time, and attempt to route heavy "WORK_TASKS" directly into your designated high-energy window.

           **Enterprise Architecture (How it works):**
           - **Redis Caching & DTO Projection:** User configurations are heavy, deeply relational data structures. The backend \`UserService\` extracts \`UserRoadmapPreferences\` and \`UserPreferences\` mappings into lightweight Data Transfer Objects (DTOs) and caches them in Redis under the \`userPreferencesDto\` namespace via \`@Cacheable\`. This drops user configuration fetch latencies to sub-milliseconds.
           - **Dynamic Prompt Engineering & Ironclad Rules:** Inside the \`ScheduleService\` and \`RoadmapService\`, your lifestyle preferences are formatted into system rules: *"IRON-CLAD RULE 3: 'WORK_TASK' blocks MUST strictly fall within the 'Strict Available Work Hours': {availableHoursJson}"*.
           - **Polymorphic JSON Storage:** Your daily habits and availability blocks are stored directly inside the MySQL database as raw JSON strings. This eliminates the overhead of processing multi-table relational joins for simple arrays, heavily optimizing database read operations during intensive scheduling sequences.
         `,
       },
       {
         id: 'dynamic-gamification',
         title: 'Dynamic Gamification & Progression System',
         icon: <Trophy />,
         color: 'text-amber-500 dark:text-amber-400',
         content: `
           **How to use:**
           - Every meaningful action you take in MyMindMirror rewards you with **Experience Points (XP)**. As you accumulate XP, your global **Mental Mastery Level** increases (every 500 XP = 1 Level).
           - **Maintain Your Streak:** Any core activity (journaling, completing a task, chatting with the AI) keeps your daily streak alive.
           - **Unlock Badges:** The system actively monitors your milestones and awards dynamic badges that appear on your dashboard.

           **XP Distribution Table:**
           - **50 XP:** Saving a Journal Entry
           - **30 XP:** Generating a Smart Schedule Timetable
           - **30 XP:** Architecting a new AI Roadmap
           - **20 XP:** Completing a Roadmap, Milestone, or Custom Task
           - **20 XP:** Generating an AI Milestone Insight
           - **15 XP:** Chatting with the AI Reflection Coach
           - **15 XP:** Generating the "Today's Reflection" summary
           - **10 XP:** Creating a new Milestone manually
           - **5 XP:** Creating a micro-task or using the AI "Elaborate Task" feature

           **Unlockable Achievement Badges:**
           - *Consistency:* **THREE_DAY_STREAK**, **SEVEN_DAY_STREAK**, **THIRTY_DAY_LEGEND**
           - *Productivity:* **FIRST_STEP**, **TASK_MASTER** (10 tasks), **PRODUCTIVITY_NINJA** (50 tasks), **ROADMAP_FINISHER** (complete an entire roadmap)
           - *Introspection:* **FIRST_THOUGHT**, **REFLECTIVE_SOUL** (5 journal entries), **FIRST_CHAT**, **AI_WHISPERER** (20 deep AI chats), **INTROSPECTIVE**
           - *Planning:* **TIME_LORD** (schedule generation), **VISIONARY** (milestone creation), **ARCHITECT** (roadmap generation), **DEEP_DIVER** (task elaboration)

           **Enterprise Architecture (How it works):**
           - **Atomic Transactions:** The \`GamificationService\` evaluates your progression state entirely inside strict \`@Transactional\` database locks, guaranteeing that concurrent task completions don't cause race conditions or drop XP.
           - **JSON Object Persistence:** To avoid heavy relational join tables for achievements, earned badges are serialized using Jackson \`ObjectMapper\` into a highly efficient flat \`badges_json\` string column inside the \`user_stats\` table.
           - **High-Speed Redis Caching:** Because Gamification Stats are displayed constantly across the dashboard header and sidebars, the \`/api/gamification/stats\` endpoint is heavily cached in Redis under the \`gamificationStats\` namespace. Cache eviction policies are surgically applied so the UI updates instantly the millisecond an activity is recorded, but database read-load remains virtually zero.
         `,
       },
       {
             id: 'high-res-visual-analytics',
             title: 'High-Resolution Visual Analytics & Chart.js Architecture',
             icon: <LineChart />,
             color: 'text-blue-500 dark:text-blue-400',
             content: `
               **How to use:**
               - Navigate to the **Journal** analytics environment and switch cleanly between your three presentation layers:
                 - *Today Dashboard:* An immediate evaluation snapshot featuring today's AI-generated reflection, an interactive Chart.js doughnut chart rendering real-time emotional vectors, and your raw matching entries.
                 - *Weekly Dashboard:* High-fidelity tracking arrays focused on short-term mood variances, weekly multi-point emotional intensity metrics, and recent core concern weights.
                 - *All Entries Dashboard:* The ultimate long-term chronological viewport containing your complete historical line charts, custom-mapped calendar heatmaps, and semantic phrase clouds.

               **The Upgraded Chart.js Arsenal (Zero Recharts Remnants):**
               - **1. Overall Mood Timeline (Chart.js Line Component):** Plots your mathematically derived mood score (-1.0 to +1.0) along a continuous time continuum. Enabled with \`chartjs-plugin-zoom\`, allowing seamless horizontal dragging, panning, and multi-touch pinch-zooming across thousands of data nodes, entirely preventing rendering degradation or data compression over multi-year scales.
               - **2. High-Density Consistency Grid (\`react-calendar-heatmap\`):** A customized, highly performant GitHub-style contribution calendar mapping tracking density over a 365-day boundary. Days featuring higher entry lengths or intense emotional evaluations are shaded dynamically using deeper opacity configurations. Integrated with \`react-tooltip\` for instant, asynchronous entry lookups upon hovering.
               - **3. Sprawling Emotional Profile (Chart.js Radar Component):** A full-width circular spider configuration plotting the absolute intensity averages of **all 14 baseline emotions** simultaneously (joy, sadness, anger, fear, surprise, love, anxiety, relief, neutral, excitement, contentment, frustration, gratitude, hope). Long spokes isolate immediate psychological triggers; balance configurations display psychological equilibrium, while localized spikes flag structural over-indexing.
               - **4. Expression Correlation Matrix (Chart.js Scatter Component):** Maps word volume metrics (X-axis) against structural mood values (Y-axis) in a unified coordinate frame. An automated linear regression trend line is calculated on the fly across the dataset. Hovering over any independent point leverages Chart.js interactive tooltips to read text-truncated summaries from that exact production date.
               - **5. Intensity & Concerns Split View (Chart.js Bar & Pie Components):** Side-by-side decoupled visual cards pairing a grouped Bar Chart (aggregating accurate mathematical averages of your primary 7 emotional arrays) with a fully responsive Pie Chart (displaying percentage distributions of overarching core life concepts).
               - **6. Golden Angle Word Clouds (\`react-tagcloud\`):** A customized, math-driven key phrase cloud where phrase sizing scales linearly with system extraction frequencies. Rendered using a specialized golden-angle distribution algorithm to eliminate text collisions. Clicking any phrase fires a React state change, filtering your historical timeline instantly.

               **Enterprise Architecture (How it works):**
               - **Chart.js Performance Maximization:** By completely purging the unoptimized, heavy Recharts library and migrating to \`chart.js\` combined with \`react-chartjs-2\`, rendering engine overhead was dropped significantly. Chart.js leverages HTML5 canvas rendering instead of heavy DOM-based SVG manipulation, freeing up massive CPU cycles on client browsers during large data scaling operations.
               - **Trigger-Backed Pre-Aggregations:** To completely bypass high-latency runtime SQL calculations, mutations to the primary journaling tables trigger an atomic calculation that populates a specialized, relational \`daily_journal_summary\` table. The frontend pulls pre-aggregated rows, lowering dashboard paint times to under <10ms.
               - **Component Memoization Layouts:** Every chart container is isolated using structural React components heavily wrapped within \`React.memo\`, \`useMemo\`, and \`useCallback\` hooks. Data properties are structurally bound; components skip re-evaluation entirely unless their underlying numerical coordinate arrays encounter explicit structural mutations.
             `,
           },
       {
             id: 'early-burnout-anomaly-alerts',
             title: 'Early Burnout Alerts & EWMA Anomaly Detection',
             icon: <HeartPulse />,
             color: 'text-rose-600 dark:text-rose-400',
             content: `
               **The User Experience (Proactive vs. Reactive):**
               - Standard journaling applications are purely *reactive*—they wait for you to analyze a chart to realize you are trending downward. MyMindMirror is deeply *proactive*.
               - **Automated Baseline Monitoring:** The system acts as a silent guardian, constantly monitoring your daily emotional baseline and writing volume in the background.
               - **Subtle Shift Detection:** It doesn't just look for obvious negative entries. It looks for behavioral drift—such as your average mood dropping slightly but consistently over a 14-day period, or your typical 500-word daily journal entries suddenly collapsing to 50-word fragments.
               - **Burnout Warning UI:** If your mathematical variance crosses a critical threshold, a dedicated alert card will surface on your dashboard. This early warning prompts you to take preventative rest, adjust your Smart Timetable constraints, or review your recent AI reflections before total burnout occurs.

               **Enterprise Architecture (How it works):**
               - **The Java Migration (Deprecating Python/Pandas):** Previously, anomaly detection required transmitting heavy historical data payloads over HTTP to an external Python Flask microservice just to utilize the \`pandas\` data science library. We completely eliminated this structural bottleneck. The anomaly detection engine now runs 100% natively inside the core Spring Boot JVM.
               - **Pure Java EWMA Algorithm:** The system evaluates your data using an Exponentially Weighted Moving Average (EWMA). Unlike a Simple Moving Average (SMA) which treats all historical days equally, EWMA mathematically applies exponentially decreasing weights to older data. Your emotions from yesterday impact the calculation significantly more than your emotions from 6 months ago, creating a highly sensitive, dynamically adapting psychological baseline.
               - **O(1) Memory Complexity:** Calculating historical variance across thousands of text entries normally causes severe server memory spikes. Because EWMA mathematical principles only require the *previous* day's moving average to calculate *today's* moving average, our Java algorithm executes with strict **O(1) memory complexity**. It never has to load your entire journal history array into RAM.
               - **Standard Deviation Triggers:** The backend \`AnomalyDetectionService\` calculates the standard deviation of your emotional momentum. If today's incoming mood score drops more than 2.0 standard deviations below your established EWMA baseline, the system flags the entry as a statistical anomaly and persists an alert flag to the database.
               - **Sub-Millisecond Execution:** By pairing the native Java algorithm with the database-trigger-backed \`daily_journal_summary\` MySQL table, burnout evaluations execute in under 5 milliseconds immediately after an entry is saved, guaranteeing absolutely zero blocking of the Tomcat worker threads.
             `,
           },
       {
         id: 'search-and-filtering',
         title: 'Advanced Search & Semantic Filtering (3072-Dim pgvector)',
         icon: <Search />,
         color: 'text-cyan-500 dark:text-cyan-400',
         content: `
           **How to use:**
           - Navigate to the **Search** tab within your Journal history. You have three deeply integrated vectors for precision lookup:
             - **Keyword Search:** Type any word or phrase. The system instantly scans your text records to find exact plaintext syntax matches.
             - **Semantic Concept Search:** Type a general feeling, an abstract memory, or a concept like *"times I felt overwhelmed by college graduation"* or *"moments of unexpected joy"*. The AI will pull matching entries based on emotional intent, even if none of the words match your search string.
             - **Mood & Date Range Filters:** Leverage interactive range sliders to isolate entries where your mood score dipped below 0, or isolate specific monthly chronological brackets.

           **Enterprise Architecture (How it works):**
           - **High-Fidelity 3072-Dimensional Embeddings:** Your journal entries are processed through the official Spring AI implementation of the Google Vertex AI/AI Studio platform, configuring a massive **3072-dimensional vector space** (\`spring.ai.vectorstore.pgvector.dimensions=3072\`). This represents an enormous leap in semantic resolution compared to standard 384-dimensional layers, capturing micro-nuances in complex multilingual expressions.
           - **Vector Similarity Matching:** The Semantic Search string is converted into a 3072-element float array on the fly. We then query the secondary PostgreSQL \`pgvector\` database utilizing an optimized Cosine Similarity algorithm (threshold > 0.55). The vector store leverages B-tree and GIN indexes to execute high-speed similarity matches, returning matching UUID arrays in under 50ms.
           - **In-Memory Decryption Filtering:** Because your journal content is stored encrypted via AES-CBC at rest to protect user privacy, standard SQL \`LIKE\` queries cannot read the data. The backend \`JournalService\` queries the targeted primary rows, rapidly decrypts the text streams in active memory using your active session key, and applies keyword matching filters entirely on the fly.
         `,
       },
        {
                  id: 'universal-data-export',
                  title: 'Universal Data Export & Client-Side Document Compilation',
                  icon: <Download />,
                  color: 'text-emerald-500 dark:text-emerald-400',
                  content: `
                    **How to use:**
                    - Navigate to the **All Entries** tab on your Journal page. At the top of your history view, you will find dedicated, one-click actions for **CSV** and **PDF** exports.
                    - **Retina-Quality Document Generation (PDF):** Click to instantly generate a highly professional, beautifully styled, and paginated document containing your complete journaling history. Every entry maps out its precise timestamp, calculated mood score, complete AI-generated text summary, and your extracted key conceptual phrases. Excellent for offline archiving or sharing directly with a mental health professional.
                    - **Raw Tabular Data (CSV):** Click to download a cleanly structured spreadsheet containing your universal historical data logs. This is perfect for users who want to run their own localized data analytics using Excel, Python/Pandas, or business intelligence toolkits like Tableau.
                    - **Retina-Quality Canvas Capturing:** Every visual analytics chart (including the Spider Radar, Expression Scatter Plot, and Consistency Heatmap Grid) features a subtle download icon (↓) in its header card. Clicking this button captures the exact state of that specific DOM element and saves a crystal-clear PNG image straight to your local device storage.
                    - **Absolute Data Ownership:** We believe your psychological and emotional tracking data belongs strictly to you. There are no paywalls, hidden gates, or rate-limits blocking data extraction. You can mass-export 100% of your records at any point in time.

                    **Enterprise Architecture (How it works):**
                    - **Secure Decryption Pipeline:** When an export trigger is clicked, the backend \`JournalService\` queries the MySQL instance, extracts your AES-CBC encrypted database payloads, and safely decrypts the text blocks entirely within active memory using your session secret. The raw plaintext strings are streamed securely over a temporary HTTPS connection directly to the client browser.
                    - **Client-Side CPU Offloading:** To maximize server-side efficiency and prevent heavy multi-threaded memory spikes during PDF rendering, all document compilation is offloaded to the client browser. We integrate \`jspdf\` paired with \`jspdf-autotable\` to compute real-time margins, explicit text wrapping, and clean document pagination on the fly.
                    - **Blob Stream CSV Serialization:** CSV spreadsheets are constructed client-side using a UTF-8 Byte Order Mark (BOM) encoder. This mathematically guarantees that emojis, special characters, and mixed language expressions render flawlessly when opened in standard spreadsheet software. The string payload is compiled into a JavaScript \`Blob\` and flushed via \`file-saver\`.
                    - **Dynamic DOM Isolations (html-to-image):** Chart exports don't rely on unoptimized static server-side rendering images. We use advanced client-side DOM capturing that actively checks your current user interface theme (Light or Dark mode). The script isolates the target chart element container, temporarily strips out the UI interactive buttons, and renders a pristine, transparent-background PNG image straight from the active SVG or Canvas elements.
                  `,
                },
                {
                  id: 'enterprise-security-byok',
                  title: 'Enterprise-Grade Security & Bring Your Own Key (BYOK) Vault',
                  icon: <LockKeyhole />,
                  color: 'text-indigo-500 dark:text-indigo-400',
                  content: `
                    **How to use:**
                    - Navigate to your user **Profile** page and locate the **Gemini API Key Security Vault** module.
                    - Paste your personal token generated via Google AI Studio. The system will securely validate, encrypt, and store the key, switching your status to *"Using Personal API Key"*.
                    - **Bypass Global Shared Quotas:** By using your own personal API key, you unlock your own dedicated infrastructure limits directly from Google (e.g., 1,500 requests per day for Gemma models and 500 requests per day for Gemini 3.1-Flash-Lite). This ensures your heavy roadmap generations, deep task expansions, and continuous AI chats are never throttled during high global application traffic.
                    - **The Danger Zone (Hard Cascade Purge):** If you ever choose to leave the platform, the "Delete Account Forever" option executes a true, destructive cascading hard-delete. Your records are not soft-deleted, flagged, or hidden—they are completely wiped from existence across all structural layers.

                    **Zero-Compromise Privacy Isolation:**
                    - Journaling text data represents an extraordinary degree of personal vulnerability. MyMindMirror is engineered with a strict "Zero-Trust" data architecture. Even if the underlying primary database servers were fully compromised or accessed by an unauthorized entity, your personal thoughts remain unreadable, highly encrypted cryptographic gibberish.

                    **Enterprise Architecture (How it works):**
                    - **AES-CBC Journal Encryption:** When you click save, your plaintext journal entries are never written directly to cold disk storage. The backend \`EncryptionUtil\` immediately encrypts the text block using the Advanced Encryption Standard (AES) operating in Cipher Block Chaining (CBC) mode. The 256-bit key is derived using PBKDF2 from your unique BCrypt password hash. Without your active plaintext login password, your text records are mathematically impossible to crack.
                    - **AES-GCM Key Vault Storage:** Your personal Gemini API Key is stored using an isolated AES-GCM (Galois/Counter Mode) encryption algorithm driven by an independent, server-side system master secret key variable, preventing side-channel leakage.
                    - **Stateless JWT Interceptors:** Session security is enforced across every single API route using strict JSON Web Tokens (JWT). The backend \`JwtRequestFilter\` intercepts incoming requests, verifying cryptographic signatures and parsing claims before routing to the business layer. Any tampered token results in immediate rejection via the \`JwtAuthenticationEntryPoint\`.
                    - **Hard Cascading Account Teardown:** Triggering an account deletion fires an atomic, transactional method. The system purges your Redis chat history records, wipes out your 3072-dimensional PostgreSQL vector entries, executes cross-table cascade deletes across your MySQL tasks, milestones, custom timetables, and roadmap structures, and finally obliterates your primary user record.
                  `,
                },

            {
                         id: 'ai-engine-orchestration-routing',
                         title: 'AI Engine Ensemble & Strategic Quota Orchestration',
                         icon: <Cpu />,
                         color: 'text-amber-500 dark:text-amber-400',
                         content: `
                           **The User & System Experience:**
                           - **Zero-Throttle Reliability:** By using a dual-engine architectural layout, you never experience total system blackout if a single AI model hits its strict Google AI Studio production limit.
                           - **Dynamic Traffic Shifting:** The system splits tasks by their computational nature. Long-form creative prose, summaries, and open-ended journaling prompts are routed to deep open-weights text architectures. Highly complex, schema-bound programmatic components (like compiling tables or generating nested calendar arrays) are cleanly isolated to dedicated JSON-native processing engines.
                           - **Resilient Fallback Protection:** If an upstream model returns an HTTP 429 Rate Limit exception or experiences an unexpected cold-start latency spike, the backend interceptor catches the exception invisibly. It seamlessly drops down to a designated secondary model pool to fulfill the operation without throwing a single error to your dashboard UI.

                           **The AITask Mapping & Production Architecture Matrix:**
                           - **1. Plain Text Generation (High-Volume Prose Pools):**
                             - *TODAY_REFLECTION:* Primary: \`gemma-4-31b-it\` | Fallback: \`gemma-4-26b-a4b-it\`. Capitalizes on the massive 1,500 Requests Per Day (RPD) and 15 Requests Per Minute (RPM) Gemma parameters to generate rich markdown daily logs without draining high-tier Gemini tokens.
                             - *REFLECTIVE_QUESTION:* Primary: \`gemini-3.1-flash-lite\` | Fallback: \`gemma-4-26b-a4b-it\`. Dynamically surfaces initial daily prompts, checking against the Gemma pool if capacity is constrained.
                             - *REFLECTION_CHAT:* Primary: \`gemini-3.5-flash\` | Fallback: \`gemini-3-flash\`. Taps into premium reasoning models (5 RPM, 20 RPD limit) to evaluate multi-turn therapeutic conversations while maintaining historical continuity.
                           - **2. Structured JSON Generation (Strict Schema Enforcement):**
                             - All structured operations are locked strictly to Google Gemini engines to guarantee full compliance with Spring AI's native \`BeanOutputConverter\` schemas.
                             - *JOURNAL_ANALYSIS:* Primary: \`gemini-3.1-flash-lite\` (500 RPD) | Fallback: \`gemini-2.5-flash-lite\` (20 RPD).
                             - *ROADMAP_MANAGEMENT:* (\`INITIAL\`, \`EXTENSION\`, \`RESCHEDULE\`): Primary: \`gemini-3.1-flash-lite\` | Fallback: \`gemini-3-flash\` (20 RPD pool).
                             - *ROADMAP_NEXT_STEPS:* Primary: \`gemini-3.1-flash-lite\` | Fallback: \`gemini-2.5-flash\` (20 RPD pool).
                             - *ROADMAP_ELABORATION & COGNITIVE_PARSING:* Primary: \`gemini-3.1-flash-lite\` | Fallback: \`gemini-2.5-flash-lite\`.
                             - *SCHEDULE & TIMETABLE ENGINES:* (\`GENERATION\`, \`REOPTIMIZATION\`): Primary: \`gemini-3.1-flash-lite\` | Fallback: \`gemini-2.5-flash\`.

                           **Enterprise Architecture & Quota Guardrails (How it works):**
                           - **Spring Retry Integration:** Every model transaction execution is wrapped inside a customized \`@Retryable\` context driven by \`spring-retry\`. The interceptor isolates specific HTTP 429 errors and triggers an exponential backoff sequence before dropping out of the primary model block.
                           - **Fallback Interceptor Pipeline:** If retries are fully exhausted, a localized proxy service catches the boundary error and immediately instantiates an alternative instance of the Spring AI \`ChatClient\` pre-configured with the corresponding enum \`fallbackModel\` variable.
                           - **Strategic Token Conservation:** By prioritizing the high-capacity 500 RPD \`gemini-3.1-flash-lite\` container for complex processing while offloading raw linguistic tasks to the 1,500 RPD \`gemma-4\` clusters, the backend maintains a balanced execution buffer, ensuring peak performance even during high-concurrency conditions.
                         `,
                       },

                   {
                                     id: 'ai-technology-stack',
                                     title: 'AI Technology Stack & Polyglot Data Architecture',
                                     icon: <Layers />,
                                     color: 'text-fuchsia-500 dark:text-fuchsia-400',
                                     content: `
                                       **The Ecosystem (What powers your experience):**
                                       - **The Generative AI Ensemble:** The application moves past brittle single-model paradigms, implementing a dynamic routing network across Google's absolute latest LLM architectures:
                                         - *Gemini 3.1-Flash-Lite:* Our foundational workhorse optimized for high-speed, structural JSON payload assembly (e.g., Roadmap Blueprints, Timetable Constraints, Entry Parsing).
                                         - *Gemini 3.5-Flash:* A premium reasoning engine deployed exclusively for complex context interpretation during multi-turn AI Reflection Coaching sessions.
                                         - *Gemma-4:* A massive open-weights architecture tapped for fluid, long-form plaintext creative generation (e.g., Markdown Growth Tips, Today's Reflection Prompts).
                                       - **High-Fidelity Embeddings:** Your journal summaries are mathematically translated into deep spatial relationships using the \`text-embedding-004\` engine.

                                       **Enterprise Architecture (How it works):**
                                       - **The Native Spring AI Migration:** We completely deprecated our legacy, intermediate Python/Flask middleware layer for core AI routines. All generative communications are now handled directly inside the core Spring Boot application using the native **Spring AI** framework. This completely eliminated an unoptimized secondary network hop, cutting overall AI processing and serialization latency by approximately ~40%.
                                       - **Mathematical JSON Schema Guarantees:** Instead of relying on unreliable, fragile Regex expressions to parse stringified JSON out of raw model responses, MyMindMirror leverages Spring AI's native \`BeanOutputConverter<T>\`. This dynamically injects explicit JSON schema boundaries straight into the system-level prompts, mathematically forcing the LLM engine to structure its outputs to bind with our target Java Records and DTOs.
                                       - **True Polyglot Persistence Layer:** We separate data structures across three distinctly unique database engines, matching data types to their optimal transactional engines:
                                         - *MySQL (Primary Relational Engine):* Manages atomic transactional integrity, user profiles, relational milestone tables, and AES-encrypted text.
                                         - *PostgreSQL + pgvector (Semantic Store):* A secondary datasource dedicated entirely to processing 3072-dimensional vector embedding queries with deep GIN and B-tree vector indices.
                                         - *Redis (Distributed Memory):* An ultra-fast, in-memory cache layer managing ephemeral state, active chat history sessions, and gamification metrics.
                                     `,
                                   },

            {
                  id: 'complete-polyglot-dependency-manifest',
                  title: 'Enterprise Infrastructure & Polyglot Dependency Manifest',
                  icon: <Server />,
                  color: 'text-sky-500 dark:text-sky-400',
                  content: `
                    **The Architecture Spectrum (Full-Stack Alignment):**
                    - **Modern Runtime Ecosystem:** Driven entirely by a bleeding-edge infrastructure layer utilizing **Java 25 (LTS)** on the backend and **React 19.2** paired with **Vite 7** on the frontend, establishing compile-time security, modern garbage collection optimization, and high-speed Hot Module Replacement (HMR).
                    - **The Core Webflux Integration Matrix:** While the legacy Python Flask microservice has been completely removed to unify processing within a native Java pipeline, \`spring-boot-starter-webflux\` has been intentionally retained. It handles non-blocking reactive thread pooling through Project Reactor and serves as a high-throughput execution boundary for downstream service processing alongside \`resilience4j-reactor\` bindings.

                    **Production Backend Technical Stack Frameworks (pom.xml Analysis):**
                    - **1. Native Spring AI Foundation (v2.0.0-M8 Stable BOM):**
                      - \`spring-ai-starter-model-google-genai\`: Direct interface integration managing native API transactions with Google GenAI infrastructure.
                      - \`spring-ai-google-genai-embedding\`: Orchestrates vectorized formatting for raw data processing.
                      - \`spring-ai-starter-vector-store-pgvector\`: High-performance relational vector layer mapping embedding indices securely.
                    - **2. Core Multi-Tenant Storage Layer:**
                      - Driven by \`spring-boot-starter-data-jpa\` handling strict transactional operations over **MySQL** (via \`mysql-connector-j\`) for relational user records, combined with a secondary **PostgreSQL** runtime engine to process 3072-dimensional vector datasets.
                    - **3. Stateful Security, Session Memory & Cache Core:**
                      - Encrypted token boundaries managed using JSON Web Tokens (\`jjwt-api\` 0.11.5) integrated with \`spring-boot-starter-security\`.
                      - Multi-tier performance acceleration driven by \`spring-boot-starter-data-redis\` for active session caching and ephemeral state management, backed by local low-latency \`caffeine\` cache eviction mechanisms.
                    - **4. Resiliency & Enterprise Quality Assurance:**
                      - Fortified via \`spring-retry\` (2.0.5) and \`resilience4j-spring-boot3\` (2.2.0) providing programmatic circuit breaking. Full structural verification executed via automated \`jacoco-maven-plugin\` coverage boundaries, bypassing non-functional tool packages.

                    **Production Frontend Interface Stack (package.json Analysis):**
                    - **1. Rendering, State, and Style Core:** Built on top of **React 19** and React DOM. Global look-and-feel variables are compiled directly through **Tailwind CSS v4** utilizing the performant \`@tailwindcss/vite\` bundling engine. Asynchronous server synchronization, structural retries, and browser cache queries are automated via **TanStack React Query v5**.
                    - **2. High-Performance HTML5 Canvas Analytics (The Chart.js Migration):** Legacy, unoptimized Recharts blocks have been completely ripped out of the application dependencies. Data tracking is rendered exclusively via **Chart.js v4** and \`react-chartjs-2\`, backed by \`chartjs-plugin-zoom\` to natively capture rich horizontal user scrolling and pinch-to-zoom matrix adjustments.
                    - **3. Productivity Layout Engines:** Interactive calendars are drawn via \`react-big-calendar\`. Daily contribution patterns leverage \`react-calendar-heatmap\` tied with \`react-tooltip\`. Visual phrase clustering executes via \`react-tagcloud\` powered by golden angle rendering rules, accompanied by custom progress trackers like \`react-circular-progressbar\`.
                    - **4. Secure Client-Side Data Export Pipeline:** Tabular extractions use \`xlsx\` and \`file-saver\`. Beautiful PDF reporting leverages \`jspdf\` integrated with custom table boundaries via \`jspdf-autotable\`. Crisp canvas captures bypass server load completely by utilizing \`html-to-image\` directly within the client sandbox.
                  `,
                },

                {
                  id: 'enterprise-performance',
                  title: 'Enterprise Performance & System Optimizations',
                  icon: <Zap />,
                  color: 'text-yellow-500 dark:text-yellow-400',
                  content: `
                    **What you experience:**
                    - **Sub-Second Dashboard Rendering:** Dashboards render instantly. There is zero lag when hopping between the calendar layout, your complete historical timeline, or heavy analytics.
                    - **Zero-Blocking Architecture:** High-latency tasks like executing 12-week roadmap compilations or processing complex journal breakdowns execute quietly in the background, keeping the user interface completely reactive.

                    **Enterprise Architecture (What we built to make it fast):**
                    - **Database Level Indexing:** Every relational table is fortified with explicit multi-column indices on critical foreign keys and heavy filtering columns (including \`user_id\`, \`entry_date\`, \`created_at\`, and task parent links), dropping search execution times to milliseconds.
                    - **JPA N+1 Query Elimination:** Complex object structures (like a Master Roadmap consisting of weeks, which contain tasks, which wrap subtask arrays) normally trigger hundreds of sequential database queries. We utilize explicit JPA \`@EntityGraph\` annotations to fetch entire nested relational trees in a single, highly-optimized SQL JOIN statement.
                    - **Pre-Aggregated Cache Invalidation Tables:** The trigger-backed \`daily_journal_summary\` table tracks daily metrics on the fly. This prevents heavy aggregate math functions from running on the primary entries table during chart paints.
                    - **Multi-Layer Redis Caching Engine:** Heavy read endpoints are intercepted by Redis running in RAM. Items like your Roadmap Preferences, Achievement matrices, and Token statuses are served directly from memory, dropping query times from ~120ms to under 10ms. Annotations like \`@CacheEvict\` are surgically attached to corresponding \`PUT/POST/PATCH\` mutations to instantly drop outdated data frames.
                    - **Frontend Component Memoization & Deferred Loads:** The React application leverages \`React.memo\`, \`useMemo\`, and \`useCallback\` hooks to optimize browser performance. Massive visual layout blocks only calculate re-renders when their underlying data parameters experience an explicit structural mutation.
                    - **Optimization Tactics:**
                      - *Lazy-Loaded Route Splits:* Split bundles map Journal, Profiles, and Achievements into separate async chunks, loading elements only on demand.
                      - *Deferred History Buffers:* Heavy paginated journal histories are completely deferred, fetching rows only when the user explicitly clicks the History tab.
                      - *Network Gzip Compression:* Backend JSON response streams are compressed using Gzip, shrinking data payloads over the wire by up to 80% for rapid mobile operations.
                      - *Debounced Input Streams:* Search inputs and text entry updates are heavily debounced to prevent redundant API thrashing while typing.
                  `,
                },
              ], []);

  return (
      <div className={`min-h-screen w-full transition-colors duration-300 relative bg-gray-50 dark:bg-transparent text-gray-900 dark:text-gray-100`}>
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-teal-500/5" />
          <div className="absolute top-0 left-1/4 w-[40vw] h-[40vw] bg-purple-500/10 rounded-full blur-[120px] animate-pulse-slow" />
          <div className="absolute bottom-0 right-1/4 w-[40vw] h-[40vw] bg-teal-500/10 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
        </div>

        {/* Hero Section */}
        <section className="relative w-full py-16 lg:py-24 px-4 sm:px-6 lg:px-8 text-center z-10">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-teal-500/10 border border-purple-500/20 dark:border-purple-500/30 mb-6 lg:mb-8 animate-in fade-in slide-in-from-top-5 duration-700 shadow-sm">
              <Sparkles className="w-4 h-4 lg:w-5 lg:h-5 text-purple-600 dark:text-purple-400 mr-2" />
              <span className="text-xs lg:text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Enterprise Architecture & Features</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-poppins font-extrabold mb-6 lg:mb-8 animate-in fade-in slide-in-from-bottom-5 duration-700 leading-tight tracking-tight text-gray-800 dark:text-gray-100">
              Comprehensive Platform <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-teal-500 dark:from-purple-400 dark:via-pink-400 dark:to-teal-400 bg-clip-text text-transparent">
                Deep Dive
              </span>
            </h1>
            <p className={`text-base sm:text-lg lg:text-xl font-medium text-gray-600 dark:text-gray-400 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100 leading-relaxed`}>
              Explore every operational feature in detail—from RAG AI analysis and gamification, to smart scheduling and polyglot persistence.
            </p>

            {/* Floating Background Icons */}
            <div className="absolute top-20 left-10 opacity-20 animate-float hidden lg:block pointer-events-none">
              <Layers className="w-10 h-10 text-purple-400" />
            </div>
            <div className="absolute top-40 right-10 opacity-20 animate-float-delayed hidden lg:block pointer-events-none">
              <Cpu className="w-10 h-10 text-teal-400" />
            </div>
            <div className="absolute bottom-10 left-1/4 opacity-20 animate-float-slow hidden lg:block pointer-events-none">
              <Database className="w-10 h-10 text-amber-400" />
            </div>
          </div>
        </section>

        {/* Main Content with Sidebar + Accordion */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 relative z-10">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 xl:gap-10">

            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-80 xl:w-96 shrink-0">
              <div className={`sticky top-24 rounded-2xl lg:rounded-3xl ${colors.sidebarBg} border ${colors.cardBorder} p-5 lg:p-6 shadow-lg`}>
                <h3 className="text-lg lg:text-xl font-poppins font-bold mb-4 lg:mb-6 flex items-center gap-2 text-gray-800 dark:text-gray-100 tracking-tight">
                  <Menu className="w-5 h-5 lg:w-6 lg:h-6 text-purple-500 dark:text-teal-400" /> Architecture Index
                </h3>
                <nav className="space-y-1.5 lg:space-y-2 max-h-[calc(100vh-12rem)] overflow-y-auto custom-scrollbar pr-2">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => toggleSection(section.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl lg:rounded-2xl transition-all duration-200 flex items-center gap-3 lg:gap-4 text-xs lg:text-sm font-bold tracking-wide group ${
                        openSection === section.id
                          ? `${colors.sidebarActiveText} ${colors.sidebarActiveBg} border border-purple-200 dark:border-white/10`
                          : `${colors.sidebarText} hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent`
                      }`}
                    >
                      <span className={`shrink-0 transition-transform ${openSection === section.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                        {React.cloneElement(section.icon, { className: "w-4 h-4 lg:w-5 lg:h-5" })}
                      </span>
                      <span className="truncate">{section.title}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            {ReactDOM.createPortal(
              <>
                {/* Floating Toggle Button */}
                <div className="lg:hidden fixed bottom-6 right-6 z-[9999]">
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-4 rounded-full bg-gradient-to-r from-purple-600 to-teal-600 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all"
                    aria-label="Toggle Table of Contents"
                  >
                    {mobileMenuOpen ? <X size={24} /> : <ListTree size={24} />}
                  </button>
                </div>

                {/* Mobile Drawer (overlay + content) */}
                {mobileMenuOpen && (
                  <div
                    className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div
                      className={`absolute right-0 top-0 bottom-0 w-80 sm:w-96 ${colors.drawerBg} border-l ${colors.drawerBorder} shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-300`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-between items-center mb-8 border-b border-gray-200/50 dark:border-white/10 pb-4">
                        <h3 className="text-xl font-poppins font-bold tracking-tight text-gray-800 dark:text-gray-100">Index</h3>
                        <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition text-gray-500 dark:text-gray-400">
                          <X size={20} />
                        </button>
                      </div>
                      <nav className="space-y-2">
                        {sections.map((section) => (
                          <button
                            key={section.id}
                            onClick={() => toggleSection(section.id)}
                            className={`w-full text-left px-4 py-3.5 rounded-xl transition flex items-center gap-3 text-sm font-bold ${
                              openSection === section.id
                                ? `${colors.sidebarActiveText} ${colors.sidebarActiveBg} border border-purple-200 dark:border-white/10 shadow-sm`
                                : `${colors.sidebarText} hover:bg-gray-100 dark:hover:bg-white/5`
                            }`}
                          >
                            <span className="shrink-0">{React.cloneElement(section.icon, { className: "w-5 h-5" })}</span>
                            <span className="truncate">{section.title}</span>
                          </button>
                        ))}
                      </nav>
                    </div>
                  </div>
                )}
              </>,
              document.body
            )}
            {/* Accordion Content Area */}
            <div className="flex-1 space-y-6 lg:space-y-8">
              {sections.map((section) => (
                <FeatureSectionCard
                  key={section.id}
                  ref={(el) => (sectionRefs.current[section.id] = el)}
                  section={section}
                  isOpen={openSection === section.id}
                  onToggle={toggleSection}
                  colors={colors}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Upgraded CSS Styles for Content Parsing */}
        <style>{`


          /* Floating Animations */
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-15px) rotate(5deg); }
          }
          .animate-float { animation: float 6s ease-in-out infinite; }
          .animate-float-delayed { animation: float 6s ease-in-out infinite 2s; }
          .animate-float-slow { animation: float 8s ease-in-out infinite 1s; }
        `}</style>

        {/* Call to Action */}
        <section className="relative w-full py-16 lg:py-24 px-4 sm:px-6 lg:px-8 z-10">
          <div className="max-w-5xl mx-auto text-center">
            <div className={`rounded-[2rem] lg:rounded-[3rem] ${colors.cardBg} border ${colors.cardBorder} p-10 lg:p-16 backdrop-blur-xl relative overflow-hidden group shadow-2xl`}>
              {/* Hover Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-teal-500/10 opacity-0 group-hover:opacity-100 transition duration-700 ease-in-out pointer-events-none" />

              <div className="relative z-10">
                <div className="inline-flex p-4 lg:p-5 rounded-2xl lg:rounded-3xl bg-gradient-to-br from-purple-500/20 to-teal-500/20 dark:from-purple-900/30 dark:to-teal-900/30 mb-6 lg:mb-8 shadow-inner border border-purple-200/50 dark:border-teal-700/30">
                  <Shield className="w-8 h-8 lg:w-10 lg:h-10 text-purple-600 dark:text-teal-400" />
                </div>
                <h2 className="text-3xl lg:text-5xl font-poppins font-extrabold mb-4 lg:mb-6 tracking-tight text-gray-800 dark:text-gray-100">Ready to experience it yourself?</h2>
                <p className={`text-base lg:text-lg mb-8 lg:mb-10 ${colors.textSecondary} max-w-3xl mx-auto font-medium leading-relaxed`}>
                  Start tracking, learning, and optimizing your personal and professional growth with our private, AI-driven architecture.
                </p>
                <Link
                  to={localStorage.getItem('jwtToken') ? "/journal" : "/register"}
                  className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white px-8 py-3.5 lg:px-10 lg:py-4 rounded-full font-bold text-sm lg:text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
                >
                  {localStorage.getItem('jwtToken') ? "Enter Application" : "Create Free Account"}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
}

export default FeaturesGuide;