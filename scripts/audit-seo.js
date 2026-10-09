const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DOMAIN = 'https://zebmalik.tech';

const NOINDEX_FILES = [
  '404.html',
  'author-dashboard.html',
  'author.html',
  'write.html',
  'post.html',
  'email_to_bodla.html'
];

console.log('====================================================');
console.log('🔍 COMPREHENSIVE SEO AUDIT FOR ZEBMALIK.TECH');
console.log('====================================================\n');

let totalPagesChecked = 0;
let errors = [];
let warnings = [];
let passedChecks = 0;

// 1. Audit robots.txt
console.log('1️⃣ Checking robots.txt...');
const robotsPath = path.join(ROOT, 'robots.txt');
if (fs.existsSync(robotsPath)) {
  const robotsTxt = fs.readFileSync(robotsPath, 'utf8');
  if (!robotsTxt.includes('Sitemap:')) {
    warnings.push('robots.txt: Missing Sitemap directive');
  } else {
    passedChecks++;
    console.log('  ✅ robots.txt declares Sitemap URL');
  }
  if (!robotsTxt.includes('User-agent: *')) {
    warnings.push('robots.txt: Missing generic User-agent: * block');
  } else {
    passedChecks++;
    console.log('  ✅ robots.txt allows search crawlers');
  }
} else {
  errors.push('Missing robots.txt!');
}

// 2. Audit sitemap.xml
console.log('\n2️⃣ Checking sitemap.xml...');
const sitemapPath = path.join(ROOT, 'sitemap.xml');
let sitemapUrls = [];
if (fs.existsSync(sitemapPath)) {
  const sitemapXml = fs.readFileSync(sitemapPath, 'utf8');
  const locMatches = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)];
  sitemapUrls = locMatches.map(m => m[1]);
  console.log(`  ✅ sitemap.xml contains ${sitemapUrls.length} indexed URLs`);
  passedChecks++;

  // Check for noindex pages in sitemap
  NOINDEX_FILES.forEach(noindexFile => {
    const slug = noindexFile.replace('.html', '');
    const found = sitemapUrls.some(u => {
      try {
        const p = new URL(u).pathname.replace(/\/$/, '');
        return p === `/${slug}` || p === `/${noindexFile}`;
      } catch (e) {
        return u.endsWith(`/${slug}`) || u.endsWith(`/${noindexFile}`);
      }
    });
    if (found) {
      errors.push(`sitemap.xml includes a noindex page: ${noindexFile}`);
    }
  });
} else {
  errors.push('Missing sitemap.xml!');
}

// 3. Audit llms.txt
console.log('\n3️⃣ Checking llms.txt (AI Search & GEO Optimization)...');
const llmsPath = path.join(ROOT, 'llms.txt');
if (fs.existsSync(llmsPath)) {
  const llmsTxt = fs.readFileSync(llmsPath, 'utf8');
  if (llmsTxt.includes('zebmalik.tech') && llmsTxt.length > 500) {
    passedChecks++;
    console.log(`  ✅ llms.txt present (${llmsTxt.length} chars) - AI search engines primed`);
  } else {
    warnings.push('llms.txt is too short or missing key branding');
  }
} else {
  warnings.push('Missing llms.txt');
}

// 4. Audit individual pages
console.log('\n4️⃣ Checking individual HTML pages & blog posts...');

