import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Side-by-side promo panels. Each cell of a row is one panel:
 * optional background image first, then heading(s), text and CTA links.
 *
 * @param {Element} block The columns-promo-panels block element
 */
export default function decorate(block) {
  const firstRow = block.firstElementChild;
  const cols = firstRow ? firstRow.children.length : 0;
  block.classList.add(`columns-promo-panels-${cols}-cols`);

  [...block.children].forEach((row) => {
    row.classList.add('columns-promo-panels-row');

    [...row.children].forEach((panel) => {
      panel.classList.add('columns-promo-panels-panel');

      const pic = panel.querySelector('picture');
      const hasText = [...panel.children].some((el) => !el.querySelector('picture') && el.textContent.trim());

      if (pic && hasText) {
        // First picture with other content = panel background image
        const picParent = pic.parentElement;
        const img = pic.querySelector('img');
        const bg = document.createElement('div');
        bg.className = 'columns-promo-panels-bg';
        bg.append(img
          ? createOptimizedPicture(img.src, img.alt || '', false, [{ width: '1200' }])
          : pic);
        if (img) pic.remove();
        if (picParent && picParent !== panel && !picParent.textContent.trim()
          && !picParent.querySelector('picture, img')) {
          picParent.remove();
        }

        const content = document.createElement('div');
        content.className = 'columns-promo-panels-content';
        content.append(...panel.childNodes);
        panel.replaceChildren(bg, content);
        panel.classList.add('has-bg');
      } else if (pic) {
        panel.classList.add('columns-promo-panels-img-col');
      } else {
        const content = document.createElement('div');
        content.className = 'columns-promo-panels-content';
        content.append(...panel.childNodes);
        panel.replaceChildren(content);
      }
    });
  });
}
