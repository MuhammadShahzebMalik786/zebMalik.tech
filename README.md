# zebmalik.tech

Marketing site for zebMalik.tech — a small engineering team taking on data
extraction, automation and backend work.

Static HTML. No build step, no framework, no dependencies. Nine pages sharing
one stylesheet.

## Structure

```
index.html                        Home
services.html                     The four service lines, with spec tables
work.html                         Case studies
pricing.html                      Packages and FAQ
about.html                        Team and how we operate
contact.html                      Project brief form
free-sample.html                  Free 100-row sample offer (main conversion page)
ecommerce-price-monitoring.html   SEO landing page
lead-list-building.html           SEO landing page
styles.css                        Shared stylesheet
sitemap.xml / robots.txt          Search
```

## Before deploying

One placeholder is left:

| Placeholder | Where | Replace with |
|---|---|---|
| `YOUR_FORM_ID` | `contact.html`, `free-sample.html` | Formspree endpoint from formspree.io |

Find it:

```bash
grep -rn "YOUR_FORM_ID" *.html
```

Contact details are already wired in: `hello@zebmalik.tech` (forwards to Gmail via Cloudflare Email Routing),
`wa.me/923448970498`, and the LinkedIn profile in every footer.

## Deploying

**Cloudflare Pages (free):**

```bash
npx wrangler pages deploy . --project-name zebmalik-tech
```

Or drag the folder into Cloudflare Pages → Create project → Upload assets.
Then add `zebmalik.tech` under Custom domains. SSL is automatic.

Connecting this repo to Cloudflare Pages instead gives you deploy-on-push:
build command empty, output directory `/`.

## Local preview

```bash
python3 -m http.server 8000
```

## Editing

The header and footer are duplicated across all nine pages. `apply_chrome.py`
in the repo root rewrites both everywhere at once — edit the templates in that
script, run it, and every page updates:

```bash
python3 apply_chrome.py
```

## Design notes

Light, editorial, deliberately undecorated. No gradients, no glows, no icon
circles. Palette is near-black on off-white with one warm red accent
(`--accent: #d63a1e`), all defined as custom properties at the top of
`styles.css`. Type is Instrument Sans with JetBrains Mono for technical labels.

Content rule: no invented client names, no fabricated metrics, no logo wall.
Every project on the work page is a real repository.
