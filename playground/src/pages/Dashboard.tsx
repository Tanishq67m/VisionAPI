import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { LogoMark } from '../components/Logo';
import { Activity, Zap, Coins, KeyRound, Plus, Copy, Check, Eye, EyeOff, ArrowRight, Terminal } from 'lucide-react';

export default function Dashboard({ session }: { session: any }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ requestsToday: 0, requestsMonth: 0, tokensSaved: 0, costSaved: 0 });
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState('');
  const [revealed, setRevealed] = useState(false);

  useEffect(() => { if (session?.user) fetchData(); else setLoading(false); }, [session]);

  const fetchData = async () => {
    if (!supabase) { setLoading(false); return; }
    try {
      const { data: keys } = await supabase.from('api_keys').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
      setApiKeys(keys || []);
      if (keys && keys.length > 0) {
        const { data: reqs } = await supabase.from('requests').select('id, tokens_saved, cost_saved, created_at').in('api_key_id', keys.map((k) => k.id));
        if (reqs) {
          const now = new Date();
          const today = reqs.filter((r) => new Date(r.created_at).toDateString() === now.toDateString());
          setStats({
            requestsToday: today.length,
            requestsMonth: reqs.length,
            tokensSaved: reqs.reduce((s, r) => s + (r.tokens_saved || 0), 0),
            costSaved: reqs.reduce((s, r) => s + (r.cost_saved || 0), 0),
          });
        }
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const generateKey = async () => {
    if (!supabase) return;
    setCreating(true);
    try {
      const newKey = `vs_live_${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 12)}`;
      await supabase.from('api_keys').insert([{ user_id: session.user.id, key_value: newKey, name: `Key ${apiKeys.length + 1}` }]);
      await fetchData();
    } catch (e) { console.error(e); } finally { setCreating(false); }
  };

  const copy = (text: string, key: string) => { navigator.clipboard?.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 1500); };

  const primaryKey = apiKeys.find((k) => k.is_active)?.key_value as string | undefined;
  const mask = (k: string) => `${k.slice(0, 11)}${'•'.repeat(14)}`;
  const curl = `curl -X POST https://api.visionstream.dev/observe \\
  -H "Authorization: Bearer ${primaryKey || 'vs_live_YOUR_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://news.ycombinator.com"}'`;

  if (loading) return <div className="loading-screen"><div className="loading-spinner" /></div>;

  const hasKey = apiKeys.length > 0;

  return (
    <div className="db">
      <div className="db-head">
        <div className="db-head-title"><LogoMark size={22} /> <h1>Dashboard</h1></div>
        <p className="db-head-sub">Signed in as {session?.user?.email}</p>
      </div>

      {/* Onboarding / first request */}
      <div className="db-onboard">
        <div className="db-onboard-title">
          {hasKey ? 'Make your first request' : 'Get started in three steps'}
        </div>

        <div className="db-steps">
          <div className={`db-step ${hasKey ? 'done' : 'current'}`}>
            <span className="db-step-n">{hasKey ? <Check size={14} /> : '1'}</span>
            <div>
              <div className="db-step-title">Create an API key</div>
              {!hasKey && <button className="db-btn primary" onClick={generateKey} disabled={creating}>{creating ? 'Generating…' : <><Plus size={15} /> Generate key</>}</button>}
              {hasKey && primaryKey && (
                <div className="db-key-inline">
                  <code>{revealed ? primaryKey : mask(primaryKey)}</code>
                  <button className="db-icon-btn" onClick={() => setRevealed((v) => !v)} title={revealed ? 'Hide' : 'Reveal'}>{revealed ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                  <button className="db-icon-btn" onClick={() => copy(primaryKey, 'key')} title="Copy">{copied === 'key' ? <Check size={14} /> : <Copy size={14} />}</button>
                </div>
              )}
            </div>
          </div>

          <div className={`db-step ${hasKey ? 'current' : ''}`}>
            <span className="db-step-n">2</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="db-step-title">Call the API <span className="db-muted">— key already filled in below</span></div>
              <div className="db-code">
                <div className="db-code-bar"><span><Terminal size={13} /> shell</span><button onClick={() => copy(curl, 'curl')} disabled={!hasKey}>{copied === 'curl' ? <Check size={13} /> : <Copy size={13} />} {copied === 'curl' ? 'Copied' : 'Copy'}</button></div>
                <pre>{curl}</pre>
              </div>
            </div>
          </div>

          <div className="db-step">
            <span className="db-step-n">3</span>
            <div>
              <div className="db-step-title">Get structured JSON back</div>
              <div className="db-muted" style={{ fontSize: 13 }}>You'll receive a screenshot URL plus the page's links, forms, tables and elements. <a onClick={() => navigate('/docs')}>See the response shape →</a></div>
            </div>
          </div>
        </div>
      </div>

      {/* Usage */}
      <div className="db-section-label">Usage</div>
      <div className="db-stats">
        <div className="db-stat"><div className="db-stat-icon blue"><Activity size={17} /></div><div><div className="db-stat-num">{stats.requestsToday}</div><div className="db-stat-label">Requests today</div></div></div>
        <div className="db-stat"><div className="db-stat-icon indigo"><Zap size={17} /></div><div><div className="db-stat-num">{stats.requestsMonth}</div><div className="db-stat-label">Requests this month</div></div></div>
        <div className="db-stat"><div className="db-stat-icon green"><Coins size={17} /></div><div><div className="db-stat-num">{stats.tokensSaved.toLocaleString()}</div><div className="db-stat-label">Vision tokens saved</div></div></div>
        <div className="db-stat"><div className="db-stat-icon green"><Coins size={17} /></div><div><div className="db-stat-num">${stats.costSaved.toFixed(2)}</div><div className="db-stat-label">Estimated cost saved</div></div></div>
      </div>

      {/* Keys */}
      <div className="db-section-row">
        <div className="db-section-label" style={{ margin: 0 }}>API keys</div>
        <button className="db-btn ghost" onClick={generateKey} disabled={creating}><Plus size={14} /> New key</button>
      </div>
      <div className="db-keys">
        {!hasKey ? (
          <div className="db-empty"><KeyRound size={20} /> No keys yet — generate one above to start.</div>
        ) : (
          apiKeys.map((k) => (
            <div className="db-key-row" key={k.id}>
              <div className="db-key-main">
                <span className="db-key-name">{k.name}</span>
                <code className="db-key-val">{mask(k.key_value)}</code>
              </div>
              <div className="db-key-meta">
                <span className={`db-status ${k.is_active ? 'active' : 'revoked'}`}>{k.is_active ? 'Active' : 'Revoked'}</span>
                <span className="db-muted">{new Date(k.created_at).toLocaleDateString()}</span>
                <button className="db-icon-btn" onClick={() => copy(k.key_value, k.id)}>{copied === k.id ? <Check size={14} /> : <Copy size={14} />}</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
