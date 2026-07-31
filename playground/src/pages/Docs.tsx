import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoMark } from '../components/Logo';
import { Copy, Check, Terminal, KeyRound, Eye, Camera, AlertTriangle, Gauge, Boxes, BookOpen, ArrowRight } from 'lucide-react';

/* ── Small helpers ─────────────────────────────────────────────────────────── */
function Code({ children, lang }: { children: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 1400); };
  return (
    <div className="doc-code">
      <div className="doc-code-bar"><span>{lang || 'shell'}</span><button onClick={copy}>{copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}</button></div>
      <pre>{children}</pre>
    </div>
  );
}
function Params({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="doc-table">
      <div className="doc-tr doc-th"><span>Field</span><span>Type</span><span>Description</span></div>
      {rows.map((r, i) => <div className="doc-tr" key={i}><span className="doc-mono">{r[0]}</span><span className="doc-type">{r[1]}</span><span>{r[2]}</span></div>)}
    </div>
  );
}

const NAV: { group: string; items: [string, string][] }[] = [
  { group: 'Getting started', items: [['introduction', 'Introduction'], ['quickstart', 'Quickstart'], ['authentication', 'Authentication']] },
  { group: 'API reference', items: [['observe', 'Observe API'], ['capture', 'Capture API'], ['errors', 'Errors'], ['rate-limits', 'Rate limits']] },
  { group: 'SDKs', items: [['sdk-js', 'JavaScript'], ['sdk-python', 'Python']] },
  { group: 'Help', items: [['faq', 'FAQ']] },
];

const ICON: Record<string, any> = { introduction: BookOpen, quickstart: Terminal, authentication: KeyRound, observe: Eye, capture: Camera, errors: AlertTriangle, 'rate-limits': Gauge, 'sdk-js': Boxes, 'sdk-python': Boxes, faq: BookOpen };

