# zebmalik.tech

Marketing site for zebMalik.tech — a small engineering team taking on data
extraction, automation and backend work.

Static HTML. No build step or framework. The marketing pages share one
stylesheet, with browser-only file tools alongside them.

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
ai-chatbot-rag.html               AI chatbot and RAG service page
tools.html                        Free online tools hub
image-compressor.html             Browser-based image compressor
image-resizer.html                Browser-based image resizer
image-converter.html              Browser-based format converter
image-to-pdf.html                 Browser-based image to PDF tool
pdf-to-image.html                 Browser-based PDF renderer
image-metadata-remover.html       Browser-based EXIF metadata remover
image-cropper.html                Browser-based image cropper
image-rotator.html                Browser-based rotate and flip tool
image-watermark.html              Browser-based text watermark tool
meme-generator.html               Browser-based meme caption tool
merge-pdf.html                    Browser-based PDF merger
split-pdf.html                    Browser-based PDF page extractor
compress-pdf.html                 Browser-based PDF optimizer
extract-text-from-pdf.html        Browser-based PDF text extraction and OCR
pdf-organizer.html                Browser-based PDF page organizer
watermark-pdf.html                Browser-based text watermark tool
pdf-page-numbers.html             Browser-based PDF page numbering
qr-code-generator.html            Browser-based QR code generator
json-formatter.html               Browser-based JSON formatter and validator
word-counter.html                 Browser-based word and character counter
tools.js / advanced-tools.js      Client-side tool logic
pdf-to-image.js                   PDF rendering logic
styles.css                        Shared stylesheet
sitemap.xml / robots.txt          Search crawling
llms.txt                          AI-readable site and tool summary
_headers / 404.html                Cloudflare Pages headers and fallback page
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

The Tools pages process images, PDFs and text in the visitor's browser. Files are
not uploaded to this site. Image compressor, resizer, converter and metadata
remover support batches; Image to PDF supports multiple pages and drag-to-reorder.
The cropper and meme generator process one image at a time; the rotator and
watermark tools support batches.
PDF merge, split and optimization use pdf-lib from jsDelivr. PDF-to-image uses
PDF.js from cdnjs, and the QR generator uses qrcode-generator from jsDelivr.
PDF text extraction uses PDF.js and offers optional Tesseract.js OCR for scanned
pages. JSON formatting and word counting have no runtime dependency. External
libraries are loaded only to provide the relevant browser-side feature; the site
does not send user files to an application server.
The PDF organizer, watermark and page-number tools use pdf-lib in the browser.
They do not claim to provide password removal, encryption, PDF-to-Word conversion
or permanent redaction; those features need additional format-specific handling
and should not be represented as simple browser operations.

## Deploying

**Cloudflare Pages (free):**

```bash
npx wrangler pages deploy . --project-name zebmalik-tech --branch main
```

Or drag the folder into Cloudflare Pages → Create project → Upload assets.
Then add `zebmalik.tech` under Custom domains. SSL is automatic.

Connecting this repo to Cloudflare Pages instead gives you deploy-on-push:
build command empty, output directory `/`.

There is no build command because this is a static site. Cloudflare Pages
automatically serves `404.html` for missing routes and applies the rules in
`_headers` for security and caching. If you use the dashboard, leave the build
command empty and set the output directory to `/` (the repository root).

## Local preview

```bash
python3 -m http.server 8000
```

## Editing

The header and footer are duplicated across the HTML pages. `apply_chrome.py`
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
