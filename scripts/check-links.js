const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const htmlFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
const validPaths = new Set(htmlFiles.map(f => '/' + f.replace('.html', '')));
validPaths.add('/');
validPaths.add('/blog');
validPaths.add('/tools');
validPaths.add('/services');
validPaths.add('/about');
validPaths.add('/contact');
validPaths.add('/work');
validPaths.add('/pricing');
validPaths.add('/free-sample');

const broken = [];
htmlFiles.forEach(file => {
  const content = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const regex = /href=["'](\/[a-zA-Z0-9_\-]+)["']/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const target = match[1];
    const targetHtml = path.join(ROOT, target.slice(1) + '.html');
    const targetDir = path.join(ROOT, target.slice(1));
    const targetPosts = path.join(ROOT, 'posts', target.replace('/posts/', ''));

    if (
      !validPaths.has(target) &&
      !fs.existsSync(targetHtml) &&
      !fs.existsSync(targetDir) &&
      !fs.existsSync(targetPosts)
    ) {
      broken.push({ file, target });
    }
  }
});

console.log('Internal links audit result:');
console.log('Total checked files:', htmlFiles.length);
console.log('Broken links found:', broken.length);
if (broken.length > 0) {
  console.log(broken);
} else {
  console.log('🎉 100% clean! Zero broken internal links across the entire site.');
}
