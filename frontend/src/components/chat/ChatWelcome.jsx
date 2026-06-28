// ChatWelcome.jsx
import { motion } from 'framer-motion';
import { Sparkles, Code2, Globe, ImageIcon, BookOpen, Lightbulb } from 'lucide-react';

const SUGGESTIONS = [
  { icon: Code2, text: 'Write a React component for a responsive navbar', category: 'Code' },
  { icon: Globe, text: 'Search the web for the latest AI news today', category: 'Search' },
  { icon: ImageIcon, text: 'Explain how diffusion models generate images', category: 'Learn' },
  { icon: BookOpen, text: 'Summarize the key points of a topic I paste', category: 'Analyze' },
  { icon: Lightbulb, text: 'Brainstorm 10 startup ideas for 2025', category: 'Ideate' },
  { icon: Sparkles, text: 'Help me write a professional email to my team', category: 'Write' },
];

export default function ChatWelcome({ onSuggestion, userName }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="text-center max-w-2xl w-full">
        <div className="w-16 h-16 rounded-2xl bg-gradient-brand mx-auto mb-6 flex items-center justify-center text-2xl shadow-lg shadow-brand-600/20">
          ✨
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Hello{userName ? `, ${userName.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-gray-400 text-lg mb-10">How can I help you today?</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SUGGESTIONS.map(({ icon: Icon, text, category }, i) => (
            <motion.button key={text}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
              onClick={() => onSuggestion(text)}
              className="flex items-start gap-3 p-4 bg-dark-700 hover:bg-dark-600 border border-white/5 hover:border-brand-500/30 rounded-xl text-left transition-all group">
              <div className="p-2 bg-brand-600/20 rounded-lg group-hover:bg-brand-600/30 transition-colors flex-shrink-0">
                <Icon size={15} className="text-brand-400" />
              </div>
              <div>
                <span className="text-xs text-brand-400 font-medium block mb-0.5">{category}</span>
                <p className="text-sm text-gray-300 group-hover:text-white transition-colors">{text}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
