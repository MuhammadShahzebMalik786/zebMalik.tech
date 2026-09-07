import re, glob, os

SITE = os.path.dirname(os.path.abspath(__file__))

NAV = [
    ("services.html", "Services"),
    ("work.html", "Work"),
    ("pricing.html", "Pricing"),
    ("about.html", "About"),
    ("contact.html", "Contact"),
]

def header(fname):
    links = []
    for href, text in NAV:
        cur = ' aria-current="page"' if href == fname else ""
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
        <a href="https://www.linkedin.com/in/YOUR_HANDLE">LinkedIn</a>
        <a href="https://muhammadshahzeb.dev">Portfolio</a>
      </div>
    </div>
    <div class="fbot">
      <div>&copy; <span id="yr">2026</span> zebMalik.tech</div>
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
