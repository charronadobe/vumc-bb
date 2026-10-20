import { decorateIcons } from '../../scripts/aem.js';

/**
 * Header block – builds the site header from the nav fragment (content/nav.plain.html).
 *
 * Fragment sections (top-level divs), in order:
 *   1. utility bar – one or more lists; a list item with a nested list becomes a dropdown
 *   2. brand – logo link
 *   3. main navigation – list items; nested lists become full-width panels made of columns
 *      (column label + list of links; a <strong> link renders as a call-to-action button)
 *   4. search (optional) – heading (panel title), <em> (input placeholder), link (form action
 *      + submit label). The main-navigation link pointing at the same URL opens this panel.
 *   5. mobile (optional) – paragraph (menu button label), a list of extra links shown first in
 *      the mobile menu, and a list of links (with :icon: tokens) for the mobile action bar.
 *
 * All copy lives in the fragment; this file only adds controls and behavior.
 * Desktop layout from 1200px (matches the source); below that the menu is a drawer.
 */

const DESKTOP = window.matchMedia('(width >= 1200px)');
const ICON_TOKEN = /^\s*:([a-z0-9-]+):\s*$/;

async function fetchNav() {
  // metadata-independent: /content first (local preview), then site root (DA/EDS)
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) resp = await fetch('/nav.plain.html');
  if (!resp.ok) return null;
  const tmp = document.createElement('div');
  tmp.innerHTML = await resp.text();
  return tmp;
}

/** Text of a list item, excluding nested lists. */
function ownLabel(li) {
  return [...li.childNodes]
    .filter((n) => n.nodeType === Node.TEXT_NODE || (n.nodeType === Node.ELEMENT_NODE && n.tagName !== 'UL'))
    .map((n) => n.textContent)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Converts raw :name: tokens (not yet converted by the delivery pipeline) into icon spans. */
function decorateIconTokens(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const tokens = [];
  while (walker.nextNode()) {
    const match = walker.currentNode.textContent.match(ICON_TOKEN);
    if (match) tokens.push([walker.currentNode, match[1]]);
  }
  tokens.forEach(([node, name]) => {
    const icon = document.createElement('span');
    icon.className = `icon icon-${name}`;
    node.replaceWith(icon);
  });
  // an icon authored next to a link belongs to that link
  root.querySelectorAll('li > .icon + a').forEach((a) => a.prepend(a.previousElementSibling));
}

function closeAll(nav, except) {
  nav.querySelectorAll('.nav-toggle[aria-expanded="true"]').forEach((btn) => {
    if (btn === except) return;
    btn.setAttribute('aria-expanded', 'false');
    btn.closest('li')?.classList.remove('is-open');
  });
}

let idCount = 0;
const nextId = (prefix) => {
  idCount += 1;
  return `${prefix}-${idCount}`;
};

/** Turns a list item into a toggle button controlling `panel`. */
function makeToggle(nav, li, label, panel) {
  panel.id = nextId('nav-panel');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nav-toggle';
  btn.textContent = label;
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', panel.id);
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') !== 'true';
    // desktop: one panel at a time; mobile accordion: sections open independently
    if (DESKTOP.matches) closeAll(nav, btn);
    btn.setAttribute('aria-expanded', String(open));
    li.classList.toggle('is-open', open);
  });
  return btn;
}

function decorateLinks(list) {
  list.querySelectorAll('strong > a').forEach((a) => {
    a.classList.add('nav-cta');
    a.parentElement.replaceWith(a);
  });
}

/** Utility-bar dropdown: label + simple link list. */
function buildDropdown(nav, li) {
  const list = li.querySelector(':scope > ul');
  const label = ownLabel(li);
  list.classList.add('nav-dropdown');
  const btn = makeToggle(nav, li, label, list);
  li.classList.add('nav-has-dropdown');
  li.replaceChildren(btn, list);
}

/**
 * Main-navigation panel: each nested item is a column (label + links).
 * On mobile each column label collapses its links (expanded by default).
 */
