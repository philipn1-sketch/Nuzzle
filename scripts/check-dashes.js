// Fails if any text the app shows contains a hyphen between words or a dash.
// Uses the TypeScript parser so code like `now - start` is never mistaken for text.
const ts = require('typescript');
const fs = require('fs');
const path = require('path');

const files = [];
const walk = (dir) => {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) { if (f !== '__tests__') walk(p); }
    else if (/\.tsx?$/.test(f) && f !== 'theme.ts') files.push(p); // theme.ts holds font names, not app text
  }
};
walk(path.join(__dirname, '..', 'src'));

// text only: anything with a space in it (ids, keys and styles have none)
// markup built for the PDF summary: only the words in it are app text, not its styles or tags
const visible = (s) => s.replace(/<style>[\s\S]*?<\/style>/g, ' ').replace(/<[^>]*>/g, ' ');
// Other languages spell some words with a hyphen (Dutch back-up, Portuguese recém-nascido), so
// translations may keep those; a dash or a spaced hyphen between words is still not allowed.
const bad = (raw, translation) => {
  const s = visible(raw);
  return /\s/.test(s) && (/[–—]/.test(s) || /\s-\s/.test(s) || (!translation && /\p{L}-\p{L}/u.test(s)));
};
const problems = [];
for (const file of files) {
  const translation = file.includes(`${path.sep}i18n${path.sep}locales${path.sep}`);
  const src = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (node) => {
    let text = null;
    if (ts.isJsxText(node)) text = node.getText();
    else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) text = node.text;
    else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) text = node.text;
    const inImport = !!node.parent && (ts.isImportDeclaration(node.parent) || ts.isExportDeclaration(node.parent));
    if (text && !inImport && bad(text, translation)) {
      const { line } = src.getLineAndCharacterOfPosition(node.getStart());
      problems.push(`${path.relative(process.cwd(), file)}:${line + 1}: ${text.trim()}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(src);
}
// comments are not app text, so they are not checked
if (problems.length) {
  console.error('Dashes or hyphens in app text:\n' + problems.join('\n'));
  process.exit(1);
}
console.log(`No dashes in app text (${files.length} files checked).`);
