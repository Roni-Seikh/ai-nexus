import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center gap-6 text-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
        <p className="text-8xl font-bold gradient-text mb-4">404</p>
        <h1 className="text-2xl font-semibold text-white mb-2">Page not found</h1>
        <p className="text-gray-400 mb-8">The page you're looking for doesn't exist.</p>
        <Link to="/" className="btn-primary px-8 py-3">Go Home</Link>
      </motion.div>
    </div>
  );
}
