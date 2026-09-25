export async function onRequestGet(context) {
  const SUPABASE_HOST = 'qfsmwivvcfpkutqszlhd.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmc213aXZ2Y2Zwa3V0cXN6bGhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNjI5NTUsImV4cCI6MjEwNTgzODk1NX0.rWln2NStaO3DNTNZzrJOk_F7FkG4hqijwPvm1aP199M';

  const STATIC_PAGES = [
    { url: 'https://zebmalik.tech/', priority: '1.0' },
    { url: 'https://zebmalik.tech/blog', priority: '0.9' },
    { url: 'https://zebmalik.tech/services', priority: '0.9' },
    { url: 'https://zebmalik.tech/tools', priority: '0.9' },
    { url: 'https://zebmalik.tech/ai-chatbot-rag', priority: '0.9' },
    { url: 'https://zebmalik.tech/ecommerce-price-monitoring', priority: '0.9' },
    { url: 'https://zebmalik.tech/lead-list-building', priority: '0.9' },
    { url: 'https://zebmalik.tech/free-sample', priority: '0.9' },
    { url: 'https://zebmalik.tech/about', priority: '0.8' },
    { url: 'https://zebmalik.tech/contact', priority: '0.8' },
    { url: 'https://zebmalik.tech/work', priority: '0.8' },
    { url: 'https://zebmalik.tech/pricing', priority: '0.8' },
    { url: 'https://zebmalik.tech/write', priority: '0.8' },
    { url: 'https://zebmalik.tech/author-dashboard', priority: '0.7' },
    { url: 'https://zebmalik.tech/compress-pdf', priority: '0.8' },
    { url: 'https://zebmalik.tech/extract-text-from-pdf', priority: '0.8' },
    { url: 'https://zebmalik.tech/image-compressor', priority: '0.8' },
    { url: 'https://zebmalik.tech/image-converter', priority: '0.8' },
    { url: 'https://zebmalik.tech/image-cropper', priority: '0.8' },
    { url: 'https://zebmalik.tech/image-metadata-remover', priority: '0.8' },
    { url: 'https://zebmalik.tech/image-resizer', priority: '0.8' },
    { url: 'https://zebmalik.tech/image-rotator', priority: '0.8' },
    { url: 'https://zebmalik.tech/image-to-pdf', priority: '0.8' },
    { url: 'https://zebmalik.tech/image-watermark', priority: '0.8' },
    { url: 'https://zebmalik.tech/json-formatter', priority: '0.8' },
    { url: 'https://zebmalik.tech/meme-generator', priority: '0.8' },
    { url: 'https://zebmalik.tech/merge-pdf', priority: '0.8' },
    { url: 'https://zebmalik.tech/password-generator', priority: '0.8' },
    { url: 'https://zebmalik.tech/pdf-organizer', priority: '0.8' },
    { url: 'https://zebmalik.tech/pdf-page-numbers', priority: '0.8' },
    { url: 'https://zebmalik.tech/pdf-to-image', priority: '0.8' },
    { url: 'https://zebmalik.tech/qr-code-generator', priority: '0.8' },
    { url: 'https://zebmalik.tech/rotate-pdf', priority: '0.8' },
    { url: 'https://zebmalik.tech/split-pdf', priority: '0.8' },
    { url: 'https://zebmalik.tech/watermark-pdf', priority: '0.8' },
    { url: 'https://zebmalik.tech/word-counter', priority: '0.8' },
    { url: 'https://zebmalik.tech/privacy', priority: '0.5' },
    { url: 'https://zebmalik.tech/terms', priority: '0.5' }
  ];

  try {
    const res = await fetch(`https://${SUPABASE_HOST}/rest/v1/posts?select=slug,updated_at,published_at&status=eq.published&order=published_at.desc`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    const posts = await res.json();
    const today = new Date().toISOString().slice(0, 10);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    STATIC_PAGES.forEach(p => {
      xml += `  <url><loc>${p.url}</loc><lastmod>${today}</lastmod><priority>${p.priority}</priority></url>\n`;
    });

    if (Array.isArray(posts)) {
      posts.forEach(p => {
        const postDate = (p.updated_at || p.published_at || today).slice(0, 10);
        xml += `  <url><loc>https://zebmalik.tech/post?slug=${encodeURIComponent(p.slug)}</loc><lastmod>${postDate}</lastmod><priority>0.9</priority></url>\n`;
      });
    }

    xml += '</urlset>\n';

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=1800, s-maxage=3600' // Cache at edge for 1 hour
      }
    });
  } catch (e) {
    // If Supabase fetch fails, pass through to static sitemap.xml
    return context.next();
  }
}
