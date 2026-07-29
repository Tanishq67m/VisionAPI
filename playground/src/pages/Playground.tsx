import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Check, Copy, Download, ArrowRight, Loader2, Camera, Braces,
  Boxes, Link2, Table2, Sparkles, Gauge, RefreshCw,
} from 'lucide-react';

type Observation = {
  pageTitle: string;
  headings: { level: number; text: string }[];
  buttons: { id: string; text: string }[];
  links: { text: string; href: string }[];
  forms: { id: string; method: string; fields: { type: string; name?: string; placeholder?: string; label?: string }[] }[];
  inputs: { type: string; name?: string; placeholder?: string }[];
  tables: { id: string; headers: string[]; rowCount: number }[];
  images: { alt?: string; src: string }[];
  interactiveElements: { id: string; tagName: string; text?: string }[];
  counts: Record<string, number>;
};

type CaptureResult = {
  image: string;
  metadata: { width: number; height: number; sizeBytes: number; tokens: number; timeMs: number; title: string; resolvedUrl: string };
  observation?: Observation | null;
};

const SAMPLE_URLS = ['https://news.ycombinator.com', 'https://github.com', 'https://stripe.com', 'https://en.wikipedia.org/wiki/Web_scraping'];
const LOADING_STAGES = ['Loading page…', 'Running headless browser…', 'Extracting the DOM…', 'Understanding structure…', 'Generating screenshot…'];
type Tab = 'overview' | 'extraction' | 'screenshot' | 'api' | 'code';

