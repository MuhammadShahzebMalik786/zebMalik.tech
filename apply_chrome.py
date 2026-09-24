import html
import json
import re, glob, os

SITE = os.path.dirname(os.path.abspath(__file__))
TOOL_PAGES = {
    "tools.html",
    "image-compressor.html",
    "image-resizer.html",
    "image-converter.html",
    "image-to-pdf.html",
    "pdf-to-image.html",
    "image-metadata-remover.html",
    "image-cropper.html",
    "image-rotator.html",
    "image-watermark.html",
    "meme-generator.html",
    "merge-pdf.html",
    "split-pdf.html",
    "compress-pdf.html",
    "extract-text-from-pdf.html",
    "pdf-organizer.html",
    "watermark-pdf.html",
    "pdf-page-numbers.html",
    "rotate-pdf.html",
    "qr-code-generator.html",
    "json-formatter.html",
    "word-counter.html",
    "password-generator.html",
}

SITE_URL = "https://zebmalik.tech"
SOCIAL_IMAGE = SITE_URL + "/android-chrome-512x512.png"

def page_url(fname):
    if fname == "index.html":
        return SITE_URL + "/"
    return SITE_URL + "/" + fname.replace(".html", "")

def seo_block(fname, title, description):
    if fname == "404.html":
        return '''<!-- SEO-META -->
<meta name="robots" content="noindex, nofollow">
<meta name="google-adsense-account" content="ca-pub-9522829065676411">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9522829065676411" crossorigin="anonymous"></script>
<!-- /SEO-META -->'''

    url = page_url(fname)
    clean_title = html.unescape(title)
    clean_description = html.unescape(description)
    label = "Home" if fname == "index.html" else re.sub(r"\s*[—|].*$", "", clean_title).strip()
    graph = [{
        "@type": "WebPage",
        "@id": url + "#webpage",
        "url": url,
        "name": clean_title,
        "description": clean_description,
        "isPartOf": {"@id": SITE_URL + "/#website"},
        "inLanguage": "en"
    }]
    if fname != "index.html":
        graph.append({
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL + "/"},
                {"@type": "ListItem", "position": 2, "name": label, "item": url}
            ]
        })
    if fname == "index.html":
        graph.extend([{
            "@type": "Organization",
            "@id": SITE_URL + "/#organization",
            "name": "zebMalik.tech",
            "url": SITE_URL + "/",
            "logo": {"@type": "ImageObject", "url": SOCIAL_IMAGE},
            "sameAs": [
                "https://github.com/MuhammadShahzebMalik786",
                "https://www.linkedin.com/in/muhammad-shahzeb-malik/"
            ]
        }, {
            "@type": "WebSite",
            "@id": SITE_URL + "/#website",
            "url": SITE_URL + "/",
            "name": "zebMalik.tech",
            "publisher": {"@id": SITE_URL + "/#organization"},
            "inLanguage": "en"
        }])
    elif fname in TOOL_PAGES and fname != "tools.html":
        graph.append({
            "@type": "SoftwareApplication",
            "name": clean_title,
            "url": url,
            "applicationCategory": "UtilitiesApplication",
            "operatingSystem": "Web browser",
            "isAccessibleForFree": True,
            "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
            "featureList": [
                "Processing in the web browser",
                "No account required",
                "Tool inputs are not sent to an application server"
            ]
        })
    payload = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=True)
    return f'''<!-- SEO-META -->
<link rel="canonical" href="{html.escape(url, quote=True)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="author" content="zebMalik.tech">
<meta name="theme-color" content="#121316">
<meta property="og:type" content="website">
<meta property="og:site_name" content="zebMalik.tech">
<meta property="og:title" content="{html.escape(clean_title, quote=True)}">
<meta property="og:description" content="{html.escape(clean_description, quote=True)}">
<meta property="og:url" content="{html.escape(url, quote=True)}">
<meta property="og:image" content="{SOCIAL_IMAGE}">
<meta property="og:image:alt" content="zebMalik.tech">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{html.escape(clean_title, quote=True)}">
<meta name="twitter:description" content="{html.escape(clean_description, quote=True)}">
<meta name="twitter:image" content="{SOCIAL_IMAGE}">
<script type="application/ld+json">{payload}</script>
<meta name="google-adsense-account" content="ca-pub-9522829065676411">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9522829065676411" crossorigin="anonymous"></script>
<!-- /SEO-META -->'''

