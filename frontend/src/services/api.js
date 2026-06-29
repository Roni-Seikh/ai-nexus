import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://ai-nexus-backend-kadk.onrender.com/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, Promise.reject);

let isRefreshing = false;
let failedQueue  = [];
const processQueue = (error, token = null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token));
  failedQueue = [];
};

api.interceptors.response.use(
  res => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => { failedQueue.push({ resolve, reject }); })
          .then(token => { original.headers.Authorization = `Bearer ${token}`; return api(original); });
      }
      original._retry = true; isRefreshing = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken');
        window.location.href = '/login'; return Promise.reject(error);
      }
      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh-token`, { refreshToken });
        const { accessToken, refreshToken: newRT } = data.data;
        localStorage.setItem('accessToken', accessToken); localStorage.setItem('refreshToken', newRT);
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        processQueue(null, accessToken); original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (err) {
        processQueue(err, null); localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken');
        window.location.href = '/login'; return Promise.reject(err);
      } finally { isRefreshing = false; }
    }
    return Promise.reject(error);
  }
);

export default api;
