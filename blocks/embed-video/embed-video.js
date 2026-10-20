/*
 * Embed Video block
 * Video embed with optional poster image. Supports Vidyard, YouTube and Vimeo,
 * falling back to a generic iframe for other URLs.
 *
 * Authored structure (single cell):
 *   optional poster image
 *   link to the video (https://play.vidyard.com/<uuid>, YouTube, Vimeo)
 */

import { createOptimizedPicture } from '../../scripts/aem.js';

const VIDYARD_HOSTS = ['play.vidyard.com', 'share.vidyard.com', 'video.vidyard.com'];

function getVidyardId(url) {
  // play.vidyard.com/<uuid>[.html|.jpg], share.vidyard.com/watch/<uuid>
  const parts = url.pathname.split('/').filter(Boolean);
  const last = parts[parts.length - 1] || '';
  return last.replace(/\.(html|jpg|png|js)$/i, '');
}

function getYoutubeId(url) {
  if (url.hostname.includes('youtu.be')) return url.pathname.split('/').filter(Boolean)[0] || '';
  const v = url.searchParams.get('v');
  if (v) return v;
  const match = url.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/);
  return match ? match[1] : '';
}

function getVimeoId(url) {
  const parts = url.pathname.split('/').filter((p) => /^\d+$/.test(p));
  return parts[0] || '';
}

/**
 * Resolve provider details for a video URL.
 * @param {URL} url
 * @returns {{ provider: string, src: (autoplay: boolean) => string, poster?: string }}
 */
function resolveProvider(url) {
  const host = url.hostname.replace(/^www\./, '');

  if (VIDYARD_HOSTS.includes(host) || host.endsWith('.vidyard.com')) {
    const id = encodeURIComponent(getVidyardId(url));
    return {
      provider: 'vidyard',
      src: (autoplay) => `https://play.vidyard.com/${id}?disable_popouts=1&v=4&type=inline${autoplay ? '&autoplay=1&muted=1' : ''}`,
      poster: id ? `https://play.vidyard.com/${id}.jpg` : undefined,
    };
  }

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be' || host === 'youtube-nocookie.com') {
    const id = encodeURIComponent(getYoutubeId(url));
    return {
      provider: 'youtube',
      src: (autoplay) => `https://www.youtube.com/embed/${id}?rel=0${autoplay ? '&autoplay=1&mute=1' : ''}`,
      poster: id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : undefined,
    };
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = encodeURIComponent(getVimeoId(url));
    return {
      provider: 'vimeo',
      src: (autoplay) => `https://player.vimeo.com/video/${id}${autoplay ? '?autoplay=1&muted=1' : ''}`,
    };
  }

  return {
    provider: 'generic',
    src: () => url.href,
  };
}

function createIframe(src, title) {
  const wrapper = document.createElement('div');
  wrapper.className = 'embed-video-frame';
  const iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.title = title;
  iframe.loading = 'lazy';
  iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture; encrypted-media');
  iframe.setAttribute('allowfullscreen', '');
  wrapper.append(iframe);
  return wrapper;
}

function loadEmbed(block, config, autoplay, title) {
  if (block.classList.contains('embed-video-is-loaded')) return;
  block.replaceChildren(createIframe(config.src(autoplay), title));
  block.classList.add('embed-video-is-loaded');
}

/** @param {Element} block The embed-video block element */
export default function decorate(block) {
  const link = block.querySelector('a[href]');
  if (!link) return;

  let url;
  try {
    url = new URL(link.href);
  } catch (e) {
    return;
  }

  const config = resolveProvider(url);
  block.classList.add(`embed-video-${config.provider}`);

  const authoredPicture = block.querySelector('picture');
  const authoredImg = authoredPicture?.querySelector('img');
  const linkText = link.textContent.trim();
  // Accessible name comes from authored content (link text or poster alt)
  const title = (linkText && linkText !== link.href ? linkText : '')
    || authoredImg?.alt
    || linkText
    || url.hostname;

  block.textContent = '';

  let poster = null;
  if (authoredImg) {
    poster = createOptimizedPicture(authoredImg.src, authoredImg.alt || '', false, [
      { media: '(min-width: 900px)', width: '1600' },
      { width: '750' },
    ]);
  } else if (config.poster) {
    // Provider thumbnail fallback (Vidyard / YouTube)
    poster = document.createElement('picture');
    const img = document.createElement('img');
    img.src = config.poster;
    img.alt = '';
    img.loading = 'lazy';
    poster.append(img);
  }

  if (poster) {
    const placeholder = document.createElement('div');
    placeholder.className = 'embed-video-placeholder';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'embed-video-play';
    button.setAttribute('aria-label', title);
    placeholder.append(poster, button);
    placeholder.addEventListener('click', () => loadEmbed(block, config, true, title));
    block.append(placeholder);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      observer.disconnect();
      loadEmbed(block, config, false, title);
    }
  });
  observer.observe(block);
}