NAV = [
    ("services.html", "Services"),
    ("tools.html", "Tools"),
    ("work.html", "Work"),
    ("pricing.html", "Pricing"),
    ("about.html", "About"),
    ("contact.html", "Contact"),
]

def header(fname):
    links = []
    for href, text in NAV:
        cur = ' aria-current="page"' if href == fname or (href == "tools.html" and fname in TOOL_PAGES) else ""
        links.append(f'      <a href="{href}"{cur}>{text}</a>')
    nav = "\n".join(links)
    return f'''<header class="site-header">
  <div class="wrap hdr">
    <a class="brand" href="index.html">zebMalik<em>.tech</em></a>
    <button class="menu-btn" aria-label="Menu" onclick="document.querySelector('.mainnav').classList.toggle('open')"><span></span><span></span><span></span></button>
    <nav class="mainnav">
{nav}
      <a href="free-sample.html" class="navcta">Free sample</a>
    </nav>
    <a href="free-sample.html" class="btn">Get a free sample</a>
  </div>
</header>'''

FOOTER = '''<footer class="site-footer">
  <div class="wrap">
    <div class="fcols">
      <div class="about">
        <div class="brand">zebMalik<em>.tech</em></div>
        <p>An engineering team building data extraction, automation and AI systems. Written scope, fixed prices, code handed over.</p>
      </div>
      <div>
        <h4>Services</h4>
        <a href="services.html#extraction">Data extraction</a>
        <a href="services.html#automation">AI &amp; automation</a>
        <a href="services.html#backend">Backend engineering</a>
        <a href="services.html#dataops">Data operations</a>
      </div>
      <div>
        <h4>Solutions</h4>
        <a href="ecommerce-price-monitoring.html">Price monitoring</a>
        <a href="lead-list-building.html">Lead list building</a>
        <a href="ai-chatbot-rag.html">AI chatbots &amp; RAG</a>
        <a href="free-sample.html">Free sample</a>
      </div>
      <div>
        <h4>Company</h4>
        <a href="about.html">About</a>
        <a href="work.html">Work</a>
        <a href="pricing.html">Pricing</a>
        <a href="contact.html">Contact</a>
      </div>
      <div>
        <h4>Elsewhere</h4>
        <a href="https://github.com/MuhammadShahzebMalik786">GitHub</a>
        <a href="https://www.linkedin.com/in/muhammad-shahzeb-malik/">LinkedIn</a>
        <a href="https://muhammadshahzeb.dev">Portfolio</a>
        <a href="https://www.fiverr.com/maliksahahb/build-n8n-automation-ai-agents-and-ai-workflow-automation">Fiverr &mdash; n8n &amp; AI Agents</a>
        <a href="https://www.fiverr.com/maliksahahb/build-an-ai-chatbot-rag-agent-and-ai-assistant-for-your-data">Fiverr &mdash; AI Chatbot &amp; RAG</a>
      </div>
    </div>
    <div class="ftools">
      <div class="ftools-head">
        <h4>Free Browser Tools</h4>
        <a href="tools.html">Browse all 22 tools &rarr;</a>
      </div>
      <div class="ftools-grid">
        <div class="ftools-group image-group">
          <h5>Image Tools</h5>
          <div class="ftools-subgrid">
            <div>
              <a href="image-compressor.html">Image compressor</a>
              <a href="image-resizer.html">Image resizer</a>
              <a href="image-converter.html">Image converter</a>
              <a href="image-to-pdf.html">Image to PDF</a>
              <a href="pdf-to-image.html">PDF to image</a>
            </div>
            <div>
              <a href="image-metadata-remover.html">Metadata remover</a>
              <a href="image-cropper.html">Image cropper</a>
              <a href="image-rotator.html">Rotate images</a>
              <a href="image-watermark.html">Image watermark</a>
              <a href="meme-generator.html">Meme generator</a>
            </div>
          </div>
        </div>
        <div class="ftools-group">
          <h5>PDF Tools</h5>
          <a href="merge-pdf.html">Merge PDF</a>
          <a href="split-pdf.html">Split PDF</a>
          <a href="compress-pdf.html">Compress PDF</a>
          <a href="extract-text-from-pdf.html">PDF to text &amp; OCR</a>
          <a href="pdf-organizer.html">Organize PDF pages</a>
          <a href="watermark-pdf.html">Watermark PDF</a>
          <a href="pdf-page-numbers.html">Add page numbers</a>
          <a href="rotate-pdf.html">Rotate PDF</a>
        </div>
        <div class="ftools-group">
          <h5>Developer &amp; Utilities</h5>
          <a href="qr-code-generator.html">QR code generator</a>
          <a href="json-formatter.html">JSON formatter</a>
          <a href="word-counter.html">Word counter</a>
          <a href="password-generator.html">Password generator</a>
        </div>
      </div>
    </div>
    <div class="fbot">
      <div>&copy; <span id="yr">2026</span> zebMalik<span class="tech-mark">.tech</span> &nbsp;&middot;&nbsp; <a href="privacy.html" style="color:inherit;text-decoration:underline;">Privacy Policy</a> &nbsp;&middot;&nbsp; <a href="terms.html" style="color:inherit;text-decoration:underline;">Terms of Service</a></div>
      <div>Built and maintained in Pakistan &middot; Working across US, UK and EU hours</div>
    </div>
  </div>
</footer>

<script>document.getElementById('yr').textContent=new Date().getFullYear();</script>'''

