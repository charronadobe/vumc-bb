/* eslint-disable */
/* global WebImporter */

/**
 * Parser for columns-banner-dark.
 * Source: .banner-feature:has(.secondaryDark) (Telehealth banner)
 * Target table:
 *   Row 1 (single cell): background photo
 *   Row 2: text cell (H2, paragraph, CTA links) | illustration image cell
 *
 * The background photo is an inline CSS background on the live page and an
 * <img> in the cleaned capture; both are emitted as <img>.
 * CTAs are <a><button> (invalid nesting) so iteration is keyed on the anchors.
 * The bg row stays single-cell on purpose: the block JS only treats a leading
 * one-cell image row as the background.
 */
const ORIGIN = 'https://www.vanderbilthealth.com/';

function absUrl(src) {
  try { return new URL(src, ORIGIN).href; } catch (e) { return src; }
}

function makeImg(document, src, alt) {
  const img = document.createElement('img');
  img.src = absUrl(src);
  img.alt = alt || '';
  return img;
}

function cleanText(el) {
  const clone = el.cloneNode(true);
  clone.querySelectorAll('svg, img, title').forEach((n) => n.remove());
  return clone.textContent.replace(/\s+/g, ' ').trim();
}

export default function parse(element, { document }) {
  const cells = [];
  const textCol = element.querySelector('.text-column');

  // Illustration: image outside the bg holder and outside the text column
  const bgHolder = element.querySelector('.module__214LV2CzP6UQ0G6x1NHV7c');
  const illustration = [...element.querySelectorAll('img')].find((i) => {
    const src = i.getAttribute('src') || '';
    return src && !src.startsWith('data:')
      && !(bgHolder && bgHolder.contains(i))
      && !(textCol && textCol.contains(i));
  });

  // Row 1: background photo
  let bg = null;
  if (bgHolder) {
    const bgImg = [...bgHolder.querySelectorAll('img')]
      .find((i) => (i.getAttribute('src') || '') && !i.getAttribute('src').startsWith('data:'));
    if (bgImg) {
      bg = makeImg(document, bgImg.getAttribute('src'), bgImg.getAttribute('alt'));
    } else {
      const styled = [bgHolder, ...bgHolder.querySelectorAll('[style]')]
        .find((el) => /url\(/.test(el.getAttribute('style') || ''));
      const m = styled && styled.getAttribute('style').match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/);
      if (m) bg = makeImg(document, m[1], '');
    }
  }
  if (bg) cells.push([bg]);

  // Row 2, cell 1: heading, copy, CTAs
  const text = [];
  const root = textCol || element;
  root.querySelectorAll('h1, h2, h3, h4, h5, h6, p').forEach((el) => {
    if (el.closest('a, button, .data-tracker-feature-banner-buttons')) return;
    if (!cleanText(el)) return;
    const tag = /^H[1-6]$/.test(el.tagName) ? el.tagName.toLowerCase() : 'p';
    const out = document.createElement(tag);
    if (tag === 'p') {
      const clone = el.cloneNode(true);
      clone.querySelectorAll('svg, img').forEach((n) => n.remove());
      out.innerHTML = clone.innerHTML.replace(/\s+/g, ' ').trim();
    } else {
      out.textContent = cleanText(el);
    }
    text.push(out);
  });

  const ctaRoot = root.querySelector('.data-tracker-feature-banner-buttons') || root;
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
    if (/\bsecondary(Dark)?\b/.test(cls)) {
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
    text.push(p);
  });

  // Row 2, cell 2: illustration
  const illo = illustration
    ? makeImg(document, illustration.getAttribute('src'), illustration.getAttribute('alt'))
    : '';

  cells.push([text, illo]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-banner-dark', cells });
  element.replaceWith(block);
}
