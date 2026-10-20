/* eslint-disable */
/* global WebImporter */

/**
 * Parser for cards-article.
 * Source: .data-tracker-stories div:has(> div > div > .data-tracker-news-card)
 * Target table (2 columns), one row per card:
 *   image | H3 title + "Read article" link
 *
 * Iteration is keyed on .data-tracker-news-card (stable per-card wrapper).
 * The empty overlay <a> on each card may be stripped by the importer before
 * parsing, so the article URL is taken from the visible "Read article" link
 * first and the overlay link only as a fallback.
 */
const ORIGIN = 'https://www.vanderbilthealth.com/';

function absUrl(src) {
  try { return new URL(src, ORIGIN).href; } catch (e) { return src; }
}

export default function parse(element, { document }) {
  const cells = [];
  const cards = [...element.querySelectorAll('.data-tracker-news-card')];

  cards.forEach((card) => {
    // Image cell
    const srcImg = [...card.querySelectorAll('img')]
      .find((i) => (i.getAttribute('src') || '') && !i.getAttribute('src').startsWith('data:'));
    let imageCell = '';
    let src = srcImg ? srcImg.getAttribute('src') : '';
    let alt = srcImg ? (srcImg.getAttribute('alt') || '') : '';
    if (!src) {
      // Live page renders the image as <div role="img" aria-label style="background-image:url(...)">
      const styled = [...card.querySelectorAll('[style*="background"]')]
        .find((el) => /url\(/.test(el.getAttribute('style') || ''));
      const m = styled && styled.getAttribute('style').match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/);
      if (m) {
        [, src] = m;
        alt = styled.getAttribute('aria-label') || '';
      }
    }
    if (src) {
      const img = document.createElement('img');
      img.src = absUrl(src);
      img.alt = alt;
      imageCell = img;
    }

    // Text cell
    const text = [];
    const heading = card.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading) {
      const h3 = document.createElement('h3');
      h3.textContent = heading.textContent.replace(/\s+/g, ' ').trim();
      text.push(h3);
    }

    const links = [...card.querySelectorAll('a[href]')];
    const readLink = links.find((a) => a.textContent.trim()) || links[0];
    if (readLink) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = readLink.getAttribute('href');
      a.textContent = readLink.textContent.replace(/\s+/g, ' ').trim() || 'Read article';
      p.append(a);
      text.push(p);
    }

    cells.push([imageCell, text]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-article', cells });
  element.replaceWith(block);
}
