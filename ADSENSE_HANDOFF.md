# AdSense implementation handoff

Date: 2026-10-01  
Site: `zebmalik.tech`  
Repository: static HTML / Cloudflare Pages

## Current status

The code-level AdSense issues found in the previous audit have been corrected
without changing the site's page structure or visual layout. The repository
passes the local static checks and a representative browser check.

This is not a final Google approval. The remaining account-side work includes
installing a Google-certified consent management platform (CMP), connecting it
to the IAB TCF where required, and using the real ad-unit snippets from the
AdSense account.

## What changed

- `ads-consent.js` now gates ad loading behind an advertising-consent choice.
  “Allow ads” loads Google AdSense; “No thanks” keeps ad units hidden.
- Monetized HTML pages now use the valid ad-code publisher ID:
  `ca-pub-9522829065676411`.
- Direct AdSense loaders were removed from individual pages and centralized
  behind the consent script.
- Fabricated placeholder slot IDs such as `in_article_tool` and
  `sidebar_tool` were removed. Do not invent replacements; paste numeric slot
  IDs copied from the AdSense account when manual units are enabled.
- Ad labels were changed to the standard `Advertisement` label.
- `privacy.html` now explains the consent behavior and includes a
  “Change advertising consent” control.
- `styles.css` contains the responsive consent banner styling. Existing ad
  containers and page layout were left intact.
- `scripts/audit-adsense.js` now checks the actual implementation instead of
  only searching for a publisher-ID string.
- `ads.txt` remains unchanged and valid. It intentionally uses the
  `pub-9522829065676411` format; `ads.txt` and page ad code use different
  formats.

## Verification already completed

Run these commands from the repository root:

```bash
node --check ads-consent.js
node --check scripts/audit-adsense.js
node scripts/audit-adsense.js
node scripts/check-links.js
git diff --check
```

Expected results:

- AdSense static implementation audit passes.
- Internal-link audit reports zero broken links.
- JavaScript syntax checks pass.
- No invalid `pub-` page publisher IDs, placeholder slot IDs, direct page
  loaders, or nonstandard ad labels remain.

A local browser check on `image-compressor.html` confirmed that the header,
tool card, guide, and footer retain their layout. The consent banner disappears
after selecting “No thanks.”

## Required before enabling live monetization

1. In the AdSense account, configure a Google-certified CMP for visitors in
   the EEA, UK, and Switzerland, with the required IAB TCF consent signal.
2. Decide whether the site will use Auto ads, manual display units, or both.
3. For every manual unit, copy the complete snippet from AdSense and replace
   the slotless `<ins class="adsbygoogle">` markup with the account's real
   numeric `data-ad-slot`. Never guess or reuse a placeholder.
4. Confirm the privacy-policy URL, consent message, and ad personalization
   settings in the AdSense account.
5. Deploy to staging or a preview URL and check mobile and desktop pages,
   especially ad proximity to tool controls and download buttons.
6. Request the site review in AdSense, then monitor Policy Center, crawl
   status, consent signals, and invalid-traffic alerts.

The local banner in `ads-consent.js` is a lightweight implementation guard. It
does not replace Google's certified CMP requirement for personalized ads in
the applicable regions.

## Troubleshooting

### The consent banner does not appear

Clear the browser's local storage key `zebmalik-ads-consent-v1` and reload. A
monetized page must include the consent script with the `data-ads-page`
attribute.

### Ads do not load after “Allow ads”

Check that the page uses `data-ad-client="ca-pub-9522829065676411"`, that the
AdSense account has approved the site, and that manual units contain real
numeric slot IDs. Also check the browser Network panel for the Google ad
script and any account/CMP errors.

### Consent needs to be changed

Open `/privacy` and use the “Change advertising consent” button. The choice is
stored locally in the current browser only.

## Deployment

This is a static site; there is no build step. Preview locally with:

```bash
python3 -m http.server 8000
```

Deploy to Cloudflare Pages with:

```bash
npx wrangler pages deploy . --project-name zebmalik-tech --branch main
```

Before deploying, confirm that `/ads.txt`, `/privacy`, `/terms`, and
`/robots.txt` are reachable from the deployed domain. Do not commit account
secrets or replace the publisher ID with a personal value.

## Official references

- [AdSense ad code requirements](https://support.google.com/adsense/answer/105516?hl=en)
- [Ad placement and ad labels](https://support.google.com/adsense/answer/1282097?hl=en)
- [Google-certified CMP requirements](https://support.google.com/adsense/answer/13554116?hl=en)
- [AdSense program policies](https://support.google.com/adsense/answer/48182?hl=en)

