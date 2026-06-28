import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMe } from '@/store/slices/authSlice';
import { AnimatePresence } from 'framer-motion';

// Layouts
import DashboardLayout from '@/components/layout/DashboardLayout';
import AuthLayout from '@/components/layout/AuthLayout';

// Pages
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import ChatPage from '@/pages/ChatPage';
import ImagePage from '@/pages/ImagePage';
import AgentsPage from '@/pages/AgentsPage';
import SearchPage from '@/pages/SearchPage';
import PricingPage from '@/pages/PricingPage';
import SettingsPage from '@/pages/SettingsPage';
import ProfilePage from '@/pages/ProfilePage';
import AdminPage from '@/pages/AdminPage';
import SharedChatPage from '@/pages/SharedChatPage';
import NotFoundPage from '@/pages/NotFoundPage';

// Loading
import SplashScreen from '@/components/shared/SplashScreen';

const ProtectedRoute = ({ children }) => {
  const { user, isInitialized } = useSelector(s => s.auth);
  if (!isInitialized) return <SplashScreen />;
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, isInitialized } = useSelector(s => s.auth);
  if (!isInitialized) return <SplashScreen />;
  return user ? <Navigate to="/chat" replace /> : children;
};

export default function App() {
  const dispatch = useDispatch();
  const { isInitialized } = useSelector(s => s.auth);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) dispatch(fetchMe());
    else dispatch({ type: 'auth/fetchMe/rejected' });
  }, [dispatch]);

  if (!isInitialized) return <SplashScreen />;

  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/share/:token" element={<SharedChatPage />} />

          {/* Auth */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          </Route>

          {/* Protected dashboard */}
          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/:id" element={<ChatPage />} />
            <Route path="/images" element={<ImagePage />} />
            <Route path="/agents" element={<AgentsPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  );
}
