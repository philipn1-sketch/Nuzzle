// Checks docs/appstore/listing.md against Apple's limits for each language.
const fs = require('fs');
const path = require('path');

const LIMITS = { Name: 30, Subtitle: 30, 'Promotional text': 170, Keywords: 100 };
const text = fs.readFileSync(path.join(__dirname, '..', 'docs', 'appstore', 'listing.md'), 'utf8');
const problems = [];
for (const section of text.split(/\n## /).slice(1)) {
  const lang = section.split('\n')[0];
  for (const [field, max] of Object.entries(LIMITS)) {
    const m = section.match(new RegExp(`\\*\\*${field}:\\*\\* (.*)`));
    if (!m) continue;
    const n = [...m[1]].length;
    if (n > max) problems.push(`${lang}: ${field} is ${n} characters, limit ${max}`);
  }
  const d = section.match(/\*\*Description:\*\*\n([\s\S]*?)(\n---|$)/);
  if (d && [...d[1].trim()].length > 4000) problems.push(`${lang}: description over 4000 characters`);
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('App Store listing fits Apple\'s limits.');
