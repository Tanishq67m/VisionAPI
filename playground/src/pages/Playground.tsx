import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Check, Copy, Download, ArrowRight, Loader2, Camera, Braces,
  Link2, Table2, Sparkles, Gauge, RefreshCw, MousePointerClick, AlertTriangle,
} from 'lucide-react';

type Box = { x: number; y: number; width: number; height: number };
type IElem = { id: string; tagName: string; text?: string; href?: string; role?: string; bbox: Box };
type Observation = {
  pageTitle: string;
  headings: { level: number; text: string }[];
  buttons: { id: string; text: string; bbox?: Box }[];
  links: { text: string; href: string }[];
  forms: { id: string; method: string; fields: { type: string; name?: string; placeholder?: string; label?: string }[] }[];
  inputs: { type: string; name?: string; placeholder?: string }[];
  tables: { id: string; headers: string[]; rowCount: number }[];
  images: { alt?: string; src: string }[];
  interactiveElements: IElem[];
  counts: Record<string, number>;
};
type CaptureResult = {
  image: string;
  metadata: { width: number; height: number; sizeBytes: number; tokens: number; timeMs: number; title: string; resolvedUrl: string };
  observation?: Observation | null;
};

const SAMPLE_URLS = ['https://news.ycombinator.com', 'https://github.com', 'https://stripe.com', 'https://en.wikipedia.org/wiki/Web_scraping'];
const LOADING_STAGES = ['Loading website…', 'Running headless browser…', 'Extracting the DOM…', 'Optimizing for AI…', 'Generating screenshot…'];
type Tab = 'extraction' | 'api' | 'code';
type Highlight = 'all' | 'a' | 'button' | 'input';

