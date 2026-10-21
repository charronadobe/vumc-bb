import { readBlockConfig } from '../../scripts/aem.js';

/**
 * Doctor search – searches a results spreadsheet (multi-sheet: "specialties", "doctors").
 *
 * Authored as key / value rows: "Results" (link to the spreadsheet) plus the form and
 * results labels. Specialty options come from the "specialties" sheet (id, specialty,
 * total, all results); doctors from the "doctors" sheet (specialty id, name, credentials,
 * specialties, languages, gender, profile, image). Language and gender options are the
 * values present in the doctors sheet. The search state lives in the URL query string.
 *
 * @param {Element} block The doctor-search block element
 */

const PARAMS = ['specialty', 'query', 'language', 'gender'];

let sheetBase = '';

/** Fetches one sheet; falls back to the local /content preview path. */
async function fetchSheet(path, name) {
  let resp = await fetch(`${path}?sheet=${name}`);
  sheetBase = '';
  if (!resp.ok) {
    resp = await fetch(`/content${path}?sheet=${name}`);
    sheetBase = '/content';
  }
  if (!resp.ok) return [];
  const json = await resp.json();
  const sheet = json[':type'] === 'multi-sheet' ? json[name] : json;
  return sheet?.data || [];
}

const splitList = (value) => (value || '').split(',').map((v) => v.trim()).filter(Boolean);

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (v === undefined || v === null || v === false) return;
    if (k === 'className') node.className = v;
    else node.setAttribute(k, v === true ? '' : v);
  });
  node.append(...children.filter((c) => c !== undefined && c !== null));
  return node;
}

function select(name, placeholder, options) {
  const s = el('select', { name, 'aria-label': placeholder });
  s.append(el('option', { value: '' }, placeholder));
  options.forEach(([value, label]) => s.append(el('option', { value }, label)));
  return el('div', { className: 'doctor-search-select' }, s);
}

function doctorCard(doctor, labels) {
  const img = el('img', {
    src: `${sheetBase}${doctor.image}`, alt: doctor.name, loading: 'lazy', width: 150, height: 225,
  });
  const name = el('a', { href: doctor.profile }, el('span', {}, doctor.name));
  if (doctor.credentials) name.append(' ', el('span', {}, doctor.credentials));
  return el(
    'li',
    { className: 'doctor-search-card' },
    el('div', { className: 'doctor-search-card-body' }, el('div', { className: 'doctor-search-photo' }, img), el('h3', {}, name), el('p', {}, doctor.specialties)),
    el('div', { className: 'doctor-search-card-footer' }, el('a', { href: doctor.profile, className: 'doctor-search-profile' }, labels.profile)),
  );
}

