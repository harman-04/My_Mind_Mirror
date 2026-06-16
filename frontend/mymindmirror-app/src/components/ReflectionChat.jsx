// src/components/ReflectionChat.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useReflectionChat, useClearChatMemory } from '../hooks/useJournalData'; // 💡 NEW HOOKS IMPORTED
import axios from 'axios';
import {
  Send, Bot, User as UserIcon, Sparkles, RefreshCw,
  Lightbulb, ArrowDown, Copy, Check, Trash2, Repeat, Plus, Brain // 💡 Added Brain Icon
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8080/api';
const getToken = () => localStorage.getItem('jwtToken');

const CACHE_KEY = 'reflection_last_question';
const CACHE_EXPIRY = 60 * 60 * 1000;

const cacheQuestion = (question) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      question,
      timestamp: Date.now()
    }));
  } catch (e) {}
};

const getCachedQuestion = () => {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const { question, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_EXPIRY) {
        return question;
      }
    }
  } catch (e) {}
  return null;
};

const formatMarkdown = (text) => {
  if (!text) return '';
  const escapeHtml = (str) => {
    return str.replace(/[&<>]/g, (m) => {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  };

  let processed = text;
  const codeBlocks = [];

  // FIX: This regex is now safely on one single line!
  processed = processed.replace(/```([\s\S]*?)```/g, (match, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre><code>${escapeHtml(code)}</code></pre>`);
    return `__CODEBLOCK_${idx}__`;
  });

  const formatInline = (str) => {
    let formatted = escapeHtml(str);
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    return formatted;
  };

  const lines = processed.split('\n');
  const result = [];
  let i = 0;
  const total = lines.length;

  while (i < total) {
    const line = lines[i];

    const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = formatInline(headingMatch[2]);
      result.push(`<h${level} class="chat-heading">${content}</h${level}>`);
      i++;
      continue;
    }

    const bulletMatch = line.match(/^\s*[\*\-]\s+(.*)/);
    if (bulletMatch) {
      const items = [];
      while (i < total && lines[i].match(/^\s*[\*\-]\s+(.*)/)) {
        const content = formatInline(lines[i].match(/^\s*[\*\-]\s+(.*)/)[1]);
        items.push(`<li>${content}</li>`);
        i++;
      }
      result.push(`<ul class="chat-list">${items.join('')}</ul>`);
      continue;
    }

    const numberMatch = line.match(/^\s*\d+\.\s+(.*)/);
    if (numberMatch) {
      const items = [];
      while (i < total && lines[i].match(/^\s*\d+\.\s+(.*)/)) {
        const content = formatInline(lines[i].match(/^\s*\d+\.\s+(.*)/)[1]);
        items.push(`<li>${content}</li>`);
        i++;
      }
      result.push(`<ol class="chat-list">${items.join('')}</ol>`);
      continue;
    }

    if (line.startsWith('> ')) {
      let quote = line.substring(2);
      let j = i + 1;
      while (j < total && lines[j].startsWith('> ')) {
        quote += '\n' + lines[j].substring(2);
        j++;
      }
      const quotedHtml = formatMarkdown(quote);
      result.push(`<blockquote class="chat-blockquote">${quotedHtml}</blockquote>`);
      i = j;
      continue;
    }

    if (/^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())) {
      result.push('<hr class="chat-hr"/>');
      i++;
      continue;
    }

    if (line.trim() === '') {
      result.push('<br/>');
      i++;
      continue;
    }

    result.push(`<p class="chat-paragraph">${formatInline(line)}</p>`);
    i++;
  }

  let finalHtml = result.join('');
  codeBlocks.forEach((block, idx) => {
    finalHtml = finalHtml.replace(`__CODEBLOCK_${idx}__`, block);
  });
  return finalHtml;
};

const fetchReflectiveQuestion = async () => {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const response = await axios.post(
    `${API_BASE_URL}/chat/suggest-question`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data?.answer || "What's one thing you've learned about yourself recently?";
};

const TypingIndicator = () => (
  <div className="flex gap-1 items-center py-2 px-3">
    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
  </div>
);

const ScrollToBottom = ({ onClick, visible }) => (
  visible ? (
    <button
      onClick={onClick}
      className="absolute bottom-24 right-4 p-2 rounded-full bg-purple-500/80 backdrop-blur-sm text-white shadow-lg hover:bg-purple-600 transition z-10"
      aria-label="Scroll to bottom"
    >
      <ArrowDown size={18} />
    </button>
  ) : null
);

function ReflectionChat() {
  const { theme } = useTheme();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [replaceMode, setReplaceMode] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [refreshInBackground, setRefreshInBackground] = useState(false);

  // 💡 NEW: Session & Memory State
  const [rememberChat, setRememberChat] = useState(true);
  const [sessionId] = useState(() => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36));

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  // 💡 NEW: Hook Integrations
  const reflectionChat = useReflectionChat();
  const clearMemoryMutation = useClearChatMemory();

  useEffect(() => {
    const loadMessages = async () => {
      setIsInitializing(true);
      const cachedQuestion = getCachedQuestion();

      if (cachedQuestion) {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: `Hi! I'm your AI reflection coach. I've read your recent journal entries.\n\nHere's a reflective question to start: **${cachedQuestion}**\n\nFeel free to answer, ask anything, or click the refresh button for another question.`,
          timestamp: new Date(),
        }]);
        setIsInitializing(false);
        setRefreshInBackground(true);
        try {
          const freshQuestion = await fetchReflectiveQuestion();
          if (freshQuestion && freshQuestion !== cachedQuestion) {
            cacheQuestion(freshQuestion);
            setMessages((prev) => [{
              id: 'welcome',
              role: 'assistant',
              content: `Hi! I'm your AI reflection coach. I've read your recent journal entries.\n\nHere's a reflective question to start: **${freshQuestion}**\n\nFeel free to answer, ask anything, or click the refresh button for another question.`,
              timestamp: new Date(),
            }]);
          }
        } catch (error) {
          console.error('Background refresh failed', error);
        } finally {
          setRefreshInBackground(false);
        }
      } else {
        try {
          const freshQuestion = await fetchReflectiveQuestion();
          cacheQuestion(freshQuestion);
          setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: `Hi! I'm your AI reflection coach. I've read your recent journal entries.\n\nHere's a reflective question to start: **${freshQuestion}**\n\nFeel free to answer, ask anything, or click the refresh button for another question.`,
            timestamp: new Date(),
          }]);
        } catch (error) {
          console.error('Failed to load initial question', error);
          setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: "Hi! I'm your AI reflection coach. I've read your recent journal entries. Ask me anything!",
            timestamp: new Date(),
          }]);
        } finally {
          setIsInitializing(false);
        }
      }
    };
    loadMessages();
  }, []);

  const handleNewQuestion = async () => {
    setIsLoading(true);
    try {
      const question = await fetchReflectiveQuestion();
      cacheQuestion(question);
      const newQuestionMsg = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Here's another reflective question for you:\n\n**${question}**`,
        timestamp: new Date(),
      };
      if (replaceMode) {
        setMessages((prev) => {
          const lastIndex = prev.length - 1;
          if (lastIndex >= 0 && prev[lastIndex].role === 'assistant') {
            const newMessages = [...prev];
            newMessages[lastIndex] = newQuestionMsg;
            return newMessages;
          }
          return [...prev, newQuestionMsg];
        });
      } else {
        setMessages((prev) => [...prev, newQuestionMsg]);
      }
    } catch (error) {
      console.error('Failed to fetch question', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 💡 UPGRADED: Clears UI AND backend Redis Memory
  const handleClearConversation = () => {
    if (window.confirm('Clear all messages and AI memory? This cannot be undone.')) {
      clearMemoryMutation.mutate(sessionId);
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: "Conversation and memory cleared. Ask me anything about your journal entries!",
        timestamp: new Date(),
      }]);
    }
  };

  const handleCopyMessage = (content, id) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // 💡 UPGRADED: Sends payload with Session UUID and Toggle State
  const handleSend = () => {
    if (!input.trim() || isLoading || isInitializing) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    reflectionChat.mutate(
      { query: userMessage.content, sessionId, rememberChat },
      {
        onSuccess: (data) => {
          if (replaceMode) {
            setMessages((prev) => {
              const lastIndex = prev.length - 1;
              if (lastIndex >= 0 && prev[lastIndex].role === 'assistant') {
                const newMessages = [...prev];
                newMessages[lastIndex] = {
                  ...newMessages[lastIndex],
                  content: data,
                  timestamp: new Date(),
                };
                return newMessages;
              }
              return [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: data,
                timestamp: new Date(),
              }];
            });
          } else {
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                role: 'assistant',
                content: data,
                timestamp: new Date(),
              },
            ]);
          }
          setIsLoading(false);
        },
        onError: () => {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: "Sorry, I'm having trouble connecting. Please try again later.",
              timestamp: new Date(),
            },
          ]);
          setIsLoading(false);
        }
      }
    );
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isInitializing]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const suggestionChips = [
    "Tell me more about that",
    "What can I do to feel better?",
    "I'm grateful for...",
    "One small step I can take today is...",
    "That's interesting, why?",
    "How can I apply this to my life?",
  ];

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const isDarkMode = theme === 'dark';
  const bgClass = isDarkMode ? 'bg-gray-800/60' : 'bg-white/70';
  const borderClass = isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50';
  const userBubbleClass = isDarkMode
    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white'
    : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white';
  const assistantBubbleClass = isDarkMode ? 'bg-gray-700/80 text-gray-100' : 'bg-gray-100 text-gray-800';

  return (
    <div className={`relative rounded-2xl ${bgClass} border ${borderClass} backdrop-blur-sm overflow-hidden flex flex-col h-[600px] shadow-xl transition-all duration-300`}>

      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap justify-between items-center gap-2 bg-gradient-to-r from-purple-50/30 to-teal-50/30 dark:from-purple-900/20 dark:to-teal-900/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-teal-500 flex items-center justify-center shadow-md">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-poppins font-semibold text-lg">AI Reflection Coach</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Based on your journal entries
              {refreshInBackground && (
                <span className="ml-2 inline-flex items-center gap-1 text-purple-500">
                  <RefreshCw size={10} className="animate-spin" /> refreshing...
                </span>
              )}
            </p>
          </div>
        </div>


        <div className="flex items-center gap-2">

          <button
            onClick={() => setRememberChat(!rememberChat)}
            className={`px-3 py-1.5 rounded-full transition flex items-center gap-1.5 text-xs font-medium border ${
              rememberChat
                ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
            }`}
            title={rememberChat ? "AI remembers this conversation" : "AI forgets previous messages"}
          >
            <Brain size={14} className={rememberChat ? 'animate-pulse text-purple-500' : 'opacity-50'} />
            <span className="hidden sm:inline">{rememberChat ? 'Memory ON' : 'Memory OFF'}</span>
          </button>

          <button
            onClick={() => setReplaceMode(!replaceMode)}
            className={`p-2 rounded-full transition flex items-center gap-1 text-xs ${replaceMode ? 'bg-purple-500 text-white shadow-sm' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
            title={replaceMode ? "Replace last response" : "Append new response"}
          >
            {replaceMode ? <Repeat size={14} /> : <Plus size={14} />}
            <span className="hidden sm:inline">{replaceMode ? 'Replace' : 'Append'}</span>
          </button>

          <button
            onClick={handleClearConversation}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            title="Clear conversation & memory"
          >
            <Trash2 size={16} className="text-red-400" />
          </button>

          <button
            onClick={handleNewQuestion}
            disabled={isLoading || isInitializing}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-50"
            title="New reflective question"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>


      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300 group`}
          >
            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="flex-shrink-0">
                {msg.role === 'user' ? (
                  <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center shadow-sm">
                    <UserIcon size={16} className="text-gray-600 dark:text-gray-300" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500/30 to-teal-500/30 flex items-center justify-center shadow-sm">
                    <Bot size={16} className="text-purple-500" />
                  </div>
                )}
              </div>
              <div className="relative">
                <div className={`rounded-2xl px-4 py-2 shadow-sm ${msg.role === 'user' ? userBubbleClass : assistantBubbleClass}`}>
                  {msg.role === 'assistant' ? (
                    <div
                      className="text-sm prose prose-sm max-w-none dark:prose-invert chat-content"
                      dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                <div className="flex justify-between items-center mt-1 px-1">
                  <p className="text-xs text-gray-400">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <button
                    onClick={() => handleCopyMessage(msg.content, msg.id)}
                    className="opacity-0 group-hover:opacity-100 transition p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    title="Copy message"
                  >
                    {copiedMessageId === msg.id ? (
                      <Check size={12} className="text-green-500" />
                    ) : (
                      <Copy size={12} className="text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {isInitializing && messages.length === 0 && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500/30 to-teal-500/30 flex items-center justify-center">
                <Bot size={16} className="text-purple-500" />
              </div>
              <div className="rounded-2xl px-4 py-2 bg-gray-100 dark:bg-gray-700 shadow-sm flex items-center gap-2">
                <TypingIndicator />
                <span className="text-xs text-gray-500 dark:text-gray-400">Reviewing your journal...</span>
              </div>
            </div>
          </div>
        )}

        {isLoading && reflectionChat.isPending && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500/30 to-teal-500/30 flex items-center justify-center">
                <Bot size={16} className="text-purple-500" />
              </div>
              <div className="rounded-2xl px-4 py-2 bg-gray-100 dark:bg-gray-700 shadow-sm">
                <TypingIndicator />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>


      {messages.length > 0 && !isLoading && !isInitializing && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto custom-scrollbar">
          {suggestionChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSuggestionClick(chip)}
              className="flex-shrink-0 px-3 py-1.5 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800/40 transition"
            >
              <Lightbulb size={12} className="inline mr-1" />
              {chip}
            </button>
          ))}
        </div>
      )}


      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white/30 dark:bg-gray-900/20">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            disabled={isInitializing}
            placeholder={isInitializing ? "AI is reading your journal..." : "Answer the question or ask something..."}
            rows={1}
            className="flex-1 p-3 rounded-xl border resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || isInitializing}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-teal-500 text-white font-medium hover:shadow-lg transition disabled:opacity-50 disabled:hover:shadow-none"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>

      <ScrollToBottom onClick={scrollToBottom} visible={showScrollButton} />

      <style>{`
        .chat-content h1, .chat-content h2, .chat-content h3 {
          font-weight: 600;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .chat-content h1 { font-size: 1.25rem; }
        .chat-content h2 { font-size: 1.125rem; }
        .chat-content h3 { font-size: 1rem; }
        .chat-content p {
          margin-bottom: 0.5rem;
          line-height: 1.5;
        }
        .chat-content ul, .chat-content ol {
          margin-left: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .chat-content li {
          margin-bottom: 0.25rem;
        }
        .chat-content code {
          background: rgba(0,0,0,0.05);
          padding: 0.2rem 0.3rem;
          border-radius: 0.25rem;
          font-size: 0.85rem;
        }
        .chat-content pre {
          background: rgba(0,0,0,0.05);
          padding: 0.5rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin-bottom: 0.5rem;
        }
        .chat-content blockquote {
          border-left: 3px solid #8B5CF6;
          padding-left: 0.75rem;
          margin: 0.5rem 0;
          color: #6B7280;
          font-style: italic;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: ${isDarkMode ? '#374151' : '#E5E7EB'};
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${isDarkMode ? '#8B5CF6' : '#C084FC'};
          border-radius: 10px;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default ReflectionChat;