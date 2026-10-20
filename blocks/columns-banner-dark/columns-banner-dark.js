import { createOptimizedPicture } from '../../scripts/aem.js';

function isImageOnly(el) {
  return !!el.querySelector('picture') && !el.textContent.trim();
}

/**
 * Dark banner: text + CTAs beside an illustration, over an optional background photo.
 *
 * Authored structure:
 *   Row 1 (optional): background image (single cell)
 *   Row 2: text cell (heading, paragraph, links) | illustration image cell
 *
 * @param {Element} block The columns-banner-dark block element
 */
export default function decorate(block) {
  const rows = [...block.children];

  // A leading single-cell, image-only row is the background
  const first = rows[0];
  if (rows.length > 1 && first && first.children.length === 1 && isImageOnly(first)) {
    first.className = 'columns-banner-dark-bg';
    const img = first.querySelector('picture > img');
    if (img) {
      first.replaceChildren(createOptimizedPicture(img.src, img.alt || '', false, [
        { media: '(min-width: 900px)', width: '2000' },
        { width: '900' },
      ]));
    }
    block.classList.add('has-bg');
  }

  const contentRows = rows.filter((row) => !row.classList.contains('columns-banner-dark-bg'));
  const cols = contentRows[0] ? contentRows[0].children.length : 0;
  block.classList.add(`columns-banner-dark-${cols}-cols`);

  contentRows.forEach((row) => {
    row.classList.add('columns-banner-dark-row');
    [...row.children].forEach((col) => {
      if (isImageOnly(col)) {
        col.classList.add('columns-banner-dark-img-col');
      } else {
        col.classList.add('columns-banner-dark-text-col');
      }
    });
  });
}
