/* eslint-disable */
/* global WebImporter */

/**
 * Cleanup transformer for vanderbilthealth.com.
 * Removes non-authorable site chrome (global header, footer, modals),
 * the visually hidden page H1 and carousel arrow controls.
 * All selectors were verified against migration-work/cleaned.html.
 */
// Fallback block roots if payload.template.blocks is unavailable
const BLOCK_ROOT_FALLBACK = [
  '.data-tracker-banner-hero',
  '.data-tracker-banner-grid',
  '.banner-feature:has(.secondaryDark)',
  '.data-tracker-stories',
];

function getBlockRoots(element, payload) {
  const blocks = (payload && payload.template && payload.template.blocks) || [];
  const selectors = blocks.flatMap((b) => b.instances || []);
  const list = selectors.length ? selectors : BLOCK_ROOT_FALLBACK;
  const roots = [];
  list.forEach((sel) => {
    try {
      element.querySelectorAll(sel).forEach((el) => roots.push(el));
    } catch (e) {
      // invalid selector in this DOM engine, skip
    }
  });
  return roots;
}

function ctaLabel(a) {
  const clone = a.cloneNode(true);
  clone.querySelectorAll('svg, img, title, [aria-hidden="true"], .sr-only, .visually-hidden')
    .forEach((n) => n.remove());
  return clone.textContent.replace(/\s+/g, ' ').trim();
}

/**
 * Default-content CTA groups (.data-tracker-feature-banner-buttons outside any
 * block instance) are <a><button class="primary|secondary...">. Emit one <p>
 * per link: primary -> <p><strong><a></a></strong></p>,
 * secondary -> <p><em><a></a></em></p> (same convention as block parsers).
 */
function normalizeDefaultContentCtas(element, payload) {
  const document = element.ownerDocument || payload.document;
  const roots = getBlockRoots(element, payload);
  element.querySelectorAll('.data-tracker-feature-banner-buttons').forEach((group) => {
    if (roots.some((r) => r === group || r.contains(group))) return;
    const paragraphs = [];
    group.querySelectorAll('a[href]').forEach((a) => {
      const label = ctaLabel(a);
      if (!label) return;
      const btn = a.querySelector('button') || a.nextElementSibling;
      const cls = (btn && btn.getAttribute('class')) || '';
      const link = document.createElement('a');
      link.href = a.getAttribute('href');
      link.textContent = label;
      const p = document.createElement('p');
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
      paragraphs.push(p);
    });
    if (paragraphs.length) group.replaceWith(...paragraphs);
  });
}

export default function transform(hookName, element, payload) {
  if (hookName === 'beforeTransform') {
    // Must run before block parsers; groups inside block instances are skipped
    normalizeDefaultContentCtas(element, payload);

    WebImporter.DOMUtils.remove(element, [
      // Global header (skip links, desktop + mobile nav)
      '[class*="HeaderOrganism"]',
      // Global footer
      '#footer',
      'footer',
      // Modal dialogs (make an appointment, insurance plans, gallery, form)
      '#modal-root',
      'next-route-announcer',
      // Visually hidden sr-only H1 "Vanderbilt Health" (direct child of the main wrapper)
      '#main-content > div > h1',
      // Carousel prev/next arrow buttons (icon-only, inline SVG data URIs)
      '#main-content button:has(> img[src^="data:image/svg"])',
    ]);
  }

  if (hookName === 'afterTransform') {
    WebImporter.DOMUtils.remove(element, [
      'nav',
      'script',
      'style',
      'noscript',
      'link',
      'iframe:not([src*="vidyard"])',
    ]);

    // Strip tracking / framework attributes
    element.querySelectorAll('*').forEach((el) => {
      [...el.attributes].forEach((attr) => {
        // Keep data-excat-* markers used by the sections transformer
        if (attr.name.startsWith('data-excat-')) return;
        if (attr.name.startsWith('data-') || attr.name.startsWith('on')) {
          el.removeAttribute(attr.name);
        }
      });
    });

    // "<p><span>Label</span><br>Text</p>" (e.g. About Ratings and Comments) becomes an h3 + p
    element.querySelectorAll('p').forEach((p) => {
      const label = p.firstElementChild;
      if (!label || label.tagName !== 'SPAN' || p.firstChild !== label) return;
      const br = label.nextSibling;
      if (!br || br.nodeName !== 'BR') return;
      const heading = element.ownerDocument.createElement('h3');
      heading.textContent = label.textContent.trim();
      label.remove();
      br.remove();
      p.before(heading);
    });
  }
}
