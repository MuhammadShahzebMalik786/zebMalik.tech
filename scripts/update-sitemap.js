// ============================================================
// zebMalik.tech — Auto SEO Sync Script
// Regenerates: sitemap.xml + llms.txt
// Pings: IndexNow (instant Bing/Yandex crawl notification)
// Run: node scripts/update-sitemap.js
// ============================================================
const fs = require('fs');
const https = require('https');
const path = require('path');

const SUPABASE_HOST = 'qfsmwivvcfpkutqszlhd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmc213aXZ2Y2Zwa3V0cXN6bGhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNjI5NTUsImV4cCI6MjEwNTgzODk1NX0.rWln2NStaO3DNTNZzrJOk_F7FkG4hqijwPvm1aP199M';
const INDEXNOW_KEY = '9f8e7d6c5b4a392817263544abcdef01';
const SITE = 'https://zebmalik.tech';
const ROOT = path.join(__dirname, '..');

const STATIC_PAGES = [
  { url: '/',                          priority: '1.0', changefreq: 'daily'   },
  { url: '/blog',                      priority: '0.9', changefreq: 'daily'   },
  { url: '/services',                  priority: '0.9', changefreq: 'weekly'  },
  { url: '/tools',                     priority: '0.9', changefreq: 'weekly'  },
  { url: '/ai-chatbot-rag',            priority: '0.9', changefreq: 'monthly' },
  { url: '/ecommerce-price-monitoring',priority: '0.9', changefreq: 'monthly' },
  { url: '/lead-list-building',        priority: '0.9', changefreq: 'monthly' },
  { url: '/free-sample',               priority: '0.9', changefreq: 'monthly' },
  { url: '/about',                     priority: '0.8', changefreq: 'monthly' },
  { url: '/contact',                   priority: '0.8', changefreq: 'monthly' },
  { url: '/work',                      priority: '0.8', changefreq: 'monthly' },
  { url: '/pricing',                   priority: '0.8', changefreq: 'monthly' },
  { url: '/write',                     priority: '0.8', changefreq: 'monthly' },
  { url: '/author-dashboard',          priority: '0.7', changefreq: 'weekly'  },
  { url: '/compress-pdf',              priority: '0.8', changefreq: 'monthly' },
  { url: '/extract-text-from-pdf',     priority: '0.8', changefreq: 'monthly' },
  { url: '/image-compressor',          priority: '0.8', changefreq: 'monthly' },
  { url: '/image-converter',           priority: '0.8', changefreq: 'monthly' },
  { url: '/image-cropper',             priority: '0.8', changefreq: 'monthly' },
  { url: '/image-metadata-remover',    priority: '0.8', changefreq: 'monthly' },
  { url: '/image-resizer',             priority: '0.8', changefreq: 'monthly' },
  { url: '/image-rotator',             priority: '0.8', changefreq: 'monthly' },
  { url: '/image-to-pdf',             priority: '0.8', changefreq: 'monthly' },
  { url: '/image-watermark',           priority: '0.8', changefreq: 'monthly' },
  { url: '/json-formatter',            priority: '0.8', changefreq: 'monthly' },
  { url: '/meme-generator',            priority: '0.8', changefreq: 'monthly' },
  { url: '/merge-pdf',                 priority: '0.8', changefreq: 'monthly' },
  { url: '/password-generator',        priority: '0.8', changefreq: 'monthly' },
  { url: '/pdf-organizer',             priority: '0.8', changefreq: 'monthly' },
  { url: '/pdf-page-numbers',          priority: '0.8', changefreq: 'monthly' },
  { url: '/pdf-to-image',             priority: '0.8', changefreq: 'monthly' },
  { url: '/qr-code-generator',         priority: '0.8', changefreq: 'monthly' },
  { url: '/rotate-pdf',                priority: '0.8', changefreq: 'monthly' },
  { url: '/split-pdf',                 priority: '0.8', changefreq: 'monthly' },
  { url: '/watermark-pdf',             priority: '0.8', changefreq: 'monthly' },
  { url: '/word-counter',              priority: '0.8', changefreq: 'monthly' },
  { url: '/privacy',                   priority: '0.5', changefreq: 'yearly'  },
  { url: '/terms',                     priority: '0.5', changefreq: 'yearly'  },
];

