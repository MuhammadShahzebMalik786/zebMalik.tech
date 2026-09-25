const fs = require('fs');
const https = require('https');
const path = require('path');

const SUPABASE_HOST = 'qfsmwivvcfpkutqszlhd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmc213aXZ2Y2Zwa3V0cXN6bGhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNjI5NTUsImV4cCI6MjEwNTgzODk1NX0.rWln2NStaO3DNTNZzrJOk_F7FkG4hqijwPvm1aP199M';

const STATIC_PAGES = [
  { url: 'https://zebmalik.tech/', priority: '1.0', changefreq: 'daily' },
  { url: 'https://zebmalik.tech/blog', priority: '0.9', changefreq: 'daily' },
  { url: 'https://zebmalik.tech/services', priority: '0.9', changefreq: 'weekly' },
  { url: 'https://zebmalik.tech/tools', priority: '0.9', changefreq: 'weekly' },
  { url: 'https://zebmalik.tech/ai-chatbot-rag', priority: '0.9', changefreq: 'monthly' },
  { url: 'https://zebmalik.tech/ecommerce-price-monitoring', priority: '0.9', changefreq: 'monthly' },
  { url: 'https://zebmalik.tech/lead-list-building', priority: '0.9', changefreq: 'monthly' },
  { url: 'https://zebmalik.tech/free-sample', priority: '0.9', changefreq: 'monthly' },
  { url: 'https://zebmalik.tech/about', priority: '0.8', changefreq: 'monthly' },
  { url: 'https://zebmalik.tech/contact', priority: '0.8', changefreq: 'monthly' },
  { url: 'https://zebmalik.tech/work', priority: '0.8', changefreq: 'monthly' },
  { url: 'https://zebmalik.tech/pricing', priority: '0.8', changefreq: 'monthly' },
  { url: 'https://zebmalik.tech/write', priority: '0.8', changefreq: 'monthly' },
  { url: 'https://zebmalik.tech/author-dashboard', priority: '0.7', changefreq: 'weekly' },
  // Tools
  { url: 'https://zebmalik.tech/compress-pdf', priority: '0.8', changefreq: 'monthly' },
  { url: 'https://zebmalik.tech/extract-text-from-pdf', priority: '0.8', changefreq: 'monthly' },
  { url: 'https://zebmalik.tech/image-compressor', priority: '0.8', changefreq: 'monthly' },
  { url: 'https://zebmalik.tech/image-converter', priority: '0.8', changefreq: 'monthly' },
  { url: 'https://zebmalik.tech/image-cropper', priority: '0.8', changefreq: 'monthly' },
  { url: 'https://zebmalik.tech/image-metadata-remover', priority: '0.8', changefreq: 'monthly' },
  { url: 'https://zebmalik.tech/image-resizer', priority: '0.8', changefreq: 'monthly' },
  { url: 'https://zebmalik.tech/image-rotator', priority: '0.8', changefreq: 'monthly' },
  { url: 'https://zebmalik.tech/image-to-pdf', priority: '0.8', changefreq: 'monthly' },
  { url: 'https://zebmalik.tech/image-watermark', priority: '0.8', changefreq: 'monthly' },
  { url: 'https://zebmalik.tech/json-formatter', priority: '0.8', changefreq: 'monthly' },
  { url: 'https://zebmalik.tech/meme-generator', priority: '0.8', changefreq: 'monthly' },
  { url: 'https://zebmalik.tech/merge-pdf', priority: '0.8', changefreq: 'monthly' },
  { url: 'https://zebmalik.tech/password-generator', priority: '0.8', changefreq: 'monthly' },
  { url: 'https://zebmalik.tech/pdf-organizer', priority: '0.8', changefreq: 'monthly' },
  { url: 'https://zebmalik.tech/pdf-page-numbers', priority: '0.8', changefreq: 'monthly' },
  { url: 'https://zebmalik.tech/pdf-to-image', priority: '0.8', changefreq: 'monthly' },
  { url: 'https://zebmalik.tech/qr-code-generator', priority: '0.8', changefreq: 'monthly' },
  { url: 'https://zebmalik.tech/rotate-pdf', priority: '0.8', changefreq: 'monthly' },
  { url: 'https://zebmalik.tech/split-pdf', priority: '0.8', changefreq: 'monthly' },
  { url: 'https://zebmalik.tech/watermark-pdf', priority: '0.8', changefreq: 'monthly' },
  { url: 'https://zebmalik.tech/word-counter', priority: '0.8', changefreq: 'monthly' },
  { url: 'https://zebmalik.tech/privacy', priority: '0.5', changefreq: 'yearly' },
  { url: 'https://zebmalik.tech/terms', priority: '0.5', changefreq: 'yearly' },
];

function fetchPublishedPosts() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SUPABASE_HOST,
      path: '/rest/v1/posts?select=slug,title,updated_at,published_at&status=eq.published&order=published_at.desc',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function updateSitemap() {
  const posts = await fetchPublishedPosts();
  console.log(`Found ${posts.length} published articles in database.`);

  const today = new Date().toISOString().slice(0, 10);

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Static Pages
  STATIC_PAGES.forEach(page => {
    xml += `  <url><loc>${page.url}</loc><lastmod>${today}</lastmod><priority>${page.priority}</priority></url>\n`;
  });

  // Dynamic Blog Posts
  posts.forEach(post => {
    const postDate = (post.updated_at || post.published_at || today).slice(0, 10);
    xml += `  <url><loc>https://zebmalik.tech/post?slug=${encodeURIComponent(post.slug)}</loc><lastmod>${postDate}</lastmod><priority>0.9</priority></url>\n`;
  });

  xml += '</urlset>\n';

  const sitemapPath = path.join(__dirname, '..', 'sitemap.xml');
  fs.writeFileSync(sitemapPath, xml, 'utf8');
  console.log(`Successfully generated sitemap.xml with ${STATIC_PAGES.length + posts.length} total URLs.`);
}

updateSitemap().catch(err => {
  console.error('Failed to update sitemap:', err);
  process.exit(1);
});
