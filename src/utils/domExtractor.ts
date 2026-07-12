import type { Page } from 'playwright';
import type { InteractiveElement } from '../types/capture.js';

export async function extractInteractiveElements(
  page: Page,
  scaleFactor: number
): Promise<InteractiveElement[]> {
  return await page.evaluate((scale) => {
    const elements: Array<{
      id: string;
      tagName: string;
      role?: string;
      text?: string;
      href?: string;
      bbox: { x: number; y: number; width: number; height: number };
    }> = [];

    // Selectors that indicate interactivity
    const interactiveSelector = [
      'a',
      'button',
      'input',
      'select',
      'textarea',
      '[role="button"]',
      '[role="link"]',
      '[role="checkbox"]',
      '[role="menuitem"]',
      '[role="tab"]'
    ].join(', ');

    const nodes = document.querySelectorAll('*');
    let idCounter = 1;

    nodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;

      // Check if it matches our interactive selectors
      let isInteractive = node.matches(interactiveSelector);

      // Also check for cursor: pointer as a heuristic for clickable items (e.g. custom div buttons)
      if (!isInteractive) {
        const style = window.getComputedStyle(node);
        if (style.cursor === 'pointer') {
          isInteractive = true;
        }
      }

      if (!isInteractive) return;

      const rect = node.getBoundingClientRect();
      
      // Filter out elements that are not visible or effectively 0x0
      if (
        rect.width === 0 ||
        rect.height === 0 ||
        rect.x < 0 ||
        rect.y < 0
      ) {
        return;
      }
      
      const style = window.getComputedStyle(node);
      if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') {
        return;
      }

      const tagName = node.tagName.toLowerCase();
      const text = node.innerText?.trim() || (node as HTMLInputElement).value?.trim() || node.getAttribute('aria-label') || '';
      const href = (node as HTMLAnchorElement).href;
      const role = node.getAttribute('role') || undefined;

      elements.push({
        id: `el-${idCounter++}`,
        tagName,
        ...(role ? { role } : {}),
        ...(text ? { text } : {}),
        ...(href ? { href } : {}),
        bbox: {
          x: Math.round(rect.x * scale),
          y: Math.round(rect.y * scale),
          width: Math.round(rect.width * scale),
          height: Math.round(rect.height * scale),
        },
      });
    });

    return elements;
  }, scaleFactor);
}
