import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, useThemeStore } from './stores';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import Admin from './pages/Admin';
import BrandLogo from './components/BrandLogo';
import './index.css';

function App() {
  const { isAuthenticated, isLoading, init } = useAuthStore();
  const { initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
    init();
  }, [init, initTheme]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-300 professional-surface flex items-center justify-center">
        <div className="text-center">
          <div className="mb-5 flex justify-center"><BrandLogo size="lg" /></div>
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-cyan-300 border-t-transparent"></div>
          <p className="text-white text-lg">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-300">
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/chat" /> : <Landing />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/chat" /> : <Login />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/chat" /> : <Register />} />
        <Route path="/chat/*" element={isAuthenticated ? <Chat /> : <Navigate to="/login" />} />
        <Route path="/admin" element={isAuthenticated ? <Admin /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to={isAuthenticated ? '/chat' : '/'} />} />
      </Routes>
    </div>
  );
}

export default App;
