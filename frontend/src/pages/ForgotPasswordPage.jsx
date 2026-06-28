import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, CheckCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

const STEPS = { EMAIL: 'email', OTP: 'otp', NEWPASS: 'newpass', SUCCESS: 'success' };

function OTPInput({ value, onChange }) {
  const inputs = useRef([]);
  const digits  = value.split('').concat(Array(6).fill('')).slice(0, 6);
  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      const n = [...digits]; n[i] = ''; onChange(n.join(''));
      if (i > 0) inputs.current[i-1]?.focus();
    } else if (/^\d$/.test(e.key)) {
      const n = [...digits]; n[i] = e.key; onChange(n.join('').slice(0,6));
      if (i < 5) inputs.current[i+1]?.focus();
    }
  };
  const handlePaste = (e) => {
    const p = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
    onChange(p); inputs.current[Math.min(p.length,5)]?.focus();
  };
  return (
    <div className="flex gap-3 justify-center my-6">
      {digits.map((d,i) => (
        <input key={i} ref={el => inputs.current[i]=el} value={d}
          onKeyDown={e => handleKey(i,e)} onPaste={handlePaste} onChange={() => {}}
          maxLength={1} inputMode="numeric"
          className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-dark-600 text-white focus:outline-none transition-all ${d?'border-brand-500 bg-brand-600/10':'border-white/10 focus:border-brand-500/50'}`}
        />
      ))}
    </div>
  );
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep]       = useState(STEPS.EMAIL);
  const [email, setEmail]     = useState('');
  const [otp, setOtp]         = useState('');
  const [resetToken, setResetToken] = useState('');
  const [passwords, setPasswords]   = useState({ pw: '', confirm: '' });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c-1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Step 1 — send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setStep(STEPS.OTP); setCooldown(60);
      toast.success(`OTP sent to ${email}`);
    } catch (err) { setError(err.response?.data?.message || 'Failed to send OTP'); }
    finally { setLoading(false); }
  };

  // Step 2 — verify OTP
  const handleVerifyOTP = async () => {
    if (otp.length < 6) { setError('Enter all 6 digits'); return; }
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/forgot-password/verify-otp', { email, otp });
      setResetToken(data.data.resetToken);
      setStep(STEPS.NEWPASS);
    } catch (err) { setError(err.response?.data?.message || 'Invalid OTP'); setOtp(''); }
    finally { setLoading(false); }
  };

  // Step 3 — set new password
  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (passwords.pw !== passwords.confirm) { setError('Passwords do not match'); return; }
    if (passwords.pw.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/auth/reset-password', { email, resetToken, password: passwords.pw });
      setStep(STEPS.SUCCESS);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) { setError(err.response?.data?.message || 'Reset failed'); }
    finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (cooldown > 0) return; setLoading(true);
    try {
      await api.post('/auth/resend-otp', { email, type: 'forgot' });
      setCooldown(60); setOtp(''); toast.success('New OTP sent!');
    } catch { toast.error('Failed to resend'); }
    finally { setLoading(false); }
  };

  // ── Success ───────────────────────────────────────────────
  if (step === STEPS.SUCCESS) return (
    <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} className="text-center py-8">
      <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle size={40} className="text-green-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Password Reset!</h2>
      <p className="text-gray-400">Redirecting to login…</p>
    </motion.div>
  );

  // ── New Password ──────────────────────────────────────────
  if (step === STEPS.NEWPASS) return (
    <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }}>
      <div className="mb-7">
        <h2 className="text-2xl font-bold text-white mb-1">Set new password</h2>
        <p className="text-gray-400">Choose a strong password for your account</p>
      </div>
      <form onSubmit={handleSetPassword} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">New Password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input type={showPw?'text':'password'} value={passwords.pw} required minLength={8}
              onChange={e => setPasswords(p=>({...p,pw:e.target.value}))}
              placeholder="Min 8 characters" className="input-base pl-10 pr-10" />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Confirm Password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input type="password" value={passwords.confirm} required
              onChange={e => setPasswords(p=>({...p,confirm:e.target.value}))}
              placeholder="Repeat password" className="input-base pl-10" />
          </div>
        </div>
        <AnimatePresence>
          {error && <motion.p initial={{opacity:0}} animate={{opacity:1}}
            className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</motion.p>}
        </AnimatePresence>
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? 'Resetting…' : 'Reset Password'}
        </button>
      </form>
    </motion.div>
  );

  // ── OTP Screen ────────────────────────────────────────────
  if (step === STEPS.OTP) return (
    <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }}>
      <button onClick={() => { setStep(STEPS.EMAIL); setOtp(''); setError(''); }}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm transition-colors">
        <ArrowLeft size={14}/> Back
      </button>
      <div className="text-center mb-4">
        <div className="w-14 h-14 bg-brand-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Mail size={24} className="text-brand-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">Enter OTP</h2>
        <p className="text-gray-400 text-sm">Sent to <span className="text-brand-400">{email}</span></p>
      </div>
      <OTPInput value={otp} onChange={setOtp} />
      <AnimatePresence>
        {error && <motion.p initial={{opacity:0}} animate={{opacity:1}}
          className="text-red-400 text-sm text-center mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</motion.p>}
      </AnimatePresence>
      <button onClick={handleVerifyOTP} disabled={loading || otp.length < 6}
        className="btn-primary w-full py-3 mb-4">
        {loading ? 'Verifying…' : 'Verify OTP →'}
      </button>
      <div className="text-center">
        <button onClick={handleResend} disabled={cooldown > 0 || loading}
          className="flex items-center gap-2 text-sm mx-auto text-brand-400 hover:text-brand-300 disabled:opacity-40">
          <RefreshCw size={13}/>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
        </button>
      </div>
    </motion.div>
  );

  // ── Email Form ────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
      <div className="mb-7">
        <h2 className="text-2xl font-bold text-white mb-1">Forgot password?</h2>
        <p className="text-gray-400">Enter your email and we'll send a 6-digit OTP</p>
      </div>
      <form onSubmit={handleSendOTP} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Email address</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
              required placeholder="you@example.com" className="input-base pl-10" />
          </div>
        </div>
        <AnimatePresence>
          {error && <motion.p initial={{opacity:0}} animate={{opacity:1}}
            className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</motion.p>}
        </AnimatePresence>
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? 'Sending OTP…' : 'Send OTP →'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-500">
        <Link to="/login" className="text-brand-400 hover:text-brand-300 flex items-center gap-1 justify-center">
          <ArrowLeft size={13}/> Back to login
        </Link>
      </p>
    </motion.div>
  );
}
