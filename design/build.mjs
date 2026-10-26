// Builds Nuzzle's components for the web, for Claude Design: react-native becomes react-native-web,
// and the app's theme and state hooks are swapped for the small stand ins in src/.
// Run from the repo root after the design sync scripts are staged: node design/build.mjs
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
// esbuild comes from the staged design sync tools, so the app's own dependencies stay as they are
const require = createRequire(join(root, '.ds-sync', 'package.json'));
const esbuild = require('esbuild');

rmSync(join(here, 'dist'), { recursive: true, force: true });

const swap = {
  name: 'nuzzle-swap',
  setup(b) {
    b.onResolve({ filter: /\/state\/theme$/ }, () => ({ path: join(here, 'src', 'theme-shim.tsx') }));
    b.onResolve({ filter: /\/state\/AppState$/ }, () => ({ path: join(here, 'src', 'app-shim.ts') }));
    b.onResolve({ filter: /^react-native$/ }, () => ({ path: require.resolve('react-native-web', { paths: [root] }) }));
    // react stays outside the bundle (Claude Design provides it). Bundled CommonJS code that calls
    // require('react') gets a tiny module that re-exports the real one, so no dynamic require is left.
    b.onResolve({ filter: /^react(-dom)?(\/.*)?$/ }, (a) => (a.kind === 'require-call' ? { path: a.path, namespace: 'cjs-react' } : undefined));
    b.onLoad({ filter: /.*/, namespace: 'cjs-react' }, (a) => ({
      contents: `export * from ${JSON.stringify(a.path)}; export { default } from ${JSON.stringify(a.path)};`,
      resolveDir: root,
    }));
  },
};

await esbuild.build({
  entryPoints: [join(here, 'src', 'index.tsx')],
  outfile: join(here, 'dist', 'index.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  jsx: 'automatic',
  target: 'es2020',
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  resolveExtensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js', '.mjs', '.json'],
  mainFields: ['browser', 'module', 'main'],
  nodePaths: [join(root, 'node_modules')],
  define: { __DEV__: 'false', 'process.env.NODE_ENV': '"production"', global: 'globalThis' },
  plugins: [swap],
  logLevel: 'warning',
});

execSync('npx tsc -p design/tsconfig.json', { cwd: root, stdio: 'inherit' });
console.log('design/dist built');
