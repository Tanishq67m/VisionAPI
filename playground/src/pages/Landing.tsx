import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoMark } from '../components/Logo';
import { Eye, Scissors, Plug, Ruler, GitFork, ArrowRight, Github } from 'lucide-react';

const CODE = `POST /observe

const { observation } = await vision.observe({
  url: "news.ycombinator.com",
});

observation.counts;   // { links: 196, tables: 4 }
observation.tables;   // [{ headers: [...], rowCount: 92 }]
observation.buttons;  // [{ text, bbox: { x, y, w, h } }]`;

const FEATURES = [
  { icon: Eye, title: 'Structure, not guesswork', body: 'Headings, buttons, links, forms and tables — each returned with a bounding box. No OCR, no prompt-and-pray on a screenshot.' },
  { icon: Scissors, title: 'Chrome gets cut before capture', body: 'Cookie banners, ads and nav are stripped before the screenshot, so your model isn’t billed to read furniture. Usually 30–60% fewer vision tokens.' },
  { icon: Plug, title: 'MCP and a typed SDK', body: 'A real Model Context Protocol server plus a TypeScript SDK. Drop it into Claude Desktop, Cursor or your own loop in a couple of lines.' },
  { icon: Ruler, title: 'Coordinates that line up', body: 'Every element ships with a box that matches the capture — ready for click-targeting, grounding and overlays.' },
  { icon: GitFork, title: 'One call, both halves', body: 'Screenshot and structured JSON come back together. No second request, no stitching two tools into one prompt.' },
  { icon: Eye, title: 'Fails without drama', body: 'If a hostile page breaks structure extraction, you still get the screenshot and a readable error — never a silent 500.' },
];

