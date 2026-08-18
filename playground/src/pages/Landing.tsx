import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoMark } from '../components/Logo';
import { supabase } from '../lib/supabaseClient';
import {
  ArrowRight, ArrowUpRight, Check, Copy,
  Bot, MousePointerClick, Wand2, Table2,
} from 'lucide-react';

const GITHUB_URL = 'https://github.com/Tanishq67m/VisionAPI';

// Single reference observation, reused across the demo, pipeline, API example,
// and metrics sections so the numbers on the page are one story, not four.
const REF = {
  url: 'https://news.ycombinator.com',
  host: 'news.ycombinator.com',
  title: 'Hacker News',
  counts: { links: 196, buttons: 52, tables: 4, interactive: 191 },
  sampleButton: { id: 'btn-1', text: 'login', bbox: { x: 24, y: 240, width: 44, height: 20 } },
};

// Bounding-box brand motif — each detected element carries a mono label + coords.
const BOXES = [
  { l: '5%', t: '30%', w: '46%', h: '12%', label: 'link', xy: 'x 24 · y 96' },
  { l: '5%', t: '50%', w: '34%', h: '12%', label: 'link', xy: 'x 24 · y 168' },
  { l: '5%', t: '70%', w: '24%', h: '12%', label: 'button', xy: 'x 24 · y 240' },
  { l: '66%', t: '8%', w: '28%', h: '13%', label: 'input', xy: 'x 512 · y 28' },
];

// The pipeline strip cycles through these on the same clock as the box reveal —
// one visible mechanism, not two competing animations.
const PIPELINE_STAGES = [
  'URL submitted', 'Page rendered', 'Chrome removed',
  'Elements mapped', 'Screenshot produced', 'JSON returned',
];

const HOW_STEPS: { n: string; h: string; p: string }[] = [
  { n: '01', h: 'Capture', p: 'Render the URL in a real headless browser — the same page a person would see.' },
  { n: '02', h: 'Clean', p: 'Strip cookie banners, ads, and chrome so the screenshot is just the page.' },
  { n: '03', h: 'Map', p: 'Detect links, buttons, inputs, tables, and text — each with pixel coordinates.' },
  { n: '04', h: 'Return', p: 'One response: the vision-optimized screenshot and coordinate-grounded JSON.' },
];

const USE_CASES: { icon: any; h: string; p: string }[] = [
  { icon: Bot, h: 'Browser agents', p: 'Give an agent a page it can act on, not just summarize.' },
  { icon: MousePointerClick, h: 'Computer-use systems', p: 'Ground clicks and keystrokes in real pixel coordinates.' },
  { icon: Wand2, h: 'UI automation', p: 'Find buttons, inputs, and forms without maintaining selectors.' },
  { icon: Table2, h: 'Web understanding', p: 'Pull structured tables and links straight out of any page.' },
];

// Numbers below are the reference-engine figures VisionStream reports; a footnote
// keeps them honest rather than dressing them up as third-party benchmarks.
const STATS: { to: number; suffix?: string; l: string }[] = [
  { to: REF.counts.links, l: 'links detected' },
  { to: REF.counts.buttons, l: 'buttons found' },
  { to: REF.counts.tables, l: 'tables mapped' },
  { to: REF.counts.interactive, l: 'interactive elements' },
];

const CURL_SNIPPET = `curl -X POST https://api.visionstream.dev/observe \\
  -H "Authorization: Bearer vs_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "url": "${REF.url}" }'`;

const RESPONSE_SNIPPET = `{
  "success": true,
  "data": {
    "observation": {
      "pageTitle": "${REF.title}",
      "links": [
        { "text": "new", "href": "${REF.url}/newest" }
      ],
      "buttons": [
        { "id": "${REF.sampleButton.id}", "text": "${REF.sampleButton.text}",
          "bbox": { "x": ${REF.sampleButton.bbox.x}, "y": ${REF.sampleButton.bbox.y},
                    "width": ${REF.sampleButton.bbox.width}, "height": ${REF.sampleButton.bbox.height} } }
      ],
      "tables": [ { "headers": ["Rank", "Title"], "rowCount": 92 } ],
      "counts": {
        "links": ${REF.counts.links}, "buttons": ${REF.counts.buttons},
        "tables": ${REF.counts.tables}, "interactiveElements": ${REF.counts.interactive}
      }
    },
    "metadata": { "title": "${REF.title}", "resolvedUrl": "${REF.url}/" },
    "processing_time": 2310
  }
}`;

