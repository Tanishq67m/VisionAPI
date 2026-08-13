import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoMark } from '../components/Logo';
import { ArrowRight, Github, Check, X, Plus, Minus, Eye, Scissors, Ruler, Plug, GitFork, ShieldCheck } from 'lucide-react';

/* Fictional developer chatter for the problem wall — illustrative, not real quotes. */
const CHATTER = [
  { t: 'we were sending full-page screenshots to gpt-4o on every step. the vision bill was 4× the text bill before anyone noticed.', h: 'deploys@2am', s: 'r/LocalLLaMA · 1.2k' },
  { t: 'the agent clicked the wrong button because it inferred the layout from a blurry screenshot. every single time.', h: 'mira.builds', s: 'X · 3.4k' },
  { t: 'spent a weekend writing playwright selectors for one site. they redesigned. selectors dead. weekend gone.', h: 'hn_throwaway', s: 'Hacker News · 210' },
  { t: "our scraper 'worked' — returned an empty array every run because the cookie wall was never dismissed.", h: 'jklol', s: 'Discord · #bugs' },
  { t: 'asked the model to read a pricing table from a screenshot. it hallucinated a tier that does not exist.', h: 'priyaonprod', s: 'X · 5.1k' },
  { t: 'vision tokens are the silent killer. nobody budgets for re-reading nav bars ten thousand times a day.', h: 'costwatch', s: 'r/MachineLearning · 780' },
  { t: 'we bolted an OCR step onto screenshots to get text back. it is 2026. why am I doing OCR.', h: 'devnull_ops', s: 'X · 2.7k' },
  { t: 'got a browser from the infra vendor. still had to figure out what was actually ON the page ourselves.', h: 'anon_agent', s: 'Discord · pinned' },
];

const PIPELINE = [
  { k: 'Load page', d: 'navigate + settle' },
  { k: 'Strip chrome', d: 'banners, ads, modals' },
  { k: 'Extract DOM', d: 'links, forms, tables' },
  { k: 'Box elements', d: 'bounding boxes' },
  { k: 'Return JSON', d: 'screenshot + structure' },
];

const COMPARE = [
  ['Structured JSON (links, forms, tables)', true, false, false],
  ['Bounding box on every element', true, false, false],
  ['Cleaned, vision-optimized screenshot', true, 'raw', 'raw'],
  ['30–60% fewer vision tokens', true, false, false],
  ['First-class MCP server', true, false, false],
  ['Setup', '1 API call', 'browser + prompts + glue', 'browser infra'],
];

const FEATURES = [
  { icon: Eye, t: 'Structure, not guesswork', d: 'Headings, buttons, links, forms and tables — each with a bounding box. No OCR, no prompt-and-pray.' },
  { icon: Scissors, t: 'Chrome cut before capture', d: 'Cookie walls, ads and nav stripped before the screenshot. Your model is not billed to read furniture.' },
  { icon: Ruler, t: 'Coordinates that line up', d: 'Every element ships with a box that matches the capture — ready for click-targeting and grounding.' },
  { icon: Plug, t: 'MCP + typed SDK', d: 'A real Model Context Protocol server and a TypeScript SDK. Two lines into Claude Desktop, Cursor or your loop.' },
  { icon: GitFork, t: 'One call, both halves', d: 'Screenshot and JSON come back together. No second request, no stitching two tools into one prompt.' },
  { icon: ShieldCheck, t: 'Fails without drama', d: 'Hostile page breaks extraction? You still get the screenshot and a readable error — never a silent 500.' },
];

const STATS: { to?: number; suffix?: string; static?: string; l: string; d: string }[] = [
  { to: 191, l: 'elements from stripe.com', d: 'in a single call' },
  { to: 41, suffix: '%', l: 'fewer vision tokens', d: 'after cleaning' },
  { to: 1, l: 'API call', d: 'screenshot + structure' },
  { static: '<3s', l: 'median capture', d: 'viewport pages' },
];

