// ============================================================
// zebMalik.tech — Static Site Pre-renderer & SEO Publisher
// Converts Supabase blog posts into real static HTML pages
// Updates:
//   1. posts/<slug>/index.html for each published article
//   2. blog.html with pre-rendered article list
//   3. sitemap.xml with canonical article URLs
//   4. llms.txt with AI-readable summaries & links
//   5. cmd-palette.js static search index
//   6. Pings IndexNow (Bing / Yandex)
// ============================================================

const fs = require('fs');
const https = require('https');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SUPABASE_HOST = 'qfsmwivvcfpkutqszlhd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmc213aXZ2Y2Zwa3V0cXN6bGhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNjI5NTUsImV4cCI6MjEwNTgzODk1NX0.rWln2NStaO3DNTNZzrJOk_F7FkG4hqijwPvm1aP199M';
const SITE = 'https://zebmalik.tech';
const INDEXNOW_KEY = '9f8e7d6c5b4a392817263544abcdef01';

// Load Marked library for markdown conversion
const markedCode = fs.readFileSync(path.join(__dirname, 'marked.min.js'), 'utf8');
const markedContext = {};
vm.createContext(markedContext);
vm.runInContext(markedCode, markedContext);
const marked = markedContext.marked;

// Static pages configuration for sitemap
const STATIC_PAGES = [
  { url: '/',                           priority: '1.0', changefreq: 'daily'   },
  { url: '/blog',                       priority: '0.9', changefreq: 'daily'   },
  { url: '/services',                   priority: '0.9', changefreq: 'weekly'  },
  { url: '/tools',                      priority: '0.9', changefreq: 'weekly'  },
  { url: '/ai-chatbot-rag',             priority: '0.9', changefreq: 'monthly' },
  { url: '/ecommerce-price-monitoring', priority: '0.9', changefreq: 'monthly' },
  { url: '/lead-list-building',         priority: '0.9', changefreq: 'monthly' },
  { url: '/free-sample',                priority: '0.9', changefreq: 'monthly' },
  { url: '/about',                      priority: '0.8', changefreq: 'monthly' },
  { url: '/contact',                    priority: '0.8', changefreq: 'monthly' },
  { url: '/work',                       priority: '0.8', changefreq: 'monthly' },
  { url: '/pricing',                    priority: '0.8', changefreq: 'monthly' },
  { url: '/write',                      priority: '0.8', changefreq: 'monthly' },
  { url: '/author-dashboard',           priority: '0.7', changefreq: 'weekly'  },
  { url: '/compress-pdf',               priority: '0.8', changefreq: 'monthly' },
  { url: '/extract-text-from-pdf',      priority: '0.8', changefreq: 'monthly' },
  { url: '/image-compressor',           priority: '0.8', changefreq: 'monthly' },
  { url: '/image-converter',            priority: '0.8', changefreq: 'monthly' },
  { url: '/image-cropper',              priority: '0.8', changefreq: 'monthly' },
  { url: '/image-metadata-remover',     priority: '0.8', changefreq: 'monthly' },
  { url: '/image-resizer',              priority: '0.8', changefreq: 'monthly' },
  { url: '/image-rotator',              priority: '0.8', changefreq: 'monthly' },
  { url: '/image-to-pdf',               priority: '0.8', changefreq: 'monthly' },
  { url: '/image-watermark',            priority: '0.8', changefreq: 'monthly' },
  { url: '/json-formatter',             priority: '0.8', changefreq: 'monthly' },
  { url: '/meme-generator',             priority: '0.8', changefreq: 'monthly' },
  { url: '/merge-pdf',                  priority: '0.8', changefreq: 'monthly' },
  { url: '/password-generator',         priority: '0.8', changefreq: 'monthly' },
  { url: '/pdf-organizer',              priority: '0.8', changefreq: 'monthly' },
  { url: '/pdf-page-numbers',           priority: '0.8', changefreq: 'monthly' },
  { url: '/pdf-to-image',               priority: '0.8', changefreq: 'monthly' },
  { url: '/qr-code-generator',          priority: '0.8', changefreq: 'monthly' },
  { url: '/rotate-pdf',                 priority: '0.8', changefreq: 'monthly' },
  { url: '/split-pdf',                  priority: '0.8', changefreq: 'monthly' },
  { url: '/watermark-pdf',              priority: '0.8', changefreq: 'monthly' },
  { url: '/word-counter',               priority: '0.8', changefreq: 'monthly' },
  { url: '/privacy',                    priority: '0.5', changefreq: 'yearly'  },
  { url: '/terms',                      priority: '0.5', changefreq: 'yearly'  },
];

