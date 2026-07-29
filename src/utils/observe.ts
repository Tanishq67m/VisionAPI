import type { Page } from 'playwright';
import type { PageObservation } from '../types/capture.js';


export async function observePage(
  page: Page,
  scaleFactor: number
): Promise<PageObservation> {
  return await page.evaluate((scale) => {
    const isVisible = (el: Element): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      const style = window.getComputedStyle(el);
      if (
        style.visibility === 'hidden' ||
        style.display === 'none' ||
        style.opacity === '0'
      )
        return false;
      return true;
    };

    const box = (el: Element) => {
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.x * scale),
        y: Math.round(r.y * scale),
        width: Math.round(r.width * scale),
        height: Math.round(r.height * scale),
      };
    };

    const clean = (s: string | null | undefined) =>
      (s || '').replace(/\s+/g, ' ').trim();

    let idCounter = 1;
    const nextId = (prefix: string) => `${prefix}-${idCounter++}`;

    // ── Headings ────────────────────────────────────────────────────────────
    const headings = Array.from(
      document.querySelectorAll('h1, h2, h3, h4, h5, h6')
    )
      .filter(isVisible)
      .map((el) => ({
        level: Number(el.tagName.substring(1)),
        text: clean((el as HTMLElement).innerText),
      }))
      .filter((h) => h.text.length > 0)
      .slice(0, 100);

    // ── Buttons ─────────────────────────────────────────────────────────────
    const buttonNodes = Array.from(
      document.querySelectorAll(
        'button, [role="button"], input[type="submit"], input[type="button"], a.btn, a[class*="button"]'
      )
    ).filter(isVisible);

    const buttons = buttonNodes
      .map((el) => {
        const text =
          clean((el as HTMLElement).innerText) ||
          clean((el as HTMLInputElement).value) ||
          clean(el.getAttribute('aria-label')) ||
          clean(el.getAttribute('title'));
        return { id: nextId('btn'), text, bbox: box(el) };
      })
      .filter((b) => b.text.length > 0)
      .slice(0, 100);

    // ── Links ───────────────────────────────────────────────────────────────
    const links = Array.from(document.querySelectorAll('a[href]'))
      .filter(isVisible)
      .map((el) => ({
        text: clean((el as HTMLElement).innerText),
        href: (el as HTMLAnchorElement).href,
      }))
      .filter((l) => l.text.length > 0 && l.href && !l.href.startsWith('javascript:'))
      .slice(0, 200);

    // ── Forms ───────────────────────────────────────────────────────────────
    const forms = Array.from(document.querySelectorAll('form'))
      .filter(isVisible)
      .map((form) => {
        const fields = Array.from(
          form.querySelectorAll('input, select, textarea')
        )
          .filter((f) => (f as HTMLInputElement).type !== 'hidden')
          .map((f) => {
            const el = f as HTMLInputElement;
            return {
              type:
                el.tagName.toLowerCase() === 'input'
                  ? el.type || 'text'
                  : el.tagName.toLowerCase(),
              name: el.name || el.id || undefined,
              placeholder: clean(el.placeholder) || undefined,
              label:
                clean(
                  (el.labels && el.labels[0]?.innerText) ||
                    el.getAttribute('aria-label')
                ) || undefined,
              required: el.required || undefined,
            };
          })
          .slice(0, 40);
        return {
          id: nextId('form'),
          action: (form as HTMLFormElement).action || undefined,
          method: ((form as HTMLFormElement).method || 'get').toLowerCase(),
          fields,
          bbox: box(form),
        };
      })
      .slice(0, 30);

    // ── Standalone inputs (not inside a <form>) ──────────────────────────────
    const inputs = Array.from(
      document.querySelectorAll('input, select, textarea')
    )
      .filter(
        (el) =>
          isVisible(el) &&
          !el.closest('form') &&
          (el as HTMLInputElement).type !== 'hidden'
      )
      .map((el) => {
        const input = el as HTMLInputElement;
        return {
          type:
            el.tagName.toLowerCase() === 'input'
              ? input.type || 'text'
              : el.tagName.toLowerCase(),
          name: input.name || input.id || undefined,
          placeholder: clean(input.placeholder) || undefined,
        };
      })
      .slice(0, 60);

    // ── Tables ──────────────────────────────────────────────────────────────
    const tables = Array.from(document.querySelectorAll('table'))
      .filter(isVisible)
      .map((table) => {
        const headerCells = Array.from(
          table.querySelectorAll('thead th, thead td, tr:first-child th')
        ).map((c) => clean((c as HTMLElement).innerText));
        const rowCount = table.querySelectorAll('tr').length;
        return {
          id: nextId('table'),
          headers: headerCells.filter((h) => h.length > 0).slice(0, 30),
          rowCount,
          bbox: box(table),
        };
      })
      .slice(0, 30);

    // ── Images ──────────────────────────────────────────────────────────────
    const images = Array.from(document.querySelectorAll('img'))
      .filter(isVisible)
      .map((el) => ({
        alt: clean((el as HTMLImageElement).alt) || undefined,
        src: (el as HTMLImageElement).currentSrc || (el as HTMLImageElement).src,
      }))
      .filter((i) => !!i.src)
      .slice(0, 100);

    // ── Flat interactive elements (for click-targeting / overlays) ───────────
    const interactiveSelector = [
      'a[href]',
      'button',
      'input',
      'select',
      'textarea',
      '[role="button"]',
      '[role="link"]',
      '[role="checkbox"]',
      '[role="menuitem"]',
      '[role="tab"]',
    ].join(', ');

    const interactiveElements = Array.from(
      document.querySelectorAll(interactiveSelector)
    )
      .filter(isVisible)
      .map((el) => {
        const tagName = el.tagName.toLowerCase();
        const text =
          clean((el as HTMLElement).innerText) ||
          clean((el as HTMLInputElement).value) ||
          clean(el.getAttribute('aria-label'));
        const href = (el as HTMLAnchorElement).href || undefined;
        const role = el.getAttribute('role') || undefined;
        return {
          id: nextId('el'),
          tagName,
          ...(role ? { role } : {}),
          ...(text ? { text } : {}),
          ...(href ? { href } : {}),
          bbox: box(el),
        };
      })
      .slice(0, 300);

    return {
      pageTitle: document.title || '',
      headings,
      buttons,
      links,
      forms,
      inputs,
      tables,
      images,
      interactiveElements,
      counts: {
        headings: headings.length,
        buttons: buttons.length,
        links: links.length,
        forms: forms.length,
        inputs: inputs.length,
        tables: tables.length,
        images: images.length,
        interactiveElements: interactiveElements.length,
      },
    };
  }, scaleFactor);
}