const PLANS = [
  { name: 'Free', price: '$0', tag: 'Kick the tires', items: ['100 captures / month', 'Observe + Capture', 'Community support'], cta: 'Start free' },
  { name: 'Pro', price: '$29', tag: 'Once it’s in your loop', items: ['10,000 captures / month', 'MCP server + SDK', 'Dashboard + metrics', 'Email support'], cta: 'Go Pro', featured: true },
  { name: 'Team', price: '$99', tag: 'When the team piles on', items: ['Shared projects', 'Usage analytics', 'Webhooks', 'Team API keys'], cta: 'Talk to us' },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="lp">
      <nav className="lp-nav">
        <div className="lp-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <LogoMark size={24} /> Vision<span style={{ color: 'var(--text-accent)' }}>Stream</span>
        </div>
        <div className="lp-nav-links">
          <button className="lp-link" onClick={() => navigate('/playground')}>Playground</button>
          <button className="lp-link" onClick={() => navigate('/docs')}>Docs</button>
          <button className="lp-link" onClick={() => navigate('/login')}>Sign in</button>
          <button className="lp-btn lp-btn-primary" onClick={() => navigate('/login')}>Get an API key</button>
        </div>
      </nav>

      {/* Asymmetric hero — copy left, code right */}
      <header className="lp-hero2">
        <div className="lp-hero2-left">
          <div className="lp-eyebrow">Browser intelligence API</div>
          <h1 className="lp-h1">Your agent gets the page —<br />not just a picture of it.</h1>
          <p className="lp-lead">Point VisionStream at any URL. It hands back a cleaned screenshot <em>and</em> the page's real structure — every link, form, table and button, boxed and labeled — from a single request. Your vision model stops paying to squint at cookie banners.</p>
          <div className="lp-cta-row">
            <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={() => navigate('/playground')}>Run it on a URL <ArrowRight size={17} /></button>
            <button className="lp-btn lp-btn-ghost lp-btn-lg" onClick={() => navigate('/docs')}>Read the docs</button>
          </div>
          <div className="lp-trust">
            <div className="lp-trust-row"><span className="lp-trust-label">Feeds</span> GPT-4o · Claude · Gemini · OpenAI Agents SDK · LangChain</div>
            <div className="lp-trust-row"><span className="lp-trust-label">Runs on</span> Playwright · Chrome · MCP · TypeScript</div>
          </div>
        </div>
        <div className="lp-hero2-right">
          <div className="lp-code-card">
            <div className="lp-code-head">
              <LogoMark size={15} />
              <span className="lp-code-file">observe.ts</span>
            </div>
            <pre className="lp-code">{CODE}</pre>
          </div>
        </div>
      </header>

      <section className="lp-compare">
        <div className="lp-section-head">
          <h2 className="lp-h2">“Why not just Playwright and GPT-4o?”</h2>
          <p className="lp-section-sub">Because that setup pays a vision model to re-read the browser chrome on every single call.</p>
        </div>
        <div className="lp-compare-grid">
          <div className="lp-compare-col old">
            <div className="lp-compare-tag">Rolling your own</div>
            <ul className="lp-compare-list">
              <li>Screenshot the whole page — banners, ads and all</li>
              <li>Ship megapixels to GPT-4o, pay per tile</li>
              <li>Ask the model to <em>infer</em> buttons and forms from pixels</li>
              <li>Get a coordinate wrong, retry, burn more tokens</li>
              <li>Hand-write Playwright selectors per site, forever</li>
            </ul>
          </div>
          <div className="lp-compare-col new">
            <div className="lp-compare-tag accent">With VisionStream</div>
            <ul className="lp-compare-list">
              <li>A cleaned, chrome-free screenshot comes back first</li>
              <li>Alongside JSON: links, forms, tables, buttons</li>
              <li>Every element already carries a box — nothing inferred</li>
              <li>30–60% fewer vision tokens, request after request</li>
              <li>Works on any site, no per-site selectors to babysit</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="lp-features">
        <div className="lp-section-head">
          <h2 className="lp-h2">What comes back</h2>
          <p className="lp-section-sub">Two things in one response: the picture, and the structure behind it.</p>
        </div>
        <div className="lp-grid">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div className="lp-feature" key={i}>
                <div className="lp-feature-icon"><Icon size={20} /></div>
                <div className="lp-feature-title">{f.title}</div>
                <div className="lp-feature-body">{f.body}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="lp-pricing">
        <div className="lp-section-head">
          <h2 className="lp-h2">Start free. Pay when it’s load-bearing.</h2>
          <p className="lp-section-sub">No card to try it. No surprise metering.</p>
        </div>
        <div className="lp-plans">
          {PLANS.map((p) => (
            <div className={`lp-plan ${p.featured ? 'featured' : ''}`} key={p.name}>
              {p.featured && <div className="lp-plan-flag">Most picked</div>}
              <div className="lp-plan-name">{p.name}</div>
              <div className="lp-plan-price">{p.price}<span>/mo</span></div>
              <div className="lp-plan-tag">{p.tag}</div>
              <ul className="lp-plan-items">{p.items.map((it) => <li key={it}>{it}</li>)}</ul>
              <button className={`lp-btn ${p.featured ? 'lp-btn-primary' : 'lp-btn-ghost'} lp-plan-cta`} onClick={() => navigate(p.name === 'Free' ? '/playground' : '/login')}>{p.cta}</button>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-final">
        <h2 className="lp-h2">Point it at something ugly and watch.</h2>
        <p className="lp-section-sub">A news site, a dashboard, a checkout — see the screenshot, the JSON and the token savings for yourself.</p>
        <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={() => navigate('/playground')}>Open the playground <ArrowRight size={17} /></button>
      </section>

      <footer className="lp-footer">
        <div className="lp-logo"><LogoMark size={22} /> VisionStream</div>
        <div className="lp-footer-links">
          <button className="lp-link" onClick={() => navigate('/playground')}>Playground</button>
          <button className="lp-link" onClick={() => navigate('/docs')}>Docs</button>
          <button className="lp-link" onClick={() => navigate('/login')}>Sign in</button>
          <a className="lp-link" href="https://github.com" target="_blank" rel="noreferrer"><Github size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} />GitHub</a>
        </div>
        <div className="lp-copy">© {new Date().getFullYear()} VisionStream — browser intelligence for AI agents.</div>
      </footer>
    </div>
  );
}
