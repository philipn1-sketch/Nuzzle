# Style bible

Direction (chosen by Philip): **soft midnight plum, with a big ring**. Nuzzle should feel like a dim, gentle night light: deep plum, soft rose and peach, rounded type, and one calm ring that answers the main question at a glance. Nothing glows white, nothing is red, nothing moves unless something changed.

## Colours (six per theme)

| Token | Night (default) | Day | Used for |
|---|---|---|---|
| `bg` | `#1A1221` deep plum | `#F6EEF3` blush | Screen background; also the text on filled rose or peach |
| `surface` | `#2A1E33` aubergine | `#FFF9FB` | Cards, side buttons at rest, sheets |
| `ink` | `#F4E9EF` soft pink cream (never pure white) | `#2D1E33` | Main text, big numbers, the neutral Done and Save buttons |
| `muted` | `#BBA9C2` lilac grey | `#6B5872` | Labels, the ring at rest, Done and Save (filled, with plum text) |
| `accent` (rose) | `#EBA3B9` | `#A8456A` | **Left** everywhere; selected options |
| `peach` | `#F4BC9C` | `#B0503F` coral | **Right** everywhere |

**Each side keeps its own colour on every screen:** Left is rose and Right is peach, on the side buttons, the ring while feeding, the "Ended on" chip and the History chips. Half asleep, she can tell the sides apart without reading. The main actions (Done, Save, Add a feed) are deliberately neutral (a soft cream outline) so they are never mistaken for a side.

Contrast, measured: night ink on bg 15.4, muted on surface 7.2, rose on bg 9.1, peach on bg 10.9, plum text on rose 9.1. Day ink on bg 13.7, muted on bg 5.7, rose on bg 5.0, peach on bg 4.7. All at least 4.5:1.

Nothing here is Huckleberry's: no navy, bright orange, lime, cyan or purple.

## Type

Apple's rounded system font (SF Pro Rounded) on iPhone, with no font files to load. The web preview stands in Nunito, which is close. Everything scales with her text size setting; the big numbers shrink to fit on one line rather than clipping.

| Role | Size | Weight |
|---|---|---|
| Timer in the ring | 56 | 700 |
| Time since the last feed | 44 | 700 |
| Side name on the buttons | 30 | 700 |
| Title | 21 | 700 |
| Body and buttons | 17 | 600 |
| Label | 15 | 500 |
| Chip | 13 | 600 |

## Layout

* **Home.** Baby's name centred at the top, with History on the left and Settings on the right. The ring sits in the middle: at rest it fills in lilac as time passes towards her reminder time, with the time since the last feed and an "Ended on the right" chip inside. While feeding it shows the timer inside a calm full circle in the feeding side's colour. Under the ring: the last feed's details, or Discard during a feed. The two side buttons sit at the bottom in thumb reach and never move; Done and the Undo snackbar appear above them.
* When a question card shows ("Still feeding?", the reminder question), the ring steps aside and the same answer shows as plain text, so the card's buttons always fit.
* **History.** Day headings with totals per side, then one rounded row per feed: time, coloured side chips ("Left 9m", "Right 7m"), total.

## Spacing and shape

Spacing steps: 4, 8, 12, 16, 24, 32; screen side margin 20. Corners: 18 for rows, 28 for cards, 36 for side buttons. Chips are fully round.

## Components

* **Side button.** A tall soft pill with the side's name in 30pt. At rest: surface. Suggested or paused here: a wash of the side's colour, an outline, and a filled "Start here" or "Carry on here" chip. Running: filled with the side's colour, plum text, its own time.
* **Ring.** 14 thick on a faint lilac track, drawn with plain views (no drawing library). Lilac at rest, the feeding side's colour while feeding, dimmed when paused.
* **Main button.** Full width, 64 tall, filled lilac with plum text: Done, Save, Add a feed.
* **Snackbar.** Above the main buttons, surface with a rose outline; actions 56 tall and ignore taps for their first 0.6 seconds.
* **Choice.** Outlined segmented control; the chosen option fills with rose.

## Motion and feel

150 to 250 ms, gentle springs, only to show what changed. Reduced motion turns it into fades. A soft haptic tick on start, switch, pause and stop.

## Words

Short, kind, plain. No exclamation marks, no dashes, no advice. "Baby" until she types a name.
