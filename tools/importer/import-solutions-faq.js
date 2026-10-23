/* eslint-disable */
/* global WebImporter */

// Parsers
import faqParser from "./parsers/faq.js";

// Transformers
import cleanupTransformer from "./transformers/vanderbilthealth-cleanup.js";
import sectionsTransformer from "./transformers/vanderbilthealth-sections.js";

const PAGE_TEMPLATE = {
  "name": "solutions-faq",
  "urls": [
    "https://www.vanderbilthealth.com/solutions/myorthohealth-hip-knee-surgery-faqs"
  ],
  "representativeUrl": "https://www.vanderbilthealth.com/solutions/myorthohealth-hip-knee-surgery-faqs",
  "description": "Solutions FAQ page: navy title band with H1, authored FAQ block of question/answer pairs, More Information links",
  "blocks": [
    {
      "name": "faq",
      "instances": [
        "#main-content div.module__2Tzb2TUFiV6oNnP9RfG9hx:has(.data-tracker-text-body)"
      ]
    }
  ],
  "urlPattern": "/solutions/*-faqs",
  "sections": [
    {
      "id": "section-1",
      "name": "Title band",
      "selector": [
        "#main-content .data-tracker-banner-hero"
      ],
      "style": "navy",
      "blocks": [],
      "defaultContent": [
        "#main-content .data-tracker-banner-hero h1"
      ]
    },
    {
      "id": "section-2",
      "name": "FAQ questions and answers",
      "selector": [
        "#main-content div.module__2Tzb2TUFiV6oNnP9RfG9hx:has(.data-tracker-text-body)"
      ],
      "style": null,
      "blocks": [
        "faq"
      ],
      "defaultContent": []
    },
    {
      "id": "section-3",
      "name": "More Information",
      "selector": [
        "#main-content div.module__2Tzb2TUFiV6oNnP9RfG9hx:has(.data-tracker-list-section-ul)"
      ],
      "style": null,
      "blocks": [],
      "defaultContent": [
        "#main-content div.module__2Tzb2TUFiV6oNnP9RfG9hx:has(.data-tracker-list-section-ul) h2",
        "#main-content div.module__2Tzb2TUFiV6oNnP9RfG9hx:has(.data-tracker-list-section-ul) ul"
      ]
    }
  ]
};

const parsers = {
  "faq": faqParser,
};

const transformers = [cleanupTransformer, sectionsTransformer];

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((fn) => {
    try {
      fn(hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        pageBlocks.push({ name: blockDef.name, selector, element });
      });
    });
  });
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;

    executeTransformers("beforeTransform", main, payload);

    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (!parser) return;
      try {
        parser(block.element, { document, url, params });
      } catch (e) {
        console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
      }
    });

    executeTransformers("afterTransform", main, payload);

    main.appendChild(document.createElement("hr"));
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, "")
      .replace(/\.html?$/, "");
    const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: [...new Set(pageBlocks.map((b) => b.name))],
      },
    }];
  },
};
