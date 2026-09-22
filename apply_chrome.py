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
    "qr-code-generator.html",
    "json-formatter.html",
    "word-counter.html",
}

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
        <h4>Tools</h4>
        <a href="image-compressor.html">Image compressor</a>
        <a href="image-resizer.html">Image resizer</a>
        <a href="image-converter.html">Image converter</a>
        <a href="image-to-pdf.html">Image to PDF</a>
        <a href="pdf-to-image.html">PDF to image</a>
        <a href="image-metadata-remover.html">Metadata remover</a>
        <a href="image-cropper.html">Image cropper</a>
        <a href="image-rotator.html">Rotate images</a>
        <a href="image-watermark.html">Image watermark</a>
        <a href="meme-generator.html">Meme generator</a>
        <a href="merge-pdf.html">Merge PDF</a>
        <a href="split-pdf.html">Split PDF</a>
        <a href="compress-pdf.html">Compress PDF</a>
        <a href="extract-text-from-pdf.html">PDF to text &amp; OCR</a>
        <a href="pdf-organizer.html">Organize PDF pages</a>
        <a href="watermark-pdf.html">Watermark PDF</a>
        <a href="pdf-page-numbers.html">Add page numbers</a>
        <a href="qr-code-generator.html">QR code generator</a>
        <a href="json-formatter.html">JSON formatter</a>
        <a href="word-counter.html">Word counter</a>
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
    <div class="fbot">
      <div>&copy; <span id="yr">2026</span> zebMalik<span class="tech-mark">.tech</span></div>
      <div>Built and maintained in Pakistan &middot; Working across US, UK and EU hours</div>
    </div>
  </div>
</footer>

<script>document.getElementById('yr').textContent=new Date().getFullYear();</script>'''

hdr_re = re.compile(r'<header class="site-header">.*?</header>', re.S)
ftr_re = re.compile(r'<footer class="site-footer">.*?</footer>\s*(?:<script>document\.getElementById\(\'yr\'\).*?</script>)?', re.S)

for path in sorted(glob.glob(os.path.join(SITE, "*.html"))):
    fname = os.path.basename(path)
    src = open(path).read()
    h = header(fname)

    if "<!--HEADER-->" in src:
        src = src.replace("<!--HEADER-->", h)
    else:
        src = hdr_re.sub(lambda m: h, src, count=1)

    if "<!--FOOTER-->" in src:
        src = src.replace("<!--FOOTER-->", FOOTER)
    else:
        src = ftr_re.sub(lambda m: FOOTER, src, count=1)

    open(path, "w").write(src)
    print("updated", fname)
