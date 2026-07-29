import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, MousePointerClick, Boxes, Zap, Gauge, ShieldCheck, ArrowRight, Github } from 'lucide-react';

const CODE = `import { VisionStream } from "visionstream";

const vision = new VisionStream(process.env.VISIONSTREAM_KEY);

// Don't just see the page — understand it.
const { observation } = await vision.observe({
  url: "https://news.ycombinator.com",
});

observation.buttons;   // [{ text: "Login", bbox: {...} }, ...]
observation.forms;     // structured forms + fields
observation.tables;    // headers + row counts`;

const FEATURES = [
  {
    icon: Eye,
    title: 'Observe API',
    body: 'Return structured page understanding — headings, buttons, links, forms, tables and interactive elements with bounding boxes. Your agent understands the page instead of guessing from pixels.',
  },
  {
    icon: Zap,
    title: 'Vision-optimized Capture',
    body: 'Clean, high-DPI screenshots with cookie banners and UI noise stripped out — so vision models spend tokens on content, not chrome. Typically 30–60% fewer tokens.',
  },
  {
    icon: Boxes,
    title: 'MCP + SDKs',
    body: 'A first-class Model Context Protocol server and a JavaScript SDK. Drop VisionStream into Claude Desktop, Cursor, or any agent framework in minutes.',
  },
  {
    icon: Gauge,
    title: 'Built for agents',
    body: 'Stateless, fast, and predictable. One call returns the screenshot and the structured data together, so your agent loop stays simple.',
  },
  {
    icon: MousePointerClick,
    title: 'Bounding boxes',
    body: 'Every element comes with coordinates that line up with the capture — ready for click-targeting, overlays, and grounding.',
  },
  {
    icon: ShieldCheck,
    title: 'Graceful by design',
    body: 'If structure extraction fails on a hostile page, you still get the screenshot. No crashes, no dead ends.',
  },
];

const PLANS = [
  { name: 'Free', price: '$0', tag: 'For trying it out', items: ['100 captures / month', 'Observe + Capture API', 'Community support'], cta: 'Start free' },
  { name: 'Pro', price: '$29', tag: 'For builders', items: ['10,000 captures / month', 'MCP server + SDK', 'Dashboard + metrics', 'Email support'], cta: 'Go Pro', featured: true },
  { name: 'Team', price: '$99', tag: 'For teams', items: ['Shared projects', 'Usage analytics', 'Webhooks', 'Team API keys'], cta: 'Contact us' },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="lp">
      <nav className="lp-nav">
        <div className="lp-logo">VisionStream</div>
        <div className="lp-nav-links">
          <button className="lp-link" onClick={() => navigate('/playground')}>Playground</button>
          <button className="lp-link" onClick={() => navigate('/login')}>Sign in</button>
          <button className="lp-btn lp-btn-primary" onClick={() => navigate('/playground')}>
            Try the Playground
          </button>
        </div>
      </nav>

      <header className="lp-hero">
        <div className="lp-badge">Browser intelligence infrastructure for AI agents</div>
        <h1 className="lp-title">
          Give your AI agents <span>eyes</span> — and the ability to understand any web page.
        </h1>
        <p className="lp-sub">
          VisionStream turns any URL into a clean screenshot <em>and</em> a structured map of the page —
          buttons, forms, tables, links — in a single API call. Stop making models infer everything from pixels.
        </p>
        <div className="lp-cta-row">
          <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={() => navigate('/playground')}>
            Try it free — no signup <ArrowRight size={18} />
          </button>
          <button className="lp-btn lp-btn-ghost lp-btn-lg" onClick={() => navigate('/login')}>
            Get an API key
          </button>
        </div>
        <div className="lp-hero-note">Paste a URL, hit Observe, watch the page turn into JSON.</div>
      </header>

      <section className="lp-code-section">
        <div className="lp-code-card">
          <div className="lp-code-head">
            <span className="lp-dot red" /><span className="lp-dot amber" /><span className="lp-dot green" />
            <span className="lp-code-file">observe.ts</span>
          </div>
          <pre className="lp-code">{CODE}</pre>
        </div>
      </section>

      <section className="lp-features">
        <h2 className="lp-h2">One layer above the browser</h2>
        <p className="lp-section-sub">
          Not another headless browser. The intelligence layer on top of it.
        </p>
        <div className="lp-grid">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div className="lp-feature" key={f.title}>
                <div className="lp-feature-icon"><Icon size={20} /></div>
                <div className="lp-feature-title">{f.title}</div>
                <div className="lp-feature-body">{f.body}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="lp-pricing">
        <h2 className="lp-h2">Simple, honest pricing</h2>
        <p className="lp-section-sub">Start free. Upgrade when you ship.</p>
        <div className="lp-plans">
          {PLANS.map((p) => (
            <div className={`lp-plan ${p.featured ? 'featured' : ''}`} key={p.name}>
              {p.featured && <div className="lp-plan-flag">Most popular</div>}
              <div className="lp-plan-name">{p.name}</div>
              <div className="lp-plan-price">{p.price}<span>/mo</span></div>
              <div className="lp-plan-tag">{p.tag}</div>
              <ul className="lp-plan-items">
                {p.items.map((it) => <li key={it}>{it}</li>)}
              </ul>
              <button
                className={`lp-btn ${p.featured ? 'lp-btn-primary' : 'lp-btn-ghost'} lp-plan-cta`}
                onClick={() => navigate(p.name === 'Free' ? '/playground' : '/login')}
              >
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-final">
        <h2 className="lp-h2">See it work in ten seconds</h2>
        <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={() => navigate('/playground')}>
          Open the Playground <ArrowRight size={18} />
        </button>
      </section>

      <footer className="lp-footer">
        <div className="lp-logo">VisionStream</div>
        <div className="lp-footer-links">
          <button className="lp-link" onClick={() => navigate('/playground')}>Playground</button>
          <button className="lp-link" onClick={() => navigate('/login')}>Sign in</button>
          <a className="lp-link" href="https://github.com" target="_blank" rel="noreferrer">
            <Github size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} />GitHub
          </a>
        </div>
        <div className="lp-copy">© {new Date().getFullYear()} VisionStream — Browser intelligence for AI agents.</div>
      </footer>
    </div>
  );
}
