const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));

const hrefs = {};
files.forEach(f => {
  const content = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const match = content.match(/href=["']([^"']*styles\.css[^"']*)["']/);
  if (match) {
    hrefs[match[1]] = (hrefs[match[1]] || 0) + 1;
  } else {
    console.log(f, 'has NO styles.css link!');
  }
});
console.log('Stylesheet href counts:', hrefs);