export default function Docs() {
  const navigate = useNavigate();
  const [active, setActive] = useState('introduction');
  const go = (id: string) => { setActive(id); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <div className="docs">
      <nav className="pg-nav">
        <div className="pg-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}><LogoMark size={22} />VisionStream</div>
        <div className="pg-nav-links">
          <a className="pg-nav-link" onClick={() => navigate('/playground')}>Playground</a>
          <a className="pg-nav-link active">Docs</a>
          <a className="pg-nav-link" onClick={() => navigate('/')}>Pricing</a>
          <button className="pg-nav-cta" onClick={() => navigate('/login')}>Get API key</button>
        </div>
      </nav>

      <div className="docs-layout">
        <aside className="docs-side">
          {NAV.map((g) => (
            <div className="docs-side-group" key={g.group}>
              <div className="docs-side-title">{g.group}</div>
              {g.items.map(([id, label]) => {
                const Icon = ICON[id];
                return <button key={id} className={`docs-side-link ${active === id ? 'active' : ''}`} onClick={() => go(id)}><Icon size={15} />{label}</button>;
              })}
            </div>
          ))}
        </aside>

        <main className="docs-content">
          {active === 'introduction' && (
            <article className="doc">
              <div className="doc-eyebrow">Getting started</div>
              <h1>Introduction</h1>
              <p className="doc-lead">VisionStream is the browser-intelligence layer for AI agents. One API call returns a clean, vision-optimized screenshot <em>and</em> a structured map of the page — links, forms, tables, buttons, and interactive elements with bounding boxes.</p>
              <p>Instead of screenshotting a whole page and paying a vision model to infer the UI from pixels, VisionStream gives your agent both the picture and the structure — with 30–60% fewer vision tokens.</p>
              <h3>Two endpoints</h3>
              <div className="doc-cards">
                <div className="doc-card"><Eye size={18} /><b>Observe</b><span>Structured understanding of a page: elements, forms, tables, bounding boxes, plus an optional screenshot.</span></div>
                <div className="doc-card"><Camera size={18} /><b>Capture</b><span>A clean, high-DPI screenshot optimized for GPT-4o, Claude, and Gemini vision models.</span></div>
              </div>
              <h3>Base URL</h3>
              <Code lang="text">https://api.visionstream.dev</Code>
              <div className="doc-next" onClick={() => go('quickstart')}>Next: Quickstart <ArrowRight size={15} /></div>
            </article>
          )}

          {active === 'quickstart' && (
            <article className="doc">
              <div className="doc-eyebrow">Getting started</div>
              <h1>Quickstart</h1>
              <p className="doc-lead">Go from zero to your first structured response in under five minutes.</p>
              <h3>1. Get an API key</h3>
              <p>Create a key from your <a onClick={() => navigate('/login')}>dashboard</a>. Keys look like <code>vs_live_…</code>. Keep them secret.</p>
              <h3>2. Make your first request</h3>
              <Code lang="shell">{`curl -X POST https://api.visionstream.dev/observe \\
  -H "Authorization: Bearer vs_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "url": "https://news.ycombinator.com" }'`}</Code>
              <h3>3. Read the response</h3>
              <Code lang="json">{`{
  "success": true,
  "data": {
    "observation": {
      "pageTitle": "Hacker News",
      "links": [ { "text": "new", "href": "https://news.ycombinator.com/newest" } ],
      "tables": [ { "headers": ["Rank", "Title"], "rowCount": 92 } ],
      "counts": { "links": 196, "interactiveElements": 227, "tables": 4 }
    },
    "metadata": { "title": "Hacker News", "resolvedUrl": "https://news.ycombinator.com/" },
    "processing_time": 2310
  }
}`}</Code>
              <p>That's it — you now have structured, AI-ready page data. Explore it live in the <a onClick={() => navigate('/playground')}>Playground</a>.</p>
              <div className="doc-next" onClick={() => go('authentication')}>Next: Authentication <ArrowRight size={15} /></div>
            </article>
          )}

          {active === 'authentication' && (
            <article className="doc">
              <div className="doc-eyebrow">Getting started</div>
              <h1>Authentication</h1>
              <p className="doc-lead">Every request is authenticated with an API key sent as a Bearer token.</p>
              <Code lang="shell">{`Authorization: Bearer vs_live_YOUR_KEY`}</Code>
              <h3>Key types</h3>
              <Params rows={[
                ['vs_live_…', 'production', 'Use in your backend. Counts against your plan quota.'],
                ['vs_test_…', 'development', 'For local testing and CI. Same behavior, isolated usage.'],
              ]} />
              <h3>Keeping keys safe</h3>
              <p>Never expose keys in client-side code or commit them to git. Store them in environment variables and rotate them from the dashboard if one leaks. A leaked key can be revoked instantly without affecting your others.</p>
              <div className="doc-callout"><AlertTriangle size={15} /> Requests without a valid key return <code>401 Unauthorized</code>.</div>
              <div className="doc-next" onClick={() => go('observe')}>Next: Observe API <ArrowRight size={15} /></div>
            </article>
          )}

          {active === 'observe' && (
            <article className="doc">
              <div className="doc-eyebrow">API reference</div>
              <h1>Observe API</h1>
              <p className="doc-lead">Return a full structured understanding of a page — the core VisionStream endpoint.</p>
              <div className="doc-endpoint"><span className="doc-verb post">POST</span> /observe</div>
              <h3>Request body</h3>
              <Params rows={[
                ['url', 'string · required', 'The page to observe. Must be http(s).'],
                ['includeScreenshot', 'boolean', 'Also return a hosted screenshot URL. Default false.'],
                ['fullPage', 'boolean', 'Capture/observe the full scrollable page. Default false.'],
                ['waitForSelector', 'string', 'Wait for this CSS selector before observing.'],
                ['viewportWidth', 'number', 'Logical viewport width in px. Default 1280.'],
                ['timeoutMs', 'number', 'Max time to wait for the page. Default 30000.'],
              ]} />
              <h3>Response</h3>
              <p>Returns <code>observation</code> with categorized arrays and a <code>counts</code> summary. Elements include bounding boxes in image pixels.</p>
              <Code lang="json">{`{
  "success": true,
  "data": {
    "observation": {
      "pageTitle": "…",
      "headings": [ { "level": 1, "text": "…" } ],
      "buttons":  [ { "id": "btn-1", "text": "Login", "bbox": { "x": 24, "y": 12, "width": 80, "height": 32 } } ],
      "links":    [ { "text": "Pricing", "href": "https://…" } ],
      "forms":    [ { "id": "form-1", "method": "post", "fields": [ { "type": "email", "name": "email" } ] } ],
      "tables":   [ { "id": "table-1", "headers": ["Rank","Title"], "rowCount": 92 } ],
      "interactiveElements": [ { "id": "el-1", "tagName": "a", "text": "…", "bbox": { } } ],
      "counts": { "links": 196, "buttons": 34, "interactiveElements": 227 }
    },
    "metadata": { "title": "…", "resolvedUrl": "https://…" },
    "processing_time": 2310
  }
}`}</Code>
              <div className="doc-next" onClick={() => go('capture')}>Next: Capture API <ArrowRight size={15} /></div>
            </article>
          )}

          {active === 'capture' && (
            <article className="doc">
              <div className="doc-eyebrow">API reference</div>
              <h1>Capture API</h1>
              <p className="doc-lead">Return a clean, vision-optimized screenshot of a page.</p>
              <div className="doc-endpoint"><span className="doc-verb post">POST</span> /capture</div>
              <h3>Request body</h3>
              <Params rows={[
                ['url', 'string · required', 'The page to capture.'],
                ['fullPage', 'boolean', 'Capture the full scrollable height. Default false.'],
                ['skipClean', 'boolean', 'Return the raw page without overlay removal. Default false.'],
                ['waitForSelector', 'string', 'Wait for this selector before capturing.'],
                ['extractElements', 'boolean', 'Also return interactive elements with bounding boxes.'],
              ]} />
              <h3>Response</h3>
              <Code lang="json">{`{
  "success": true,
  "data": {
    "image_url": "https://…/capture_123.jpeg",
    "metadata": { "width": 2560, "height": 1600, "sizeBytes": 184320, "tokens_used": 1105, "title": "…", "resolvedUrl": "https://…" },
    "processing_time": 1890
  }
}`}</Code>
              <div className="doc-next" onClick={() => go('errors')}>Next: Errors <ArrowRight size={15} /></div>
            </article>
          )}

          {active === 'errors' && (
            <article className="doc">
              <div className="doc-eyebrow">API reference</div>
              <h1>Errors</h1>
              <p className="doc-lead">VisionStream uses standard HTTP status codes. Error responses include a human-readable <code>error</code> message.</p>
              <Params rows={[
                ['400', 'Bad Request', 'The url is missing or not a valid http(s) URL.'],
                ['401', 'Unauthorized', 'Missing or invalid API key.'],
                ['422', 'Unprocessable', 'The page failed to load, navigate, or timed out.'],
                ['429', 'Rate limited', 'You exceeded your plan quota or request rate. Retry later or upgrade.'],
                ['500', 'Server error', 'An unexpected error. Safe to retry with backoff.'],
              ]} />
              <h3>Error shape</h3>
              <Code lang="json">{`{ "error": "Timed out waiting for content on \\"https://…\\"" }`}</Code>
              <div className="doc-callout"><AlertTriangle size={15} /> Timeouts usually mean a heavy or bot-protected page. Increase <code>timeoutMs</code> or set <code>waitForSelector</code>.</div>
              <div className="doc-next" onClick={() => go('rate-limits')}>Next: Rate limits <ArrowRight size={15} /></div>
            </article>
          )}

          {active === 'rate-limits' && (
            <article className="doc">
              <div className="doc-eyebrow">API reference</div>
              <h1>Rate limits</h1>
              <p className="doc-lead">Usage is metered per API key against your plan's monthly quota.</p>
              <Params rows={[
                ['Free', '100 / month', 'For trying it out. Shared browser pool.'],
                ['Pro', '10,000 / month', 'Full API + MCP, dashboard, metrics.'],
                ['Team', '50,000 / month', 'Shared projects, webhooks, team keys.'],
              ]} />
              <p>When you exceed your quota, requests return <code>429</code> with an upgrade message. Every response includes <code>RateLimit-*</code> headers so you can track remaining usage.</p>
              <div className="doc-next" onClick={() => go('sdk-js')}>Next: JavaScript SDK <ArrowRight size={15} /></div>
            </article>
          )}

          {active === 'sdk-js' && (
            <article className="doc">
              <div className="doc-eyebrow">SDKs</div>
              <h1>JavaScript SDK</h1>
              <p className="doc-lead">A typed client for Node and the browser (server-side).</p>
              <h3>Install</h3>
              <Code lang="shell">npm install visionstream</Code>
              <h3>Usage</h3>
              <Code lang="javascript">{`import { VisionStream } from "visionstream";

const vision = new VisionStream(process.env.VISIONSTREAM_KEY);

// Understand a page
const { data } = await vision.observe({ url: "https://news.ycombinator.com" });
console.log(data.observation.counts);

// Or just a clean screenshot
const shot = await vision.capture({ url: "https://stripe.com" });
console.log(shot.data.image_url);`}</Code>
              <div className="doc-next" onClick={() => go('sdk-python')}>Next: Python SDK <ArrowRight size={15} /></div>
            </article>
          )}

          {active === 'sdk-python' && (
            <article className="doc">
              <div className="doc-eyebrow">SDKs</div>
              <h1>Python SDK</h1>
              <p className="doc-lead">A lightweight client for Python 3.9+.</p>
              <h3>Install</h3>
              <Code lang="shell">pip install visionstream</Code>
              <h3>Usage</h3>
              <Code lang="python">{`from visionstream import VisionStream

vision = VisionStream(api_key=os.environ["VISIONSTREAM_KEY"])

result = vision.observe(url="https://news.ycombinator.com")
print(result.observation.counts)`}</Code>
              <div className="doc-next" onClick={() => go('faq')}>Next: FAQ <ArrowRight size={15} /></div>
            </article>
          )}

          {active === 'faq' && (
            <article className="doc">
              <div className="doc-eyebrow">Help</div>
              <h1>FAQ</h1>
              <div className="doc-faq">
                <div><b>How is this different from Playwright?</b><p>Playwright drives a browser. VisionStream is the intelligence layer on top: it returns cleaned screenshots plus structured, AI-ready JSON in one call, so your agent doesn't infer the UI from pixels or maintain per-site selectors.</p></div>
                <div><b>Which vision models does it work with?</b><p>Any of them. Output is standard JPEG + JSON — used today with GPT-4o, Claude, and Gemini.</p></div>
                <div><b>Do you support MCP?</b><p>Yes. VisionStream ships a Model Context Protocol server, so agents in Claude Desktop, Cursor, and similar tools can call it directly.</p></div>
                <div><b>How do the token savings work?</b><p>Vision models are billed per image tile. By stripping cookie banners, ads, and chrome before the screenshot, there's less to encode — typically 30–60% fewer vision tokens.</p></div>
                <div><b>Can it interact with pages (click, type)?</b><p>Observe and Capture are read operations today. Action endpoints and persistent sessions are on the roadmap.</p></div>
              </div>
              <div className="doc-next" onClick={() => navigate('/playground')}>Try it in the Playground <ArrowRight size={15} /></div>
            </article>
          )}
        </main>
      </div>
    </div>
  );
}
