# Building with Nuzzle

Nuzzle is an iPhone breastfeeding tracker used one handed, half asleep, often at 3am. Every design is a phone screen about 390 wide. These are the app's real React Native components, rendered on the web through react-native-web.

## Setup

Wrap the whole design once in `NuzzleTheme`. It sets the palette every component reads and paints the page. Without it the components fall back to Night and `Screen` has nothing around it.

```jsx
const { NuzzleTheme, Screen, TopBar, PillButton, Card, T, Choice, PrimaryButton, type } = window.Nuzzle;

<NuzzleTheme theme="night">
  <Screen>
    <TopBar title="Settings" left={<PillButton label="Back" onPress={() => {}} />} />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--nz-space-l)', padding: '0 var(--nz-space-side)' }}>
      <Card style={{ gap: 12 }}>
        <T tone="muted" style={type.label}>Remind me after a feed starts</T>
        <Choice label="Reminder" value="on" onChange={() => {}} options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]} />
      </Card>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', padding: '0 var(--nz-space-side)' }}>
      <PrimaryButton label="Save" onPress={() => {}} />
    </div>
  </Screen>
</NuzzleTheme>
```

* `theme="night"` (deep plum) is the default and what most people use; `theme="day"` is blush. `paint={false}` nests a theme without repainting.
* **Every `div` that holds Nuzzle components must be `display: 'flex', flexDirection: 'column'`** (or row). React Native views stretch to their parent only inside flex; in a plain block `div`, `PrimaryButton`, `Choice` and `Card` shrink to their content.
* Give `Screen` a parent with a height (e.g. `<div style={{ height: 844, display: 'flex' }}>`) so the main action sits at the bottom.

## Styling idiom

No CSS classes. Components are styled by props:
* Text is always `T`: `tone` is `ink` | `muted` | `accent` | `peach` | `onAccent`; size comes from the `type` object: `style={type.timer}` 56, `type.answer` 44, `type.side` 30, `type.title` 21, `type.body` 17 (default), `type.label` 15, `type.small` 13.
* Colours for your own layout come from CSS variables in `styles.css`: `--nz-bg`, `--nz-surface`, `--nz-ink`, `--nz-muted`, `--nz-accent` (rose), `--nz-peach`, `--nz-on-accent`, `--nz-line`; put `data-theme="day"` on a container for Day values. Or read `palettes.night` / `palettes.day` from `window.Nuzzle` in JS (e.g. for `Ring`'s `color`).
* Spacing `--nz-space-xs` 4, `-s` 8, `-m` 12, `-l` 16, `-xl` 24, `-xxl` 32, `--nz-space-side` 20 (screen margin). Corners `--nz-radius-row` 18, `--nz-radius-card` 28, `--nz-radius-big` 36. Minimum tap target `--nz-tap` 56.
* Font: `--nz-font` (Apple's rounded font on iPhone, Nunito here).

## Rules the brand depends on

* **Left is rose (`accent`), Right is peach, everywhere**: `SideButton`, `Ring` while feeding, chips, charts. Never use rose or peach for anything else; main actions are neutral lilac (`PrimaryButton`).
* Home: baby's name in the `TopBar` with History and Settings pills, a `Ring` in the middle answering how long since the last feed, two `SideButton`s (Left, Right) side by side at the bottom that never move.
* One `PrimaryButton` per screen, at the bottom in thumb reach. Secondary actions are `SecondaryButton` or `QuietButton` (links end with ›).
* Prefer `Choice` (segmented) to switches and `Stepper` to keyboards.
* Words: short and kind, no exclamation marks, no hyphens or dashes, no medical advice.

## Where the truth lives

Read `styles.css` (tokens and fonts) and each `components/<group>/<Name>/<Name>.prompt.md` before composing. `SideButton` states are `rest`, `suggested`, `running`, `switch`, `paused`.
