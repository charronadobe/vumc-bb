/**
 * Footer block – builds the site footer from the footer fragment (content/footer.plain.html).
 *
 * Fragment sections (top-level divs), in order:
 *   1. top row – a list of social/quick links (image or text links) and an optional badge
 *      paragraph (linked image) shown on the right
 *   2. link columns – repeated heading + list pairs; each pair becomes one column
 *   3+. legal – every remaining section becomes a column of the bottom legal band
 *
 * All copy lives in the fragment; this file only adds layout wrappers.
 */

async function fetchFooter() {
  // metadata-independent: /content first (local preview), then site root (DA/EDS)
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) resp = await fetch('/footer.plain.html');
  if (!resp.ok) return null;
  const tmp = document.createElement('div');
  tmp.innerHTML = await resp.text();
  return tmp;
}

function wrap(className, children) {
  const el = document.createElement('div');
  el.className = className;
  el.append(...children);
  return el;
}

function buildTop(section) {
  const list = section.querySelector('ul');
  list?.classList.add('footer-social');
  list?.querySelectorAll('li').forEach((li) => {
    if (li.querySelector('img')) li.classList.add('footer-social-icon');
  });
  const badge = section.querySelector('p:has(img)');
  badge?.classList.add('footer-badge');
  return wrap('footer-top', [list, badge].filter(Boolean));
}

/** Groups consecutive heading + list pairs into columns. */
function buildColumns(section) {
  const columns = [];
  let current;
  [...section.children].forEach((el) => {
    if (/^H[1-6]$/.test(el.tagName) || !current) {
      current = wrap('footer-column', []);
      columns.push(current);
    }
    current.append(el);
  });
  return wrap('footer-columns', columns);
}

function buildLegal(sections) {
  return wrap('footer-legal', sections.map((s) => wrap('footer-legal-column', [...s.children])));
}

export default async function decorate(block) {
  const fragment = await fetchFooter();
  if (!fragment) return;
  const [top, links, ...legal] = fragment.querySelectorAll(':scope > div');

  const parts = [];
  if (top) parts.push(buildTop(top));
  if (links) parts.push(buildColumns(links));
  if (legal.length) parts.push(buildLegal(legal));

  block.replaceChildren(wrap('footer-inner', parts));
}
