# Style bible

Nuzzle should feel like a dim, warm lamp in a nursery at 3 am: dark brown, cream text, and one honey colour that means "this is happening now". Nothing glows white, nothing is red, nothing moves unless something changed.

## Colours (six per theme)

| Token | Night (default) | Day | Used for |
|---|---|---|---|
| `bg` | `#16120F` warm near black | `#F4ECE1` oat | Screen background |
| `surface` | `#251E19` | `#FBF5EC` | Cards, side buttons at rest, sheets |
| `ink` | `#EFE3D3` cream (never pure white) | `#2C221B` | Main text, big numbers |
| `muted` | `#B5A592` | `#6B5C4F` | Labels, secondary lines |
| `accent` | `#E0B16B` honey | `#8A581A` dark honey | The running side, the suggested side's label, primary buttons, focus |
| `onAccent` | `#2A1C0C` | `#FBF5EC` | Text on accent |

Lines and dividers are `muted` at 25% opacity. Pressed states darken by 8%. There is no red: an overdue reminder is shown in `accent`, never as an alarm.

Contrast, measured: every text pair is at least 4.5:1. Night ink on bg 14.7, muted on surface 6.9, onAccent on accent 8.4. Day ink on bg 13.3, muted on bg 5.5, accent on bg 5.1, onAccent on accent 5.4.

## Type

The phone's own system font (San Francisco on iPhone, Roboto on Android): no font files to load, and it respects her text size setting. All numbers use tabular figures so timers don't jiggle.

| Role | Size | Weight |
|---|---|---|
| Timer | 64 | 600 |
| Big answer (time since last feed) | 40 | 700 |
| Title | 22 | 700 |
| Body and buttons | 17 | 600 |
| Label | 15 | 500 |
| Small | 13 | 500 |

Every text scales with the phone's text size setting. Layouts stack and wrap instead of clipping at the largest sizes.

## Spacing and shape

Spacing steps: 4, 8, 12, 16, 24, 32. Screen side margin 20. Corner radius: 16 for rows and small buttons, 24 for cards, 32 for the side buttons and sheets.

## Components

* **Side button.** The signature shape: two tall rounded rectangles side by side, filling the bottom of Home in thumb reach (at least 150 tall, never under 56). A huge letter L or R, the word Left or Right under it, and one status line ("Start here", "Tap to pause", "Tap to switch", "Tap to carry on"). At rest: `surface` with `ink` text. Suggested: an `accent` outline and the "Start here" line in `accent`. Running: filled `accent`, `onAccent` text, its own time shown.
* **Top card.** The answer card on Home: the big time since the last feed, then the last side in words. While feeding it becomes the timer.
* **Primary button.** Full width, 60 tall, `accent` fill, `onAccent` text (Done, Save).
* **Quiet button.** Text only in `muted`, but still 56 tall to tap (Discard, Not now).
* **Round icon button.** 56 by 56 in `surface`, for History and Settings in the top bar.
* **Snackbar.** Bottom, above the side buttons, `ink` background with `bg` text; one message and up to two actions; stays 6 seconds.
* **Stepper.** Minus, number, plus; buttons 56 by 56, repeat when held; the number can be tapped to type.
* **Day header.** Small caps style label in `muted`: "Today · 8 feeds · L 64m · R 58m".

## Motion and feel

* 150 to 250 ms, gentle springs, only to show what changed: the running side filling with honey, the timer appearing, the snackbar sliding up.
* Reduced motion on the phone turns all of it into simple fades.
* A soft haptic tick on start, switch, pause and stop.

## Words

Short, kind, plain. No exclamation marks, no dashes, no advice. "Baby" until she types a name. Examples: "Baby last fed 1h 40m ago", "Ended on the left", "Start here", "Saved. 18 min, ended on the right."