function buildPanel(nav, li) {
  const columns = li.querySelector(':scope > ul');
  const label = ownLabel(li);
  const panel = document.createElement('div');
  panel.className = 'nav-panel';
  columns.classList.add('nav-panel-columns');
  columns.querySelectorAll(':scope > li').forEach((col) => {
    col.classList.add('nav-panel-column');
    const links = col.querySelector(':scope > ul');
    const heading = document.createElement('button');
    heading.type = 'button';
    heading.className = 'nav-panel-heading';
    heading.textContent = ownLabel(col);
    heading.setAttribute('aria-expanded', 'true');
    if (links) {
      links.id = nextId('nav-links');
      heading.setAttribute('aria-controls', links.id);
      links.classList.add('nav-panel-links');
      decorateLinks(links);
      col.replaceChildren(heading, links);
    } else {
      col.replaceChildren(heading);
    }
    heading.addEventListener('click', () => {
      if (DESKTOP.matches) return;
      heading.setAttribute('aria-expanded', String(heading.getAttribute('aria-expanded') !== 'true'));
    });
  });
  panel.append(columns);
  const btn = makeToggle(nav, li, label, panel);
  li.classList.add('nav-has-panel');
  li.replaceChildren(btn, panel);
}

/** Search form built from the search section of the fragment. */
function buildSearchForm(section, fallbackLabel) {
  const action = section.querySelector('a');
  const title = section.querySelector('h1, h2, h3, h4, h5, h6, p:not(:has(a, em))');
  const placeholder = section.querySelector('em');

  const form = document.createElement('form');
  form.className = 'nav-search-form';
  form.setAttribute('role', 'search');
  form.action = action.getAttribute('href');
  form.method = 'get';

  const input = document.createElement('input');
  input.type = 'search';
  input.name = 'query';
  input.id = nextId('nav-search-input');
  input.className = 'nav-search-input';
  if (placeholder) input.placeholder = placeholder.textContent.trim();

  const heading = document.createElement('label');
  heading.className = 'nav-panel-heading';
  heading.htmlFor = input.id;
  heading.textContent = title ? title.textContent.trim() : fallbackLabel;

  const row = document.createElement('div');
  row.className = 'nav-search-row';
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'nav-search-submit';
  submit.textContent = action.textContent.trim();
  row.append(input, submit);
  form.append(heading, row);
  return form;
}

function searchIcon() {
  const icon = document.createElement('span');
  icon.className = 'icon icon-search';
  icon.setAttribute('aria-hidden', 'true');
  return icon;
}

/** Desktop search panel opened from the main-navigation search link. */
function buildSearch(nav, li, section) {
  const label = li.textContent.trim();
  const panel = document.createElement('div');
  panel.className = 'nav-panel nav-search-panel';
  const form = buildSearchForm(section, label);
  panel.append(form);

  const btn = makeToggle(nav, li, label, panel);
  btn.classList.add('nav-search-toggle');
  btn.prepend(searchIcon());
  btn.addEventListener('click', () => {
    if (btn.getAttribute('aria-expanded') === 'true') form.querySelector('input').focus();
  });
  li.classList.add('nav-has-panel', 'nav-search');
  li.replaceChildren(btn, panel);
}

function buildUtility(nav, section) {
  const bar = document.createElement('div');
  bar.className = 'nav-utility';
  section.querySelectorAll(':scope > ul').forEach((list) => {
    list.classList.add('nav-utility-list');
    list.querySelectorAll(':scope > li').forEach((li) => {
      if (li.querySelector(':scope > ul')) buildDropdown(nav, li);
    });
    if (list.querySelector('.nav-has-dropdown')) list.classList.add('nav-utility-dropdowns');
    bar.append(list);
  });
  return bar;
}

function buildSections(nav, navSection, searchSection, mobileExtras) {
  const list = navSection?.querySelector('ul');
  if (!list) return null;
  list.classList.add('nav-sections');
  const searchHref = searchSection?.querySelector('a')?.getAttribute('href');
  list.querySelectorAll(':scope > li').forEach((li) => {
    li.classList.add('nav-item');
    const link = li.querySelector(':scope > a');
    if (li.querySelector(':scope > ul')) {
      buildPanel(nav, li);
    } else if (searchHref && link && link.getAttribute('href') === searchHref) {
      buildSearch(nav, li, searchSection);
    }
  });
  // mobile-only items lead the mobile menu
  [...(mobileExtras?.children || [])].reverse().forEach((li) => {
    li.classList.add('nav-item', 'nav-mobile-only');
    list.prepend(li);
  });
  return list;
}

