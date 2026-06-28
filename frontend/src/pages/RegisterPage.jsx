import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, CheckCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { setUser, setToken } from '@/store/slices/authSlice';
import api from '@/services/api';
import toast from 'react-hot-toast';

const STEPS = { FORM: 'form', OTP: 'otp', SUCCESS: 'success' };

// ── OTP Input ──────────────────────────────────────────────
function OTPInput({ value, onChange }) {
  const inputs = useRef([]);
  const digits = value.split('').concat(Array(6).fill('')).slice(0, 6);

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      const next = [...digits]; next[i] = '';
      onChange(next.join(''));
      if (i > 0) inputs.current[i - 1]?.focus();
    } else if (/^\d$/.test(e.key)) {
      const next = [...digits]; next[i] = e.key;
      onChange(next.join('').slice(0, 6));
      if (i < 5) inputs.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex gap-3 justify-center my-6">
      {digits.map((d, i) => (
        <input key={i} ref={el => inputs.current[i] = el}
          value={d} onKeyDown={e => handleKey(i, e)} onPaste={handlePaste}
          onChange={() => {}}
          maxLength={1} inputMode="numeric"
          className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-dark-600 text-white focus:outline-none transition-all
            ${d ? 'border-brand-500 bg-brand-600/10' : 'border-white/10 focus:border-brand-500/50'}`}
        />
      ))}
    </div>
  );
}

export default function RegisterPage() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const [step, setStep]   = useState(STEPS.FORM);
  const [form, setForm]   = useState({ name: '', email: '', password: '', confirm: '' });
  const [otp, setOtp]     = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState('');

  // Countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleChange = e => { setError(''); setForm(p => ({ ...p, [e.target.name]: e.target.value })); };

  // Step 1 — Send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/auth/register/send-otp', { name: form.name, email: form.email, password: form.password });
      setStep(STEPS.OTP);
      setResendCooldown(60);
      toast.success(`OTP sent to ${form.email}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  // Step 2 — Verify OTP
  const handleVerifyOTP = async () => {
    if (otp.length < 6) { setError('Enter all 6 digits'); return; }
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/register/verify-otp', { email: form.email, otp });
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      dispatch(setToken(data.data.accessToken));
      dispatch(setUser(data.data.user));
      setStep(STEPS.SUCCESS);
      setTimeout(() => navigate('/chat'), 1800);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
      setOtp('');
    } finally { setLoading(false); }
  };

  // Resend OTP
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      await api.post('/auth/resend-otp', { email: form.email, type: 'register' });
      setResendCooldown(60);
      setOtp('');
      toast.success('New OTP sent!');
    } catch { toast.error('Failed to resend'); }
    finally { setLoading(false); }
  };

  // ── Success screen ────────────────────────────────────────
  if (step === STEPS.SUCCESS) return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
      <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle size={40} className="text-green-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Account Created!</h2>
      <p className="text-gray-400">Welcome to AI Nexus. Redirecting…</p>
    </motion.div>
  );

  // ── OTP Screen ────────────────────────────────────────────
  if (step === STEPS.OTP) return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      <button onClick={() => { setStep(STEPS.FORM); setOtp(''); setError(''); }}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm transition-colors">
        <ArrowLeft size={14} /> Back
      </button>

      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-brand-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Mail size={24} className="text-brand-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">Check your email</h2>
        <p className="text-gray-400 text-sm">We sent a 6-digit OTP to</p>
        <p className="text-brand-400 font-medium">{form.email}</p>
      </div>

      <OTPInput value={otp} onChange={setOtp} />

      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-red-400 text-sm text-center mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <button onClick={handleVerifyOTP} disabled={loading || otp.length < 6}
        className="btn-primary w-full py-3 mb-4 flex items-center justify-center gap-2">
        {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying…</> : '✓ Verify & Create Account'}
      </button>

      <div className="text-center">
        <p className="text-gray-500 text-sm mb-2">Didn't receive it?</p>
        <button onClick={handleResend} disabled={resendCooldown > 0 || loading}
          className="flex items-center gap-2 text-sm mx-auto transition-colors disabled:opacity-40 text-brand-400 hover:text-brand-300">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
        </button>
      </div>
    </motion.div>
  );

  // ── Registration Form ─────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
      <div className="mb-7">
        <h2 className="text-2xl font-bold text-white mb-1">Create account</h2>
        <p className="text-gray-400">Start your AI journey for free</p>
      </div>

      <form onSubmit={handleSendOTP} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Full Name</label>
          <div className="relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input name="name" value={form.name} onChange={handleChange} required
              placeholder="John Doe" className="input-base pl-10" />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Email</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input name="email" type="email" value={form.email} onChange={handleChange} required
              placeholder="you@example.com" className="input-base pl-10" />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input name="password" type={showPw ? 'text' : 'password'} value={form.password}
              onChange={handleChange} required minLength={8} placeholder="Min 8 characters"
              className="input-base pl-10 pr-10" />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Confirm Password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input name="confirm" type="password" value={form.confirm} onChange={handleChange}
              required placeholder="Repeat password" className="input-base pl-10" />
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading
            ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending OTP…</span>
            : 'Send Verification OTP →'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in</Link>
      </p>
    </motion.div>
  );
}
