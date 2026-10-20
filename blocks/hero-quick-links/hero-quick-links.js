import { createOptimizedPicture, decorateIcons } from '../../scripts/aem.js';

const ICON_TOKEN = /^\s*:([a-z0-9-]+):\s*$/;

/**
 * Hero with background image, heading and a row of quick-link CTAs.
 *
 * Authored structure:
 *   Row 1: background image (optional)
 *   Row 2: H1 (+ optional text) followed by links (optionally with :icon: tokens)
 *
 * @param {Element} block The hero-quick-links block element
 */
export default function decorate(block) {
  const rows = [...block.children];

  // Background image: the first row that contains only a picture
  const bgRow = rows.find((row) => {
    const pic = row.querySelector('picture');
    return pic && !row.querySelector('h1, h2, a:not(:has(picture))');
  });

  if (bgRow) {
    bgRow.className = 'hero-quick-links-bg';
    const img = bgRow.querySelector('picture > img');
    if (img) {
      const optimized = createOptimizedPicture(img.src, img.alt || '', true, [
        { media: '(min-width: 900px)', width: '2000' },
        { width: '900' },
      ]);
      bgRow.replaceChildren(optimized);
    }
  } else {
    block.classList.add('no-image');
  }

  const contentRow = rows.find((row) => row !== bgRow) || rows[rows.length - 1];
  if (!contentRow || contentRow === bgRow) return;
  contentRow.className = 'hero-quick-links-content';

  const contentCell = contentRow.firstElementChild || contentRow;

  // Collect quick links (any link outside a heading)
  const links = [...contentCell.querySelectorAll('a[href]')]
    .filter((a) => !a.closest('h1, h2, h3, h4, h5, h6'));

  if (!links.length) return;

  const list = document.createElement('ul');
  list.className = 'hero-quick-links-list';

  links.forEach((link) => {
    const parent = link.parentElement;
    link.classList.remove('button', 'primary', 'secondary');
    link.classList.add('hero-quick-links-link');

    // Wrap label text so it can be laid out next to an optional icon
    const textNodes = [...link.childNodes]
      .filter((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    textNodes.forEach((n) => {
      const span = document.createElement('span');
      span.className = 'hero-quick-links-label';
      span.textContent = n.textContent.trim();
      n.replaceWith(span);
    });

    // Icons authored next to (not inside) the link move into it. A raw :name: token
    // (content not yet converted by the delivery pipeline) becomes an icon span here.
    if (parent && parent !== contentCell) {
      [...parent.childNodes].forEach((n) => {
        const match = n.nodeType === Node.TEXT_NODE && n.textContent.match(ICON_TOKEN);
        if (!match) return;
        const icon = document.createElement('span');
        icon.className = `icon icon-${match[1]}`;
        n.replaceWith(icon);
        // only icons created here still need their image (the page already decorated the rest)
        const holder = document.createElement('span');
        holder.append(icon.cloneNode());
        decorateIcons(holder);
        icon.replaceWith(holder.firstElementChild);
      });
      parent.querySelectorAll(':scope > .icon').forEach((icon) => link.prepend(icon));
    }

    const li = document.createElement('li');
    li.append(link);
    list.append(li);

    // Remove now-empty wrappers (p / strong / em)
    let wrapper = parent;
    while (wrapper && wrapper !== contentCell && !wrapper.textContent.trim()
      && !wrapper.querySelector('picture, img, a')) {
      const next = wrapper.parentElement;
      wrapper.remove();
      wrapper = next;
    }
  });

  contentCell.append(list);
}
