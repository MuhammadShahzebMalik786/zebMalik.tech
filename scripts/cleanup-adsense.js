const fs = require('fs');
const path = require('path');

const filesToClean = [
  '404.html',
  'author-dashboard.html',
  'author.html',
  'privacy.html',
  'terms.html',
  'contact.html',
  'free-sample.html',
  'write.html',
  'pricing.html',
  'tools.html',
  'compress-pdf.html',
  'extract-text-from-pdf.html',
  'image-compressor.html',
  'image-converter.html',
  'image-cropper.html',
  'image-metadata-remover.html',
  'image-resizer.html',
  'image-rotator.html',
  'image-to-pdf.html',
  'image-watermark.html',
  'json-formatter.html',
  'meme-generator.html',
  'merge-pdf.html',
  'password-generator.html',
  'pdf-organizer.html',
  'pdf-page-numbers.html',
  'pdf-to-image.html',
  'qr-code-generator.html',
  'rotate-pdf.html',
  'split-pdf.html',
  'watermark-pdf.html',
  'word-counter.html'
];

const ROOT = path.join(__dirname, '..');
let cleanedCount = 0;

filesToClean.forEach(file => {
  const filePath = path.join(ROOT, file);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Remove AdSense meta tag
  content = content.replace(/<meta name="google-adsense-account" content="ca-pub-9522829065676411">\r?\n?/g, '');
  // Remove AdSense script tag
  content = content.replace(/<script async src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-9522829065676411" crossorigin="anonymous"><\/script>\r?\n?/g, '');
  // Remove empty ad-slot placeholder div
  content = content.replace(/<div class="(?:wrap )?ad-slot" aria-label="Advertisement"><span>Advertisement<\/span><\/div>\r?\n?/g, '');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    cleanedCount++;
    console.log('✅ Cleaned:', file);
  }
});

console.log(`\n🎉 Total files cleaned: ${cleanedCount}`);
