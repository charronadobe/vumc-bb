import { createTag, fetchPlaceholders } from '../../scripts/shared.js';

/**
 * Doctor – renders a provider profile from a "doctor" structured content document
 * (Document Authoring form). The form data is collected by buildStructuredContentBlock()
 * in scripts.js and handed over as JSON in the block's data-content attribute.
 * Layout modeled on vanderbilthealth.com/doctors/<name>.
 *
 * Labels come from /config/placeholders.json (keys below), falling back to the defaults.
 * The photo is looked up by profile URL in the Find a Doctor results sheet.
 *
 * @param {Element} block The doctor block element
 */

const LABELS = {
  'doctor-expertise': 'Areas of Expertise',
  'doctor-conditions': 'Conditions and Treatments',
  'doctor-locations': 'Location',
  'doctor-languages': 'Languages',
  'doctor-education': 'Education',
  'doctor-board-certifications': 'Board Certifications',
  'doctor-appointment': 'Make an Appointment',
  'doctor-contact': 'Contact',
  'doctor-directions': 'Get Directions',
  'doctor-quick-links': 'On this page',
  'doctor-results-sheet': '/doctors/results.json',
};

const asList = (value) => {
  if (Array.isArray(value)) return value.filter((v) => v && (typeof v !== 'string' || v.trim()));
  return value ? [value] : [];
};

async function findPhoto(sheet, profileUrl) {
  if (!sheet || !profileUrl) return null;
  try {
    const resp = await fetch(`${sheet}?sheet=doctors`);
    if (!resp.ok) return null;
    const json = await resp.json();
    const rows = (json[':type'] === 'multi-sheet' ? json.doctors : json)?.data || [];
    const path = new URL(profileUrl).pathname;
    return rows.find((row) => row.profile && new URL(row.profile, profileUrl).pathname === path)?.image || null;
  } catch (e) {
    return null;
  }
}

function section(id, title, ...content) {
  return createTag('section', { class: `doctor-section doctor-${id}`, id: `doctor-${id}`, 'aria-labelledby': `doctor-${id}-title` }, [
    createTag('h2', { id: `doctor-${id}-title` }, title),
    ...content,
  ]);
}

function list(items, render) {
  return createTag('ul', {}, items.map((item) => createTag('li', {}, render(item))));
}

const telHref = (phone) => `tel:${phone.replace(/\D/g, '')}`;

function educationText(entry) {
  const label = entry.degree || entry.type;
  const where = [entry.institution, entry.year].filter(Boolean).join(', ');
  return [label, where].filter(Boolean).join(' - ');
}

function certificationText(entry) {
  const where = [entry.board, entry.year].filter(Boolean).join(', ');
  return [entry.specialty, where].filter(Boolean).join(' - ');
}

function locationCard(location, labels) {
  const address = location.address || {};
  const cityLine = [address.city, [address.state, address.postalCode].filter(Boolean).join(' ')]
    .filter(Boolean).join(', ');
  const actions = createTag('div', { class: 'doctor-location-actions' }, [
    location.phone ? createTag('a', { class: 'button secondary doctor-location-button', href: telHref(location.phone) }, location.phone) : null,
    location.directionsUrl ? createTag('a', {
      class: 'button secondary doctor-location-button', href: location.directionsUrl, target: '_blank', rel: 'noopener',
    }, labels['doctor-directions']) : null,
  ]);
  return createTag('li', { class: 'doctor-location' }, [
    createTag('h3', {}, location.clinicName),
    createTag('p', {}, [address.street, cityLine].filter(Boolean).flatMap((line, i) => (i ? [createTag('br'), line] : [line]))),
    actions,
  ]);
}

export default async function decorate(block) {
  let data = {};
  try { data = JSON.parse(block.dataset.content || '{}'); } catch (e) { /* render what we can */ }
  block.removeAttribute('data-content');
  const labels = { ...LABELS, ...await fetchPlaceholders() };

  const degree = data.degree || '';
  const name = data.name || '';
  const baseName = degree && name.endsWith(degree) ? name.slice(0, -degree.length).trim() : name;
  const specialties = asList(data.specialties);
  const conditions = asList(data.conditionsAndTreatments);
  const locations = asList(data.locations).filter((l) => l.clinicName);
  const languages = asList(data.languages);
  const education = asList(data.education).filter((e) => e.degree || e.type);
  const certifications = asList(data.boardCertifications).filter((c) => c.specialty);
  const contact = data.contact || {};

  // ---------- header card ----------
  const photo = createTag('div', { class: 'doctor-photo' });
  const heading = createTag('h1', {}, degree && baseName !== name
    ? [createTag('span', {}, `${baseName},`), ' ', createTag('span', { class: 'doctor-credentials' }, degree)]
    : name);
  const ctas = createTag('div', { class: 'doctor-ctas' }, [
    contact.appointmentUrl ? createTag('a', {
      class: 'button doctor-appointment', href: contact.appointmentUrl, target: '_blank', rel: 'noopener',
    }, labels['doctor-appointment']) : null,
    createTag('a', { class: 'button doctor-contact', href: locations.length ? '#doctor-locations' : telHref(contact.mainPhone || '') }, labels['doctor-contact']),
  ]);
  if (!locations.length && !contact.mainPhone) ctas.lastElementChild.remove();
  const intro = createTag('div', { class: 'doctor-intro' }, [
    heading,
    data.title ? createTag('p', { class: 'doctor-title' }, data.title.split(/\s*;\s*/).join(', ')) : null,
  ]);
  const header = createTag('div', { class: 'doctor-header' }, [
    createTag('div', { class: 'doctor-card' }, [photo, intro]),
    ctas.children.length ? ctas : null,
  ]);

  // ---------- sections ----------
  const sections = [
    specialties.length && section('expertise', labels['doctor-expertise'], list(specialties, (s) => s)),
    conditions.length && section('conditions', labels['doctor-conditions'], list(conditions, (c) => (c.url
      ? createTag('a', { href: c.url }, c.label) : c.label))),
    locations.length && section('locations', labels['doctor-locations'], createTag('ul', { class: 'doctor-location-list' }, locations.map((l) => locationCard(l, labels)))),
    languages.length && section('languages', labels['doctor-languages'], list(languages, (l) => l)),
    education.length && section('education', labels['doctor-education'], list(education, educationText)),
    certifications.length && section('certifications', labels['doctor-board-certifications'], list(certifications, certificationText)),
  ].filter(Boolean);

  const quickLinks = sections.length > 1 ? createTag('nav', { class: 'doctor-quick-links', 'aria-label': labels['doctor-quick-links'] }, list(
    sections,
    (s) => createTag('a', { href: `#${s.id}` }, s.querySelector('h2').textContent),
  )) : null;

  block.replaceChildren(header, ...(quickLinks ? [quickLinks] : []), ...sections);

  const image = await findPhoto(labels['doctor-results-sheet'], data.profileUrl);
  if (image) {
    photo.append(createTag('img', {
      src: image, alt: baseName, width: 200, height: 200, loading: 'eager',
    }));
  } else {
    photo.remove();
  }
}
