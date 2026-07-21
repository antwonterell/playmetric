# ThumbSnag

Free YouTube creator tools. Two tools, one domain, built for SEO:

- **/youtube-thumbnail-downloader** - every resolution, batch ZIP download (up to 20), copy URL, mock YouTube preview at real sizes, instant brightness/contrast/palette check.
- **/youtube-earnings-calculator** - 2026 RPM data by niche and audience geography, low/typical/high ranges, Shorts adjustment, shareable PNG result card.

## Stack

Node 18+ / Express, vanilla JS frontend, no build step. Only two dependencies: `express` and `archiver`.

## Run locally

```
npm install
npm start
# http://localhost:3000
```

## Deploy (Render)

`render.yaml` is set up for Render's free Node runtime with `/healthz` as the health check (exempt from rate limiting). Push to GitHub, create a Blueprint on Render, done.

## Before launch checklist

- [ ] Buy domain and replace `thumbsnag.com` in canonical/OG/sitemap/robots URLs if different
- [ ] Add Google Analytics or Plausible snippet to all three pages (update CSP in server.js to allow it)
- [ ] Google Search Console: verify domain, submit sitemap.xml
- [ ] AdSense application once there is some traffic (site must be live a few weeks first)
- [ ] Generate OG share images (1200x630) for each page
