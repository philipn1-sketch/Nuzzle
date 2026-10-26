---
category: Feeding
---
# SideButton

The two big buttons at the bottom of Home, always Left then Right, side by side, and they never move. Left is rose, Right is peach, on every screen.

`state`:
* `rest`: not suggested; shows "Start".
* `suggested`: the side to start on next; washed in its colour with a filled "Start here" chip.
* `running`: feeding on this side; filled with its colour and showing this side's time (`ms`).
* `switch`: the other side while one is running; "Tap to switch".
* `paused`: the feed is paused on this side; "Carry on here".

`ms` is this side's time in the current feed, or null.
