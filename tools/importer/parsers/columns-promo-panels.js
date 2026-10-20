/* eslint-disable */
/* global WebImporter */

/**
 * Parser for columns-promo-panels.
 * Source: .data-tracker-banner-grid:not(:has(iframe)) — each instance holds
 * two .banner-feature panels.
 * Target table: one row, one cell per panel:
 *   [optional background image] H2, optional H3, paragraph(s), CTA link(s)
 *
 * Background images are inline CSS (style="background-image:url(...)") on the
 * live page and <img> in the cleaned capture; both are emitted as <img>.
 * CTAs are <a><button> (invalid nesting) so iteration is keyed on the anchors.
 * Primary buttons become <strong><a>, secondary buttons <em><a>.
 */
const ORIGIN = 'https://www.vanderbilthealth.com/';

function absUrl(src) {
  try { return new URL(src, ORIGIN).href; } catch (e) { return src; }
}

function findBackground(root) {
  const holder = root.querySelector('.module__214LV2CzP6UQ0G6x1NHV7c') || root;
  const img = [...holder.querySelectorAll('img')].find((i) => {
    const src = i.getAttribute('src') || '';
    return src && !src.startsWith('data:') && !i.closest('a, button, .text-column');
  });
  if (img) return { src: img.getAttribute('src'), alt: img.getAttribute('alt') || '' };
  const styled = [...holder.querySelectorAll('[style*="background"]')]
    .find((el) => !el.closest('.text-column') && /url\(/.test(el.getAttribute('style') || ''));
  if (styled) {
    const m = styled.getAttribute('style').match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/);
    if (m) return { src: m[1], alt: '' };
  }
  return null;
}

function cleanText(el) {
  const clone = el.cloneNode(true);
  clone.querySelectorAll('svg, img, title, button:empty').forEach((n) => n.remove());
  return clone.textContent.replace(/\s+/g, ' ').trim();
}

function buildPanel(panel, document) {
  const content = [];

  const bg = findBackground(panel);
  if (bg) {
    const img = document.createElement('img');
    img.src = absUrl(bg.src);
    img.alt = bg.alt;
    content.push(img);
  }

  const textRoot = panel.querySelector('.text-column') || panel;
  // Headings and paragraphs in document order (skip anything inside CTAs)
  textRoot.querySelectorAll('h1, h2, h3, h4, h5, h6, p').forEach((el) => {
    if (el.closest('a, button, .data-tracker-feature-banner-buttons')) return;
    const text = cleanText(el);
    if (!text) return;
    const tag = /^H[1-6]$/.test(el.tagName) ? el.tagName.toLowerCase() : 'p';
    const out = document.createElement(tag);
    if (tag === 'p') {
      // Preserve inline links inside body copy
      const clone = el.cloneNode(true);
      clone.querySelectorAll('svg, img').forEach((n) => n.remove());
      out.innerHTML = clone.innerHTML.replace(/\s+/g, ' ').trim();
    } else {
      out.textContent = text;
    }
    content.push(out);
  });

  const ctaRoot = panel.querySelector('.data-tracker-feature-banner-buttons') || panel;
  ctaRoot.querySelectorAll('a[href]').forEach((a) => {
    if (a.closest('p') && !a.closest('.data-tracker-feature-banner-buttons')) return;
    const label = cleanText(a);
    if (!label) return;
    const btn = a.querySelector('button') || a.nextElementSibling;
    const cls = (btn && btn.className) || '';
    const p = document.createElement('p');
    const link = document.createElement('a');
    link.href = a.getAttribute('href');
    link.textContent = label;
    if (/\bsecondary\b/.test(cls)) {
      const em = document.createElement('em');
      em.append(link);
      p.append(em);
    } else if (/\bprimary(Dark)?\b/.test(cls)) {
      const strong = document.createElement('strong');
      strong.append(link);
      p.append(strong);
    } else {
      p.append(link);
    }
    content.push(p);
  });

  return content;
}

export default function parse(element, { document }) {
  let panels = [...element.querySelectorAll(':scope > .banner-feature')];
  if (!panels.length) panels = [...element.querySelectorAll('.banner-feature')]
    .filter((p) => !p.parentElement.closest('.banner-feature'));
  if (!panels.length) panels = [element];

  const row = panels.map((panel) => buildPanel(panel, document));
  const cells = [row];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-promo-panels', cells });
  element.replaceWith(block);
}