export default async function decorate(block) {
  const labels = readBlockConfig(block);
  const sheetPath = new URL(labels.results, window.location.href).pathname;
  block.textContent = '';

  const specialties = await fetchSheet(sheetPath, 'specialties');
  let doctors;
  const loadDoctors = async () => {
    doctors = doctors || await fetchSheet(sheetPath, 'doctors');
    return doctors;
  };

  // form
  const form = el('form', { className: 'doctor-search-form', role: 'search' });
  const query = el('input', {
    type: 'search', name: 'query', placeholder: labels.name, 'aria-label': labels.name, autocomplete: 'off',
  });
  const specialtySelect = select('specialty', labels.specialty, specialties.map((s) => [s.id, s.specialty]));
  const languageSelect = select('language', labels.language, []);
  const genderSelect = select('gender', labels.gender, []);
  const submit = el('button', { type: 'submit', className: 'doctor-search-submit' }, labels.search);
  const reset = el('button', { type: 'reset', className: 'doctor-search-reset' }, labels.reset);
  const filtersId = `${block.id || 'doctor-search'}-filters`;
  const more = el('button', {
    type: 'button', className: 'doctor-search-more', 'aria-expanded': 'false', 'aria-controls': filtersId,
  }, labels['more-filters']);
  const filters = el('div', { className: 'doctor-search-filters', id: filtersId, hidden: true }, languageSelect, genderSelect);
  form.append(
    el('div', { className: 'doctor-search-query' }, query),
    specialtySelect,
    submit,
    reset,
    el('div', { className: 'doctor-search-more-line' }, more),
    filters,
  );

  const results = el('div', { className: 'doctor-search-results', 'aria-live': 'polite' });
  block.append(form, results);

  const field = (name) => form.elements.namedItem(name);
  const setFilters = (open) => {
    filters.hidden = !open;
    more.setAttribute('aria-expanded', String(open));
    more.textContent = open ? labels['fewer-filters'] || labels['more-filters'] : labels['more-filters'];
  };
  more.addEventListener('click', () => setFilters(filters.hidden));

  const fillOptions = (all) => {
    const fill = (name, values) => {
      const s = field(name);
      if (s.options.length > 1) return;
      [...values].sort().forEach((v) => s.append(el('option', { value: v }, v)));
    };
    fill('language', new Set(all.flatMap((d) => splitList(d.languages))));
    fill('gender', new Set(all.map((d) => d.gender).filter(Boolean)));
  };

  const readState = () => Object.fromEntries(PARAMS.map((p) => [p, (field(p).value || '').trim()]));

  const writeUrl = (state) => {
    const url = new URL(window.location.href);
    PARAMS.forEach((p) => { if (state[p]) url.searchParams.set(p, state[p]); else url.searchParams.delete(p); });
    window.history.pushState({}, '', url);
  };

  const render = async (state) => {
    results.textContent = '';
    if (!PARAMS.some((p) => state[p])) return;
    const all = await loadDoctors();
    fillOptions(all);

    const q = state.query.toLowerCase();
    const seen = new Set();
    const matches = all.filter((d) => {
      if (state.specialty && d['specialty id'] !== state.specialty) return false;
      if (q && !`${d.name} ${d.specialties}`.toLowerCase().includes(q)) return false;
      if (state.language && !splitList(d.languages).includes(state.language)) return false;
      if (state.gender && d.gender !== state.gender) return false;
      const key = d.profile || d.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // specialty-only searches report the specialty's full total and link to the full results
    const spec = specialties.find((s) => s.id === state.specialty);
    const specialtyOnly = spec && !state.query && !state.language && !state.gender;
    const count = specialtyOnly ? Number(spec.total) || matches.length : matches.length;

    const heading = el('h2', { className: 'doctor-search-heading' }, el('span', { className: 'doctor-search-count' }, String(count)), ` ${labels['results-for']} `);
    const chips = el('span', { className: 'doctor-search-chips' });
    [['specialty', spec?.specialty], ['query', state.query], ['language', state.language], ['gender', state.gender]]
      .filter(([, value]) => value)
      .forEach(([name, value]) => {
        const chip = el('button', { type: 'button', className: 'doctor-search-chip', 'aria-label': `${labels['remove-filter']}: ${value}` }, el('span', {}, value));
        chip.addEventListener('click', () => {
          field(name).value = '';
          const next = readState();
          writeUrl(next);
          render(next);
        });
        chips.append(chip);
      });
    heading.append(chips);
    results.append(heading);

    if (matches.length) results.append(el('ul', { className: 'doctor-search-list' }, ...matches.map((d) => doctorCard(d, labels))));
    if (specialtyOnly && count > matches.length && spec['all results']) {
      results.append(el('p', { className: 'doctor-search-all' }, el('a', { href: spec['all results'], className: 'doctor-search-all-link' }, labels['all-results'])));
    }
  };

  const applyUrl = async () => {
    const params = new URLSearchParams(window.location.search);
    const state = Object.fromEntries(PARAMS.map((p) => [p, params.get(p) || '']));
    if (state.language || state.gender) {
      fillOptions(await loadDoctors());
      setFilters(true);
    }
    PARAMS.forEach((p) => { field(p).value = state[p]; });
    await render(readState());
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const state = readState();
    writeUrl(state);
    await render(state);
  });
  form.addEventListener('reset', () => {
    setTimeout(() => {
      writeUrl(readState());
      results.textContent = '';
    });
  });
  more.addEventListener('click', async () => { if (!filters.hidden) fillOptions(await loadDoctors()); }, { once: true });
  window.addEventListener('popstate', applyUrl);

  await applyUrl();
}