function setDrawer(nav, open) {
  const hamburger = nav.querySelector('.nav-hamburger');
  nav.classList.toggle('is-open', open);
  hamburger?.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('nav-drawer-open', open && !DESKTOP.matches);
  if (!open) closeAll(nav);
}

export default async function decorate(block) {
  const fragment = await fetchNav();
  if (!fragment) return;
  const [utilitySection, brandSection, navSection, searchSection, mobileSection] = fragment.querySelectorAll(':scope > div');
  const [mobileExtras, actionList] = mobileSection ? mobileSection.querySelectorAll(':scope > ul') : [];

  const nav = document.createElement('nav');
  nav.id = 'nav';

  // brand bar: logo + mobile controls
  const brandBar = document.createElement('div');
  brandBar.className = 'nav-brand-bar';
  const brand = document.createElement('div');
  brand.className = 'nav-brand';
  const brandLink = brandSection?.querySelector('a');
  if (brandLink) brand.append(brandLink);
  brandBar.append(brand);

  // drawer: mobile search + scrollable menu + action bar (layout-transparent on desktop)
  const drawer = document.createElement('div');
  drawer.className = 'nav-drawer';
  drawer.id = nextId('nav-drawer');
  const scroller = document.createElement('div');
  scroller.className = 'nav-drawer-scroll';
  const sections = buildSections(nav, navSection, searchSection, mobileExtras);
  if (sections) scroller.append(sections);
  if (utilitySection) scroller.append(buildUtility(nav, utilitySection));

  let mobileSearch;
  if (searchSection) {
    mobileSearch = buildSearchForm(searchSection, '');
    mobileSearch.classList.add('nav-drawer-search');
    drawer.append(mobileSearch);
  }
  drawer.append(scroller);
  if (actionList) {
    actionList.classList.add('nav-action-bar');
    drawer.append(actionList);
  }

  // mobile controls
  const controls = document.createElement('div');
  controls.className = 'nav-mobile-controls';
  const menuLabel = mobileSection?.querySelector('p')?.textContent.trim();
  const hamburger = document.createElement('button');
  hamburger.type = 'button';
  hamburger.className = 'nav-hamburger';
  hamburger.setAttribute('aria-controls', drawer.id);
  hamburger.setAttribute('aria-expanded', 'false');
  if (menuLabel) hamburger.setAttribute('aria-label', menuLabel);
  hamburger.innerHTML = '<span class="icon icon-menu" aria-hidden="true"></span><span class="icon icon-close" aria-hidden="true"></span>';
  hamburger.addEventListener('click', () => setDrawer(nav, !nav.classList.contains('is-open')));
  if (mobileSearch) {
    const searchBtn = document.createElement('button');
    searchBtn.type = 'button';
    searchBtn.className = 'nav-mobile-search';
    searchBtn.setAttribute('aria-controls', drawer.id);
    searchBtn.setAttribute('aria-label', mobileSearch.querySelector('.nav-search-submit').textContent);
    searchBtn.append(searchIcon());
    searchBtn.addEventListener('click', () => {
      setDrawer(nav, true);
      mobileSearch.querySelector('input').focus();
    });
    controls.append(searchBtn);
  }
  controls.append(hamburger);
  brandBar.append(controls);

  nav.append(brandBar, drawer);
  decorateIconTokens(nav);
  decorateIcons(nav);

  nav.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = nav.querySelector('.nav-toggle[aria-expanded="true"]');
    if (open && DESKTOP.matches) {
      closeAll(nav);
      open.focus();
    } else if (nav.classList.contains('is-open')) {
      setDrawer(nav, false);
      hamburger.focus();
    }
  });

  // crossing the breakpoint resets open menus, the drawer and the hamburger icon
  DESKTOP.addEventListener('change', () => setDrawer(nav, false));

  const wrapper = document.createElement('div');
  wrapper.className = 'nav-wrapper';
  wrapper.append(nav);
  block.replaceChildren(wrapper);
}
