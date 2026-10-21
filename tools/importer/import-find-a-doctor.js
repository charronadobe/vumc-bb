/* eslint-disable */
/* global WebImporter */

// Parsers
import doctorSearchParser from "./parsers/doctor-search.js";

// Transformers
import cleanupTransformer from "./transformers/vanderbilthealth-cleanup.js";
import sectionsTransformer from "./transformers/vanderbilthealth-sections.js";

const PAGE_TEMPLATE = {
  "name": "find-a-doctor",
  "urls": [
    "https://www.vanderbilthealth.com/doctors"
  ],
  "representativeUrl": "https://www.vanderbilthealth.com/doctors",
  "description": "Find a Doctor search page: heading + doctor search form (results from captured data), About Ratings and Comments text",
  "urlPattern": "/doctors",
  "blocks": [
    {
      "name": "doctor-search",
      "instances": [
        "#provider-search-form",
        ".data-tracker-provider-search-page form"
      ]
    }
  ],
  "sections": [
    {
      "id": "s1",
      "name": "Search",
      "selector": [
        ".data-tracker-provider-search-page > div:nth-of-type(1)"
      ],
      "style": "search-panel",
      "blocks": [
        "doctor-search"
      ],
      "defaultContent": [
        ".data-tracker-provider-search-page > div:nth-of-type(1) h1"
      ]
    },
    {
      "id": "s2",
      "name": "About Ratings and Comments",
      "selector": [
        ".data-tracker-provider-search-page > div:nth-of-type(2)"
      ],
      "style": null,
      "blocks": [],
      "defaultContent": [
        ".data-tracker-provider-search-page > div:nth-of-type(2) h2",
        ".data-tracker-provider-search-page > div:nth-of-type(2) p"
      ]
    }
  ]
};

const parsers = {
  "doctor-search": doctorSearchParser,
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
