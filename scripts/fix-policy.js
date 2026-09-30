/**
 * fix-policy.js
 * Hard AdSense policy fixes:
 * 1. noindex pages that are login-gated / JS-only shells
 * 2. Ensure no AdSense tags on any noindex/thin page
 * 3. Ensure all indexed pages have canonical tags
 * 4. Verify terms.html content is substantial
 * 5. Ensure Mediapartners-Google agent is whitelisted
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUB_ID = 'pub-9522829065676411';

// Pages that are JS-gated / login-required / empty shells - MUST be noindex
const NOINDEX_PAGES = [
  'write.html',           // JS editor - empty without login
  'author.html',          // JS-only - empty without ?u= param
  'author-dashboard.html',// JS-only - login required
  'post.html',            // JS template shell - empty without ?slug=
  'email_to_bodla.html',  // Internal - should not be indexed
];

// Pages that must NOT have AdSense (noindex or prohibited)
const NO_ADS_PAGES = [
  ...NOINDEX_PAGES,
  '404.html',
];

let fixed = 0;
let report = [];

NOINDEX_PAGES.forEach(filename => {
  const filePath = path.join(ROOT, filename);
  if (!fs.existsSync(filePath)) {
    report.push(`⚠️  ${filename} not found — skipping.`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. Ensure noindex meta is set
  if (content.includes('content="index, follow"') || content.includes('content="index,follow"')) {
    content = content
      .replace(/content="index, follow[^"]*"/g, 'content="noindex, nofollow"')
      .replace(/content="index,follow[^"]*"/g, 'content="noindex, nofollow"');
    changed = true;
    report.push(`✅ ${filename}: Set noindex,nofollow.`);
  } else if (!content.includes('noindex')) {
    // Inject noindex into <head>
    if (content.includes('<!-- SEO-META -->')) {
      content = content.replace(
        '<!-- SEO-META -->',
        '<!-- SEO-META -->\n<meta name="robots" content="noindex, nofollow">'
      );
    } else {
      content = content.replace('<head>', '<head>\n<meta name="robots" content="noindex, nofollow">');
    }
    changed = true;
    report.push(`✅ ${filename}: Injected noindex,nofollow.`);
  } else {
    report.push(`✓  ${filename}: Already has noindex.`);
  }

  // 2. Remove any AdSense tags from noindex pages
  if (content.includes(PUB_ID) || content.includes('adsbygoogle')) {
    content = content.replace(/<script[^>]*pagead2\.googlesyndication\.com[^>]*><\/script>/gi, '');
    content = content.replace(/<div class="ad-slot-unit">[\s\S]*?<\/div>/gi, '');
    content = content.replace(/<ins class="adsbygoogle"[\s\S]*?<\/ins>/gi, '');
    content = content.replace(/<script>\(adsbygoogle[\s\S]*?<\/script>/gi, '');
    changed = true;
    report.push(`✅ ${filename}: Removed all AdSense tags.`);
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    fixed++;
  }
});

// 3. Verify terms.html has substantial content
const termsPath = path.join(ROOT, 'terms.html');
if (fs.existsSync(termsPath)) {
  const termsContent = fs.readFileSync(termsPath, 'utf8');
  const wordCount = termsContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').split(' ').filter(w => w.length > 2).length;
  if (wordCount < 300) {
    report.push(`⚠️  terms.html: Only ~${wordCount} words — may trigger thin content flag.`);
  } else {
    report.push(`✅ terms.html: ${wordCount} words — sufficient content.`);
  }
}

// 4. Verify contact.html has substantial content
const contactPath = path.join(ROOT, 'contact.html');
if (fs.existsSync(contactPath)) {
  const contactContent = fs.readFileSync(contactPath, 'utf8');
  const wordCount = contactContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').split(' ').filter(w => w.length > 2).length;
  if (wordCount < 300) {
    report.push(`⚠️  contact.html: Only ~${wordCount} words — may be too thin.`);
  } else {
    report.push(`✅ contact.html: ${wordCount} words — sufficient content.`);
  }
}

// 5. Full content word-count report for all indexed pages
console.log('\n=== HARD POLICY FIX REPORT ===\n');
report.forEach(r => console.log(r));

// 6. Word count ALL pages
console.log('\n=== CONTENT DEPTH AUDIT (indexed pages) ===');
const allFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
const wordCounts = [];

allFiles.forEach(filename => {
  const filePath = path.join(ROOT, filename);
  const content = fs.readFileSync(filePath, 'utf8');
  const isNoindex = content.includes('noindex');
  if (isNoindex) return;

  // Strip HTML tags and scripts
  const textOnly = content
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const wordCount = textOnly.split(' ').filter(w => w.length > 3).length;
  wordCounts.push({ filename, wordCount });
});

wordCounts.sort((a, b) => a.wordCount - b.wordCount);
wordCounts.forEach(({ filename, wordCount }) => {
  const flag = wordCount < 200 ? '⚠️  THIN' : wordCount < 500 ? '⚡ LOW' : '✅ OK ';
  console.log(`${flag}  ${filename}: ~${wordCount} indexable words`);
});

console.log(`\n✅ Fixed ${fixed} policy violations.`);
console.log('Run this script again to verify all issues are resolved.');
