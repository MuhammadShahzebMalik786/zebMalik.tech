const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUB_ID = 'ca-pub-9522829065676411';
const ADS_TXT_PUB_ID = 'pub-9522829065676411';
const PROHIBITED = ['404.html', 'author-dashboard.html', 'email_to_bodla.html'];

console.log('=== ADSENSE 100% COMPLIANCE AUDIT ===\n');

// 1. Audit ads.txt
const adsTxtPath = path.join(ROOT, 'ads.txt');
if (fs.existsSync(adsTxtPath)) {
  const adsTxt = fs.readFileSync(adsTxtPath, 'utf8').trim();
  if (adsTxt.includes(ADS_TXT_PUB_ID) && adsTxt.includes('DIRECT') && adsTxt.includes('f08c47fec0942fa0')) {
    console.log('✅ ads.txt: Valid format with publisher ID and Google cert authority.');
  } else {
    console.error('❌ ads.txt: Invalid format:', adsTxt);
  }
} else {
  console.error('❌ ads.txt is MISSING!');
}

// 2. Audit robots.txt
const robotsPath = path.join(ROOT, 'robots.txt');
if (fs.existsSync(robotsPath)) {
  const robots = fs.readFileSync(robotsPath, 'utf8');
  const blocksAll = /Disallow:\s*\/\s*$/m.test(robots);
  if (blocksAll) {
    console.error('❌ robots.txt: Root directory is disallowed!');
  } else {
    console.log('✅ robots.txt: Crawlers & Mediapartners-Google fully allowed.');
  }
} else {
  console.error('❌ robots.txt is MISSING!');
}

// 3. Audit privacy.html for mandatory Google disclosures
const privacyPath = path.join(ROOT, 'privacy.html');
if (fs.existsSync(privacyPath)) {
  const privacy = fs.readFileSync(privacyPath, 'utf8');
  const hasGoogle = privacy.toLowerCase().includes('google');
  const hasAdSense = privacy.toLowerCase().includes('adsense');
  const hasCookies = privacy.toLowerCase().includes('cookie');
  const hasOptOut = privacy.toLowerCase().includes('opt out') || privacy.toLowerCase().includes('myadcenter') || privacy.toLowerCase().includes('aboutads.info');

  if (hasGoogle && hasAdSense && hasCookies && hasOptOut) {
    console.log('✅ privacy.html: Contains the baseline AdSense cookie disclosures and opt-out links.');
  } else {
    console.error('❌ privacy.html: Missing one or more required AdSense disclosures!', { hasGoogle, hasAdSense, hasCookies, hasOptOut });
  }
} else {
  console.error('❌ privacy.html is MISSING!');
}

// 4. Audit all root HTML files
const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
console.log(`\nAuditing ${files.length} root HTML files...`);

let issues = [];
let monetizedCount = 0;

const CONSENT_SCRIPT = 'ads-consent.js';
const ALLOWED_LABELS = ['Advertisement', 'Sponsored links'];

files.forEach(f => {
  const content = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const hasAdSensePage = content.includes(CONSENT_SCRIPT) && f !== 'privacy.html';
  const hasDirectAdScript = content.includes('adsbygoogle.js');

  if (PROHIBITED.includes(f)) {
    if (hasAdSensePage || hasDirectAdScript) {
      issues.push(`Prohibited file ${f} contains AdSense tags (Violation of AdSense Policy)`);
    } else {
      // Correct!
    }
  } else {
    if (hasAdSensePage) monetizedCount++;

    if (hasDirectAdScript) {
      issues.push(`${f} loads AdSense directly instead of through ${CONSENT_SCRIPT}`);
    }

    const invalidClients = [...content.matchAll(/data-ad-client="([^"]+)"/g)]
      .map(match => match[1])
      .filter(client => client !== PUB_ID);
    if (invalidClients.length) {
      issues.push(`${f} has invalid data-ad-client values: ${invalidClients.join(', ')}`);
    }

    const invalidSlots = [...content.matchAll(/data-ad-slot="([^"]+)"/g)]
      .map(match => match[1])
      .filter(slot => !/^\d+$/.test(slot));
    if (invalidSlots.length) {
      issues.push(`${f} has nonnumeric data-ad-slot values: ${invalidSlots.join(', ')}`);
    }

    const labels = [...content.matchAll(/<span class="ad-slot-label">([^<]+)<\/span>/g)]
      .map(match => match[1].replace(/&amp;/g, '&').trim());
    labels.filter(label => !ALLOWED_LABELS.includes(label)).forEach(label => {
      issues.push(`${f} has a nonstandard ad label: ${label}`);
    });
    
    // Check viewport
    if (!content.includes('viewport')) {
      issues.push(`${f} missing viewport meta tag`);
    }
    // Check canonical
    if (!content.includes('rel="canonical"')) {
      issues.push(`${f} missing canonical tag`);
    }
  }
});

// 5. Audit posts directory
const postsDir = path.join(ROOT, 'posts');
let postCount = 0;
if (fs.existsSync(postsDir)) {
  const slugs = fs.readdirSync(postsDir);
  slugs.forEach(slug => {
    const postFile = path.join(postsDir, slug, 'index.html');
    if (fs.existsSync(postFile)) {
      postCount++;
      const postHtml = fs.readFileSync(postFile, 'utf8');
      if (!postHtml.includes('viewport')) {
        issues.push(`Post /posts/${slug}/index.html missing viewport`);
      }
      if (!postHtml.includes('data-prerendered="true"')) {
        issues.push(`Post /posts/${slug}/index.html missing data-prerendered flag`);
      }
    }
  });
}

console.log(`✅ Monetized root pages: ${monetizedCount}`);
console.log(`✅ Static blog posts checked: ${postCount}`);

if (issues.length === 0) {
  console.log('\n🎉 STATIC AUDIT COMPLETE: AdSense implementation checks passed.');
  console.log('   Account settings, consent-platform certification, traffic quality, and human policy review remain outside this script.');
} else {
  console.error('\n⚠️ ISSUES DETECTED:');
  issues.forEach(i => console.error(' - ' + i));
}
