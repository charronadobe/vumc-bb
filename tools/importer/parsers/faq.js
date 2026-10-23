/* eslint-disable */
/* global WebImporter */

/**
 * Parser for faq (authored mode).
 * Source: one wrapper per question (div.module__2Tzb2TUFiV6oNnP9RfG9hx containing
 * .data-tracker-text-body); consecutive sibling wrappers together form ONE faq block.
 * Target table (2 columns), one row per wrapper:
 *   question (plain text) | answer (rich content: p, ul/ol, links, strong/em)
 *
 * The import calls this parser once per matching wrapper, in document order. The first
 * wrapper of a run consumes all following matching siblings; later calls for consumed
 * wrappers are no-ops.
 */
const WRAPPER_CLASS = 'module__2Tzb2TUFiV6oNnP9RfG9hx';
const BODY_SELECTOR = '.data-tracker-text-body';
const CONSUMED_ATTR = 'data-faq-consumed';

function isFaqWrapper(el) {
  return !!el && el.nodeType === 1
    && el.classList.contains(WRAPPER_CLASS)
    && !!el.querySelector(BODY_SELECTOR);
}

function normalize(text) {
  return (text || '').replace(/[\s ]+/g, ' ').trim();
}

function isEmpty(el) {
  return !normalize(el.textContent) && !el.querySelector('img, picture, video, iframe');
}

function cleanAnswer(body, question) {
  const clone = body.cloneNode(true);
  // drop the question heading if it was repeated in the body
  clone.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    if (normalize(h.textContent) === question) h.remove();
  });
  // drop presentational attributes
  [clone, ...clone.querySelectorAll('*')].forEach((n) => {
    ['class', 'style', 'id'].forEach((a) => n.removeAttribute(a));
  });
  // drop empty paragraphs / list items (whitespace or &nbsp; only)
  clone.querySelectorAll('p, li, span, div').forEach((n) => {
    // the clone is detached, so use contains() to skip nodes already removed with an ancestor
    if (clone.contains(n) && isEmpty(n)) n.remove();
  });
  clone.querySelectorAll('ul, ol').forEach((list) => {
    if (!list.querySelector('li')) list.remove();
  });
  return [...clone.childNodes].filter((n) => n.nodeType === 1 || normalize(n.textContent));
}

export default function parse(element, { document }) {
  // already consumed by the first wrapper of this run
  if (!element.parentNode || element.hasAttribute(CONSUMED_ATTR)) return;

  // collect this wrapper and all following matching sibling wrappers
  const wrappers = [element];
  let next = element.nextElementSibling;
  while (isFaqWrapper(next)) {
    wrappers.push(next);
    next = next.nextElementSibling;
  }

  const cells = [];
  wrappers.forEach((wrapper) => {
    const heading = wrapper.querySelector('h2, h3');
    const question = heading ? normalize(heading.textContent) : '';
    const answer = [];
    wrapper.querySelectorAll(BODY_SELECTOR).forEach((body) => {
      answer.push(...cleanAnswer(body, question));
    });
    if (!question && !answer.length) return;
    cells.push([question, answer]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'faq', cells });
  element.replaceWith(block);
  wrappers.slice(1).forEach((w) => {
    w.setAttribute(CONSUMED_ATTR, 'true');
    w.remove();
  });
}
