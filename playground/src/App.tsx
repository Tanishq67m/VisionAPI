import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Playground from './pages/Playground';
import Landing from './pages/Landing';
import Docs from './pages/Docs';
import { LogoMark } from './components/Logo';
import { LayoutDashboard, TerminalSquare, LogOut } from 'lucide-react';

// Routes that never require authentication. The landing page, docs, and Observe
// playground are the public, no-signup surfaces — they must always render.
const PUBLIC_PATHS = ['/', '/playground', '/docs', '/login'];

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!supabase) {
      // No Supabase configured — run in public-only mode (landing + playground).
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const isPublic = PUBLIC_PATHS.includes(location.pathname);

  // Protected routes (e.g. /dashboard) require a session.
  if (!session && !isPublic) {
    return <Navigate to="/login" replace />;
  }

  // Logged-in users landing on /login go to the dashboard.
  if (session && location.pathname === '/login') {
    return <Navigate to="/dashboard" replace />;
  }

  // Public marketing/tool surfaces are full-bleed with their own top nav —
  // the app sidebar only appears on the authenticated dashboard.
  const fullBleed = ['/', '/docs', '/playground'].includes(location.pathname);
  const showSidebar = !!session && location.pathname === '/dashboard';

  return (
    <div className={fullBleed ? 'landing-shell' : 'app-layout'}>
      {showSidebar && (
        <aside className="app-sidebar">
          <div className="app-logo">
            <LogoMark size={22} />
            VisionStream
          </div>
          <nav className="app-nav">
            <button
              className={`nav-btn ${location.pathname === '/dashboard' ? 'active' : ''}`}
              onClick={() => navigate('/dashboard')}
            >
              <LayoutDashboard size={18} />
              Dashboard
            </button>
            <button
              className={`nav-btn ${location.pathname === '/playground' ? 'active' : ''}`}
              onClick={() => navigate('/playground')}
            >
              <TerminalSquare size={18} />
              Playground
            </button>
          </nav>

          <button className="nav-btn logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            Sign Out
          </button>
        </aside>
      )}

      <main className={fullBleed ? 'landing-main' : 'app-content'}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/dashboard" element={<Dashboard session={session} />} />
          {/* Any unknown route falls back to the landing page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