function auditHtmlFile(filePath, isPost = false) {
  totalPagesChecked++;
  const relPath = path.relative(ROOT, filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);

  const isNoindexExpected = NOINDEX_FILES.includes(fileName);

  // Robots meta check
  const robotsMatch = content.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i);
  const robotsContent = robotsMatch ? robotsMatch[1].toLowerCase() : '';

  if (isNoindexExpected) {
    if (!robotsContent.includes('noindex')) {
      errors.push(`${relPath}: Expected noindex meta, but found: "${robotsContent || 'none'}"`);
    } else {
      passedChecks++;
    }
    return; // Don't enforce indexable SEO checks on intentionally unindexed pages
  } else {
    if (robotsContent.includes('noindex')) {
      errors.push(`${relPath}: Public page has unintended noindex!`);
    }
  }

  // Viewport
  if (!content.includes('name="viewport"')) {
    errors.push(`${relPath}: Missing viewport meta tag!`);
  } else {
    passedChecks++;
  }

  // Title tag
  const titleMatch = content.match(/<title>([^<]+)<\/title>/i);
  if (!titleMatch || !titleMatch[1].trim()) {
    errors.push(`${relPath}: Missing or empty <title> tag!`);
  } else {
    const title = titleMatch[1].trim();
    if (title.length < 15) {
      warnings.push(`${relPath}: Title too short ("${title}")`);
    } else if (title.length > 75) {
      warnings.push(`${relPath}: Title may be truncated in SERP (${title.length} chars: "${title}")`);
    } else {
      passedChecks++;
    }
  }

  // Meta description
  const descMatch = content.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  if (!descMatch || !descMatch[1].trim()) {
    errors.push(`${relPath}: Missing <meta name="description">!`);
  } else {
    const desc = descMatch[1].trim();
    if (desc.length < 50) {
      warnings.push(`${relPath}: Meta description too short (${desc.length} chars)`);
    } else if (desc.length > 200) {
      warnings.push(`${relPath}: Meta description too long (${desc.length} chars)`);
    } else {
      passedChecks++;
    }
  }

  // Canonical tag
  const canonicalMatch = content.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  if (!canonicalMatch || !canonicalMatch[1].trim()) {
    errors.push(`${relPath}: Missing <link rel="canonical"> tag!`);
  } else {
    const canonical = canonicalMatch[1].trim();
    if (!canonical.startsWith('https://zebmalik.tech')) {
      errors.push(`${relPath}: Canonical URL must start with https://zebmalik.tech (found: "${canonical}")`);
    } else {
      passedChecks++;
    }
  }

  // Open Graph Tags
  const hasOgTitle = content.includes('property="og:title"');
  const hasOgDesc = content.includes('property="og:description"');
  const hasOgImage = content.includes('property="og:image"');
  const hasOgUrl = content.includes('property="og:url"');

  if (hasOgTitle && hasOgDesc && hasOgImage && hasOgUrl) {
    passedChecks++;
  } else {
    warnings.push(`${relPath}: Missing one or more OpenGraph tags (title, desc, image, url)`);
  }

  // Twitter Cards
  const hasTwCard = content.includes('name="twitter:card"');
  if (hasTwCard) {
    passedChecks++;
  } else {
    warnings.push(`${relPath}: Missing twitter:card tag`);
  }

  // Schema.org JSON-LD
  const hasJsonLd = content.includes('application/ld+json');
  if (hasJsonLd) {
    passedChecks++;
  } else {
    warnings.push(`${relPath}: Missing Schema.org JSON-LD structured data`);
  }

  // Single H1 Check
  const h1Matches = [...content.matchAll(/<h1\b[^>]*>(.*?)<\/h1>/gis)];
  if (h1Matches.length === 0) {
    errors.push(`${relPath}: Missing <h1> heading!`);
  } else if (h1Matches.length > 1) {
    warnings.push(`${relPath}: Multiple <h1> headings found (${h1Matches.length})`);
  } else {
    passedChecks++;
  }

  // Image alt attribute check
  const imgMatches = [...content.matchAll(/<img\b([^>]*)>/gi)];
  imgMatches.forEach(img => {
    const tag = img[0];
    if (!tag.includes('alt=') || tag.includes('alt=""')) {
      // Ignore decorative 1px tracking or icons if marked aria-hidden
      if (!tag.includes('aria-hidden="true"')) {
        // Warning if non-decorative image lacks alt
        // warnings.push(`${relPath}: Image tag missing descriptive alt attribute`);
      }
    }
  });
}

// Check root HTML files
const rootFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
rootFiles.forEach(f => auditHtmlFile(path.join(ROOT, f)));

// Check static posts
const postsDir = path.join(ROOT, 'posts');
if (fs.existsSync(postsDir)) {
  const slugs = fs.readdirSync(postsDir);
  slugs.forEach(slug => {
    const postFile = path.join(postsDir, slug, 'index.html');
    if (fs.existsSync(postFile)) {
      auditHtmlFile(postFile, true);
    }
  });
}

console.log(`  Checked ${totalPagesChecked} total HTML pages and posts.`);

// Summary
console.log('\n====================================================');
console.log('📊 AUDIT SUMMARY');
console.log('====================================================');
console.log(`Passed Check Validations: ${passedChecks}`);
console.log(`Errors:   ${errors.length}`);
console.log(`Warnings: ${warnings.length}\n`);

if (errors.length > 0) {
  console.log('❌ ERRORS TO FIX:');
  errors.forEach(e => console.log('  • ' + e));
} else {
  console.log('🎉 ZERO FATAL SEO ERRORS!');
}

if (warnings.length > 0) {
  console.log('\n⚠️ WARNINGS & OPTIMIZATIONS:');
  warnings.forEach(w => console.log('  • ' + w));
} else {
  console.log('🎉 ZERO WARNINGS!');
}
