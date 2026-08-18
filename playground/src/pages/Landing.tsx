import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoMark } from '../components/Logo';
import { supabase } from '../lib/supabaseClient';
import { ArrowRight, ArrowUpRight, Github, Check } from 'lucide-react';

const GITHUB_URL = 'https://github.com/Tanishq67m/VisionAPI';

// Bounding-box brand motif — each detected element carries a mono label + coords.
const BOXES = [
  { l: '5%', t: '30%', w: '46%', h: '12%', label: 'link', xy: 'x 24 · y 96' },
  { l: '5%', t: '50%', w: '34%', h: '12%', label: 'link', xy: 'x 24 · y 168' },
  { l: '5%', t: '70%', w: '24%', h: '12%', label: 'button', xy: 'x 24 · y 240' },
  { l: '66%', t: '8%', w: '28%', h: '13%', label: 'input', xy: 'x 512 · y 28' },
];

const STEPS: { n: string; h: string; p: string }[] = [
  { n: '01', h: 'Load', p: 'The URL opens in a real headless browser — the same page a person would see.' },
  { n: '02', h: 'Perceive', p: 'The page is cleaned of chrome, then read for structure: every element, boxed and typed.' },
  { n: '03', h: 'Return', p: 'You get a vision-optimized screenshot and coordinate-grounded JSON in one response.' },
];

// Numbers below are the reference-engine figures VisionStream reports; a footnote
// keeps them honest rather than dressing them up as third-party benchmarks.
const STATS: { to?: number; suffix?: string; static?: string; l: string }[] = [
  { to: 191, l: 'elements extracted in a single call' },
  { to: 41, suffix: '%', l: 'fewer vision tokens after cleaning' },
  { static: '1', l: 'call for screenshot + structure' },
  { static: '<3s', l: 'median capture on viewport pages' },
];

