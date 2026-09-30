const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function bumpFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('styles.css?v=6')) {
    content = content.replace(/styles\.css\?v=6/g, 'styles.css?v=7');
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

// 1. Root HTML files
const rootFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
let count = 0;
rootFiles.forEach(f => {
  if (bumpFile(path.join(ROOT, f))) count++;
});

// 2. Posts HTML files
const postsDir = path.join(ROOT, 'posts');
if (fs.existsSync(postsDir)) {
  const slugs = fs.readdirSync(postsDir);
  slugs.forEach(slug => {
    const postFile = path.join(postsDir, slug, 'index.html');
    if (fs.existsSync(postFile)) {
      if (bumpFile(postFile)) count++;
    }
  });
}

console.log(`✅ Bumped styles.css version to v=7 in ${count} files.`);
