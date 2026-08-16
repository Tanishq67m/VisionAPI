import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoMark } from '../components/Logo';
import { supabase } from '../lib/supabaseClient';
import { ArrowRight, Github, Check, Plus, Minus } from 'lucide-react';

const PIPE = ['Load', 'Clean', 'Extract', 'Box', 'JSON'];

const BOXES = [
  { l: '6%', t: '12%', w: '18%', h: '13%' },
  { l: '72%', t: '11%', w: '20%', h: '15%' },
  { l: '8%', t: '58%', w: '22%', h: '14%' },
  { l: '34%', t: '58%', w: '26%', h: '14%' },
  { l: '64%', t: '58%', w: '26%', h: '14%' },
];

const COMPARE: { cap: string; vs: string; a: string; b: string }[] = [
  { cap: 'Structured JSON (links, forms, tables)', vs: 'Built in', a: 'Build it yourself', b: 'Not included' },
  { cap: 'Bounding box on every element', vs: 'Built in', a: 'Not available', b: 'Not available' },
  { cap: 'Cleaned, vision-optimized screenshot', vs: 'Yes', a: 'Raw only', b: 'Raw only' },
  { cap: '30–60% fewer vision tokens', vs: 'Yes', a: 'No', b: 'No' },
  { cap: 'First-class MCP server', vs: 'Yes', a: 'No', b: 'No' },
  { cap: 'What it takes to set up', vs: '1 API call', a: 'Browser + prompts + glue', b: 'Browser infra' },
];

const STATS: { to?: number; suffix?: string; static?: string; l: string }[] = [
  { to: 191, l: 'elements extracted from stripe.com in one call' },
  { to: 41, suffix: '%', l: 'fewer vision tokens after cleaning' },
  { to: 1, l: 'API call for screenshot + structure' },
  { static: '<3s', l: 'median capture on viewport pages' },
];

const FAQ: [string, string][] = [
  ['How is this different from Playwright?', 'Playwright drives a browser. VisionStream is the intelligence layer on top: it returns a cleaned screenshot plus structured, AI-ready JSON in one call — so your agent never infers the UI from pixels or maintains per-site selectors.'],
  ['Which vision models does it work with?', 'Any of them. Output is standard JPEG + JSON, used today with GPT-4o, Claude and Gemini.'],
  ['How do the token savings happen?', 'Vision models bill per image tile. By stripping cookie banners, ads and chrome before the screenshot, there is less to encode — typically 30–60% fewer vision tokens.'],
  ['Do you support MCP?', 'Yes. VisionStream ships a Model Context Protocol server, so agents in Claude Desktop, Cursor and similar tools can call it directly.'],
  ['Can it click and type?', 'Observe and Capture are read operations today. Action endpoints and persistent sessions are on the roadmap.'],
  ['What do I need to start?', 'A URL to try the playground (no signup), and an API key when you want the API. The key is free while we are in beta.'],
];

const PLANS = [
  { n: 'Free', p: '$0', tag: 'Kick the tires', items: ['100 captures / mo', 'Observe + Capture', 'Community support'], cta: 'Get a free key', to: '/login' },
  { n: 'Pro', p: '$29', tag: 'Once it’s in your loop', items: ['10,000 captures / mo', 'MCP server + SDK', 'Dashboard + metrics', 'Email support'], cta: 'Get an API key', to: '/login', featured: true },
  { n: 'Team', p: '$99', tag: 'When the team piles on', items: ['Shared projects', 'Usage analytics', 'Webhooks', 'Team API keys'], cta: 'Talk to us', to: '/login' },
];

