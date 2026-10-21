/* eslint-disable */
/* global WebImporter */

/**
 * Parser for doctor-search.
 * Source: #provider-search-form (vanderbilthealth.com/doctors)
 *
 * Target: key / value block. Labels come from the source form; the results-view labels
 * ("Results for", "View Profile", "See all results") are the source's own wording on the
 * results page. Specialty, language and gender options are read by the block from the
 * results spreadsheet, so they are not authored here.
 */
const RESULTS_SHEET = '/doctors/results.json';

function text(el) {
  return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
}

function firstOption(select) {
  return select ? text(select.querySelector('option')) : '';
}

export default function parse(element, { document }) {
  const query = element.querySelector('input[name="query"]');
  const specialty = element.querySelector('select[name="specialty"]');
  const language = element.querySelector('select[name="language"]');
  const gender = element.querySelector('select[name="gender"]');
  const submit = element.querySelector('button[type="submit"]');
  const reset = [...element.querySelectorAll('a')].find((a) => /reset/i.test(text(a)));
  const more = [...element.querySelectorAll('button[type="button"]')].find((b) => /filter/i.test(text(b)));

  const data = document.createElement('a');
  data.href = RESULTS_SHEET;
  data.textContent = RESULTS_SHEET;

  const rows = [
    ['Results', data],
    ['Name', query ? (query.getAttribute('placeholder') || '').trim() : ''],
    ['Specialty', firstOption(specialty)],
    ['Language', firstOption(language)],
    ['Gender', firstOption(gender)],
    ['Search', text(submit)],
    ['Reset', text(reset)],
    ['More filters', text(more)],
    // source toggle text once the extra filters are open
    ['Fewer filters', 'Show Fewer Filters —'],
    ['Results for', 'Results for'],
    // singular heading for a single match (the source always says "Results for")
    ['Result for', 'Result for'],
    ['Profile', 'View Profile'],
    ['All results', 'See all results'],
    // accessible name for the × on each active-filter chip (the source has none)
    ['Remove filter', 'Remove filter'],
  ].filter(([, value]) => value);

  const block = WebImporter.Blocks.createBlock(document, { name: 'doctor-search', cells: rows });
  element.replaceWith(block);
}