// ── Fetch all published posts from Supabase ──────────────────
function fetchPublishedPosts() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SUPABASE_HOST,
      path: '/rest/v1/posts?select=slug,title,excerpt,tags,published_at,updated_at&status=eq.published&order=published_at.desc',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      }
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// ── Write sitemap.xml ────────────────────────────────────────
function writeSitemap(posts) {
  const today = new Date().toISOString().slice(0, 10);
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  STATIC_PAGES.forEach(p => {
    xml += `  <url><loc>${SITE}${p.url}</loc><lastmod>${today}</lastmod><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>\n`;
  });

  posts.forEach(post => {
    const date = (post.updated_at || post.published_at || today).slice(0, 10);
    const url = `${SITE}/post?slug=${encodeURIComponent(post.slug)}`;
    xml += `  <url><loc>${url}</loc><lastmod>${date}</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>\n`;
  });

  xml += '</urlset>\n';
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');
  console.log(`✅ sitemap.xml: ${STATIC_PAGES.length} static + ${posts.length} articles = ${STATIC_PAGES.length + posts.length} total URLs`);
}

// ── Write llms.txt ───────────────────────────────────────────
function writeLlmsTxt(posts) {
  const today = new Date().toISOString().slice(0, 10);

  let txt = `# zebMalik.tech\n`;
  txt += `\n`;
  txt += `> Privacy-first browser tools for images, PDFs, text and developer workflows — plus fixed-scope engineering services and a community engineering blog.\n`;
  txt += `> Last updated: ${today}\n`;
  txt += `\n`;
  txt += `## What this site provides\n`;
  txt += `\n`;
  txt += `zebMalik.tech is a static website. Free tools process files locally in the visitor's browser. No uploads to servers. Some pages load open-source libraries from public CDNs (PDF rendering, OCR).\n`;
  txt += `\n`;
  txt += `The engineering services side offers: web scraping & data extraction, AI chatbot & RAG development, workflow automation, backend/API engineering, and data operations. Projects are scoped in writing with a fixed price and source-code handover.\n`;
  txt += `\n`;
  txt += `The blog is a community platform where engineers publish technical deep-dives and earn monthly payouts based on verified reader engagement.\n`;
  txt += `\n`;
  txt += `## Core pages\n`;
  txt += `\n`;
  txt += `- [Homepage](${SITE}/): Engineering studio overview, service offerings, and free tool access.\n`;
  txt += `- [Engineering Blog](${SITE}/blog): Community articles on data pipelines, AI, backend systems, and automation.\n`;
  txt += `- [All Developer Tools](${SITE}/tools): 22+ free browser-based utilities for images, PDFs, QR codes, JSON, and writing.\n`;
  txt += `- [Engineering Services](${SITE}/services): Web scraping, AI agents, automation, and backend engineering.\n`;
  txt += `- [AI Chatbot & RAG](${SITE}/ai-chatbot-rag): Custom AI chatbot and document retrieval system development.\n`;
  txt += `- [E-commerce Price Monitoring](${SITE}/ecommerce-price-monitoring): Automated competitor price tracking at scale.\n`;
  txt += `- [B2B Lead List Building](${SITE}/lead-list-building): Verified business lead generation and enrichment.\n`;
  txt += `- [Write & Get Paid](${SITE}/write): Contributor program for engineers to publish and earn.\n`;
  txt += `- [Pricing](${SITE}/pricing): Fixed-scope service rates and retainer models.\n`;
  txt += `- [Free Sample](${SITE}/free-sample): Request a free engineering deliverable sample.\n`;
  txt += `- [Contact](${SITE}/contact): Send a project brief or direct message.\n`;
  txt += `\n`;
  txt += `## Image tools\n`;
  txt += `\n`;
  txt += `- [Image Compressor](${SITE}/image-compressor): Lossy and lossless compression for JPG, PNG, WebP.\n`;
  txt += `- [Image Converter](${SITE}/image-converter): Convert between WebP, PNG, JPG formats locally.\n`;
  txt += `- [Image Resizer](${SITE}/image-resizer): Resize by pixel dimensions or percentage.\n`;
  txt += `- [Image Cropper](${SITE}/image-cropper): Crop images with custom aspect ratios.\n`;
  txt += `- [Image Rotator](${SITE}/image-rotator): Rotate images in 90° increments.\n`;
  txt += `- [Image Watermark](${SITE}/image-watermark): Add text or image watermarks.\n`;
  txt += `- [Image to PDF](${SITE}/image-to-pdf): Combine images into a single PDF.\n`;
  txt += `- [EXIF Metadata Remover](${SITE}/image-metadata-remover): Strip GPS and camera data for privacy.\n`;
  txt += `\n`;
  txt += `## PDF tools\n`;
  txt += `\n`;
  txt += `- [Merge PDF](${SITE}/merge-pdf): Combine multiple PDFs into one.\n`;
  txt += `- [Split PDF](${SITE}/split-pdf): Extract individual pages from a PDF.\n`;
  txt += `- [Compress PDF](${SITE}/compress-pdf): Reduce PDF file size.\n`;
  txt += `- [PDF to Image](${SITE}/pdf-to-image): Convert PDF pages to PNG or JPG.\n`;
  txt += `- [Extract Text / OCR](${SITE}/extract-text-from-pdf): Pull text from PDFs including scanned documents.\n`;
  txt += `- [Organize PDF](${SITE}/pdf-organizer): Reorder and delete pages.\n`;
  txt += `- [Watermark PDF](${SITE}/watermark-pdf): Add text watermarks to PDFs.\n`;
  txt += `- [PDF Page Numbers](${SITE}/pdf-page-numbers): Add numbered footers to PDF pages.\n`;
  txt += `- [Rotate PDF](${SITE}/rotate-pdf): Rotate individual or all pages.\n`;
  txt += `\n`;
  txt += `## Developer & utility tools\n`;
  txt += `\n`;
  txt += `- [JSON Formatter](${SITE}/json-formatter): Validate, format, minify, and copy JSON locally.\n`;
  txt += `- [QR Code Generator](${SITE}/qr-code-generator): Generate QR codes for URLs, text, and contacts.\n`;
  txt += `- [Word Counter](${SITE}/word-counter): Count words, characters, sentences, and reading time.\n`;
  txt += `- [Password Generator](${SITE}/password-generator): High-entropy password generation in the browser.\n`;
  txt += `- [Meme Generator](${SITE}/meme-generator): Add text captions to images.\n`;
  txt += `\n`;

  if (posts.length > 0) {
    txt += `## Engineering blog articles (${posts.length} published)\n`;
    txt += `\n`;
    posts.forEach(post => {
      const url = `${SITE}/post?slug=${encodeURIComponent(post.slug)}`;
      const excerpt = (post.excerpt || '').replace(/\n/g, ' ').trim().slice(0, 150);
      const tags = (post.tags || []).slice(0, 5).join(', ');
      txt += `- [${post.title}](${url})`;
      if (excerpt) txt += `: ${excerpt}`;
      if (tags) txt += ` [${tags}]`;
      txt += '\n';
    });
    txt += '\n';
  }

  txt += `## Important limitations\n`;
  txt += `\n`;
  txt += `Browser tool performance depends on device memory and supported formats. OCR can make recognition mistakes and should be verified. Tools do not replace professional legal review, guaranteed lossless compression, or redaction.\n`;

  fs.writeFileSync(path.join(ROOT, 'llms.txt'), txt, 'utf8');
  console.log(`✅ llms.txt: updated with ${posts.length} articles`);
}

