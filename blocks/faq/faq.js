import { createTag } from '../../scripts/shared.js';
import { extendSchema } from '../../scripts/schema.js';

const FAQ_INDEX_PATH = '/faq-index.json';

async function fetchFaqs() {
  const resp = await fetch(FAQ_INDEX_PATH);
  if (!resp.ok) return [];
  const json = await resp.json();
  return json?.data || [];
}

let faqCount = 0;

function toggleItem(button) {
  const expanded = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', String(!expanded));
  const panel = button.closest('.faq-item').querySelector('.faq-answer');
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
 * Authored mode: each row is question | answer. Questions become accordion headings whose
 * buttons show and hide the answers (rich text: paragraphs, lists, links).
 * @param {Element} block The faq block element
 * @param {Element[]} rows Rows with a question cell and an answer cell
 */
function decorateAuthored(block, rows) {
  const entries = rows.map(({ children: [questionCell, answerCell] }) => ({
    question: questionCell.textContent.trim(),
    answer: answerCell,
    answerText: answerCell.textContent.replace(/\s+/g, ' ').trim(),
  })).filter(({ question }) => question);

  faqCount += 1;
  const list = createTag('div', { class: 'faq-list' });
  entries.forEach(({ question, answer }, i) => {
    const id = `faq-${faqCount}-${i + 1}`;
    const button = createTag('button', {
      class: 'faq-question',
      type: 'button',
      id: `${id}-question`,
      'aria-expanded': 'false',
      'aria-controls': `${id}-answer`,
    }, question);
    button.addEventListener('click', () => toggleItem(button));

    const body = createTag('div', {
      class: 'faq-answer',
      id: `${id}-answer`,
      role: 'region',
      'aria-labelledby': `${id}-question`,
      hidden: true,
    });
    if (answer.querySelector('p, ul, ol, h3, h4, table')) body.append(...answer.childNodes);
    else if (answer.textContent.trim()) body.append(createTag('p', {}, [...answer.childNodes]));

    const heading = createTag('h2', { class: 'faq-entry-question' }, button);
    list.append(createTag('div', { class: 'faq-item' }, [heading, body]));
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
