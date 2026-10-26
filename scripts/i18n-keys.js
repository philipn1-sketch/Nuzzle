// Every English text the app translates: the words passed to t(), tn() and tk() across src.
// `node scripts/i18n-keys.js` lists them; the i18n test checks every language has them all.
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..', 'src');

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === '__tests__' || d.name === 'i18n' ? [] : files(p);
    return /\.tsx?$/.test(d.name) ? [p] : [];
  });
}

/** The literal strings an argument can be: 'a', or either side of c ? 'a' : 'b'. */
function literals(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node.text];
  if (ts.isConditionalExpression(node)) return [...literals(node.whenTrue), ...literals(node.whenFalse)];
  if (ts.isParenthesizedExpression(node)) return literals(node.expression);
  return [];
}

function keys() {
  const out = new Set();
  for (const file of files(ROOT)) {
    const src = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const name = node.expression.text;
        const args = name === 'tn' ? node.arguments.slice(0, 2) : name === 't' || name === 'tk' ? node.arguments.slice(0, 1) : [];
        for (const a of args) literals(a).forEach((k) => out.add(k));
      }
      ts.forEachChild(node, visit);
    };
    visit(src);
  }
  return [...out].sort();
}

module.exports = { keys };

if (require.main === module) {
  for (const k of keys()) console.log(JSON.stringify(k));
}