export default function Playground() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('https://news.ycombinator.com');
  const [fullPage, setFullPage] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [waitForSelector, setWaitForSelector] = useState('');
  const [viewportWidth, setViewportWidth] = useState('1280');
  const [timeout, setTimeoutVal] = useState('30000');

  const [tab, setTab] = useState<Tab>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState('');
  const [rawResult, setRawResult] = useState<CaptureResult | null>(null);
  const [cleanResult, setCleanResult] = useState<CaptureResult | null>(null);
  const [copied, setCopied] = useState('');
  const stageTimer = useRef<any>(null);

  useEffect(() => () => clearInterval(stageTimer.current), []);

  const run = async () => {
    setIsLoading(true);
    setError('');
    setStage(0);
    setTab('overview');
    stageTimer.current = setInterval(() => setStage((s) => Math.min(s + 1, LOADING_STAGES.length - 1)), 900);
    try {
      const fetchCapture = async (skip: boolean, observe: boolean) => {
        const isLocal = typeof window !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
        const apiUrl = isLocal ? 'http://localhost:3001/api/capture' : '/api/capture';
        const res = await fetch(apiUrl, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, fullPage, skipClean: skip, observe, waitForSelector: waitForSelector || undefined, viewportWidth: parseInt(viewportWidth), timeoutMs: parseInt(timeout) }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        return data.data as CaptureResult;
      };
      const clean = await fetchCapture(false, true);
      setCleanResult(clean);
      const raw = await fetchCapture(true, false);
      setRawResult(raw);
    } catch (err: any) {
      setError(err.message || 'Capture failed');
    } finally {
      clearInterval(stageTimer.current);
      setIsLoading(false);
    }
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
  };

  const obs = cleanResult?.observation || null;
  const host = cleanResult ? cleanResult.metadata.resolvedUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] : '';
  const savingsPct = rawResult && cleanResult ? Math.max(0, Math.round((1 - cleanResult.metadata.sizeBytes / rawResult.metadata.sizeBytes) * 100)) : 0;
  const tokensSaved = rawResult && cleanResult ? Math.max(0, rawResult.metadata.tokens - cleanResult.metadata.tokens) : 0;
  const tableRows = obs ? obs.tables.reduce((s, t) => s + t.rowCount, 0) : 0;
  const captureSecs = cleanResult ? (cleanResult.metadata.timeMs / 1000).toFixed(1) : '0';

  const curlSnippet = `curl -X POST https://api.visionstream.dev/observe \\
  -H "Authorization: Bearer vs_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "${url}", "includeScreenshot": true}'`;
  const jsSnippet = `import { VisionStream } from "visionstream";

const vision = new VisionStream(process.env.VISIONSTREAM_KEY);
const { observation } = await vision.observe({ url: "${url}" });

observation.buttons;   // structured buttons + bounding boxes
observation.forms;     // forms with fields
observation.tables;    // headers + row counts`;
  const pySnippet = `from visionstream import VisionStream

vision = VisionStream(os.environ["VISIONSTREAM_KEY"])
result = vision.observe(url="${url}")

print(result.observation.counts)`;

  const download = () => {
    if (!cleanResult) return;
    const a = document.createElement('a');
    a.href = cleanResult.image;
    a.download = `${host || 'capture'}.jpeg`;
    a.click();
  };

  return (
    <div className="pg">
      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="pg-nav">
        <div className="pg-brand">
          <span className="pg-brand-mark" />
          VisionStream
        </div>
        <div className="pg-nav-links">
          <a className="pg-nav-link active">Observe</a>
          <a className="pg-nav-link" onClick={() => navigate('/')}>Docs</a>
          <a className="pg-nav-link" onClick={() => navigate('/')}>Pricing</a>
          <a className="pg-nav-link" href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
          <button className="pg-nav-cta" onClick={() => navigate('/login')}>Get API key</button>
        </div>
      </nav>

      <div className="pg-body">
        {/* ── Hero ──────────────────────────────────────── */}
        <header className="pg-hero">
          <div className="pg-hero-badge"><Sparkles size={13} /> Observe API · no signup required</div>
          <h1 className="pg-hero-title">Observe any website</h1>
          <p className="pg-hero-sub">Turn any URL into a clean screenshot and a structured map of the page — buttons, forms, tables, links — in a single API call.</p>

          <div className="pg-omni">
            <Search size={18} className="pg-omni-icon" />
            <input
              className="pg-omni-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              onKeyDown={(e) => e.key === 'Enter' && !isLoading && run()}
            />
            <button className="pg-omni-btn" onClick={run} disabled={isLoading || !url}>
              {isLoading ? <><Loader2 size={16} className="pg-spin" /> Observing</> : <>Run Observe <ArrowRight size={16} /></>}
            </button>
          </div>

          <div className="pg-samples">
            <span className="pg-samples-label">Try</span>
            {SAMPLE_URLS.map((s) => (
              <button key={s} className="pg-sample" onClick={() => setUrl(s)}>{s.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</button>
            ))}
            <button className="pg-options-toggle" onClick={() => setShowOptions((v) => !v)}>
              {showOptions ? 'Hide options' : 'Options'}
            </button>
          </div>

          {showOptions && (
            <div className="pg-options">
              <label className="pg-opt">
                <input type="checkbox" checked={fullPage} onChange={(e) => setFullPage(e.target.checked)} />
                Full page
              </label>
              <label className="pg-opt">
                Viewport
                <select value={viewportWidth} onChange={(e) => setViewportWidth(e.target.value)}>
                  <option value="1280">1280px</option>
                  <option value="1920">1920px</option>
                  <option value="375">375px</option>
                </select>
              </label>
              <label className="pg-opt">
                Timeout
                <select value={timeout} onChange={(e) => setTimeoutVal(e.target.value)}>
                  <option value="30000">30s</option>
                  <option value="60000">60s</option>
                </select>
              </label>
              <label className="pg-opt pg-opt-wide">
                Wait for selector
                <input type="text" value={waitForSelector} onChange={(e) => setWaitForSelector(e.target.value)} placeholder="article h1" />
              </label>
            </div>
          )}
        </header>

        {/* ── Loading ───────────────────────────────────── */}
        {isLoading && (
          <div className="pg-loading">
            <Loader2 size={22} className="pg-spin" />
            <div className="pg-loading-stage">{LOADING_STAGES[stage]}</div>
            <div className="pg-loading-track">
              <div className="pg-loading-bar" style={{ width: `${((stage + 1) / LOADING_STAGES.length) * 100}%` }} />
            </div>
          </div>
        )}

        {error && !isLoading && (
          <div className="pg-error">
            <strong>Couldn’t observe that page.</strong> {error}
          </div>
        )}

        {/* ── Results ───────────────────────────────────── */}
        {cleanResult && !isLoading && (
          <section className="pg-results">
            {/* Result header + storytelling badges */}
            <div className="pg-result-head">
              <div className="pg-result-title">
                <span className="pg-check"><Check size={15} /></span>
                Capture complete
                <span className="pg-result-host">{host}</span>
              </div>
              <div className="pg-cta-group">
                <button className="pg-ghost-btn" onClick={() => copy(JSON.stringify(obs, null, 2), 'json-top')}>
                  {copied === 'json-top' ? <Check size={14} /> : <Copy size={14} />} Copy JSON
                </button>
                <button className="pg-ghost-btn" onClick={download}><Download size={14} /> Screenshot</button>
                <button className="pg-ghost-btn" onClick={() => { setCleanResult(null); setRawResult(null); }}>
                  <RefreshCw size={14} /> New capture
                </button>
              </div>
            </div>

            <div className="pg-badges">
              <span className="pg-badge"><Gauge size={12} /> {captureSecs}s</span>
              <span className="pg-badge"><Camera size={12} /> Screenshot ready</span>
              <span className="pg-badge"><Braces size={12} /> JSON ready</span>
              {savingsPct > 0 && <span className="pg-badge green">Payload −{savingsPct}%</span>}
              <span className="pg-badge">MCP compatible</span>
              <span className="pg-badge">Playwright</span>
            </div>

            {/* Hero outcome metrics — typography, color, no heavy boxes */}
            <div className="pg-metrics">
              <div className="pg-metric">
                <div className="pg-metric-num" style={{ color: 'var(--c-blue)' }}>{(obs?.counts.links ?? 0).toLocaleString()}</div>
                <div className="pg-metric-label">Links detected</div>
                <div className="pg-metric-desc">Navigable URLs across the page</div>
              </div>
              <div className="pg-metric">
                <div className="pg-metric-num" style={{ color: 'var(--text-accent)' }}>{(obs?.counts.interactiveElements ?? 0).toLocaleString()}</div>
                <div className="pg-metric-label">Interactive elements</div>
                <div className="pg-metric-desc">Clickable + input targets for agents</div>
              </div>
              <div className="pg-metric">
                <div className="pg-metric-num" style={{ color: 'var(--c-green)' }}>{tableRows.toLocaleString()}</div>
                <div className="pg-metric-label">Table rows extracted</div>
                <div className="pg-metric-desc">Across {obs?.counts.tables ?? 0} tables</div>
              </div>
              <div className="pg-metric">
                <div className="pg-metric-num" style={{ color: savingsPct > 0 ? 'var(--c-green)' : 'var(--text-secondary)' }}>{savingsPct}%</div>
                <div className="pg-metric-label">Vision payload saved</div>
                <div className="pg-metric-desc">≈ {tokensSaved.toLocaleString()} tokens / capture</div>
              </div>
            </div>

            {/* Descriptive tabs = user journey */}
            <div className="pg-tabbar">
              {([['overview', 'Overview'], ['extraction', 'Extraction'], ['screenshot', 'Screenshot'], ['api', 'API response'], ['code', 'Code']] as [Tab, string][]).map(([k, label]) => (
                <button key={k} className={`pg-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{label}</button>
              ))}
            </div>

            <div className="pg-tabpanel">
              {tab === 'overview' && obs && (
                <div className="pg-overview">
                  <div className="pg-inline-stats">
                    <span><b>{obs.counts.buttons}</b> buttons</span>
                    <span><b>{obs.counts.forms}</b> forms</span>
                    <span><b>{obs.counts.inputs}</b> inputs</span>
                    <span><b>{obs.counts.images}</b> images</span>
                    <span><b>{obs.counts.headings}</b> headings</span>
                  </div>
                  <div className="pg-checklist">
                    <div><Check size={15} /> Clean, vision-optimized screenshot generated</div>
                    <div><Check size={15} /> Structured DOM extracted and categorized</div>
                    <div><Check size={15} /> Bounding boxes ready for click-targeting</div>
                    <div><Check size={15} /> Response ready for GPT-4o, Claude &amp; Gemini</div>
                  </div>
                </div>
              )}

              {tab === 'extraction' && obs && (
                <div className="pg-extraction">
                  {obs.links.length > 0 && (
                    <div className="pg-ex-block">
                      <div className="pg-ex-head"><Link2 size={15} /> Links <span>{obs.counts.links}</span></div>
                      <div className="pg-ex-list">
                        {obs.links.slice(0, 8).map((l, i) => (
                          <div className="pg-ex-row" key={i}><span className="pg-ex-text">{l.text}</span><span className="pg-ex-meta">{l.href.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40)}</span></div>
                        ))}
                      </div>
                    </div>
                  )}
                  {obs.tables.length > 0 && (
                    <div className="pg-ex-block">
                      <div className="pg-ex-head"><Table2 size={15} /> Tables <span>{obs.counts.tables}</span></div>
                      <div className="pg-ex-list">
                        {obs.tables.map((t) => (
                          <div className="pg-ex-row" key={t.id}><span className="pg-ex-text">{t.headers.slice(0, 4).join(' · ') || 'Untitled table'}</span><span className="pg-ex-meta">{t.rowCount} rows</span></div>
                        ))}
                      </div>
                    </div>
                  )}
                  {obs.buttons.length > 0 && (
                    <div className="pg-ex-block">
                      <div className="pg-ex-head"><Boxes size={15} /> Buttons <span>{obs.counts.buttons}</span></div>
                      <div className="pg-chips">{obs.buttons.slice(0, 20).map((b) => <span className="pg-chip" key={b.id}>{b.text}</span>)}</div>
                    </div>
                  )}
                  {obs.forms.length > 0 && (
                    <div className="pg-ex-block">
                      <div className="pg-ex-head">Forms <span>{obs.counts.forms}</span></div>
                      {obs.forms.map((f) => (
                        <div className="pg-ex-row" key={f.id}>
                          <span className="pg-method">{f.method.toUpperCase()}</span>
                          <span className="pg-chips">{f.fields.map((fl, i) => <span className="pg-chip small" key={i}>{fl.label || fl.placeholder || fl.name || fl.type}</span>)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === 'screenshot' && (
                <div className="pg-shot">
                  <div className="pg-shot-bar">
                    <span>{cleanResult.metadata.width}×{cleanResult.metadata.height} · {(cleanResult.metadata.sizeBytes / 1024).toFixed(0)} KB</span>
                    <button className="pg-ghost-btn" onClick={download}><Download size={14} /> Download</button>
                  </div>
                  <div className="pg-shot-frame"><img src={cleanResult.image} alt="Clean capture" /></div>
                </div>
              )}

              {tab === 'api' && (
                <div className="pg-code-wrap">
                  <div className="pg-code-bar"><span>Observe response</span><button className="pg-ghost-btn" onClick={() => copy(JSON.stringify(obs, null, 2), 'json')}>{copied === 'json' ? <Check size={14} /> : <Copy size={14} />} Copy</button></div>
                  <pre className="pg-code">{JSON.stringify(obs, null, 2)}</pre>
                </div>
              )}

              {tab === 'code' && (
                <div className="pg-code-list">
                  {[['JavaScript', jsSnippet, 'js'], ['Python', pySnippet, 'py'], ['cURL', curlSnippet, 'curl']].map(([label, snip, key]) => (
                    <div className="pg-code-wrap" key={key}>
                      <div className="pg-code-bar"><span>{label}</span><button className="pg-ghost-btn" onClick={() => copy(snip, key)}>{copied === key ? <Check size={14} /> : <Copy size={14} />} Copy</button></div>
                      <pre className="pg-code">{snip}</pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {!cleanResult && !isLoading && !error && (
          <div className="pg-placeholder">
            <div className="pg-placeholder-icon"><Sparkles size={22} /></div>
            Enter a URL and run Observe to see the page turned into structured data.
          </div>
        )}
      </div>
    </div>
  );
}
