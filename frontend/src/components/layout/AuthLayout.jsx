import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-dark-900 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-brand-900/40 via-dark-800 to-dark-900 items-center justify-center p-12">
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div key={i}
              className="absolute rounded-full opacity-10"
              style={{ width: `${100 + i * 80}px`, height: `${100 + i * 80}px`, background: `radial-gradient(circle, #7c3aed, transparent)`, left: `${10 + i * 15}%`, top: `${5 + i * 12}%` }}
              animate={{ y: [0, -20, 0], scale: [1, 1.05, 1] }}
              transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.5 }}
            />
          ))}
        </div>
        <div className="relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h1 className="text-5xl font-bold mb-4">
              <span className="gradient-text">AI Nexus</span>
            </h1>
            <p className="text-xl text-gray-400 mb-8">Your intelligent AI companion</p>
            <div className="space-y-4">
              {['GPT-4o • Claude 3.5 • Gemini 1.5', 'Image generation with DALL-E 3', 'Real-time web search & RAG', 'Voice chat & document analysis'].map((f, i) => (
                <motion.div key={f} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-center gap-3 text-gray-300">
                  <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />
                  <span>{f}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <Link to="/" className="text-3xl font-bold gradient-text">AI Nexus</Link>
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Outlet />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