export default function Landing() {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLElement>(null);
  const [demo, setDemo] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [email, setEmail] = useState('');
  const [waitState, setWaitState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [waitErr, setWaitErr] = useState('');

  const scrollToWaitlist = () => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' });

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

  // Signature demo animation: cycle through the pipeline + reveal boxes.
  useEffect(() => {
    const id = setInterval(() => setDemo((d) => (d + 1) % 8), 750);
    return () => clearInterval(id);
  }, []);

  // Reveal on scroll.
  useEffect(() => {
    const els = rootRef.current?.querySelectorAll('.reveal');
    if (!els) return;
    const io = new IntersectionObserver((e) => e.forEach((x) => x.isIntersecting && x.target.classList.add('in')), { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Count-up stats.
  useEffect(() => {
    const section = statsRef.current;
    if (!section) return;
    let done = false;
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting || done) return;
      done = true;
      section.querySelectorAll<HTMLElement>('.v-stat-n[data-to]').forEach((el) => {
        const to = Number(el.dataset.to); const suffix = el.dataset.suffix || ''; const t0 = performance.now();
        const tick = (t: number) => { const p = Math.min(1, (t - t0) / 1000); el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * to) + suffix; if (p < 1) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      });
    }), { threshold: 0.4 });
    io.observe(section);
    return () => io.disconnect();
  }, []);

  const pipeActive = Math.min(demo, PIPE.length - 1);
  const boxesShown = Math.max(0, demo - 1);
  const jsonReady = demo >= 5;

  return (
    <div className="v" ref={rootRef}>
      {/* Nav */}
      <nav className="v-nav">
        <div className="v-brand" onClick={() => navigate('/')}>
          <LogoMark size={26} /> <span>VisionStream</span> <em className="v-beta">BETA</em>
        </div>
        <div className="v-nav-links">
          <button className="v-link" onClick={() => navigate('/playground')}>Playground</button>
          <button className="v-link" onClick={() => navigate('/docs')}>Docs</button>
          <button className="v-link" onClick={() => navigate('/login')}>Pricing</button>
          <a className="v-link v-ic" href="https://github.com" target="_blank" rel="noreferrer" aria-label="GitHub"><Github size={17} /></a>
          <button className="v-cta" onClick={() => navigate('/playground')}>Try the playground</button>
        </div>
      </nav>

      {/* Hero — centered statement */}
      <header className="v-hero">
        <div className="v-eyebrow"><span className="v-dot" /> The perception layer for AI agents</div>
        <h1 className="v-h1">Your agent shouldn't read a transcript of the page. It should <span className="v-em">see</span> it.</h1>
        <p className="v-lead">Everyone turns the web into text for your model to read. But agents that click, fill, and verify need to <em>see</em> the page — where things are, what's interactive, what's on screen. VisionStream returns a cleaned screenshot and the page's structure, every element boxed and labeled.</p>
        <div className="v-cta-row">
          <button className="v-btn v-btn-primary" onClick={() => navigate('/playground')}>Try the playground <ArrowRight size={17} /></button>
          <button className="v-btn v-btn-ghost" onClick={scrollToWaitlist}>Get early access</button>
        </div>
        <div className="v-hero-note">Playground is live — no signup. API, SDK &amp; Console coming soon.</div>
      </header>

      {/* Signature animated product demo */}
      <section className="v-demo-wrap reveal">
        <div className="v-console">
          <div className="v-console-bar">
            <span className="v-method">POST</span>
            <span className="v-console-url">/observe · news.ycombinator.com</span>
            <span className={`v-console-pill ${jsonReady ? 'done' : ''}`}>{jsonReady ? 'done · 2.3s' : 'observing…'}</span>
          </div>
          <div className="v-console-body">
            <div className="v-shot">
              <div className="v-shot-top"><b>Hacker News</b><span>new</span><span>past</span><span>comments</span><span>ask</span><span>jobs</span></div>
              <div className="v-shot-rows">
                {['Show HN: browser intelligence for agents', 'Cutting GPT-4o vision costs by 41%', 'Ask HN: how do you give agents “eyes”?', 'Structured DOM extraction, one call'].map((r, i) => (
                  <div className="v-shot-row" key={i}><span className="v-shot-i">{i + 1}.</span> {r}</div>
                ))}
              </div>
              <div className="v-shot-scan" style={{ opacity: demo > 0 && demo < 6 ? 1 : 0 }} />
              {BOXES.map((b, i) => (
                <span key={i} className={`v-box ${i < boxesShown ? 'on' : ''}`} style={{ left: b.l, top: b.t, width: b.w, height: b.h }} />
              ))}
            </div>
            <div className="v-json">
              <div className="v-json-req"><span className="v-prompt">$</span> vision.observe(url)</div>
              <div className={`v-json-counts ${demo >= 3 ? 'on' : ''}`}>
                <div><b>196</b> links</div><div><b>52</b> buttons</div><div><b>4</b> tables</div><div><b>191</b> interactive</div>
              </div>
              <pre className={`v-json-body ${jsonReady ? 'on' : ''}`}>{`{
  "type": "button",
  "text": "login",
  "bbox": { "x": 8, "y": 6,
            "w": 44, "h": 18 }
}`}</pre>
            </div>
          </div>
          <div className="v-pipe">
            {PIPE.map((p, i) => (
              <React.Fragment key={p}>
                <span className={`v-pipe-step ${pipeActive > i ? 'done' : ''} ${pipeActive === i ? 'active' : ''}`}>{p}</span>
                {i < PIPE.length - 1 && <span className={`v-pipe-link ${pipeActive > i ? 'on' : ''}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* Trust wall */}
      <section className="v-trust reveal">
        <div className="v-trust-label">Feeds the agents you already build with</div>
        <div className="v-trust-row">
          {['GPT-4o', 'Claude', 'Gemini', 'LangChain', 'OpenAI Agents SDK', 'CrewAI', 'MCP'].map((n) => <span className="v-trust-logo" key={n}>{n}</span>)}
        </div>
      </section>

      {/* Problem — the two bad options today */}
      <section className="v-problem reveal">
        <div className="v-kicker">The problem</div>
        <h2 className="v-h2">Today you get half of what your agent needs.</h2>
        <div className="v-two">
          <div className="v-two-card">
            <div className="v-two-h">Screenshot only</div>
            <p>The model guesses from pixels. It burns vision tokens re-reading nav bars, gets coordinates wrong, and invents buttons that aren't there.</p>
          </div>
          <div className="v-two-card">
            <div className="v-two-h">Text / markdown only</div>
            <p>Clean to read, but blind to the interface. No layout, no coordinates, no idea what's clickable. Your agent can summarize the page but can't act on it.</p>
          </div>
        </div>
        <p className="v-two-foot">VisionStream returns both: the cleaned image and the coordinate-grounded structure.</p>
      </section>

      {/* Schema visual */}
      <section className="v-schema-wrap reveal">
        <div className="v-kicker">The fix</div>
        <h2 className="v-h2">Every page describes a button differently. You get one schema.</h2>
        <div className="v-schema">
          <div className="v-schema-col">
            <div className="v-schema-cap">The page says</div>
            <div className="v-schema-in">{'<button>Sign in</button>'}</div>
            <div className="v-schema-in">{'<a role="button">Log in</a>'}</div>
            <div className="v-schema-in">{'<div class="btn">Get started</div>'}</div>
          </div>
          <div className="v-schema-mid"><span className="v-schema-arrow">→</span></div>
          <div className="v-schema-col">
            <div className="v-schema-cap accent">VisionStream returns</div>
            <pre className="v-schema-out">{`{
  "type": "button",
  "text": "Sign in",
  "bbox": { "x": 24, "y": 12, "w": 80, "h": 32 }
}`}</pre>
            <div className="v-schema-tag">observation.buttons[0]</div>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="v-compare reveal">
        <div className="v-kicker">Why VisionStream</div>
        <h2 className="v-h2">They hand you a browser. We hand you the page.</h2>
        <div className="v-table">
          <div className="v-tr v-thead">
            <span className="v-col-h">Capability</span>
            <span className="v-col-h brand">VisionStream</span>
            <span className="v-col-h">Playwright + GPT-4o</span>
            <span className="v-col-h">Browser infra</span>
          </div>
          {COMPARE.map((row, i) => (
            <div className="v-tr" key={i}>
              <span className="v-cap">{row.cap}</span>
              <span className="v-cell brand"><Check size={14} /> {row.vs}</span>
              <span className="v-cell muted">{row.a}</span>
              <span className="v-cell muted">{row.b}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Live stats (proof) */}
      <section className="v-stats reveal" ref={statsRef}>
        <div className="v-kicker" style={{ textAlign: 'center', marginBottom: 8 }}>Real numbers, from the real engine</div>
        <div className="v-stats-grid">
          {STATS.map((s, i) => (
            <div className="v-stat" key={i}>
              <div className="v-stat-n" data-to={s.to ?? ''} data-suffix={s.suffix ?? ''}>{s.static ?? '0'}</div>
              <div className="v-stat-l">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing (coming soon) */}
      <section className="v-pricing reveal">
        <div className="v-kicker">Pricing · coming soon</div>
        <h2 className="v-h2">Start free. Pay when it’s load-bearing.</h2>
        <p className="v-sub">Plans open when the API launches. Join early access for launch pricing — the playground is free to use today.</p>
        <div className="v-plans">
          {PLANS.map((pl) => (
            <div className={`v-plan ${pl.featured ? 'featured' : ''}`} key={pl.n}>
              {pl.featured && <div className="v-plan-flag">Most picked</div>}
              <div className="v-plan-n">{pl.n}</div>
              <div className="v-plan-p">{pl.p}<span>/mo</span></div>
              <div className="v-plan-tag">{pl.tag}</div>
              <ul className="v-plan-items">{pl.items.map((it) => <li key={it}>{it}</li>)}</ul>
              <button className={`v-btn ${pl.featured ? 'v-btn-primary' : 'v-btn-ghost'} v-plan-cta`} onClick={scrollToWaitlist}>Get early access</button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="v-faq reveal">
        <div className="v-kicker">FAQ</div>
        <h2 className="v-h2">Questions, answered.</h2>
        <div className="v-faq-list">
          {FAQ.map(([q, a], i) => (
            <div className={`v-faq-item ${openFaq === i ? 'open' : ''}`} key={i}>
              <button className="v-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>{q}{openFaq === i ? <Minus size={16} /> : <Plus size={16} />}</button>
              {openFaq === i && <div className="v-faq-a">{a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* Waitlist / final CTA */}
      <section className="v-waitlist reveal" id="waitlist">
        <div className="v-kicker" style={{ textAlign: 'center' }}>Early access</div>
        <h2 className="v-final-h">Give your agents eyes.<br />Get a key before everyone else.</h2>
        <p className="v-sub" style={{ margin: '0 auto 26px', textAlign: 'center' }}>The playground is live today. Drop your email and we'll get you an API key the moment it opens.</p>
        {waitState === 'done' ? (
          <div className="v-wait-done"><Check size={16} /> You're on the list — we'll be in touch.</div>
        ) : (
          <form className="v-wait-form" onSubmit={submitWaitlist}>
            <input type="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button type="submit" className="v-btn v-btn-primary" disabled={waitState === 'busy'}>{waitState === 'busy' ? 'Adding…' : 'Get early access'}</button>
          </form>
        )}
        {waitErr && <div className="v-wait-err">{waitErr}</div>}
        <div className="v-wait-or">or <button className="v-linkish" onClick={() => navigate('/playground')}>try the playground now →</button></div>
      </section>

      {/* Footer */}
      <footer className="v-footer">
        <div className="v-footer-inner">
          <div className="v-footer-top">
            <div className="v-brand"><LogoMark size={24} /> <span>VisionStream</span></div>
            <div className="v-footer-links">
              <button className="v-link" onClick={() => navigate('/playground')}>Playground</button>
              <button className="v-link" onClick={() => navigate('/docs')}>Docs</button>
              <button className="v-link" onClick={() => navigate('/terms')}>Terms</button>
              <button className="v-link" onClick={() => navigate('/privacy')}>Privacy</button>
              <a className="v-link" href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
            </div>
          </div>
          <div className="v-footer-bottom">
            <span className="v-footer-sig">© {new Date().getFullYear()} VisionStream · The perception layer for AI agents</span>
            <span className="v-footer-install">Playground live · API coming soon</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
