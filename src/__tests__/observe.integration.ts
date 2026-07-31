import http from 'http';
import type { AddressInfo } from 'net';
import { captureForAI, closeBrowser } from '../index.js';

/**
 * Deterministic, offline deep-test of the Observe + Capture engine.
 * We serve a hand-built HTML fixture with KNOWN structure over localhost, so
 * every assertion is exact instead of depending on a live website.
 *
 * Also acts as the regression test for the "__name is not defined" bug — if the
 * esbuild/tsx shim ever regresses, observePage throws and these tests fail.
 */

const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const FIXTURE = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Fixture Page</title></head>
<body>
  <h1>Main Heading</h1>
  <h2>Sub Heading</h2>
  <nav>
    <a href="https://alpha.example">Alpha</a>
    <a href="https://beta.example">Beta</a>
    <a href="https://gamma.example">Gamma</a>
  </nav>
  <button>Save</button>
  <button aria-label="Close dialog">X</button>
  <form method="post" action="/submit">
    <label>Email <input type="email" name="email" placeholder="you@example.com" required></label>
    <input type="password" name="pw" placeholder="password">
    <button type="submit">Sign in</button>
  </form>
  <table>
    <thead><tr><th>Rank</th><th>Title</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>One</td></tr>
      <tr><td>2</td><td>Two</td></tr>
    </tbody>
  </table>
  <img src="${PIXEL}" alt="Logo">
</body>
</html>`;

let server: http.Server;
let base = '';

beforeAll(async () => {
  server = http.createServer((_req, res) => {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(FIXTURE);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await closeBrowser();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test('observe returns the exact structure of the fixture (regression: no __name error)', async () => {
  const res = await captureForAI({ url: base, observe: true });
  expect(res.observation).toBeDefined();
  const o = res.observation!;

  expect(o.pageTitle).toBe('Fixture Page');

  // Links: exactly the 3 nav anchors
  expect(o.counts.links).toBe(3);
  expect(o.links.map((l) => l.text).sort()).toEqual(['Alpha', 'Beta', 'Gamma']);

  // Headings: h1 + h2
  expect(o.counts.headings).toBe(2);
  expect(o.headings[0]).toEqual({ level: 1, text: 'Main Heading' });

  // Buttons: Save, Close (via aria-label), Sign in (submit)
  expect(o.counts.buttons).toBeGreaterThanOrEqual(3);

  // Forms: one form, method post, with an email + password field
  expect(o.forms.length).toBe(1);
  expect(o.forms[0].method).toBe('post');
  const email = o.forms[0].fields.find((f) => f.name === 'email');
  expect(email).toBeDefined();
  expect(email!.type).toBe('email');
  expect(email!.required).toBe(true);
  expect(o.forms[0].fields.some((f) => f.name === 'pw')).toBe(true);

  // Table: headers + row count (1 header row + 2 body rows = 3 <tr>)
  expect(o.tables.length).toBe(1);
  expect(o.tables[0].headers).toEqual(['Rank', 'Title']);
  expect(o.tables[0].rowCount).toBe(3);

  // Image: exactly one
  expect(o.counts.images).toBe(1);

  // Every interactive element carries a numeric bounding box
  expect(o.interactiveElements.length).toBeGreaterThan(5);
  for (const el of o.interactiveElements) {
    expect(el.bbox).toBeDefined();
    expect(typeof el.bbox.x).toBe('number');
    expect(typeof el.bbox.width).toBe('number');
  }

  // A real screenshot came back too
  expect(res.buffer.length).toBeGreaterThan(1000);
  expect(res.mimeType).toBe('image/jpeg');
}, 60_000);

test('capture returns a valid jpeg for both raw and clean passes', async () => {
  const raw = await captureForAI({ url: base, skipClean: true });
  const clean = await captureForAI({ url: base, observe: false });
  expect(raw.buffer.length).toBeGreaterThan(1000);
  expect(clean.buffer.length).toBeGreaterThan(1000);
  expect(clean.width).toBeGreaterThan(0);
  expect(clean.height).toBeGreaterThan(0);
  // JPEG magic bytes
  expect(clean.buffer[0]).toBe(0xff);
  expect(clean.buffer[1]).toBe(0xd8);
}, 60_000);

test('extractElements returns interactive elements with bounding boxes', async () => {
  const res = await captureForAI({ url: base, extractElements: true });
  expect(res.elements).toBeDefined();
  expect(res.elements!.length).toBeGreaterThan(0);
  expect(res.elements![0].bbox).toBeDefined();
}, 60_000);
