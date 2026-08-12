import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { LogoMark } from '../components/Logo';
import { Activity, Zap, Coins, KeyRound, Plus, Copy, Check, ArrowRight, Terminal, ShieldCheck } from 'lucide-react';

// SHA-256 → lowercase hex, matching Node's crypto.createHash('sha256') on the server.
async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Mirrors src/lib/plans.ts on the server.
const PLAN_LIMITS: Record<string, number> = { free: 100, pro: 10_000, team: 50_000 };

export default function Dashboard({ session }: { session: any }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ requestsToday: 0, requestsMonth: 0, tokensSaved: 0, costSaved: 0 });
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState('');
  const [justCreated, setJustCreated] = useState<string | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => { if (session?.user) fetchData(); else setLoading(false); }, [session]);

  const rlsHint = (msg: string) => {
    const m = (msg || '').toLowerCase();
    // Order matters: check the specific schema errors before the generic RLS one,
    // since a not-null violation also contains the word "violates".
    if (m.includes('key_hash') || m.includes('key_prefix') || m.includes('does not exist')) {
      return 'Your database is missing the hashed-key columns. Run supabase_migration_keys.sql in the Supabase SQL editor first.';
    }
    if (m.includes('not-null') || m.includes('null value') || (m.includes('key_value') && m.includes('violat'))) {
      return 'The old key_value column is still required. Re-run supabase_migration_keys.sql — it now drops that NOT NULL constraint.';
    }
    if (/row-level security|rls|policy|permission/.test(m)) {
      return 'The database is blocking this. Run supabase_policies.sql in your Supabase SQL editor to allow signed-in users to manage their own keys.';
    }
    return msg;
  };

  const fetchData = async () => {
    if (!supabase) { setLoading(false); return; }
    try {
      const { data: keys, error: keysErr } = await supabase
        .from('api_keys')
        .select('id, name, key_prefix, is_active, plan, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (keysErr) { setErr(rlsHint(keysErr.message)); setLoading(false); return; }
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
    } catch (e: any) { setErr(rlsHint(e?.message || 'Failed to load dashboard')); } finally { setLoading(false); }
  };

  const generateKey = async () => {
    if (!supabase) return;
    setCreating(true);
    setErr('');
    try {
      const raw = `vs_live_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
      const key_hash = await sha256Hex(raw);
      const key_prefix = raw.slice(0, 12);
      const currentPlan = apiKeys.find((k) => k.is_active)?.plan || 'free';
      const { error } = await supabase.from('api_keys').insert([{ user_id: session.user.id, key_hash, key_prefix, name: `Key ${apiKeys.length + 1}`, plan: currentPlan }]);
      if (error) { setErr(rlsHint(error.message)); return; }
      setJustCreated(raw); // show once — we never store the raw key
      await fetchData();
    } catch (e: any) {
      setErr(rlsHint(e?.message || 'Could not create key'));
    } finally { setCreating(false); }
  };

  const [upgrading, setUpgrading] = useState('');
  const apiBase = (typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) ? 'http://localhost:8787' : '';

  const upgrade = async (target: 'pro' | 'team') => {
    if (!supabase) return;
    setUpgrading(target);
    setErr('');
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch(`${apiBase}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: target }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Checkout failed');
      if (body.demo) {
        await fetchData(); // plan applied immediately (demo)
      } else if (body.url) {
        window.location.href = body.url; // real provider → hosted checkout
      }
    } catch (e: any) {
      setErr(e?.message || 'Upgrade failed. Is the API server running on :8787?');
    } finally {
      setUpgrading('');
    }
  };

  const revokeKey = async (id: string) => {
    if (!supabase) return;
    setErr('');
    const { error } = await supabase.from('api_keys').update({ is_active: false }).eq('id', id);
    if (error) { setErr(rlsHint(error.message)); return; }
    await fetchData();
  };

  const copy = (text: string, key: string) => { navigator.clipboard?.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 1500); };

  const hasKey = apiKeys.length > 0;
  const plan = (apiKeys.find((k) => k.is_active)?.plan || 'free') as string;
  const planLimit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
  const usedPct = Math.min(100, Math.round((stats.requestsMonth / planLimit) * 100));
  const mask = (prefix?: string) => `${prefix || 'vs_live_'}${'•'.repeat(16)}`;
  const curlKey = justCreated || 'vs_live_YOUR_KEY';
  const curl = `curl -X POST https://api.visionstream.dev/observe \\
  -H "Authorization: Bearer ${curlKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://news.ycombinator.com"}'`;

  if (loading) return <div className="loading-screen"><div className="loading-spinner" /></div>;

  return (
    <div className="db">
      <div className="db-head">
        <div className="db-head-title"><LogoMark size={22} /> <h1>Dashboard</h1></div>
        <p className="db-head-sub">Signed in as {session?.user?.email}</p>
      </div>

      {err && <div className="db-error">{err}</div>}

      {/* Show-once key banner */}
      {justCreated && (
        <div className="db-newkey">
          <div className="db-newkey-head"><ShieldCheck size={16} /> Copy your key now — it won't be shown again</div>
          <div className="db-newkey-row">
            <code>{justCreated}</code>
            <button className="db-btn primary" onClick={() => copy(justCreated, 'new')}>{copied === 'new' ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}</button>
          </div>
          <div className="db-muted" style={{ fontSize: 12, marginTop: 8 }}>We store only a hash of this key. Lose it and you'll need to generate a new one.</div>
        </div>
      )}

      {/* Onboarding / first request */}
      <div className="db-onboard">
        <div className="db-onboard-title">{hasKey ? 'Make your first request' : 'Get started in three steps'}</div>

        <div className="db-steps">
          <div className={`db-step ${hasKey ? 'done' : 'current'}`}>
            <span className="db-step-n">{hasKey ? <Check size={14} /> : '1'}</span>
            <div>
              <div className="db-step-title">Create an API key</div>
              {!hasKey && <button className="db-btn primary" onClick={generateKey} disabled={creating}>{creating ? 'Generating…' : <><Plus size={15} /> Generate key</>}</button>}
              {hasKey && (
                <div className="db-muted" style={{ fontSize: 13 }}>
                  You have {apiKeys.length} key{apiKeys.length > 1 ? 's' : ''}. Keys are shown in full only once at creation.
                </div>
              )}
            </div>
          </div>

          <div className={`db-step ${hasKey ? 'current' : ''}`}>
            <span className="db-step-n">2</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="db-step-title">
                Call the API {justCreated ? <span className="db-muted">— key filled in below</span> : <span className="db-muted">— paste your key where it says YOUR_KEY</span>}
              </div>
              <div className="db-code">
                <div className="db-code-bar"><span><Terminal size={13} /> shell</span><button onClick={() => copy(curl, 'curl')}>{copied === 'curl' ? <Check size={13} /> : <Copy size={13} />} {copied === 'curl' ? 'Copied' : 'Copy'}</button></div>
                <pre>{curl}</pre>
              </div>
            </div>
          </div>

          <div className="db-step">
            <span className="db-step-n">3</span>
            <div>
              <div className="db-step-title">Get structured JSON back</div>
              <div className="db-muted" style={{ fontSize: 13 }}>A screenshot URL plus the page's links, forms, tables and elements. <a onClick={() => navigate('/docs')}>See the response shape →</a></div>
            </div>
          </div>
        </div>
      </div>

      {/* Plan + quota */}
      <div className="db-section-label">Plan &amp; quota</div>
      <div className="db-plan">
        <div className="db-plan-row">
          <span className={`db-plan-badge ${plan}`}>{plan.toUpperCase()}</span>
          <span className="db-plan-usage">{stats.requestsMonth.toLocaleString()} / {planLimit.toLocaleString()} captures this month</span>
        </div>
        <div className="db-quota-track"><div className="db-quota-bar" style={{ width: `${usedPct}%`, background: usedPct >= 100 ? 'var(--c-red)' : usedPct >= 80 ? 'var(--c-amber)' : 'var(--accent-color)' }} /></div>
        {hasKey && plan !== 'team' && (
          <div className="db-plan-actions">
            {plan === 'free' && <button className="db-btn primary" onClick={() => upgrade('pro')} disabled={!!upgrading}>{upgrading === 'pro' ? 'Upgrading…' : 'Upgrade to Pro — $29/mo'}</button>}
            <button className="db-btn ghost" onClick={() => upgrade('team')} disabled={!!upgrading}>{upgrading === 'team' ? 'Upgrading…' : 'Upgrade to Team — $99/mo'}</button>
            <span className="db-muted" style={{ fontSize: 12 }}>Demo billing — no real charge.</span>
          </div>
        )}
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
                <code className="db-key-val">{mask(k.key_prefix)}</code>
                <span className={`db-plan-badge ${k.plan || 'free'} sm`}>{(k.plan || 'free').toUpperCase()}</span>
              </div>
              <div className="db-key-meta">
                <span className={`db-status ${k.is_active ? 'active' : 'revoked'}`}>{k.is_active ? 'Active' : 'Revoked'}</span>
                <span className="db-muted">{new Date(k.created_at).toLocaleDateString()}</span>
                {k.is_active && <button className="db-revoke" onClick={() => revokeKey(k.id)}>Revoke</button>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
