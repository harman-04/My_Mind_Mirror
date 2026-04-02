// src/data/writingPrompts.js

const writingPrompts = [
  "What made you smile today?",
  "Describe a challenge you overcame recently.",
  "Write about something you're grateful for right now.",
  "What's one thing you would change about your day if you could?",
  "What are you looking forward to tomorrow?",
  "Describe a moment when you felt truly at peace.",
  "What's a small win you had today?",
  "Write about a person who has positively influenced your life.",
  "What's something you learned about yourself this week?",
  "If you could give your future self one piece of advice, what would it be?",
  "What's a fear you'd like to overcome?",
  "Describe a place where you feel completely comfortable.",
  "What does self-care look like for you today?",
  "Write about a memory that makes you laugh.",
  "What's a goal you've been putting off? Why?",
  "Describe a recent act of kindness you witnessed or experienced.",
  "What's something you're proud of?",
  "Write about a time you stepped out of your comfort zone.",
  "What does success mean to you?",
  "What's something you're curious about?",
  "Describe your ideal morning routine.",
  "What's a quote or saying that resonates with you?",
  "Write about something you'd like to learn.",
  "What's a habit you'd like to build?",
  "Describe a recent conversation that stuck with you.",
  "What's something you'd tell your younger self?",
  "Write about a hobby you enjoy and why.",
  "What does 'balance' mean in your life right now?",
  "Describe a recent moment of frustration and how you handled it.",
  "What's something you'd like to let go of?",
];

// Helper to get a random prompt
export const getRandomPrompt = (usedPrompts = []) => {
  const available = writingPrompts.filter(p => !usedPrompts.includes(p));
  if (available.length === 0) {
    // Reset used prompts if all have been used
    return writingPrompts[Math.floor(Math.random() * writingPrompts.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
};

export default writingPrompts;