export default function Landing() {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLElement>(null);
  const [scan, setScan] = useState(0);
  const [email, setEmail] = useState('');
  const [waitState, setWaitState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [waitErr, setWaitErr] = useState('');
  const [copiedKey, setCopiedKey] = useState('');

  const copy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 1400);
  };

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

  // One clock drives both the bounding-box reveal and the pipeline strip —
  // a single mechanism, not two competing animations.
  useEffect(() => {
    const id = setInterval(() => setScan((s) => (s + 1) % PIPELINE_STAGES.length), 900);
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
      </header>

      {/* ── Live product demo — the centerpiece ─────────────────────────── */}
      <section className="v-demo reveal">
        <div className="v-demo-frame">
          <div className="v-demo-bar">
            <span className="v-method">POST</span>
            <span className="v-demo-url">/observe</span>
            <div className="v-demo-omni">
              <span className="v-demo-omni-url">{REF.url}</span>
              <button className="v-demo-run" onClick={() => navigate('/playground')}>Observe</button>
            </div>
          </div>

          {/* Pipeline strip — what the API actually did to produce this response */}
          <div className="v-pipe-strip" aria-hidden="true">
            {PIPELINE_STAGES.map((label, i) => (
              <div className={`v-pipe-tick ${i === scan ? 'active' : ''} ${i < scan ? 'done' : ''}`} key={label}>
                <span className="v-pipe-dot" />
                <span className="v-pipe-label">{label}</span>
              </div>
            ))}
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
                <div><b>{REF.counts.links}</b> links</div><div><b>{REF.counts.buttons}</b> buttons</div>
                <div><b>{REF.counts.tables}</b> tables</div><div><b>{REF.counts.interactive}</b> interactive</div>
              </div>
              <pre className="v-struct-json">{`{
  "type": "button",
  "text": "${REF.sampleButton.text}",
  "bbox": { "x": ${REF.sampleButton.bbox.x}, "y": ${REF.sampleButton.bbox.y},
            "width": ${REF.sampleButton.bbox.width}, "height": ${REF.sampleButton.bbox.height} }
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

      {/* ── The problem ──────────────────────────────────────────────────── */}
      <section className="v-why reveal">
        <div className="v-kicker">The problem</div>
        <h2 className="v-h2">Agents need more than markdown.</h2>
        <p className="v-why-lead">
          Text tells a model what the page <em>says</em>. Pixels show what the page <em>looks like</em> —
          and neither alone tells it exactly where the login button is.
          VisionStream gives agents both, already aligned to the same coordinates.
        </p>
        <div className="v-why-list">
          <span>Clean screenshot</span>
          <span>Coordinate-grounded elements</span>
          <span>Structured JSON</span>
          <span>Interactive element detection</span>
        </div>
      </section>

      {/* ── Core pipeline ────────────────────────────────────────────────── */}
      <section className="v-pipeline reveal">
        <div className="v-kicker">Core pipeline</div>
        <h2 className="v-h2">One call, from URL to grounded structure.</h2>
        <div className="v-pipe-col">
          <div className="v-pipe-node">
            <span className="v-pipe-node-label">URL</span>
            <span className="v-pipe-node-val">{REF.url}</span>
          </div>
          <div className="v-pipe-arrow">↓</div>
          <div className="v-pipe-node">
            <span className="v-pipe-node-label">Rendered webpage</span>
            <span className="v-pipe-node-val">Real browser · full layout · JS executed</span>
          </div>
          <div className="v-pipe-arrow">↓</div>
          <div className="v-pipe-node accent">
            <span className="v-pipe-node-label">VisionStream</span>
            <span className="v-pipe-node-val">Clean → map → return</span>
          </div>
          <div className="v-pipe-arrow">↓</div>
          <div className="v-pipe-split">
            <div className="v-pipe-split-col">
              <div className="v-pipe-split-cap">Screenshot</div>
              <div className="v-pipe-split-row">pixels</div>
            </div>
            <div className="v-pipe-split-col">
              <div className="v-pipe-split-cap accent">Structured JSON</div>
              <div className="v-pipe-split-row">elements</div>
              <div className="v-pipe-split-row">coordinates</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section className="v-how reveal">
        <div className="v-kicker">How it works</div>
        <div className="v-steps">
          {HOW_STEPS.map((s) => (
            <div className="v-step" key={s.n}>
              <div className="v-step-n">{s.n}</div>
              <div className="v-step-h">{s.h}</div>
              <p className="v-step-p">{s.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Real API example ────────────────────────────────────────────── */}
      <section className="v-api reveal">
        <div className="v-kicker">Real API example</div>
        <h2 className="v-h2">Exactly what you’d integrate.</h2>
        <p className="v-why-lead">
          The same request the playground makes, and the same response shape — including the
          {' '}{REF.counts.links} links and {REF.counts.interactive} interactive elements from the observation above.
        </p>
        <div className="v-api-grid">
          <div className="v-code-wrap">
            <div className="v-code-bar">
              <span>Request</span>
              <button className="v-code-copy" onClick={() => copy(CURL_SNIPPET, 'curl')}>
                {copiedKey === 'curl' ? <Check size={13} /> : <Copy size={13} />} {copiedKey === 'curl' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="v-code">{CURL_SNIPPET}</pre>
          </div>
          <div className="v-code-wrap">
            <div className="v-code-bar">
              <span>Response</span>
              <button className="v-code-copy" onClick={() => copy(RESPONSE_SNIPPET, 'response')}>
                {copiedKey === 'response' ? <Check size={13} /> : <Copy size={13} />} {copiedKey === 'response' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="v-code">{RESPONSE_SNIPPET}</pre>
          </div>
        </div>
        <button className="v-struct-link" onClick={() => navigate('/docs')}>
          Full API reference <ArrowRight size={14} />
        </button>
      </section>

      {/* ── Use cases ────────────────────────────────────────────────────── */}
      <section className="v-cases reveal">
        <div className="v-kicker">Use cases</div>
        <div className="v-cases-grid">
          {USE_CASES.map((c) => {
            const Icon = c.icon;
            return (
              <div className="v-case" key={c.h}>
                <Icon size={18} className="v-case-icon" />
                <div className="v-case-h">{c.h}</div>
                <p className="v-case-p">{c.p}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Real engine results ─────────────────────────────────────────── */}
      <section className="v-results reveal" ref={statsRef}>
        <div className="v-kicker">Real engine results</div>
        <div className="v-stats-grid">
          {STATS.map((s, i) => (
            <div className="v-stat" key={i}>
              <div className="v-stat-n" data-to={s.to} data-suffix={s.suffix ?? ''}>0</div>
              <div className="v-stat-l">{s.l}</div>
            </div>
          ))}
        </div>
        <div className="v-results-foot">
          From the {REF.title} observation shown above — your numbers vary by page.
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────── */}
      <section className="v-cta-final reveal" id="early-access">
        <h2 className="v-final-h">Give your agents eyes.</h2>
        <p className="v-final-sub">
          The Observe API is live today. Point it at any URL and see what your agent would see.
        </p>
        <div className="v-cta-row v-cta-row-center">
          <button className="v-btn v-btn-primary" onClick={() => navigate('/playground')}>
            Try the playground <ArrowRight size={17} />
          </button>
          <button className="v-btn v-btn-ghost" onClick={() => navigate('/docs')}>
            Read the docs <ArrowUpRight size={16} />
          </button>
        </div>

        <div className="v-wait-block">
          {waitState === 'done' ? (
            <div className="v-wait-done"><Check size={15} /> You’re on the list — we’ll be in touch.</div>
          ) : (
            <form className="v-wait-form-small" onSubmit={submitWaitlist}>
              <span className="v-wait-label">Prefer email updates on API access?</span>
              <input
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email address"
              />
              <button type="submit" className="v-btn v-btn-ghost v-wait-submit" disabled={waitState === 'busy'}>
                {waitState === 'busy' ? 'Adding…' : 'Join waitlist'}
              </button>
            </form>
          )}
          {waitErr && <div className="v-wait-err">{waitErr}</div>}
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