// Taxonomy
const CATEGORIES = [
  { id: 'all', label: 'All Articles', icon: '📚' },
  { id: 'data-engineering', label: 'Data Engineering & Pipelines', icon: '🌐' },
  { id: 'ai-agents', label: 'AI Systems & Agents', icon: '🤖' },
  { id: 'backend-db', label: 'Backend & Databases', icon: '⚡' },
  { id: 'devops-systems', label: 'DevOps & Systems', icon: '🛡️' },
  { id: 'research', label: 'Open Research & Insights', icon: '🔬' }
];

function inferCategory(post) {
  if (!post) return CATEGORIES[1];
  const explicit = (post.category || '').toString().trim().toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.id !== 'all' && (explicit === cat.id.toLowerCase() || explicit === cat.label.toLowerCase() || explicit.includes(cat.id))) {
      return cat;
    }
  }
  const tags = (post.tags || []).map(t => (t || '').toLowerCase());
  const title = (post.title || '').toLowerCase();
  const combined = title + ' ' + tags.join(' ');

  if (/what is zebmalik\.tech|tech journalism|write for us|open research|insights|community|interview/i.test(combined)) return CATEGORIES[5];
  if (/duckdb|scraping|scraper|crawl|crawler|etl|pipeline|pipelines|extraction|playwright|puppeteer|selenium|dataops|parquet/i.test(combined)) return CATEGORIES[1];
  if (/rag|llm|ollama|pydantic|langchain|vector|agent|agents|smartphones|ai phone|ai |chatbot|gpt|openai|gemini/i.test(combined)) return CATEGORIES[2];
  if (/postgresql|postgres|fastapi|websockets|redis|sql|database|rest api|connection pooling|backend|supabase/i.test(combined)) return CATEGORIES[3];
  if (/mmap|memory|linux|jwt|security|rls|auth|wasm|webassembly|cloudflare|nextjs|edge|devops|c\+\+|operating system/i.test(combined)) return CATEGORIES[4];

  return CATEGORIES[5];
}

function calculateReadTime(content) {
  if (!content) return 3;
  const words = content.replace(/<[^>]*>/g, '').trim().split(/\s+/).length;
  return Math.max(2, Math.ceil(words / 220));
}

