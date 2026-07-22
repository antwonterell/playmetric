# PlayMETRIC - Master Playbook and Next Steps

Updated: July 22, 2026. Site is LIVE at https://playmetric.org (Render free plan, auto-deploys from github.com/antwonterell/playmetric main branch).

## WHAT IS LIVE RIGHT NOW

- Thumbnail Downloader: all sizes, batch ZIP (20), lineup vs competitors, hidden frames, squint test, analyzer
- Earnings Calculator: 2026 RPM by niche and geo, Shorts adjustment, niche comparison bars, shareable PNG card
- 8 free thumbnail backgrounds (Higgsfield HD, PNG downloads)
- Learn hub with 4 GEO-optimized articles (TL;DR, tables, FAQ/Article/HowTo schema)
- Legal set: about, contact, privacy (AdSense-compliant), terms
- llms.txt + AI-crawler-friendly robots.txt + sitemap.xml
- Full favicon set, gzip compression, GA4 loader wired but DORMANT (needs real ID)

## DO THIS WEEK (in order)

1. GA4: analytics.google.com -> Admin -> Create property "playmetric.org" -> copy the
   G-XXXX measurement ID -> paste it into public/js/ga.js replacing PASTE-GA4-ID-HERE
   -> commit and push (or hand the ID to Claude, one commit does it). Without this
   you are flying blind, do not skip it like getPDFpress did.
2. Search Console: search.google.com/search-console -> Add property -> Domain type ->
   playmetric.org -> it gives a TXT record -> add it in Hostinger DNS (same screen as
   before) -> verify -> Sitemaps -> submit https://playmetric.org/sitemap.xml
3. Bing Webmaster Tools: bing.com/webmasters -> can import straight from Search
   Console in 2 clicks. Bing feeds ChatGPT search, which matters for the GEO play.
4. Share the site somewhere real: one Reddit comment (r/NewTubers, r/PartneredYoutube
   when relevant), one Discord, one tweet with a shareable earnings card. Google
   indexes faster when the first backlinks appear.

## THE WAITING PHASE (weeks 1-6)

What happens: Google crawls, pages enter the index, impressions start tiny.
- Check Search Console weekly, not daily. Look at: pages indexed, queries appearing.
- Normal timeline: indexed within 1-2 weeks, first impressions weeks 2-4,
  first meaningful clicks weeks 4-8. Do not panic before week 6.
- Keep publishing: 1 Learn article per week beats everything else you could do.
  Next article targets, in priority order:
  - "youtube thumbnail tester" (tool-adjacent, low competition)
  - "how many subscribers to make money on youtube"
  - "youtube shorts rpm" (rising fast)
  - "best youtube thumbnail fonts"
  - "youtube monetization requirements 2026"
- Update dateModified in article JSON-LD whenever you touch an article.
- Each new page: add to sitemap.xml and llms.txt.

## ADSENSE (apply around week 3-4)

Preconditions already met: legal pages, real content, custom domain, clean design.
1. adsense.google.com -> add site playmetric.org -> paste their verification snippet
   (hand it to Claude, CSP in server.js must be updated to allow adsense domains).
2. In AdSense settings enable Google's EU consent message (required for EEA/UK, free,
   no code needed).
3. Review usually takes 1-2 weeks. If rejected for "low value content", add 2-3 more
   Learn articles and reapply, this is common and not fatal.
4. When approved: start with Auto Ads OFF and place manual units: one below the tool
   panel on each tool page, one mid-article on Learn pages. Auto Ads on a tool site
   wrecks UX and CTR.
5. Realistic money math: general tool traffic pays $2-8 RPM on display ads. The
   calculator page and money articles pull finance advertisers and can hit $15-30+.
   50K monthly visits with this mix is roughly $200-600/month. Compounds as traffic
   grows, zero marginal cost.

## UPGRADE TRIGGERS

- Render free plan sleeps after 15 min idle (first visitor waits ~30-60s). When
  Search Console shows >100 impressions/day OR AdSense is approved, upgrade to
  Starter ($7/mo) so crawlers and users never hit cold starts.
- When AdSense is approved, also buy playmetric.us and point it at .org (brand
  protection, ~$5/yr).
- support@ email: Hostinger includes email forwarding on most plans. Set up
  hello@playmetric.org -> antwonterell@gmail.com and swap it on the contact page.

## MAINTENANCE RULES (learned on getPDFpress)

- NO EM DASHES anywhere, ever. Commas, colons, hyphens.
- Honest copy only. Estimates are ranges. Nothing fake.
- Every CSS/JS change: bump the ?v= number in all HTML files or users get stale code.
- PowerShell Set-Content corrupts emoji/UTF-8. Use the Edit tool or
  [IO.File]::WriteAllText with UTF8Encoding($false).
- Rate limiter exempts /healthz. Keep it that way or Render restart-loops.
- Images stream through, nothing is stored. Keep it that way, memory stays flat.
- Small commits, push to main auto-deploys, verify live after every deploy:
  https://playmetric.org/healthz must return {"status":"ok"}.

## FUTURE TOOL IDEAS (same domain, same audience)

- Thumbnail A/B tester with shareable results (extends lineup mode)
- Channel earnings comparison ("how much does MrBeast make")
- Title analyzer (length, power words, mock search preview)
- More background packs monthly (Higgsfield, one prompt each), consider a
  "request a style" loop from the contact page
- Watch-time / RPM growth calculator ("when will I hit $1K/month")

## PROJECT #2 WHEN TRAFFIC IS STABLE

AI Text Humanizer + Explainer (researched July 2026: searches up 120%+ YoY, freemium
model proven, position around writing quality not detector evasion). Do not start it
before PlayMETRIC has Search Console data showing real clicks, focus wins.
