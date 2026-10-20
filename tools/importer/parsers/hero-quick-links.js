/* eslint-disable */
/* global WebImporter */

/**
 * Parser for hero-quick-links.
 * Source: .data-tracker-banner-hero (vanderbilthealth.com homepage)
 * Target table (1 column):
 *   Row 1: background image (CSS background on the live page, <img> in cleaned HTML)
 *   Row 2: H1 + one quick link per paragraph
 *
 * Quick links in the source are <a><button>label</button></a> (invalid nesting),
 * so iteration is keyed on the anchors (stable wrappers), never on the buttons.
 */
const ORIGIN = 'https://www.vanderbilthealth.com/';

function absUrl(src) {
  try { return new URL(src, ORIGIN).href; } catch (e) { return src; }
}

function findBackground(root) {
  const img = [...root.querySelectorAll('img')].find((i) => {
    const src = i.getAttribute('src') || '';
    return src && !src.startsWith('data:') && !i.closest('a, button');
  });
  if (img) return { src: img.getAttribute('src'), alt: img.getAttribute('alt') || '' };
  const styled = [root, ...root.querySelectorAll('[style*="background"]')]
    .find((el) => /url\(/.test(el.getAttribute('style') || ''));
  if (styled) {
    const m = styled.getAttribute('style').match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/);
    if (m) return { src: m[1], alt: '' };
  }
  return null;
}

function labelOf(el) {
  const clone = el.cloneNode(true);
  clone.querySelectorAll('svg, img, title').forEach((n) => n.remove());
  return clone.textContent.replace(/\s+/g, ' ').trim();
}

export default function parse(element, { document }) {
  const cells = [];

  // Row 1: background image
  const bg = findBackground(element);
  if (bg) {
    const img = document.createElement('img');
    img.src = absUrl(bg.src);
    img.alt = bg.alt;
    cells.push([img]);
  }

  // Row 2: heading + quick links
  const content = [];
  const heading = element.querySelector('h1, h2');
  if (heading) {
    const h1 = document.createElement('h1');
    h1.textContent = labelOf(heading);
    content.push(h1);
  }

  const seen = new Set();
  element.querySelectorAll('a[href]').forEach((a) => {
    const label = labelOf(a);
    const href = a.getAttribute('href');
    if (!label || !href || seen.has(href)) return;
    seen.add(href);
    const p = document.createElement('p');
    // Icon name comes from the source SVG's title/aria-label ("stethoscope icon" -> stethoscope)
    const svg = a.querySelector('svg');
    const iconName = svg && (svg.querySelector('title')?.textContent || svg.getAttribute('aria-label') || '')
      .replace(/\s*icon\s*$/i, '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    // authored icon token (:name:), rendered by EDS as <span class="icon icon-name">
    if (iconName) p.append(document.createTextNode(`:${iconName}: `));
    const link = document.createElement('a');
    link.href = href;
    link.textContent = label;
    p.append(link);
    content.push(p);
  });

  if (content.length) cells.push([content]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-quick-links', cells });
  element.replaceWith(block);
}
