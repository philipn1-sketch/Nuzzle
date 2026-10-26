# Design sync notes (Nuzzle)

* Nuzzle is an Expo app, not a component library. `design/` is a small web package (`nuzzle-design`) that re-exports the app's own components from `src/components` and is built by `node design/build.mjs` (cfg.buildCmd): esbuild with `react-native` aliased to `react-native-web`, `src/state/theme` swapped for `design/src/theme-shim.tsx` (theme from `<NuzzleTheme>`), `src/state/AppState` swapped for `design/src/app-shim.ts`. Run it after staging `.ds-sync/` (it borrows esbuild from there), before `package-build.mjs`.
* React stays external in `design/dist`. Bundled CommonJS (react-native-web) calls `require('react')`; the build turns those into a virtual module `export * from 'react'; export { default } from 'react'`. Without the default re-export everything fails with "Cannot read properties of undefined (reading 'Component')"; without the shim, "Dynamic require of react is not supported".
* Run the converter with `--node-modules ./node_modules` (repo root has react 19 and react-dom) and the entry from cfg.entry.
* Playwright: link the preinstalled one into the staged scripts: `ln -sfn /opt/node-tools/node_modules/playwright .ds-sync/node_modules/playwright` and the same for `playwright-core` (cloud sessions; on a Mac install playwright instead).
* Fonts: Apple's SF Pro Rounded can't ship, so `design/fonts/Nunito-latin.woff2` (OFL, latin subset, variable 200 to 1000) stands in, wired via cfg.extraFonts. Tokens live in `design/styles.css` (cfg.cssEntry) and mirror `src/theme.ts` by hand.
* Previews: every container holding components must be `display: flex; flex-direction: column`, or RN views shrink to content. Review sheets show the dark page body under each cell; that is the html/body background from styles.css, not a defect, and full width buttons look half width only because the sheet scales the cell.
* Groups come from `category` frontmatter in `design/docs/<Name>.md` (cfg.docsDir). `guidelinesGlob` is empty so those docs don't ship twice.

## Re-sync risks

* `design/styles.css` tokens are a hand copy of `src/theme.ts` palettes, space and radius. Change one, change the other.
* The shims stand in for app state. If a component starts reading more from `useApp()` than the snackbar, `design/src/app-shim.ts` needs it or the preview crashes.
* Components added to `src/components` are not synced until exported from `design/src/index.tsx` and pinned in cfg.componentSrcMap.
* `SyncSection` and `CalendarSheet` are deliberately left out (network and native date picker).
* Nunito was fetched from Google Fonts once and committed; it is a stand in, not the iPhone font.