// ── Ping IndexNow (instant Bing/Yandex notify) ───────────────
function pingIndexNow(urls) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      host: 'zebmalik.tech',
      key: INDEXNOW_KEY,
      keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`,
      urlList: urls.slice(0, 10000) // IndexNow max per request
    });

    const req = https.request({
      hostname: 'api.indexnow.org',
      path: '/indexnow',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      console.log(`📡 IndexNow ping: HTTP ${res.statusCode} (Bing/Yandex/other engines notified)`);
      resolve();
    });

    req.on('error', (err) => {
      console.warn('IndexNow notice:', err.message);
      resolve();
    });

    req.write(payload);
    req.end();
  });
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log('🔄 Fetching published posts from Supabase...');
  const posts = await fetchPublishedPosts();
  console.log(`   Found ${posts.length} published articles.`);

  writeSitemap(posts);
  writeLlmsTxt(posts);

  // Ping IndexNow with all article URLs + top static pages
  const allUrls = [
    `${SITE}/`,
    `${SITE}/blog`,
    ...posts.map(p => `${SITE}/post?slug=${encodeURIComponent(p.slug)}`)
  ];
  await pingIndexNow(allUrls);

  console.log('\n🎉 SEO sync complete.');
}

main().catch(err => {
  console.error('❌ SEO sync failed:', err);
  process.exit(1);
});
