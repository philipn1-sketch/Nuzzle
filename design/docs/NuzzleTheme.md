---
category: Foundations
---
# NuzzleTheme

The root every Nuzzle screen sits in. Wrap the whole design in it once. It sets the theme for every component inside and paints the screen background.

* `theme="night"` (default): deep plum, for 3am feeds. This is what most people use.
* `theme="day"`: blush, for daytime.
* `paint={false}` skips the background, for nesting a Day section inside a Night page.

Without it, components fall back to Night but `Screen` has no safe area and nothing paints the page.

```tsx
<NuzzleTheme theme="night">
  <Screen>
    <TopBar title="Daphne" left={<PillButton label="History" onPress={() => {}} />} right={<PillButton label="Settings" onPress={() => {}} />} />
  </Screen>
</NuzzleTheme>
```