export default function Playground() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('https://news.ycombinator.com');
  const [fullPage, setFullPage] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [waitForSelector, setWaitForSelector] = useState('');
  const [viewportWidth, setViewportWidth] = useState('1280');
  const [timeout, setTimeoutVal] = useState('30000');

  const [tab, setTab] = useState<Tab>('extraction');
  const [hl, setHl] = useState<Highlight>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState('');
  const [rawResult, setRawResult] = useState<CaptureResult | null>(null);
  const [cleanResult, setCleanResult] = useState<CaptureResult | null>(null);
  const [copied, setCopied] = useState('');
  const stageTimer = useRef<any>(null);

  useEffect(() => () => clearInterval(stageTimer.current), []);

  const run = async () => {
    setIsLoading(true); setError(''); setStage(0); setTab('extraction'); setHl('all');
    stageTimer.current = setInterval(() => setStage((s) => Math.min(s + 1, LOADING_STAGES.length - 1)), 850);
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
    setCopied(key); setTimeout(() => setCopied(''), 1500);
  };

  const obs = cleanResult?.observation || null;
  const host = cleanResult ? cleanResult.metadata.resolvedUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] : '';
  const savingsPct = rawResult && cleanResult ? Math.max(0, Math.round((1 - cleanResult.metadata.sizeBytes / rawResult.metadata.sizeBytes) * 100)) : 0;
  const tokensSaved = rawResult && cleanResult ? Math.max(0, rawResult.metadata.tokens - cleanResult.metadata.tokens) : 0;
  const tableRows = obs ? obs.tables.reduce((s, t) => s + t.rowCount, 0) : 0;
  const captureSecs = cleanResult ? (cleanResult.metadata.timeMs / 1000).toFixed(1) : '0';

  // Interactive overlay uses the RAW screenshot (matches the pre-clean DOM the boxes came from).
  const shot = rawResult || cleanResult;
  const shotW = shot?.metadata.width || 1;
  const shotH = shot?.metadata.height || 1;
  const matchCat = (el: IElem): Highlight | null => {
    if (el.tagName === 'a') return 'a';
    if (el.tagName === 'button' || el.role === 'button') return 'button';
    if (['input', 'select', 'textarea'].includes(el.tagName)) return 'input';
    return null;
  };
  const overlayBoxes = (obs?.interactiveElements || []).filter((el) => el.bbox && (hl === 'all' || matchCat(el) === hl));

  const errReason = /timeout/i.test(error) ? 'The page took too long to load.'
    : /navigation|net::|ENOTFOUND|resolve/i.test(error) ? 'The URL couldn’t be reached.'
    : /invalid url/i.test(error) ? 'That doesn’t look like a valid URL.'
    : 'Something went wrong while capturing the page.';
  const errFix = /timeout/i.test(error) ? 'Try increasing the timeout in Options, or pick a lighter page.'
    : /navigation|net::|ENOTFOUND|resolve/i.test(error) ? 'Check the address includes https:// and is publicly reachable.'
    : /invalid url/i.test(error) ? 'Make sure it starts with http:// or https://.'
    : 'Try again, or test with one of the sample sites.';

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
    if (!shot) return;
    const a = document.createElement('a');
    a.href = shot.image; a.download = `${host || 'capture'}.jpeg`; a.click();
  };

  const overlayLegend: [Highlight, string, string][] = [
    ['all', 'All', 'var(--text-secondary)'],
    ['a', 'Links', 'var(--c-blue)'],
    ['button', 'Buttons', 'var(--text-accent)'],
    ['input', 'Inputs', 'var(--c-green)'],
  ];

  return (
    <div className="pg">
      <nav className="pg-nav">
        <div className="pg-brand"><span className="pg-brand-mark" />VisionStream</div>
        <div className="pg-nav-links">
          <a className="pg-nav-link active">Observe</a>
          <a className="pg-nav-link" onClick={() => navigate('/')}>Docs</a>
          <a className="pg-nav-link" onClick={() => navigate('/')}>Pricing</a>
          <a className="pg-nav-link" href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
          <button className="pg-nav-cta" onClick={() => navigate('/login')}>Get API key</button>
        </div>
      </nav>

      <div className="pg-body">
        <header className="pg-hero">
          <div className="pg-hero-badge"><Sparkles size={13} /> Observe API · no signup required</div>
          <h1 className="pg-hero-title">Observe any website</h1>
          <p className="pg-hero-sub">One API call returns a clean screenshot <em>and</em> structured JSON — links, forms, tables, buttons, bounding boxes — with 30–60% fewer vision tokens.</p>

          <div className="pg-omni">
            <Search size={18} className="pg-omni-icon" />
            <input className="pg-omni-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" onKeyDown={(e) => e.key === 'Enter' && !isLoading && run()} />
            <button className="pg-omni-btn" onClick={run} disabled={isLoading || !url}>
              {isLoading ? <><Loader2 size={16} className="pg-spin" /> Observing</> : <>Run Observe <ArrowRight size={16} /></>}
            </button>
          </div>

          <div className="pg-samples">
            <span className="pg-samples-label">Try</span>
            {SAMPLE_URLS.map((s) => <button key={s} className="pg-sample" onClick={() => setUrl(s)}>{s.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</button>)}
            <button className="pg-options-toggle" onClick={() => setShowOptions((v) => !v)}>{showOptions ? 'Hide options' : 'Options'}</button>
          </div>

          {showOptions && (
            <div className="pg-options">
              <label className="pg-opt"><input type="checkbox" checked={fullPage} onChange={(e) => setFullPage(e.target.checked)} /> Full page</label>
              <label className="pg-opt">Viewport
                <select value={viewportWidth} onChange={(e) => setViewportWidth(e.target.value)}><option value="1280">1280px</option><option value="1920">1920px</option><option value="375">375px</option></select>
              </label>
              <label className="pg-opt">Timeout
                <select value={timeout} onChange={(e) => setTimeoutVal(e.target.value)}><option value="30000">30s</option><option value="60000">60s</option></select>
              </label>
              <label className="pg-opt pg-opt-wide">Wait for selector
                <input type="text" value={waitForSelector} onChange={(e) => setWaitForSelector(e.target.value)} placeholder="article h1" />
              </label>
            </div>
          )}
        </header>

        {isLoading && (
          <div className="pg-loading">
            <Loader2 size={22} className="pg-spin" />
            <div className="pg-loading-stage">{LOADING_STAGES[stage]}</div>
            <div className="pg-loading-track"><div className="pg-loading-bar" style={{ width: `${((stage + 1) / LOADING_STAGES.length) * 100}%` }} /></div>
          </div>
        )}

        {error && !isLoading && (
          <div className="pg-error">
            <div className="pg-error-icon"><AlertTriangle size={18} /></div>
            <div className="pg-error-body">
              <div className="pg-error-title">Couldn’t observe that page</div>
              <div className="pg-error-reason">{errReason}</div>
              <div className="pg-error-fix">{errFix}</div>
            </div>
            <button className="pg-omni-btn pg-error-retry" onClick={run}><RefreshCw size={15} /> Retry</button>
          </div>
        )}

        {cleanResult && !isLoading && (
          <section className="pg-results">
            <div className="pg-result-head">
              <div className="pg-result-title">
                <span className="pg-check"><Check size={15} /></span>
                Capture complete<span className="pg-result-host">{host}</span>
              </div>
              <div className="pg-cta-group">
                <button className="pg-ghost-btn" onClick={() => copy(JSON.stringify(obs, null, 2), 'json-top')}>{copied === 'json-top' ? <Check size={14} /> : <Copy size={14} />} Copy JSON</button>
                <button className="pg-ghost-btn" onClick={download}><Download size={14} /> Screenshot</button>
                <button className="pg-ghost-btn" onClick={() => { setCleanResult(null); setRawResult(null); }}><RefreshCw size={14} /> New capture</button>
              </div>
            </div>

            <div className="pg-badges">
              <span className="pg-badge"><Gauge size={12} /> {captureSecs}s capture</span>
              <span className="pg-badge"><Camera size={12} /> Vision screenshot generated</span>
              <span className="pg-badge"><Braces size={12} /> Structured response generated</span>
              {savingsPct > 0 && <span className="pg-badge green">AI token savings −{savingsPct}%</span>}
              <span className="pg-badge">MCP compatible</span>
              <span className="pg-badge">Playwright</span>
            </div>

            {/* Screenshot IS the product — show it first, interactive. */}
            {shot && (
              <div className="pg-stage">
                <div className="pg-stage-toolbar">
                  <div className="pg-stage-legend">
                    <span className="pg-stage-hint"><MousePointerClick size={13} /> Hover to highlight detected elements</span>
                    {overlayLegend.map(([k, label, color]) => (
                      <button key={k} className={`pg-legend-chip ${hl === k ? 'active' : ''}`} onMouseEnter={() => setHl(k)} onClick={() => setHl(k)} style={{ ['--chip' as any]: color }}>
                        <span className="pg-legend-dot" style={{ background: color }} />{label}
                      </button>
                    ))}
                  </div>
                  <span className="pg-stage-dims">{shot.metadata.width}×{shot.metadata.height}</span>
                </div>
                <div className="pg-shot-frame">
                  <img src={shot.image} alt="Capture" />
                  <div className="pg-shot-overlay">
                    {overlayBoxes.map((el) => {
                      const cat = matchCat(el);
                      return <span key={el.id} className={`pg-box cat-${cat || 'other'}`} style={{ left: `${(el.bbox.x / shotW) * 100}%`, top: `${(el.bbox.y / shotH) * 100}%`, width: `${(el.bbox.width / shotW) * 100}%`, height: `${(el.bbox.height / shotH) * 100}%` }} />;
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Outcome metrics */}
            <div className="pg-metrics">
              <div className="pg-metric"><div className="pg-metric-num" style={{ color: 'var(--c-blue)' }}>{(obs?.counts.links ?? 0).toLocaleString()}</div><div className="pg-metric-label">Links detected</div><div className="pg-metric-desc">Navigable URLs on the page</div></div>
              <div className="pg-metric"><div className="pg-metric-num" style={{ color: 'var(--text-accent)' }}>{(obs?.counts.interactiveElements ?? 0).toLocaleString()}</div><div className="pg-metric-label">Interactive elements</div><div className="pg-metric-desc">Click + input targets for agents</div></div>
              <div className="pg-metric"><div className="pg-metric-num" style={{ color: 'var(--c-green)' }}>{tableRows.toLocaleString()}</div><div className="pg-metric-label">Table rows extracted</div><div className="pg-metric-desc">Across {obs?.counts.tables ?? 0} tables</div></div>
              <div className="pg-metric"><div className="pg-metric-num" style={{ color: savingsPct > 0 ? 'var(--c-green)' : 'var(--text-secondary)' }}>{savingsPct}%</div><div className="pg-metric-label">AI token savings</div><div className="pg-metric-desc">≈ {tokensSaved.toLocaleString()} tokens / capture</div></div>
            </div>

            <div className="pg-tabbar">
              {([['extraction', 'Extraction'], ['api', 'API response'], ['code', 'Code examples']] as [Tab, string][]).map(([k, label]) => (
                <button key={k} className={`pg-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{label}</button>
              ))}
            </div>

            <div className="pg-tabpanel">
              {tab === 'extraction' && obs && (
                <div className="pg-extraction">
                  {obs.links.length > 0 && (
                    <div className="pg-ex-block">
                      <div className="pg-ex-head"><Link2 size={15} /> Links <span>{obs.counts.links}</span></div>
                      <div className="pg-ex-list">{obs.links.slice(0, 8).map((l, i) => <div className="pg-ex-row" key={i}><span className="pg-ex-text">{l.text}</span><span className="pg-ex-meta">{l.href.replace(/^https?:\/\/(www\.)?/, '').slice(0, 42)}</span></div>)}</div>
                    </div>
                  )}
                  {obs.tables.length > 0 && (
                    <div className="pg-ex-block">
                      <div className="pg-ex-head"><Table2 size={15} /> Tables <span>{obs.counts.tables}</span></div>
                      <div className="pg-ex-list">{obs.tables.map((t) => <div className="pg-ex-row" key={t.id}><span className="pg-ex-text">{t.headers.slice(0, 4).join(' · ') || 'Untitled table'}</span><span className="pg-ex-meta">{t.rowCount} rows</span></div>)}</div>
                    </div>
                  )}
                  {obs.buttons.length > 0 && (
                    <div className="pg-ex-block">
                      <div className="pg-ex-head">Buttons <span>{obs.counts.buttons}</span></div>
                      <div className="pg-chips">{obs.buttons.slice(0, 20).map((b) => <span className="pg-chip" key={b.id}>{b.text}</span>)}</div>
                    </div>
                  )}
                  {obs.forms.length > 0 && (
                    <div className="pg-ex-block">
                      <div className="pg-ex-head">Forms <span>{obs.counts.forms}</span></div>
                      {obs.forms.map((f) => <div className="pg-ex-row" key={f.id}><span className="pg-method">{f.method.toUpperCase()}</span><span className="pg-chips">{f.fields.map((fl, i) => <span className="pg-chip small" key={i}>{fl.label || fl.placeholder || fl.name || fl.type}</span>)}</span></div>)}
                    </div>
                  )}
                </div>
              )}

              {tab === 'api' && (
                <div className="pg-code-wrap">
                  <div className="pg-code-bar"><span>POST /observe · response</span><button className="pg-ghost-btn" onClick={() => copy(JSON.stringify(obs, null, 2), 'json')}>{copied === 'json' ? <Check size={14} /> : <Copy size={14} />} Copy</button></div>
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
            <div className="pg-placeholder-steps">
              <span><span className="pg-step-n">1</span> Paste any URL</span>
              <ArrowRight size={15} />
              <span><span className="pg-step-n">2</span> Run Observe</span>
              <ArrowRight size={15} />
              <span><span className="pg-step-n">3</span> Get screenshot + structured JSON</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
