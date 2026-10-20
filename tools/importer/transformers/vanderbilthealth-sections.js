/* eslint-disable */
/* global WebImporter */

/**
 * Sections transformer for vanderbilthealth.com.
 * beforeTransform: inserts <hr> section breaks (while section elements still exist)
 * and marks styled sections with a temporary data-excat-section-id.
 * afterTransform: appends Section Metadata blocks for styled sections.
 */
const MARKER = 'data-excat-section-id';

function findSectionElement(root, section) {
  const selectors = Array.isArray(section.selector) ? section.selector : [section.selector];
  for (const sel of selectors) {
    if (!sel) continue;
    try {
      const el = root.querySelector(sel);
      if (el) return el;
    } catch (e) {
      // invalid selector, try next
    }
  }
  return null;
}

export default function transform(hookName, element, payload) {
  const sections = payload && payload.template && payload.template.sections;
  if (!sections || sections.length < 2) return;
  const document = element.ownerDocument || payload.document;

  if (hookName === 'beforeTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      const el = findSectionElement(element, section);
      if (!el) continue;
      // Non-first sections always get a break; a styled first section
      // gets a temporary marker <hr> removed in afterTransform.
      if (i > 0 || section.style) {
        const hr = document.createElement('hr');
        if (section.style) hr.setAttribute(MARKER, section.id);
        el.parentNode.insertBefore(hr, el);
      }
    }
  }

  if (hookName === 'afterTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (!section.style) continue;
      const marker = element.querySelector(`hr[${MARKER}="${section.id}"]`);
      if (!marker) continue;

      // Find the end of this section: next <hr> sibling or end of parent
      let end = marker.nextElementSibling;
      while (end && end.tagName !== 'HR') end = end.nextElementSibling;

      const metadata = WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata',
        cells: { style: section.style },
      });

      if (end) {
        end.parentNode.insertBefore(metadata, end);
      } else {
        marker.parentNode.appendChild(metadata);
      }

      if (i === 0) {
        marker.remove();
      } else {
        marker.removeAttribute(MARKER);
      }
    }
  }
}