hdr_re = re.compile(r'<header class="site-header">.*?</header>', re.S)
ftr_re = re.compile(r'<footer class="site-footer">.*?</footer>\s*(?:<script>document\.getElementById\(\'yr\'\).*?</script>)?', re.S)

for path in sorted(glob.glob(os.path.join(SITE, "*.html"))):
    fname = os.path.basename(path)
    src = open(path, encoding="utf-8").read()
    h = header(fname)
    title_match = re.search(r"<title>(.*?)</title>", src, re.S | re.I)
    description_match = re.search(r'<meta name="description" content="([^"]*)"', src, re.I)
    if title_match and description_match:
        src = re.sub(r"<!-- SEO-META -->.*?<!-- /SEO-META -->\s*", "", src, flags=re.S)
        metadata = seo_block(fname, html.unescape(title_match.group(1)), html.unescape(description_match.group(1)))
        src = src.replace("</head>", metadata + "\n</head>", 1)

    if "<!--HEADER-->" in src:
        src = src.replace("<!--HEADER-->", h)
    else:
        src = hdr_re.sub(lambda m: h, src, count=1)

    if "<!--FOOTER-->" in src:
        src = src.replace("<!--FOOTER-->", FOOTER)
    else:
        src = ftr_re.sub(lambda m: FOOTER, src, count=1)

    open(path, "w", encoding="utf-8").write(src)
    print("updated", fname)

def generate_sitemap():
    from datetime import date
    today = date.today().isoformat()
    html_files = [os.path.basename(p) for p in glob.glob(os.path.join(SITE, "*.html"))]
    lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for fname in sorted(html_files):
        if fname == "404.html":
            continue
        url = page_url(fname)
        if fname == "index.html":
            prio = "1.0"
        elif fname in ("services.html", "tools.html", "free-sample.html", "ecommerce-price-monitoring.html", "lead-list-building.html", "ai-chatbot-rag.html"):
            prio = "0.9"
        elif fname in ("privacy.html", "terms.html"):
            prio = "0.5"
        else:
            prio = "0.8"
        lines.append(f'  <url><loc>{url}</loc><lastmod>{today}</lastmod><priority>{prio}</priority></url>')
    lines.append('</urlset>\n')
    sitemap_path = os.path.join(SITE, "sitemap.xml")
    open(sitemap_path, "w", encoding="utf-8").write("\n".join(lines))
    print("generated sitemap.xml with", len(lines) - 3, "URLs")

generate_sitemap()

