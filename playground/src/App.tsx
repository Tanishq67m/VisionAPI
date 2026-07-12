import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Playground from './pages/Playground';
import { LayoutDashboard, TerminalSquare, LogOut } from 'lucide-react';

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
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
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return <div className="loading-screen"><div className="loading-spinner"></div></div>;
  }

  // If not logged in and not on login page, redirect to login
  if (!session && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  // If logged in and on login page, redirect to dashboard
  if (session && location.pathname === '/login') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="app-layout">
      {session && (
        <aside className="app-sidebar">
          <div className="app-logo">
            <div className="logo-icon"></div>
            VisionStream
          </div>
          <nav className="app-nav">
            <button 
              className={`nav-btn ${location.pathname === '/' ? 'active' : ''}`}
              onClick={() => navigate('/')}
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
      
      <main className="app-content">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Dashboard session={session} />} />
          <Route path="/playground" element={<Playground />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
