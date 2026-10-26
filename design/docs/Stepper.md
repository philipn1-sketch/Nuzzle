---
category: Inputs
---
# Stepper

Minus, value, plus: how times, amounts and durations are set in Nuzzle without a keyboard. `onStep(dir, fast)` is called with 1 or -1; `fast` is true while the button is held, for bigger steps. `display` is the formatted value. `onType` lets her type a number instead (pair with `numeric`), and `onPressValue` makes the value tappable (the birthday opens a calendar).
