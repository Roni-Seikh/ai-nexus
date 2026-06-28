import { motion } from 'framer-motion';

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 bg-dark-900 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-blue-600 flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-brand-600/30">
          ✨
        </div>
        <h1 className="text-2xl font-bold gradient-text mb-3">AI Nexus</h1>
        <div className="flex items-center gap-1.5 justify-center">
          {[0, 0.15, 0.3].map((delay, i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-brand-500"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1, delay, repeat: Infinity }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
