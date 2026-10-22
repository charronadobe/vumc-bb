import { readBlockConfig } from '../../scripts/aem.js';

/**
 * Medical feeds – places the medical-feeds widget (widgets/medical-feeds) on a page.
 *
 * Authored as key / value rows: "Feed URL" (the deployed medical-feeds worker, e.g.
 * https://<worker-subdomain>.workers.dev/medical-feeds.xml) plus optional "Heading",
 * "Loading text", "Error text" and "Empty text". Each row becomes the widget attribute of
 * the same name; the widget fetches the feed and loads its own stylesheet.
 *
 * @param {Element} block The medical-feeds block element
 */

const ATTRIBUTES = ['feed-url', 'heading', 'loading-text', 'error-text', 'empty-text'];

export default async function decorate(block) {
  const config = readBlockConfig(block);
  const widget = document.createElement('medical-feeds');
  ATTRIBUTES.forEach((name) => {
    const value = config[name];
    if (typeof value === 'string' && value.trim()) widget.setAttribute(name, value.trim());
  });
  block.replaceChildren(widget);
  await import(`${window.hlx.codeBasePath}/widgets/medical-feeds/medical-feeds.js`);
}
