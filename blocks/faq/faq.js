import { createTag } from '../../scripts/shared.js';
import { extendSchema } from '../../scripts/schema.js';

const FAQ_INDEX_PATH = '/faq-index.json';

async function fetchFaqs() {
  const resp = await fetch(FAQ_INDEX_PATH);
  if (!resp.ok) return [];
  const json = await resp.json();
  return json?.data || [];
}

function toggleItem(button) {
  const expanded = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', String(!expanded));
  const panel = button.nextElementSibling;
  panel.hidden = expanded;
}

function buildFaqItem(faq) {
  const item = createTag('div', { class: 'faq-item' });

  const button = createTag('button', {
    class: 'faq-question',
    'aria-expanded': 'false',
    type: 'button',
  }, faq.question);

  const panel = createTag('div', {
    class: 'faq-answer',
    role: 'region',
    hidden: true,
  });
  panel.append(createTag('p', {}, faq.answer));

  button.addEventListener('click', () => toggleItem(button));

  item.append(button, panel);
  return item;
}

function buildCategoryGroup(category, faqs) {
  const group = createTag('div', { class: 'faq-category' });
  group.append(createTag('h3', { class: 'faq-category-heading' }, category));
  faqs.forEach((faq) => group.append(buildFaqItem(faq)));
  return group;
}

/**
 * Authored mode: each row is question | answer. Questions become headings and the answers
 * (rich text: paragraphs, lists, links) stay visible below them.
 * @param {Element} block The faq block element
 * @param {Element[]} rows Rows with a question cell and an answer cell
 */
function decorateAuthored(block, rows) {
  const entries = rows.map(({ children: [questionCell, answerCell] }) => ({
    question: questionCell.textContent.trim(),
    answer: answerCell,
    answerText: answerCell.textContent.replace(/\s+/g, ' ').trim(),
  })).filter(({ question }) => question);

  const list = createTag('div', { class: 'faq-list' });
  entries.forEach(({ question, answer }) => {
    const heading = createTag('h2', { class: 'faq-entry-question' }, question);
    const body = createTag('div', { class: 'faq-entry-answer' });
    if (answer.querySelector('p, ul, ol, h3, h4, table')) body.append(...answer.childNodes);
    else if (answer.textContent.trim()) body.append(createTag('p', {}, [...answer.childNodes]));
    list.append(createTag('div', { class: 'faq-entry' }, [heading, body]));
  });
  block.replaceChildren(list);

  extendSchema('WebPage', {
    '@type': 'FAQPage',
    mainEntity: entries.map(({ question, answerText }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answerText,
      },
    })),
  });
}

export default async function decorate(block) {
  const authoredRows = [...block.children].filter((row) => row.children.length >= 2);
  if (authoredRows.length) {
    decorateAuthored(block, authoredRows);
    return;
  }

  const categories = [...block.children].map(
    (row) => row.textContent.trim(),
  ).filter(Boolean);

  block.textContent = '';

  const allFaqs = await fetchFaqs();
  if (!allFaqs.length) {
    block.append(createTag('p', { class: 'faq-empty' }, 'No FAQs available.'));
    return;
  }

  const filtered = categories.length
    ? allFaqs.filter((faq) => categories.includes(faq.category))
    : allFaqs;

  if (!filtered.length) {
    block.append(createTag('p', { class: 'faq-empty' }, 'No FAQs found for the selected categories.'));
    return;
  }

  const grouped = {};
  filtered.forEach((faq) => {
    if (!grouped[faq.category]) grouped[faq.category] = [];
    grouped[faq.category].push(faq);
  });

  Object.keys(grouped).forEach((category) => {
    block.append(buildCategoryGroup(category, grouped[category]));
  });

  extendSchema('WebPage', {
    '@type': 'FAQPage',
    mainEntity: filtered.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  });
}
