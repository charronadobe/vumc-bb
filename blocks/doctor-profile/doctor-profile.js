import {
  a, br, div, h1, h2, h3, li, p, span, ul,
} from '../../scripts/dom-helpers.js';
import { fetchPlaceholders } from '../../scripts/shared.js';

const SC_DELIVERY = 'https://da-sc.adobeaem.workers.dev';

const DEFAULT_LABELS = {
  'doctor-expertise': 'Areas of Expertise',
  'doctor-locations': 'Locations',
  'doctor-education': 'Education',
  'doctor-board-certifications': 'Board Certifications',
  'doctor-appointment': 'Make an Appointment',
  'doctor-contact': 'Call',
  'doctor-directions': 'Get Directions',
  'doctor-profile-view-profile': 'View Profile',
  'doctor-profile-insurance': 'Insurance Plans Accepted',
};

function currentSite() {
  const host = window.location.hostname;
  const match = host.match(/^(?:[^.]+--)?([^.]+)--([^.]+)\.aem\.(page|live)$/);
  if (!match) return null;
  return { repo: match[1], org: match[2], env: match[3] === 'live' ? 'live' : 'preview' };
}

function fragmentPath(block) {
  if (block.dataset.fragmentPath) return block.dataset.fragmentPath;
  const link = block.querySelector('a');
  const value = (link?.getAttribute('href') || block.textContent || '').trim();
  if (!value) return '';
  const path = `/${value.replace(/^\/+/, '').replace(/\.(html|json)$/i, '')}`;
  block.dataset.fragmentPath = path;
  return path;
}

async function fetchEnv(env, site, path) {
  const url = `${SC_DELIVERY}/${env}/${site.org}/${site.repo}${path}`;
  const response = await fetch(url).catch(() => null);
  if (!response?.ok) return null;
  const json = await response.json().catch(() => null);
  return json?.data ? json : null;
}

async function fetchDoctor(path, site) {
  if (!site || !path) return null;
  const environments = site.env === 'live' ? ['live', 'preview'] : ['preview', 'live'];
  for (const env of environments) {
    const json = await fetchEnv(env, site, path);
    if (json) return json;
  }
  return null;
}

const asList = (value) => (Array.isArray(value) ? value.filter(Boolean) : (value ? [value] : []));
const telHref = (phone) => `tel:${String(phone || '').replace(/\D/g, '')}`;

function section(key, title, content) {
  return div(
    { class: `doctor-profile-section doctor-profile-${key}`, 'aria-labelledby': `doctor-profile-${key}-title` },
    h2({ id: `doctor-profile-${key}-title` }, title),
    content,
  );
}

function educationText(entry) {
  const title = entry.degree || entry.type || '';
  const details = [entry.institution, entry.year].filter(Boolean).join(', ');
  return [title, details].filter(Boolean).join(' - ');
}

function certificationText(entry) {
  const details = [entry.board, entry.year].filter(Boolean).join(', ');
  return [entry.specialty, details].filter(Boolean).join(' - ');
}

function locationCard(location, labels) {
  const address = location.address || {};
  const cityLine = [address.city, [address.state, address.postalCode].filter(Boolean).join(' ')]
    .filter(Boolean).join(', ');
  const addressLines = [address.street, cityLine].filter(Boolean);
  const actions = [
    location.phone && a({ class: 'doctor-profile-action', href: telHref(location.phone) }, location.phone),
    location.directionsUrl && a({
      class: 'doctor-profile-action', href: location.directionsUrl, target: '_blank', rel: 'noopener',
    }, labels['doctor-directions']),
  ].filter(Boolean);

  return li({ class: 'doctor-profile-location' },
    location.clinicName ? h3(location.clinicName) : '',
    addressLines.length ? p(...addressLines.flatMap((line, index) => (index ? [br(), line] : [line]))) : '',
    actions.length ? div({ class: 'doctor-profile-location-actions' }, ...actions) : '',
  );
}

function listSection(key, title, entries, render) {
  if (!entries.length) return null;
  return section(key, title, ul(...entries.map((entry) => li(render(entry)))));
}

export default async function decorate(block) {
  const path = fragmentPath(block);
  const json = await fetchDoctor(path, currentSite());
  if (!json) {
    block.dataset.blockStatus = 'error';
    block.replaceChildren(div(
      { class: 'doctor-profile-error' },
      p(`Doctor profile unavailable: ${path || '(no path)'}`),
    ));
    return;
  }

  const data = json.data;
  const labels = { ...DEFAULT_LABELS, ...await fetchPlaceholders() };
  const name = data.name || json.metadata?.title || '';
  const degree = data.degree || '';
  const baseName = degree && name.endsWith(degree) ? name.slice(0, -degree.length).trim() : name;
  const specialties = asList(data.specialties);
  const locations = asList(data.locations).filter((location) => location && (location.clinicName || location.address));
  const education = asList(data.education).filter((entry) => entry && (entry.degree || entry.type));
  const certifications = asList(data.boardCertifications).filter((entry) => entry && entry.specialty);
  const insurance = asList(data.insurancePlansAccepted);
  const contact = data.contact || {};
  const phone = contact.mainPhone || locations.find((location) => location.phone)?.phone;

  const identity = h1(
    baseName,
    degree ? span({ class: 'doctor-profile-degree' }, ` ${degree}`) : '',
  );
  const actions = [
    contact.appointmentUrl && a({
      class: 'doctor-profile-button doctor-profile-appointment',
      href: contact.appointmentUrl,
      target: '_blank',
      rel: 'noopener',
    }, labels['doctor-appointment']),
    phone && a({ class: 'doctor-profile-button', href: telHref(phone) }, `${labels['doctor-contact']} ${phone}`),
    data.profileUrl && a({
      class: 'doctor-profile-text-link', href: data.profileUrl, target: '_blank', rel: 'noopener',
    }, labels['doctor-profile-view-profile']),
  ].filter(Boolean);

  const header = div(
    { class: 'doctor-profile-header' },
    div({ class: 'doctor-profile-identity' },
      identity,
    ),
    actions.length ? div({ class: 'doctor-profile-actions' }, ...actions) : '',
  );

  const sections = [
      listSection('expertise', labels['doctor-expertise'], specialties, (specialty) => specialty),
    locations.length && section('locations', labels['doctor-locations'], ul(
      { class: 'doctor-profile-location-list' },
      ...locations.map((location) => locationCard(location, labels)),
    )),
    listSection('education', labels['doctor-education'], education, educationText),
    listSection('certifications', labels['doctor-board-certifications'], certifications, certificationText),
    listSection('insurance', labels['doctor-profile-insurance'], insurance, (plan) => (
      typeof plan === 'string' ? plan : (plan.name || plan.plan || JSON.stringify(plan))
    )),
  ].filter(Boolean);

  block.replaceChildren(header, ...sections);
}