export default function Landing() {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLElement>(null);
  const [scan, setScan] = useState(0);
  const [email, setEmail] = useState('');
  const [waitState, setWaitState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [waitErr, setWaitErr] = useState('');

  const scrollToWaitlist = () => document.getElementById('early-access')?.scrollIntoView({ behavior: 'smooth' });

  const submitWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaitErr('');
    setWaitState('busy');
    try {
      if (supabase) {
        const { error } = await supabase.from('waitlist').insert([{ email }]);
        if (error && !/duplicate|unique|already/i.test(error.message)) throw error;
      }
      setWaitState('done');
    } catch {
      setWaitErr('Could not save that — email us at hello@visionstream.dev and we’ll add you.');
      setWaitState('idle');
    }
  };

  // Boxes reveal one after another, then reset — a calm loop, not a light show.
  useEffect(() => {
    const id = setInterval(() => setScan((s) => (s + 1) % (BOXES.length + 2)), 900);
    return () => clearInterval(id);
  }, []);

  // Reveal on scroll.
  useEffect(() => {
    const els = rootRef.current?.querySelectorAll('.reveal');
    if (!els) return;
    const io = new IntersectionObserver(
      (e) => e.forEach((x) => x.isIntersecting && x.target.classList.add('in')),
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Count-up on the results numbers.
  useEffect(() => {
    const section = statsRef.current;
    if (!section) return;
    let done = false;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting || done) return;
          done = true;
          section.querySelectorAll<HTMLElement>('.v-stat-n[data-to]').forEach((el) => {
            const to = Number(el.dataset.to);
            const suffix = el.dataset.suffix || '';
            const t0 = performance.now();
            const tick = (t: number) => {
              const p = Math.min(1, (t - t0) / 1000);
              el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * to) + suffix;
              if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          });
        }),
      { threshold: 0.4 }
    );
    io.observe(section);
    return () => io.disconnect();
  }, []);

  const boxesShown = Math.min(scan, BOXES.length);

  return (
    <div className="v" ref={rootRef}>
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="v-nav">
        <div className="v-brand" onClick={() => navigate('/')}>
          <LogoMark size={24} /> <span>VisionStream</span> <em className="v-beta">BETA</em>
        </div>
        <div className="v-nav-links">
          <button className="v-link" onClick={() => navigate('/playground')}>Playground</button>
          <button className="v-link" onClick={() => navigate('/docs')}>Docs</button>
          <a className="v-link" href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a>
          <button className="v-cta" onClick={() => navigate('/playground')}>Try it <ArrowRight size={15} /></button>
        </div>
      </nav>

      {/* ── Hero (left-aligned, editorial) ──────────────────────────────── */}
      <header className="v-hero">
        <div className="v-eyebrow"><span className="v-dot" /> The perception layer for AI agents</div>
        <h1 className="v-h1">
          Your agent shouldn’t read a transcript of the page.<br />
          It should <span className="v-em">see</span> it.
        </h1>
        <p className="v-lead">
          Give AI agents a cleaned screenshot and coordinate-grounded page structure in one call.
        </p>
        <div className="v-cta-row">
          <button className="v-btn v-btn-primary" onClick={() => navigate('/playground')}>
            Try the playground <ArrowRight size={17} />
          </button>
          <a className="v-btn v-btn-ghost" href={GITHUB_URL} target="_blank" rel="noreferrer">
            View on GitHub <ArrowUpRight size={16} />
          </a>
        </div>
        <div className="v-hero-note">No signup · Paste a URL · See the result</div>
      </header>

      {/* ── Live product demo ───────────────────────────────────────────── */}
      <section className="v-demo reveal">
        <div className="v-demo-frame">
          <div className="v-demo-bar">
            <span className="v-method">POST</span>
            <span className="v-demo-url">/observe</span>
            <div className="v-demo-omni">
              <span className="v-demo-omni-url">https://news.ycombinator.com</span>
              <button className="v-demo-run" onClick={() => navigate('/playground')}>Observe</button>
            </div>
          </div>
          <div className="v-demo-body">
            {/* Screenshot with bounding boxes */}
            <div className="v-canvas">
              <div className="v-canvas-cap">SCREENSHOT</div>
              <div className="v-page">
                <div className="v-page-top"><b>Hacker News</b><span>new</span><span>ask</span><span>jobs</span></div>
                <div className="v-page-rows">
                  {['Show HN: browser intelligence for agents', 'Cutting GPT-4o vision costs by 41%', 'Structured DOM extraction, one call', 'Ask HN: how do you give agents “eyes”?'].map((r, i) => (
                    <div className="v-page-row" key={i}><span className="v-page-i">{i + 1}.</span> {r}</div>
                  ))}
                </div>
                <div className="v-scan" style={{ opacity: scan > 0 && scan <= BOXES.length ? 1 : 0 }} />
                {BOXES.map((b, i) => (
                  <span
                    key={i}
                    className={`v-bbox ${i < boxesShown ? 'on' : ''}`}
                    style={{ left: b.l, top: b.t, width: b.w, height: b.h }}
                  >
                    <span className="v-bbox-tag">{b.label}</span>
                    <span className="v-bbox-xy">{b.xy}</span>
                  </span>
                ))}
              </div>
            </div>
            {/* Structured output */}
            <div className="v-struct">
              <div className="v-canvas-cap">STRUCTURE</div>
              <div className="v-struct-counts">
                <div><b>196</b> links</div><div><b>52</b> buttons</div>
                <div><b>4</b> tables</div><div><b>191</b> interactive</div>
              </div>
              <pre className="v-struct-json">{`{
  "type": "button",
  "text": "login",
  "bbox": { "x": 24, "y": 240,
            "w": 44, "h": 18 }
}`}</pre>
              <button className="v-struct-link" onClick={() => navigate('/playground')}>
                Run it on any URL <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
        <div className="v-works">
          Works with the agents you already build with —
          <span>GPT-4o · Claude · Gemini · MCP · LangChain</span>
        </div>
      </section>

      {/* ── Why VisionStream ────────────────────────────────────────────── */}
      <section className="v-why reveal">
        <h2 className="v-h2">Agents need more than markdown.</h2>
        <p className="v-why-lead">
          Text tells a model what the page <em>says</em>. Pixels show what the page <em>looks like</em>.
          VisionStream gives agents both.
        </p>
        <div className="v-flow">
          <div className="v-flow-node">Webpage</div>
          <ArrowRight className="v-flow-arrow" size={20} />
          <div className="v-flow-node accent">VisionStream</div>
          <ArrowRight className="v-flow-arrow" size={20} />
          <div className="v-flow-split">
            <div className="v-flow-node">Image</div>
            <div className="v-flow-node">Structure</div>
          </div>
        </div>
        <div className="v-why-list">
          <span>Clean screenshot</span>
          <span>Coordinate-grounded elements</span>
          <span>Structured JSON</span>
          <span>Interactive element detection</span>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section className="v-how reveal">
        <div className="v-kicker">How it works</div>
        <div className="v-steps">
          {STEPS.map((s) => (
            <div className="v-step" key={s.n}>
              <div className="v-step-n">{s.n}</div>
              <div className="v-step-h">{s.h}</div>
              <p className="v-step-p">{s.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Real engine results ─────────────────────────────────────────── */}
      <section className="v-results reveal" ref={statsRef}>
        <div className="v-kicker">Real engine results</div>
        <div className="v-stats-grid">
          {STATS.map((s, i) => (
            <div className="v-stat" key={i}>
              <div className="v-stat-n" data-to={s.to ?? ''} data-suffix={s.suffix ?? ''}>
                {s.static ?? '0'}
              </div>
              <div className="v-stat-l">{s.l}</div>
            </div>
          ))}
        </div>
        <div className="v-results-foot">
          Figures from the reference engine — your numbers vary by page.
        </div>
      </section>

      {/* ── Early access ────────────────────────────────────────────────── */}
      <section className="v-cta-final reveal" id="early-access">
        <h2 className="v-final-h">Give your agents eyes.</h2>
        <p className="v-final-sub">
          The playground is live today. We’re opening API access to early builders.
        </p>
        {waitState === 'done' ? (
          <div className="v-wait-done"><Check size={16} /> You’re on the list — we’ll be in touch.</div>
        ) : (
          <form className="v-wait-form" onSubmit={submitWaitlist}>
            <input
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Email address"
            />
            <button type="submit" className="v-btn v-btn-primary" disabled={waitState === 'busy'}>
              {waitState === 'busy' ? 'Adding…' : 'Get early access'}
            </button>
          </form>
        )}
        {waitErr && <div className="v-wait-err">{waitErr}</div>}
        <div className="v-wait-or">
          or <button className="v-linkish" onClick={() => navigate('/playground')}>try the playground now →</button>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="v-footer">
        <div className="v-footer-inner">
          <div className="v-footer-brand">
            <div className="v-brand"><LogoMark size={22} /> <span>VisionStream</span></div>
            <p>The perception layer for AI agents.</p>
          </div>
          <div className="v-footer-links">
            <button className="v-link" onClick={() => navigate('/playground')}>Playground</button>
            <button className="v-link" onClick={() => navigate('/docs')}>Docs</button>
            <a className="v-link" href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a>
            <button className="v-link" onClick={() => navigate('/terms')}>Terms</button>
            <button className="v-link" onClick={() => navigate('/privacy')}>Privacy</button>
          </div>
        </div>
        <div className="v-footer-copy">© {new Date().getFullYear()} VisionStream</div>
      </footer>
    </div>
  );
}
