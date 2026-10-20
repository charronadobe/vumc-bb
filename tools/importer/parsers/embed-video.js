/* eslint-disable */
/* global WebImporter */

/**
 * Parser for embed-video.
 * Source: .data-tracker-banner-grid:has(iframe[src*="vidyard"])
 * Target table (1 column, 1 content row):
 *   Row 1: poster image (optional) + link to the video URL
 *
 * The source only renders a Vidyard iframe (no <img> poster in the DOM), so the
 * poster comes from a poster/thumbnail image if present, otherwise from the
 * Vidyard thumbnail captured during page analysis, otherwise the generic
 * Vidyard thumbnail endpoint (https://play.vidyard.com/{uuid}.jpg).
 */
const KNOWN_POSTERS = {
  n6HxhPYUCyuv9VgKD4YcuY: 'https://cdn.vidyard.com/thumbnails/48822386/UP3Sz5hHq9y0Z3nkhus0CursMIrW4hJ4.jpg',
};

function toVideoUrl(src) {
  if (!src) return '';
  let url = src.trim();
  if (url.startsWith('//')) url = `https:${url}`;
  try {
    const u = new URL(url);
    // Strip player query params; keep a clean canonical URL for authoring
    if (/vidyard\.com$/.test(u.hostname)) return `https://play.vidyard.com${u.pathname.replace(/\.html$/, '')}`;
    return u.href;
  } catch (e) {
    return url;
  }
}

export default function parse(element, { document }) {
  const iframe = element.querySelector('iframe[src*="vidyard"], iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src]');
  let videoUrl = toVideoUrl(iframe && iframe.getAttribute('src'));

  // Fallback: a link to a video host already in the markup
  if (!videoUrl) {
    const a = element.querySelector('a[href*="vidyard"], a[href*="youtu"], a[href*="vimeo"]');
    if (a) videoUrl = toVideoUrl(a.getAttribute('href'));
  }

  const content = [];

  // Poster image
  const posterImg = [...element.querySelectorAll('img')]
    .find((i) => (i.getAttribute('src') || '') && !(i.getAttribute('src') || '').startsWith('data:'));
  let posterSrc = posterImg ? posterImg.getAttribute('src') : '';
  if (!posterSrc && videoUrl && /vidyard/.test(videoUrl)) {
    const uuid = videoUrl.split('/').filter(Boolean).pop();
    posterSrc = KNOWN_POSTERS[uuid] || `https://play.vidyard.com/${uuid}.jpg`;
  }
  if (posterSrc) {
    const img = document.createElement('img');
    img.src = posterSrc;
    img.alt = (posterImg && posterImg.getAttribute('alt')) || '';
    content.push(img);
  }

  if (videoUrl) {
    const p = document.createElement('p');
    const link = document.createElement('a');
    link.href = videoUrl;
    link.textContent = videoUrl;
    p.append(link);
    content.push(p);
  }

  const cells = [];
  if (content.length) cells.push([content]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'embed-video', cells });
  element.replaceWith(block);
}