function formatDate(isoStr) {
  if (!isoStr) return 'Recently published';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (_) {
    return 'Recently published';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ── Fetch published posts from Supabase ──────────────────────
function fetchPosts() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SUPABASE_HOST,
      path: '/rest/v1/posts?select=id,title,slug,excerpt,content_markdown,cover_image_url,tags,view_count,published_at,updated_at,category,profiles(full_name,username,bio,avatar_url)&status=eq.published&order=published_at.desc',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      }
    };
    https.get(options, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try {
          const raw = Buffer.concat(chunks).toString('utf8');
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// ── Render Markdown or clean HTML ────────────────────────────
function renderContent(rawContent) {
  if (!rawContent) return '';
  const trimmed = rawContent.trim();
  let html = '';
  if (trimmed.startsWith('<')) {
    html = trimmed;
  } else {
    html = marked.parse(trimmed);
  }

  // Assign IDs to h2 and h3 elements for table of contents
  let headingIndex = 0;
  const headings = [];

  html = html.replace(/<(h[23])([^>]*)>([\s\S]*?)<\/\1>/gi, (match, tag, attrs, inner) => {
    const plainText = stripHtml(inner);
    const existingIdMatch = attrs.match(/id=["']([^"']+)["']/i);
    let id = '';
    if (existingIdMatch) {
      id = existingIdMatch[1];
    } else {
      id = 'sec-' + headingIndex + '-' + plainText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      headingIndex++;
    }
    headings.push({ tag: tag.toLowerCase(), id, text: plainText });
    return `<${tag}${attrs} id="${id}">${inner}</${tag}>`;
  });

  return { html, headings };
}

// ── Generate Table of Contents HTML ──────────────────────────
function renderToc(headings) {
  if (!headings || headings.length === 0) {
    return '<span class="muted" style="font-size:0.85rem">Overview</span>';
  }
  let out = '<a href="#post-title" class="toc-item toc-top active">(Top)</a>\n';
  headings.forEach(h => {
    out += `          <a href="#${h.id}" class="toc-item toc-${h.tag}">${escapeHtml(h.text)}</a>\n`;
  });
  return out;
}

// ── Generate Static Post Page ────────────────────────────────
function generatePostPage(post, templateHtml, allPosts) {
  const cat = inferCategory(post);
  const readMinutes = calculateReadTime(post.content_markdown || post.excerpt || '');
  const pubDateStr = formatDate(post.published_at);
  const author = post.profiles || {};
  const authorName = author.full_name || 'Engineering Contributor';
  const authorBio = author.bio || 'Independent engineer publishing open research on zebMalik.tech.';
  const authorAvatar = author.avatar_url;
  const canonicalUrl = `${SITE}/posts/${encodeURIComponent(post.slug)}/`;
  const cleanExcerpt = escapeHtml(stripHtml(post.excerpt || post.title).slice(0, 160));
  const coverImage = post.cover_image_url || `${SITE}/android-chrome-512x512.png`;

  const { html: contentHtml, headings } = renderContent(post.content_markdown || '');
  const tocHtml = renderToc(headings);

  // Compute related articles
  const related = allPosts
    .filter(p => p.slug !== post.slug)
    .slice(0, 3);

  let relatedCardsHtml = '';
  related.forEach(rel => {
    const relCat = inferCategory(rel);
    const relDate = formatDate(rel.published_at);
    const relMinutes = calculateReadTime(rel.content_markdown || rel.excerpt || '');
    relatedCardsHtml += `
      <a href="/posts/${encodeURIComponent(rel.slug)}/" class="related-card">
        <span class="related-card-category">${relCat.icon} ${escapeHtml(relCat.label)}</span>
        <h4 class="related-card-title">${escapeHtml(rel.title)}</h4>
        <div class="related-card-meta">
          <span>${relDate}</span> &bull; <span>${relMinutes} min read</span>
        </div>
      </a>`;
  });

  // Base template adjustments
  let page = templateHtml;

  // Ensure absolute asset paths
  page = page.replace(/href="styles\.css/g, 'href="/styles.css');
  page = page.replace(/src="theme\.js/g, 'src="/theme.js');
  page = page.replace(/src="cmd-palette\.js/g, 'src="/cmd-palette.js');
  page = page.replace(/src="blog-config\.js/g, 'src="/blog-config.js');

  // Title & description
  page = page.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(post.title)} — zebMalik.tech Blog</title>`);
  page = page.replace(/<meta name="description" content=".*?">/i, `<meta name="description" content="${cleanExcerpt}">`);

  // Canonical tag
  if (page.includes('<link rel="canonical"')) {
    page = page.replace(/<link rel="canonical"[^>]*>/i, `<link rel="canonical" href="${canonicalUrl}">`);
  } else {
    page = page.replace('</head>', `  <link rel="canonical" href="${canonicalUrl}">\n</head>`);
  }

  // Open Graph & Twitter
  page = page.replace(/<meta property="og:title" content=".*?">/i, `<meta property="og:title" content="${escapeHtml(post.title)}">`);
  page = page.replace(/<meta property="og:description" content=".*?">/i, `<meta property="og:description" content="${cleanExcerpt}">`);
  page = page.replace(/<meta property="og:url" content=".*?">/i, `<meta property="og:url" content="${canonicalUrl}">`);
  page = page.replace(/<meta property="og:image" content=".*?">/i, `<meta property="og:image" content="${coverImage}">`);
  page = page.replace(/<meta name="twitter:title" content=".*?">/i, `<meta name="twitter:title" content="${escapeHtml(post.title)}">`);
  page = page.replace(/<meta name="twitter:description" content=".*?">/i, `<meta name="twitter:description" content="${cleanExcerpt}">`);
  page = page.replace(/<meta name="twitter:image" content=".*?">/i, `<meta name="twitter:image" content="${coverImage}">`);

  // Schema.org JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": cleanExcerpt,
    "image": coverImage,
    "url": canonicalUrl,
    "datePublished": post.published_at || new Date().toISOString(),
    "dateModified": post.updated_at || post.published_at || new Date().toISOString(),
    "author": {
      "@type": "Person",
      "name": authorName
    },
    "publisher": {
      "@type": "Organization",
      "name": "zebMalik.tech",
      "url": SITE,
      "logo": {
        "@type": "ImageObject",
        "url": `${SITE}/android-chrome-512x512.png`
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonicalUrl
    }
  };
  page = page.replace(/<script type="application\/ld\+json" id="post-jsonld">[\s\S]*?<\/script>/i,
    `<script type="application/ld+json" id="post-jsonld">${JSON.stringify(jsonLd)}</script>`);

  // Header breadcrumb / meta / title / byline
  const postMetaHtml = `${cat.icon} ${escapeHtml(cat.label)} &bull; ${pubDateStr} &bull; ${readMinutes} min read &bull; ${post.view_count || 1} verified reads`;
  page = page.replace('<span id="post-meta" class="label">Loading article...</span>',
    `<span id="post-meta" class="label">${postMetaHtml}</span>`);
  
  page = page.replace('<h1 id="post-title" class="reader-title">Loading...</h1>',
    `<h1 id="post-title" class="reader-title">${escapeHtml(post.title)}</h1>`);

  const tagsHtml = (post.tags || []).map(t => `<span class="chip chip-static">#${escapeHtml(t)}</span>`).join(' ');
  const bylineHtml = `
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <span>By <strong>${escapeHtml(authorName)}</strong></span>
      <span>&bull;</span>
      <span>${pubDateStr}</span>
      <button type="button" id="post-byline-bm" class="btn-bookmark" data-slug="${escapeHtml(post.slug)}" title="Save article for later" aria-label="Bookmark article">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
        <span class="bm-text">Save</span>
      </button>
    </div>
    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:6px">${tagsHtml}</div>`;
  page = page.replace('<div id="post-byline" class="reader-byline"></div>',
    `<div id="post-byline" class="reader-byline">${bylineHtml}</div>`);

  // Cover image
  if (post.cover_image_url) {
    const coverHtml = `<img src="${escapeHtml(post.cover_image_url)}" alt="${escapeHtml(post.title)}" style="width:100%;max-height:480px;object-fit:cover;border-radius:8px;border:1px solid var(--line);margin-bottom:2rem">`;
    page = page.replace(/<div id="post-cover-wrapper" class="post-cover-wrapper" style="display:none">[\s\S]*?<\/div>\s*<\/div>/i,
      `<div id="post-cover-wrapper" class="post-cover-wrapper">${coverHtml}</div>`);
  }

  // Table of Contents
  page = page.replace(/<nav id="toc-list" class="toc-links">[\s\S]*?<\/nav>/i,
    `<nav id="toc-list" class="toc-links">\n${tocHtml}        </nav>`);

  // Article Content (Real Full HTML Text!)
  page = page.replace(/<article id="post-content" class="article-body">[\s\S]*?<\/article>/i,
    `<article id="post-content" class="article-body">\n${contentHtml}\n      </article>`);

  // Author Box
  const avatarHtml = authorAvatar ? `<img src="${escapeHtml(authorAvatar)}" alt="${escapeHtml(authorName)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : '✍️';
  page = page.replace(/<div id="author-avatar" class="author-avatar-box">[\s\S]*?<\/div>/i,
    `<div id="author-avatar" class="author-avatar-box">${avatarHtml}</div>`);
  page = page.replace('<h3 id="author-name" style="margin:0;font-size:1.35rem">Engineering Contributor</h3>',
    `<h3 id="author-name" style="margin:0;font-size:1.35rem">${escapeHtml(authorName)}</h3>`);
  page = page.replace('<p id="author-bio" class="muted" style="margin-top:0.35rem;font-size:0.95rem">Independent engineer publishing open research on zebMalik.tech.</p>',
    `<p id="author-bio" class="muted" style="margin-top:0.35rem;font-size:0.95rem">${escapeHtml(authorBio)}</p>`);

  // Infobox
  const shortTitle = post.title.length > 34 ? post.title.substring(0, 32) + '...' : post.title;
  page = page.replace('<h4 id="info-card-title">Article Summary</h4>', `<h4 id="info-card-title">${escapeHtml(shortTitle)}</h4>`);
  page = page.replace('<td id="info-author">Author</td>', `<td id="info-author">${escapeHtml(authorName)}</td>`);
  page = page.replace('<td id="info-date">-</td>', `<td id="info-date">${pubDateStr}</td>`);
  page = page.replace('<td id="info-readtime">-</td>', `<td id="info-readtime">${readMinutes} min</td>`);
  page = page.replace('<td id="info-category">Engineering</td>', `<td id="info-category">${escapeHtml(cat.label)}</td>`);
  page = page.replace('<td id="info-views">0</td>', `<td id="info-views">${post.view_count || 1} reads</td>`);

  // Related Articles
  page = page.replace('<div id="related-cards-grid" class="related-cards-grid"></div>',
    `<div id="related-cards-grid" class="related-cards-grid">${relatedCardsHtml}</div>`);
  page = page.replace('<section id="related-articles-section" class="related-articles-section" style="display:none">',
    '<section id="related-articles-section" class="related-articles-section">');

  // Inject prerender flag so client-side post.html script doesn't wipe pre-rendered content
  page = page.replace('<body>', '<body data-prerendered="true">');

  // Inject post data object for client-side hydration (bookmarks, view tracking)
  const postDataScript = `  <script>window.__POST_DATA__ = ${JSON.stringify({ id: post.id, slug: post.slug, title: post.title })};</script>\n</head>`;
  page = page.replace('</head>', postDataScript);

  // AdSense Code: Keep AdSense on static articles!
  if (!page.includes('ca-pub-9522829065676411')) {
    page = page.replace('</head>', `  <meta name="google-adsense-account" content="ca-pub-9522829065676411">\n  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9522829065676411" crossorigin="anonymous"></script>\n</head>`);
  }

  return page;
}

// ── Update blog.html with Static Pre-rendered Posts ──────────
function updateBlogListing(posts) {
  const blogPath = path.join(ROOT, 'blog.html');
  if (!fs.existsSync(blogPath)) return;
  let blogHtml = fs.readFileSync(blogPath, 'utf8');

  let rowsHtml = '';
  posts.forEach(post => {
    const cat = inferCategory(post);
    const dateStr = formatDate(post.published_at);
    const readMin = calculateReadTime(post.content_markdown || post.excerpt || '');
    const authorName = (post.profiles && post.profiles.full_name) || 'Contributor';
    const postUrl = `/posts/${encodeURIComponent(post.slug)}/`;
    const cleanExcerpt = escapeHtml(stripHtml(post.excerpt || '').slice(0, 190));
    const tagsHtml = (post.tags || []).slice(0, 4).map(t => `<span class="chip chip-static">#${escapeHtml(t)}</span>`).join(' ');

    let thumbHtml = '';
    if (post.cover_image_url) {
      thumbHtml = `
        <div class="blog-row-thumb">
          <a href="${postUrl}"><img src="${escapeHtml(post.cover_image_url)}" alt="${escapeHtml(post.title)}" loading="lazy"></a>
        </div>`;
    }

    rowsHtml += `
      <article class="blog-editorial-row" data-category="${cat.id}" data-slug="${escapeHtml(post.slug)}">
        <div class="blog-row-main">
          <div class="blog-row-meta">
            <span class="blog-row-category">${cat.icon} ${escapeHtml(cat.label)}</span>
            <span class="blog-row-dot">&bull;</span>
            <span class="blog-row-readtime">${readMin} min read</span>
            <div class="blog-row-byline">By <strong>${escapeHtml(authorName)}</strong> &bull; ${dateStr}</div>
          </div>
          <h2 class="blog-row-title"><a href="${postUrl}">${escapeHtml(post.title)}</a></h2>
          <p class="blog-row-excerpt">${cleanExcerpt}</p>
          <div class="blog-row-footer">
            <div class="blog-row-tags">${tagsHtml}</div>
            <div class="blog-row-actions">
              <span class="views-txt">${post.view_count || 1} reads</span>
              <button type="button" class="btn-bookmark" data-slug="${escapeHtml(post.slug)}" title="Save article" aria-label="Bookmark article">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                <span class="bm-text">Save</span>
              </button>
            </div>
          </div>
        </div>${thumbHtml}
      </article>\n`;
  });

  // Replace placeholder skeleton inside #posts-container
  const regex = /<div id="posts-container" class="blog-editorial-list"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/section>/i;
  const replacement = `<div id="posts-container" class="blog-editorial-list" aria-live="polite">\n${rowsHtml}    </div>\n  </div>\n</section>`;

  if (regex.test(blogHtml)) {
    blogHtml = blogHtml.replace(regex, replacement);
    fs.writeFileSync(blogPath, blogHtml, 'utf8');
    console.log(`✅ blog.html: pre-rendered ${posts.length} articles into static HTML.`);
  } else {
    console.warn('⚠️ Could not find #posts-container in blog.html to replace.');
  }
}

// ── Update sitemap.xml ───────────────────────────────────────
function updateSitemap(posts) {
  const today = new Date().toISOString().slice(0, 10);
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  STATIC_PAGES.forEach(p => {
    xml += `  <url><loc>${SITE}${p.url}</loc><lastmod>${today}</lastmod><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>\n`;
  });

  posts.forEach(post => {
    const date = (post.updated_at || post.published_at || today).slice(0, 10);
    const url = `${SITE}/posts/${encodeURIComponent(post.slug)}/`;
    xml += `  <url><loc>${url}</loc><lastmod>${date}</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>\n`;
  });

  xml += '</urlset>\n';
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');
  console.log(`✅ sitemap.xml: ${STATIC_PAGES.length} static + ${posts.length} static articles = ${STATIC_PAGES.length + posts.length} total URLs.`);
}

// ── Update llms.txt ──────────────────────────────────────────
function updateLlmsTxt(posts) {
  const today = new Date().toISOString().slice(0, 10);

  let txt = `# zebMalik.tech\n\n`;
  txt += `> Privacy-first browser tools for images, PDFs, text and developer workflows — plus fixed-scope engineering services and a community engineering blog.\n`;
  txt += `> Last updated: ${today}\n\n`;
  txt += `## What this site provides\n\n`;
  txt += `zebMalik.tech is a static website. Free tools process files locally in the visitor's browser. No uploads to servers.\n\n`;
  txt += `The engineering services side offers: web scraping & data extraction, AI chatbot & RAG development, workflow automation, backend/API engineering, and data operations.\n\n`;
  txt += `The blog is a community engineering platform with peer-reviewed research papers and technical guides.\n\n`;
  txt += `## Core pages\n\n`;
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
  txt += `- [Contact](${SITE}/contact): Send a project brief or direct message.\n\n`;

  txt += `## Engineering blog articles (${posts.length} published)\n\n`;
  posts.forEach(post => {
    const url = `${SITE}/posts/${encodeURIComponent(post.slug)}/`;
    const excerpt = (post.excerpt || '').replace(/\n/g, ' ').trim().slice(0, 160);
    const tags = (post.tags || []).slice(0, 5).join(', ');
    txt += `- [${post.title}](${url})`;
    if (excerpt) txt += `: ${excerpt}`;
    if (tags) txt += ` [${tags}]`;
    txt += '\n';
  });
  txt += '\n';

  fs.writeFileSync(path.join(ROOT, 'llms.txt'), txt, 'utf8');
  console.log(`✅ llms.txt: updated with ${posts.length} article links.`);
}

// ── Update cmd-palette.js to point to /posts/<slug>/ ─────────
function updateCmdPalette(posts) {
  const palettePath = path.join(ROOT, 'cmd-palette.js');
  if (!fs.existsSync(palettePath)) return;
  let code = fs.readFileSync(palettePath, 'utf8');
  // Update link format if it still uses /post?slug=
  code = code.replace(/url:\s*'\/post\?slug='\s*\+\s*encodeURIComponent\(p\.slug\)/g, "url: '/posts/' + encodeURIComponent(p.slug) + '/'");
  fs.writeFileSync(palettePath, code, 'utf8');
  console.log('✅ cmd-palette.js: updated article URL targets.');
}

// ── Ping IndexNow ────────────────────────────────────────────
function pingIndexNow(urls) {
  return new Promise(resolve => {
    const payload = JSON.stringify({
      host: 'zebmalik.tech',
      key: INDEXNOW_KEY,
      keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`,
      urlList: urls.slice(0, 10000)
    });

    const req = https.request({
      hostname: 'api.indexnow.org',
      path: '/indexnow',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      console.log(`📡 IndexNow ping: HTTP ${res.statusCode}`);
      resolve();
    });

    req.on('error', err => {
      console.warn('IndexNow notice:', err.message);
      resolve();
    });

    req.write(payload);
    req.end();
  });
}

// ── Main Pipeline ────────────────────────────────────────────
async function main() {
  console.log('🔄 1. Fetching published posts from Supabase...');
  const posts = await fetchPosts();
  console.log(`   Found ${posts.length} published articles.`);

  console.log('📄 2. Reading base template (post.html)...');
  const templatePath = path.join(ROOT, 'post.html');
  const templateHtml = fs.readFileSync(templatePath, 'utf8');

  console.log('🔨 3. Pre-rendering static article pages in /posts/<slug>/index.html...');
  for (const post of posts) {
    const dir = path.join(ROOT, 'posts', post.slug);
    fs.mkdirSync(dir, { recursive: true });
    const rendered = generatePostPage(post, templateHtml, posts);
    fs.writeFileSync(path.join(dir, 'index.html'), rendered, 'utf8');
    console.log(`   ✓ Rendered /posts/${post.slug}/index.html`);
  }

  console.log('📰 4. Pre-rendering blog.html with static article rows...');
  updateBlogListing(posts);

  console.log('🗺️ 5. Updating sitemap.xml...');
  updateSitemap(posts);

  console.log('🤖 6. Updating llms.txt...');
  updateLlmsTxt(posts);

  console.log('⌨️ 7. Updating cmd-palette.js links...');
  updateCmdPalette(posts);

  console.log('📡 8. Pinging IndexNow with all URLs...');
  const allUrls = [
    `${SITE}/`,
    `${SITE}/blog`,
    ...posts.map(p => `${SITE}/posts/${encodeURIComponent(p.slug)}/`)
  ];
  await pingIndexNow(allUrls);

  console.log('\n🎉 ALL STATIC PAGES GENERATED AND PUBLISHED LOCALLY!');
}

main().catch(err => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
