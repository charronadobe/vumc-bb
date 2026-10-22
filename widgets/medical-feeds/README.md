# Medical Feeds widget

The widget displays up to 10 recent Medical Xpress RSS items. It uses the feed title by default and renders each item as a link, publication date, and plain-text summary.

## On site pages

Use the **Medical Feeds** block (`blocks/medical-feeds`). Its key/value rows (Feed URL, Heading, Loading text, Error text, Empty text) become the attributes below. Set Feed URL to `/widgets/medical-feeds/feed.xml`: a copy of the Medical Xpress feed that the `Refresh medical feeds` GitHub Action (`.github/workflows/medical-feeds.yaml`) updates every hour. The site serves it from its own origin, so no worker or CORS headers are needed. Run the action manually from the Actions tab to refresh it right away.

## Embed

Alternatively, deploy `workers/medical-feeds` with `npm run deploy:medical-feeds`, then set `feed-url` to the worker's public URL:

```html
<medical-feeds
  feed-url="https://<worker-subdomain>.workers.dev/medical-feeds.xml"
  heading="Recent medical news"
  loading-text="Loading the latest stories…"
  error-text="Medical news is currently unavailable."
  empty-text="No recent stories are available."
></medical-feeds>
<script type="module" src="/widgets/medical-feeds/medical-feeds.js"></script>
```

The heading and status text attributes are optional. Without `heading`, the feed's channel title is used. If `error-text` is omitted, errors are logged and emitted as a bubbling `medical-feeds-error` event. The worker adds CORS headers because Medical Xpress does not provide them on its RSS response.

For local development, run `npm run dev:medical-feeds` and set `feed-url` to `http://localhost:8787/medical-feeds.xml`.

The standalone local demo is available at `/widgets/medical-feeds/medical-feeds.html` while the project is being served locally. It uses the local worker URL; change `feed-url` to the deployed worker URL when publishing the demo page.
