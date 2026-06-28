import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, Zap } from 'lucide-react';
import { loginUser, clearError } from '@/store/slices/authSlice';
import { setUser, setToken } from '@/store/slices/authSlice';
import api from '@/services/api';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { isLoading, error } = useSelector(s => s.auth);
  const [form, setForm]     = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleChange = e => { dispatch(clearError()); setForm(p => ({ ...p, [e.target.name]: e.target.value })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(loginUser(form));
    if (loginUser.fulfilled.match(result)) { toast.success('Welcome back!'); navigate('/chat'); }
    else toast.error(result.payload || 'Login failed');
  };

  const handleDemo = async () => {
    setDemoLoading(true);
    try {
      const { data } = await api.post('/auth/demo');
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      dispatch(setToken(data.data.accessToken));
      dispatch(setUser(data.data.user));
      toast.success('Welcome to the demo! 🎉');
      navigate('/chat');
    } catch { toast.error('Demo login failed'); }
    finally { setDemoLoading(false); }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
        <p className="text-gray-400">Sign in to continue to AI Nexus</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Email</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input name="email" type="email" value={form.email} onChange={handleChange} required
              placeholder="you@example.com" className="input-base pl-10" />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input name="password" type={showPw?'text':'password'} value={form.password}
              onChange={handleChange} required placeholder="••••••••" className="input-base pl-10 pr-10" />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input type="checkbox" className="rounded accent-brand-500" /> Remember me
          </label>
          <Link to="/forgot-password" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            Forgot password?
          </Link>
        </div>

        {error && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}}
            className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            {error}
          </motion.div>
        )}

        <button type="submit" disabled={isLoading} className="btn-primary w-full py-3">
          {isLoading
            ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Signing in…</span>
            : 'Sign In'}
        </button>
      </form>

      {/* Divider */}
      <div className="relative flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-gray-500">or</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* Demo Account */}
      <button onClick={handleDemo} disabled={demoLoading}
        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-brand-600/20 to-blue-600/20 hover:from-brand-600/30 hover:to-blue-600/30 border border-brand-500/30 rounded-lg text-white font-medium transition-all mb-3">
        <Zap size={16} className="text-brand-400" />
        {demoLoading ? 'Loading demo…' : 'Try Demo Account — No signup needed'}
      </button>

      {/* OAuth — shown only if env vars are set */}
      {(import.meta.env.VITE_GOOGLE_CLIENT_ID !== 'your_google_client_id') && (
        <div className="grid grid-cols-2 gap-3">
          <a href={`${import.meta.env.VITE_API_URL?.replace('/api','')}/api/auth/google`}
            className="btn-secondary flex items-center justify-center gap-2 py-2.5 text-sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </a>
          <a href={`${import.meta.env.VITE_API_URL?.replace('/api','')}/api/auth/github`}
            className="btn-secondary flex items-center justify-center gap-2 py-2.5 text-sm">
            <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            GitHub
          </a>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-gray-500">
        Don't have an account?{' '}
        <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium">Sign up free</Link>
      </p>
    </div>
  );
}
