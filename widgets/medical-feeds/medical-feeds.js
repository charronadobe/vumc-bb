const MAX_ITEMS = 10;
const STYLESHEET_URL = new URL('./medical-feeds.css', import.meta.url).href;

function loadStylesheet() {
  const alreadyLoaded = [...document.querySelectorAll('link[rel="stylesheet"]')]
    .some((stylesheet) => stylesheet.href === STYLESHEET_URL);

  if (!alreadyLoaded) {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = STYLESHEET_URL;
    document.head.append(stylesheet);
  }
}

function getText(parent, selector) {
  return parent.querySelector(selector)?.textContent?.trim() || '';
}

function getSummary(value) {
  const documentFragment = new DOMParser().parseFromString(value, 'text/html');
  documentFragment.querySelectorAll('script, style').forEach((node) => node.remove());
  return documentFragment.body.textContent.replace(/\s+/g, ' ').trim();
}

function getArticle(item) {
  const title = getText(item, 'title');
  const rawLink = getText(item, 'link');
  if (!title || !rawLink) return null;

  let link;
  try {
    link = new URL(rawLink);
  } catch {
    return null;
  }
  if (link.protocol !== 'https:') return null;

  const rawDate = getText(item, 'pubDate');
  const publishedAt = rawDate ? new Date(rawDate) : null;
  const timestamp = publishedAt && !Number.isNaN(publishedAt.getTime())
    ? publishedAt.getTime()
    : 0;

  return {
    title,
    link: link.href,
    summary: getSummary(getText(item, 'description')),
    publishedAt: timestamp ? publishedAt : null,
    timestamp,
  };
}

function createMessage(text, className, role) {
  const message = document.createElement('p');
  message.className = className;
  message.textContent = text;
  if (role) message.setAttribute('role', role);
  return message;
}

class MedicalFeeds extends HTMLElement {
  #controller;

  connectedCallback() {
    if (this.dataset.initialized) return;
    this.dataset.initialized = 'true';
    loadStylesheet();
    this.loadFeed();
  }

  disconnectedCallback() {
    this.#controller?.abort();
  }

  async loadFeed() {
    const url = this.getAttribute('feed-url');
    this.setAttribute('aria-busy', 'true');
    const loadingText = this.getAttribute('loading-text');
    this.replaceChildren();
    if (loadingText) {
      this.append(createMessage(loadingText, 'medical-feeds-status', 'status'));
    }

    try {
      if (!url) throw new Error('The feed-url attribute is required.');
      this.#controller = new AbortController();
      const response = await fetch(url, {
        headers: { Accept: 'application/rss+xml, application/xml, text/xml' },
        signal: this.#controller.signal,
      });
      if (!response.ok) throw new Error(`Feed request failed with status ${response.status}.`);

      const feedDocument = new DOMParser().parseFromString(await response.text(), 'application/xml');
      if (feedDocument.querySelector('parsererror') || !feedDocument.querySelector('rss > channel')) {
        throw new Error('The feed response is not valid RSS.');
      }

      const channel = feedDocument.querySelector('rss > channel');
      const headingText = this.getAttribute('heading') || getText(channel, 'title');
      const articles = [...channel.querySelectorAll('item')]
        .map(getArticle)
        .filter(Boolean)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, MAX_ITEMS);

      this.renderFeed(headingText, articles);
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('medical-feeds: failed to load the Medical Xpress feed.', error);
      this.replaceChildren();
      const errorText = this.getAttribute('error-text');
      if (errorText) {
        this.append(createMessage(errorText, 'medical-feeds-status', 'alert'));
      }
      this.dispatchEvent(new CustomEvent('medical-feeds-error', {
        bubbles: true,
        detail: { error },
      }));
    } finally {
      this.setAttribute('aria-busy', 'false');
    }
  }

  renderFeed(headingText, articles) {
    this.replaceChildren();
    const section = document.createElement('section');
    section.className = 'medical-feeds-content';

    if (headingText) {
      const heading = document.createElement('h2');
      heading.className = 'medical-feeds-heading';
      heading.textContent = headingText;
      section.append(heading);
    }

    if (!articles.length) {
      const emptyText = this.getAttribute('empty-text');
      if (emptyText) {
        section.append(createMessage(emptyText, 'medical-feeds-status', 'status'));
      }
      this.append(section);
      return;
    }

    const list = document.createElement('ul');
    list.className = 'medical-feeds-list';

    articles.forEach((article) => {
      const listItem = document.createElement('li');
      listItem.className = 'medical-feeds-item';
      const articleElement = document.createElement('article');
      articleElement.className = 'medical-feeds-article';

      const title = document.createElement('h3');
      title.className = 'medical-feeds-title';
      const link = document.createElement('a');
      link.href = article.link;
      link.textContent = article.title;
      title.append(link);
      articleElement.append(title);

      if (article.publishedAt) {
        const date = document.createElement('time');
        date.className = 'medical-feeds-date';
        date.dateTime = article.publishedAt.toISOString();
        date.textContent = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
          .format(article.publishedAt);
        articleElement.append(date);
      }

      if (article.summary) {
        const summary = document.createElement('p');
        summary.className = 'medical-feeds-summary';
        summary.textContent = article.summary;
        articleElement.append(summary);
      }

      listItem.append(articleElement);
      list.append(listItem);
    });

    section.append(list);
    this.append(section);
  }
}

loadStylesheet();
if (!customElements.get('medical-feeds')) {
  customElements.define('medical-feeds', MedicalFeeds);
}
