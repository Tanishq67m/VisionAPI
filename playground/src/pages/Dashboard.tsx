import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Activity, Key, DollarSign, Zap, Plus, Copy, Check } from 'lucide-react';

export default function Dashboard({ session }: { session: any }) {
  const [stats, setStats] = useState({
    requestsToday: 0,
    requestsMonth: 0,
    tokensSaved: 0,
    costSaved: 0
  });
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  useEffect(() => {
    if (session?.user) {
      fetchDashboardData();
    }
  }, [session]);

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch API Keys
      const { data: keys } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      setApiKeys(keys || []);

      // 2. Fetch Requests Stats (Mocked or calculated based on RLS access to requests table)
      // In a real app, you would sum this up on the server using an RPC function.
      // For Phase 5 UI demonstration, we will pull the requests if they exist.
      if (keys && keys.length > 0) {
        const keyIds = keys.map(k => k.id);
        const { data: reqs } = await supabase
          .from('requests')
          .select('id, tokens_saved, cost_saved, created_at')
          .in('api_key_id', keyIds);
          
        if (reqs) {
          const now = new Date();
          const todayReqs = reqs.filter(r => new Date(r.created_at).getDate() === now.getDate());
          
          setStats({
            requestsToday: todayReqs.length,
            requestsMonth: reqs.length,
            tokensSaved: reqs.reduce((sum, r) => sum + (r.tokens_saved || 0), 0),
            costSaved: reqs.reduce((sum, r) => sum + (r.cost_saved || 0), 0)
          });
        }
      }
    } catch (err) {
      console.error('Error fetching data', err);
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = async () => {
    try {
      const newKey = `vs_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
      await supabase.from('api_keys').insert([
        {
          user_id: session.user.id,
          key_value: newKey,
          name: 'Production Key ' + (apiKeys.length + 1)
        }
      ]);
      fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (loading) {
    return <div className="loading-screen"><div className="loading-spinner"></div></div>;
  }

  return (
    <div className="dashboard-container">
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome back, {session.user.email}</p>
      </header>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper blue">
            <Activity size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Requests Today</span>
            <span className="stat-value">{stats.requestsToday}</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon-wrapper purple">
            <Zap size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Requests This Month</span>
            <span className="stat-value">{stats.requestsMonth}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper green">
            <Key size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Tokens Saved (AI Cleaning)</span>
            <span className="stat-value">{stats.tokensSaved.toLocaleString()}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper yellow">
            <DollarSign size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Estimated Money Saved</span>
            <span className="stat-value">${stats.costSaved.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* API Keys Section */}
      <div className="api-keys-section">
        <div className="section-header">
          <div>
            <h2>API Keys</h2>
            <p>Your secret keys to authenticate with the VisionStream REST API.</p>
          </div>
          <button className="btn-primary icon-btn" onClick={generateApiKey}>
            <Plus size={16} />
            Generate New Key
          </button>
        </div>

        <div className="keys-list">
          {apiKeys.length === 0 ? (
            <div className="empty-state">No API keys generated yet.</div>
          ) : (
            <table className="keys-table">
              <thead>
                <tr>
                  <th>NAME</th>
                  <th>KEY</th>
                  <th>CREATED</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((k) => (
                  <tr key={k.id}>
                    <td>{k.name}</td>
                    <td>
                      <div className="key-display">
                        <code>{k.key_value.substring(0, 12)}••••••••••••</code>
                        <button 
                          className="copy-btn" 
                          onClick={() => copyToClipboard(k.key_value)}
                          title="Copy to clipboard"
                        >
                          {copiedKey === k.key_value ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </td>
                    <td>{new Date(k.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-badge ${k.is_active ? 'active' : 'revoked'}`}>
                        {k.is_active ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
