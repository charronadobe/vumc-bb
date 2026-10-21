/* eslint-disable */
/* global WebImporter */

// Parsers
import heroQuickLinksParser from "./parsers/hero-quick-links.js";
import embedVideoParser from "./parsers/embed-video.js";
import columnsPromoPanelsParser from "./parsers/columns-promo-panels.js";
import columnsBannerDarkParser from "./parsers/columns-banner-dark.js";
import cardsArticleParser from "./parsers/cards-article.js";

// Transformers
import cleanupTransformer from "./transformers/vanderbilthealth-cleanup.js";
import sectionsTransformer from "./transformers/vanderbilthealth-sections.js";

const PAGE_TEMPLATE = {
  "name": "home",
  "urls": [
    "https://www.vanderbilthealth.com/"
  ],
  "representativeUrl": "https://www.vanderbilthealth.com/",
  "description": "Vanderbilt Health homepage: hero with quick links, video, promo panels, news and blog card rows, telehealth banner",
  "blocks": [
    {
      "name": "hero-quick-links",
      "instances": [
        ".data-tracker-banner-hero"
      ]
    },
    {
      "name": "embed-video",
      "instances": [
        ".data-tracker-banner-grid:has(iframe[src*=\"vidyard\"])",
        "#main-content > div > div:nth-of-type(3)"
      ]
    },
    {
      "name": "columns-promo-panels",
      "instances": [
        ".data-tracker-banner-grid:not(:has(iframe))"
      ]
    },
    {
      "name": "columns-banner-dark",
      "instances": [
        ".banner-feature:has(.secondaryDark)",
        "#main-content > div > div:nth-of-type(7) .banner-feature"
      ]
    },
    {
      "name": "cards-article",
      "instances": [
        ".data-tracker-stories div:has(> div > div > .data-tracker-news-card)"
      ]
    }
  ],
  "urlPattern": "/",
  "sections": [
    {
      "id": "rc5",
      "name": "Hero",
      "selector": [
        "#main-content > div > div:nth-of-type(1)",
        "#main-content > div.module__2ec5FCOXPAHiv9LMjleUgj.module__39HgjuR0xR7yHW_G-qrsgu > div:nth-of-type(1)"
      ],
      "style": null,
      "blocks": [
        "hero-quick-links"
      ],
      "defaultContent": []
    },
    {
      "id": "rc6",
      "name": "Intro",
      "selector": [
        "#main-content > div > div:nth-of-type(2)",
        "#main-content > div.module__2ec5FCOXPAHiv9LMjleUgj.module__39HgjuR0xR7yHW_G-qrsgu > div:nth-of-type(2)"
      ],
      "style": null,
      "blocks": [],
      "defaultContent": [
        "#main-content > div > div:nth-of-type(2) .banner-textblock"
      ]
    },
    {
      "id": "rc7",
      "name": "Video",
      "selector": [
        "#main-content > div > div:nth-of-type(3)",
        "#main-content > div.module__2ec5FCOXPAHiv9LMjleUgj.module__39HgjuR0xR7yHW_G-qrsgu > div:nth-of-type(3)"
      ],
      "style": null,
      "blocks": [
        "embed-video"
      ],
      "defaultContent": []
    },
    {
      "id": "rc8",
      "name": "Get Better Fast / My Health at Vanderbilt",
      "selector": [
        "#main-content > div > div:nth-of-type(4)",
        "#main-content > div.module__2ec5FCOXPAHiv9LMjleUgj.module__39HgjuR0xR7yHW_G-qrsgu > div:nth-of-type(4)"
      ],
      "style": null,
      "blocks": [
        "columns-promo-panels"
      ],
      "defaultContent": []
    },
    {
      "id": "rc9",
      "name": "Patient and Visitor Information",
      "selector": [
        "#main-content > div > div:nth-of-type(5)",
        "#main-content > div.module__2ec5FCOXPAHiv9LMjleUgj.module__39HgjuR0xR7yHW_G-qrsgu > div:nth-of-type(5)"
      ],
      "style": "beige",
      "blocks": [],
      "defaultContent": [
        "#main-content > div > div:nth-of-type(5) .banner-textblock"
      ]
    },
    {
      "id": "rc10",
      "name": "Featured News",
      "selector": [
        "#main-content > div > div:nth-of-type(6)",
        "#main-content > div.module__2ec5FCOXPAHiv9LMjleUgj.module__39HgjuR0xR7yHW_G-qrsgu > div:nth-of-type(6)"
      ],
      "style": null,
      "blocks": [
        "cards-article"
      ],
      "defaultContent": [
        "#main-content > div > div:nth-of-type(6) .data-tracker-stories h2",
        "#main-content > div > div:nth-of-type(6) .data-tracker-stories p"
      ]
    },
    {
      "id": "rc11",
      "name": "Telehealth",
      "selector": [
        "#main-content > div > div:nth-of-type(7)",
        "#main-content > div.module__2ec5FCOXPAHiv9LMjleUgj.module__39HgjuR0xR7yHW_G-qrsgu > div:nth-of-type(7)"
      ],
      "style": null,
      "blocks": [
        "columns-banner-dark"
      ],
      "defaultContent": []
    },
    {
      "id": "rc12",
      "name": "My Vanderbilt Health",
      "selector": [
        "#main-content > div > div:nth-of-type(8)",
        "#main-content > div.module__2ec5FCOXPAHiv9LMjleUgj.module__39HgjuR0xR7yHW_G-qrsgu > div:nth-of-type(8)"
      ],
      "style": null,
      "blocks": [
        "cards-article"
      ],
      "defaultContent": [
        "#main-content > div > div:nth-of-type(8) .data-tracker-stories h2",
        "#main-content > div > div:nth-of-type(8) .data-tracker-stories p"
      ]
    },
    {
      "id": "rc13",
      "name": "Volunteer / ResearchMatch",
      "selector": [
        "#main-content > div > div:nth-of-type(9)",
        "#main-content > div.module__2ec5FCOXPAHiv9LMjleUgj.module__39HgjuR0xR7yHW_G-qrsgu > div:nth-of-type(9)"
      ],
      "style": null,
      "blocks": [
        "columns-promo-panels"
      ],
      "defaultContent": []
    },
    {
      "id": "rc14",
      "name": "Make an Impact",
      "selector": [
        "#main-content > div > div:nth-of-type(10)",
        "#main-content > div.module__2ec5FCOXPAHiv9LMjleUgj.module__39HgjuR0xR7yHW_G-qrsgu > div:nth-of-type(10)"
      ],
      "style": "light-grey",
      "blocks": [],
      "defaultContent": [
        "#main-content > div > div:nth-of-type(10) .banner-textblock"
      ]
    }
  ]
};

const parsers = {
  "hero-quick-links": heroQuickLinksParser,
  "embed-video": embedVideoParser,
  "columns-promo-panels": columnsPromoPanelsParser,
  "columns-banner-dark": columnsBannerDarkParser,
  "cards-article": cardsArticleParser,
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

// Site uploads (www.vanderbilthealth.com/sites/default/files/*) answer with a 307 redirect to the
// files host, which the EDS media pipeline cannot fetch from. Keep them as absolute files-host
// URLs so the content upload downloads each image and stores it in Document Authoring with the
// page. Do not rewrite them to relative paths: no file exists there, so the upload links the
// page to images that were never created and preview renders them as about:error.
// Must run after WebImporter.rules.adjustImageUrls, which absolutizes the source URLs.
const SITE_UPLOAD = /^https:\/\/(?:www|files)\.vanderbilthealth\.com\/sites\/default\/files\/(.+)$/;

function useFilesHostForSiteUploads(main) {
  main.querySelectorAll("img[src]").forEach((img) => {
    const match = img.getAttribute("src").match(SITE_UPLOAD);
    if (!match) return;
    img.setAttribute("src", `https://files.vanderbilthealth.com/sites/default/files/${match[1]}`);
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
    useFilesHostForSiteUploads(main);

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