const FAQ = [
  ['How is this different from Playwright?', 'Playwright drives a browser. VisionStream is the intelligence layer on top: it returns a cleaned screenshot plus structured, AI-ready JSON in one call — so your agent never infers the UI from pixels or maintains per-site selectors.'],
  ['Which vision models does it work with?', 'Any of them. Output is standard JPEG + JSON, used today with GPT-4o, Claude and Gemini.'],
  ['How do the token savings happen?', 'Vision models bill per image tile. By stripping cookie banners, ads and chrome before the screenshot, there is less to encode — typically 30–60% fewer vision tokens.'],
  ['Do you support MCP?', 'Yes. VisionStream ships a Model Context Protocol server, so agents in Claude Desktop, Cursor and similar tools can call it directly.'],
  ['Can it click and type?', 'Observe and Capture are read operations today. Action endpoints and persistent sessions are on the roadmap.'],
  ['What do I need to start?', 'Nothing but a URL. Try it in the playground with no signup, then grab a key when you want the API.'],
];

export default function Landing() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLElement>(null);

  // Cycle the pipeline animation.
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % (PIPELINE.length + 1)), 1100);
    return () => clearInterval(id);
  }, []);

  // Reveal-on-scroll.
  useEffect(() => {
    const els = rootRef.current?.querySelectorAll('.reveal');
    if (!els) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('in')),
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Count-up the stat numbers once they scroll into view.
  useEffect(() => {
    const section = statsRef.current;
    if (!section) return;
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      section.querySelectorAll<HTMLElement>('.ls-stat-n').forEach((el) => {
        const to = Number(el.dataset.to);
        if (!el.dataset.to || Number.isNaN(to)) return;
        const suffix = el.dataset.suffix || '';
        const dur = 1100;
        const t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(eased * to).toString() + suffix;
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    };
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && run()), { threshold: 0.4 });
    io.observe(section);
    return () => io.disconnect();
  }, []);

  return (
    <div className="ls" ref={rootRef}>
      {/* Nav */}
      <nav className="ls-nav">
        <div className="ls-brand" onClick={() => navigate('/')}>
          <LogoMark size={26} /> <span>VisionStream</span> <em className="ls-beta">BETA</em>
        </div>
        <div className="ls-nav-links">
          <button className="ls-link" onClick={() => navigate('/playground')}>Playground</button>
          <button className="ls-link" onClick={() => navigate('/docs')}>Docs</button>
          <button className="ls-link" onClick={() => navigate('/')}>Pricing</button>
          <a className="ls-link ls-icon" href="https://github.com" target="_blank" rel="noreferrer" aria-label="GitHub"><Github size={17} /></a>
          <button className="ls-cta" onClick={() => navigate('/playground')}>Try it free</button>
        </div>
      </nav>

      {/* Hero */}
      <header className="ls-hero">
        <div className="ls-hero-left">
          <div className="ls-eyebrow"><span className="ls-dot" /> Browser intelligence API · not another screenshot tool</div>
          <h1 className="ls-h1">Your agent shouldn't have to <span className="ls-strike">guess</span> what's on the page.</h1>
          <p className="ls-lead">One call returns a clean screenshot <em>and</em> the page's real structure — links, forms, tables, buttons, every element boxed and labeled. Your vision model stops burning tokens squinting at chrome.</p>
          <div className="ls-cta-row">
            <button className="ls-btn ls-btn-primary" onClick={() => navigate('/playground')}>Run it on a URL <ArrowRight size={17} /></button>
            <button className="ls-btn ls-btn-ghost" onClick={() => navigate('/docs')}>Read the docs</button>
          </div>
          <div className="ls-install"><span className="ls-prompt">$</span> npm i visionstream</div>
        </div>

        {/* Product mock */}
        <div className="ls-hero-right">
          <div className="ls-mock">
            <div className="ls-mock-bar">
              <span className="ls-tl red" /><span className="ls-tl amber" /><span className="ls-tl green" />
              <span className="ls-mock-url">POST /observe · stripe.com</span>
            </div>
            <div className="ls-mock-body">
              <div className="ls-shot">
                <div className="ls-shot-nav"><span>Products</span><span>Solutions</span><span>Developers</span><span className="ls-shot-cta">Sign in</span></div>
                <div className="ls-shot-hero">
                  <div className="ls-shot-h1">Financial infrastructure to grow your revenue</div>
                  <div className="ls-shot-row"><span className="ls-shot-btn">Start now</span><span className="ls-shot-btn ghost">Contact sales</span></div>
                </div>
                {/* amber bounding boxes */}
                <span className="ls-box" style={{ left: '6%', top: '10%', width: '20%', height: '14%' }} />
                <span className="ls-box" style={{ left: '30%', top: '10%', width: '22%', height: '14%' }} />
                <span className="ls-box" style={{ left: '73%', top: '9%', width: '20%', height: '16%' }} />
                <span className="ls-box" style={{ left: '8%', top: '62%', width: '24%', height: '15%' }} />
                <span className="ls-box" style={{ left: '35%', top: '62%', width: '28%', height: '15%' }} />
              </div>
              <div className="ls-mock-json">
                <div className="ls-json-row"><b>196</b> links</div>
                <div className="ls-json-row"><b>52</b> buttons</div>
                <div className="ls-json-row"><b>191</b> interactive</div>
                <div className="ls-json-line">{'"buttons": ['}</div>
                <div className="ls-json-line ind">{'{ "text": "Sign in",'}</div>
                <div className="ls-json-line ind2">{'"bbox": { x, y, w, h } },'}</div>
                <div className="ls-json-line">{']'}</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Problem wall */}
      <section className="ls-wall reveal">
        <div className="ls-section-kicker">The problem</div>
        <h2 className="ls-h2">Everyone building agents hits the same wall.</h2>
        <p className="ls-sub">Screenshots are expensive and blind. The DOM is a mess. So agents guess — and quietly get it wrong.</p>
        <div className="ls-marquee">
          <div className="ls-marquee-track">
            {[...CHATTER, ...CHATTER].map((c, i) => (
              <div className="ls-quote" key={i}>
                <p>“{c.t}”</p>
                <div className="ls-quote-meta"><span className="ls-avatar">{c.h[0].toUpperCase()}</span><span>{c.h}</span><span className="ls-quote-src">{c.s}</span></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Animated pipeline */}
      <section className="ls-pipe reveal">
        <div className="ls-section-kicker">How it works</div>
        <h2 className="ls-h2">Point it at a URL. Get back a page you can reason about.</h2>
        <div className="ls-pipe-track">
          {PIPELINE.map((p, i) => (
            <React.Fragment key={p.k}>
              <div className={`ls-node ${step > i ? 'done' : ''} ${step === i ? 'active' : ''}`}>
                <div className="ls-node-dot">{step > i ? <Check size={13} /> : i + 1}</div>
                <div className="ls-node-k">{p.k}</div>
                <div className="ls-node-d">{p.d}</div>
              </div>
              {i < PIPELINE.length - 1 && <div className={`ls-node-link ${step > i ? 'on' : ''}`} />}
            </React.Fragment>
          ))}
        </div>
        <div className={`ls-pipe-out ${step >= PIPELINE.length ? 'on' : ''}`}>
          <Check size={15} /> Structured response ready · screenshot + JSON · 41% fewer vision tokens
        </div>
      </section>

      {/* Comparison */}
      <section className="ls-compare reveal">
        <div className="ls-section-kicker">Why VisionStream</div>
        <h2 className="ls-h2">They hand you a browser. We hand you the page.</h2>
        <div className="ls-table">
          <div className="ls-tr ls-thead">
            <span></span><span className="ls-brandcol">VisionStream</span><span>Playwright + GPT-4o</span><span>Browser infra vendors</span>
          </div>
          {COMPARE.map((row, i) => (
            <div className="ls-tr" key={i}>
              <span className="ls-cap">{row[0] as string}</span>
              {[row[1], row[2], row[3]].map((v, j) => (
                <span className={`ls-cell ${j === 0 ? 'brandcol' : ''}`} key={j}>
                  {v === true ? <Check size={16} className="ls-yes" /> : v === false ? <X size={16} className="ls-no" /> : <span className="ls-cell-txt">{v as string}</span>}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="ls-features reveal">
        <div className="ls-section-kicker">What comes back</div>
        <h2 className="ls-h2">Two things in one response: the picture, and the structure behind it.</h2>
        <div className="ls-fgrid">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div className="ls-feature" key={i}>
                <div className="ls-feature-ic"><Icon size={18} /></div>
                <div className="ls-feature-t">{f.t}</div>
                <div className="ls-feature-d">{f.d}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Stats */}
      <section className="ls-stats reveal" ref={statsRef}>
        {STATS.map((s, i) => (
          <div className="ls-stat" key={i}>
            <div className="ls-stat-n" data-to={s.to ?? ''} data-suffix={s.suffix ?? ''}>{s.static ?? '0'}</div>
            <div className="ls-stat-l">{s.l}</div>
            <div className="ls-stat-d">{s.d}</div>
          </div>
        ))}
      </section>

      {/* Code */}
      <section className="ls-code reveal">
        <div className="ls-code-copy">
          <div className="ls-section-kicker">Quickstart</div>
          <h2 className="ls-h2">Three lines to a page your agent can read.</h2>
          <p className="ls-sub">No signup to try it — the playground runs on any URL. Grab a key when you're ready for the API.</p>
          <button className="ls-btn ls-btn-primary" onClick={() => navigate('/docs')}>Read the docs <ArrowRight size={17} /></button>
        </div>
        <div className="ls-code-card">
          <div className="ls-code-head"><LogoMark size={15} /> <span>observe.ts</span></div>
          <pre className="ls-code-pre">{`import { VisionStream } from "visionstream";

const vision = new VisionStream(process.env.VS_KEY);

const { observation } = await vision.observe({
  url: "news.ycombinator.com",
});

observation.counts;   // { links: 196, tables: 4 }
observation.tables;   // [{ headers, rowCount: 92 }]
observation.buttons;  // [{ text, bbox: { x, y, w, h } }]`}</pre>
        </div>
      </section>

      {/* Pricing */}
      <section className="ls-pricing reveal">
        <div className="ls-section-kicker">Pricing</div>
        <h2 className="ls-h2">Start free. Pay when it's load-bearing.</h2>
        <div className="ls-plans">
          {[
            { n: 'Free', p: '$0', tag: 'Kick the tires', items: ['100 captures / mo', 'Observe + Capture', 'Community support'], cta: 'Start free', to: '/playground' },
            { n: 'Pro', p: '$29', tag: 'Once it’s in your loop', items: ['10,000 captures / mo', 'MCP server + SDK', 'Dashboard + metrics', 'Email support'], cta: 'Go Pro', to: '/login', featured: true },
            { n: 'Team', p: '$99', tag: 'When the team piles on', items: ['Shared projects', 'Usage analytics', 'Webhooks', 'Team API keys'], cta: 'Talk to us', to: '/login' },
          ].map((pl) => (
            <div className={`ls-plan ${pl.featured ? 'featured' : ''}`} key={pl.n}>
              {pl.featured && <div className="ls-plan-flag">Most picked</div>}
              <div className="ls-plan-n">{pl.n}</div>
              <div className="ls-plan-p">{pl.p}<span>/mo</span></div>
              <div className="ls-plan-tag">{pl.tag}</div>
              <ul className="ls-plan-items">{pl.items.map((it) => <li key={it}><Check size={14} /> {it}</li>)}</ul>
              <button className={`ls-btn ${pl.featured ? 'ls-btn-primary' : 'ls-btn-ghost'} ls-plan-cta`} onClick={() => navigate(pl.to)}>{pl.cta}</button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="ls-faq reveal">
        <div className="ls-section-kicker">FAQ</div>
        <h2 className="ls-h2">Questions, answered.</h2>
        <div className="ls-faq-list">
          {FAQ.map(([q, a], i) => (
            <div className={`ls-faq-item ${openFaq === i ? 'open' : ''}`} key={i}>
              <button className="ls-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                {q}{openFaq === i ? <Minus size={16} /> : <Plus size={16} />}
              </button>
              {openFaq === i && <div className="ls-faq-a">{a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* Final */}
      <section className="ls-final reveal">
        <h2 className="ls-final-h">Give your agents eyes — and the structure to use them.</h2>
        <div className="ls-cta-row" style={{ justifyContent: 'center' }}>
          <button className="ls-btn ls-btn-primary" onClick={() => navigate('/playground')}>Open the playground <ArrowRight size={17} /></button>
          <button className="ls-btn ls-btn-ghost" onClick={() => navigate('/login')}>Get an API key</button>
        </div>
      </section>

      {/* Footer */}
      <footer className="ls-footer">
        <div className="ls-footer-inner">
          <div className="ls-footer-top">
            <div className="ls-brand"><LogoMark size={24} /> <span>VisionStream</span></div>
            <div className="ls-footer-links">
              <button className="ls-link" onClick={() => navigate('/playground')}>Playground</button>
              <button className="ls-link" onClick={() => navigate('/docs')}>Docs</button>
              <button className="ls-link" onClick={() => navigate('/login')}>Sign in</button>
              <a className="ls-link" href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
            </div>
          </div>
          <div className="ls-footer-bottom">
            <span className="ls-footer-sig">© {new Date().getFullYear()} VisionStream · Browser intelligence for AI agents</span>
            <span className="ls-footer-install"><span className="ls-prompt">$</span> npm&nbsp;i&nbsp;visionstream</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
