const FEED_URL = 'https://medicalxpress.com/rss-feed/';
const FEED_PATH = '/medical-feeds.xml';

function createHeaders(contentType) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=900',
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
  };
}

export default {
  async fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname !== FEED_PATH) {
      return new Response('Not found', {
        status: 404,
        headers: createHeaders('text/plain; charset=utf-8'),
      });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: createHeaders('text/plain; charset=utf-8'),
      });
    }

    if (request.method !== 'GET') {
      return new Response('Method not allowed', {
        status: 405,
        headers: createHeaders('text/plain; charset=utf-8'),
      });
    }

    try {
      const response = await fetch(FEED_URL, {
        headers: {
          Accept: 'application/rss+xml, application/xml, text/xml',
          'User-Agent': 'Mozilla/5.0 (compatible; MedicalFeedsWidget/1.0)',
        },
        cf: { cacheEverything: true, cacheTtl: 900 },
      });
      if (!response.ok) {
        throw new Error(`Medical Xpress returned status ${response.status}.`);
      }

      return new Response(response.body, {
        headers: createHeaders('application/rss+xml; charset=utf-8'),
      });
    } catch (error) {
      console.error('medical-feeds: upstream RSS request failed.', error);
      return new Response('The Medical Xpress feed is temporarily unavailable.', {
        status: 502,
        headers: createHeaders('text/plain; charset=utf-8'),
      });
    }
  },
};
