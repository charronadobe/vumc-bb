import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Article teaser cards. One row per card: image cell | body cell
 * (H3 title + "Read article" link).
 *
 * @param {Element} block The cards-article block element
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-article-card';

    [...row.children].forEach((cell) => {
      const isImage = cell.querySelector('picture') && !cell.textContent.trim();
      cell.className = isImage ? 'cards-article-card-image' : 'cards-article-card-body';
      li.append(cell);
    });

    // Article link: plain text link (not the image), styled as a text link
    const body = li.querySelector('.cards-article-card-body');
    if (body) {
      const links = [...body.querySelectorAll('a[href]')];
      const cta = links.find((a) => !a.closest('h1, h2, h3, h4, h5, h6')) || null;
      links.forEach((a) => {
        a.classList.remove('button', 'primary', 'secondary');
        const p = a.closest('.button-container');
        if (p) p.classList.remove('button-container');
      });
      if (cta) {
        cta.classList.add('cards-article-card-link');
        cta.closest('p')?.classList.add('cards-article-card-cta');
      }
    }

    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    img.closest('picture').replaceWith(
      createOptimizedPicture(img.src, img.alt || '', false, [{ width: '750' }]),
    );
  });

  block.replaceChildren(ul);
}
