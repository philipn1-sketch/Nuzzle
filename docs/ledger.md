# Ledger

Each critic round: who checked what, the verdict, and what changed.

## Round 1: flow (critic A, fresh)

Verdict: one more pass. Ranked problems and what was done:

1. Accidental start couldn't be thrown away. **Fixed:** Undo snackbar after start, and a Discard button while running.
2. Editor lost the side she started on. **Fixed:** "Started on" choice in the editor when both sides have minutes.
3. Steppers only moved by 1. **Fixed:** buttons repeat when held and the number can be typed.
4. Start time change didn't reschedule and could overlap. **Fixed:** start time is changed through the editor (which reschedules), and overlaps are refused with a plain message.
5. Undo after Done was ambiguous. **Fixed:** the gap counts as feeding.
6. Reminder could fire mid feed. **Fixed:** no reminder is pending while a feed runs.
7. Baby's name unused; notification hinted at an interval. **Fixed:** name used on Home and in the notification; wording states facts only.
8. Notification refusal not designed. **Fixed:** Settings shows a blocked state with Open settings; lock screen notice marked best effort on iPhone.
9. Cuts. **Done:** start time sheet removed, "Match phone" theme removed, the small Change link removed. The reminder card stays because the brief asks for a one line reason before the permission prompt.
10. Midnight and snackbar placement. **Fixed:** feeds belong to the day they started; snackbar lives at the app root.
11. Huckleberry likeness risk. **Fixed:** side buttons are tall rounded rectangles with letters, no play symbols, no corner badge.

## Round 2: flow recheck (critic B, fresh)

Confirmed all round 1 fixes. Verdict: one more pass. Ranked problems and what was done:

1. Timer left running if she falls asleep. **Fixed:** "Still feeding?" card when a feed has run longer than her interval, with Save and fix the time.
2. Editor rewrote the side order. **Fixed:** editor asks "Ended on" (what drives the suggestion) and keeps the real segments when only the start time moves.
3. "Last fed 1h 40m ago" read like time since the end. **Fixed:** "Since Baby's last feed started".
4. Paused couldn't be told apart from saved after a kill. **Fixed:** a status is stored on every feed.
5. Snackbar could cover the buttons. **Fixed:** it sits above them.
6. Undo after Done always resumed running. **Fixed:** Undo restores the exact earlier state.
7. Restart could lose the reminder and lock screen notice. **Fixed:** both are set again whenever the app opens or returns.
8. "Latest saved feed" was ambiguous. **Fixed:** "the saved feed with the latest start time".
9. Missing details. **Fixed:** paused lock screen text written; due state defined with reminders off; first feed has no lock screen notice by design.
10. Cut the gap line on every History row. **Done.**

The flow is now carried into the design stage, where a fresh critic rechecks every earlier item along with the screens.

## Round 3: design and build (critic C, fresh, used the web preview and screenshots)

Verdict: one more pass. Confirmed every round 1 and 2 item is built, except one regression and two likeness slips, all listed below.

1. Undo on the "Started" snackbar after a switch threw the feed away for good. **Fixed:** any side tap hides that snackbar, and Undo on a start now shows "Feed discarded" with its own Undo.
2. The snackbar was a bright cream block at night. **Fixed:** dark surface with a honey outline.
3. Cyan switch knob in Settings (a Huckleberry colour and a default look). **Fixed:** replaced with the app's own On and Off control.
4. Snackbar actions were 48 tall. **Fixed:** 56.
5. Discard sat where Settings sits. **Fixed:** moved under the side buttons; Settings never moves.
6. "Still feeding?" answers looked like loose text. **Fixed:** two filled 56 tall buttons.
7. The due state only changed colour. **Fixed:** adds "Past your 2h reminder time" in words.
8. Editor steppers shifted and sat hard left; sub minute feeds edited as 0. **Fixed:** steppers span the row with a fixed centre; any side with time shows at least 1 minute.
9. History rows top aligned, repeated the number for one side feeds, last day under the button. **Fixed:** centred rows, "Left only" or "Right only", extra bottom room.
10. Zero minute stretches in "L 0m then R 0m" and the reminder card arriving with the snackbar. **Fixed:** stretches under 30 seconds are left out; the card waits for the snackbar to go.
11. At the largest text size the side buttons could be pushed off screen. **Fixed:** only the top part scrolls; the buttons are pinned.
12. "Last side:" in the notification echoed Huckleberry, and the ask read like a suggested interval. **Fixed:** "Ended on the right."; "Want a reminder after each feed starts? You choose how long in Settings."
13. Two near identical reminder labels. **Fixed:** the stepper is labelled "After".

## Round 4: full recheck (critic D, fresh, drove the preview with Playwright and read the code)

Verdict: one more pass. Passed the 3 am test from a cold start; every round 1 to 3 item built, with one regression. Kill, restart, Done then Undo all sound. Nothing looks like Huckleberry.

1. Overlap check missed pauses inside a moved feed and ignored the feed being timed. **Fixed:** the check uses the feed's real segments and includes the running feed; two new unit tests.
2. At the largest text size the timer clipped to a wrong number and top bar pills cut off. **Fixed:** big numbers shrink to fit on one line; pills and side button labels have a size ceiling.
3. Short feeds showed "0 min" and "under a minute". **Fixed:** any time on a side shows at least 1 minute everywhere; "Just now".
4. "Not now" left reminders on. **Fixed:** it turns them off; Settings can turn them back on.
5. Home card too busy. **Fixed:** "Today so far" removed (History has it); the reminder and due lines share one line.
6. The ring on the suggested side could be read as "last side" by a Huckleberry user. **Fixed:** "Start here" is title sized in honey, and the card says "Ended on the right" in large type.
7. Lock screen time was the feed's start after a switch; editor capped at 180; the Day step moved an hour on daylight saving weekends; flow.md had the old notification text. **Fixed:** time of the current side; cap 300; calendar day steps; doc updated.
8. Complexity: `expo-constants` only shows a version. **Kept:** Expo Router requires it anyway, so it costs nothing extra. CSV export uses no extra library, so it stays.

## Round 5: full recheck (critic E, fresh, drove the preview and read the code)

Verdict: one more pass. Confirmed: kill mid feed loses nothing (running or paused), Done then Undo is exact, overlaps are caught, delete then Undo works, every round 1 to 4 item is built, no dashes, no bright white, nothing like Huckleberry, no clutter.

1. A double tap on "Start here" could hit "Discard this feed", which appeared where the buttons had been. **Fixed:** the side buttons never move (Discard now sits inside the timer card, and Done and the snackbar grow upward above the buttons), and a second tap on the same side within 0.6 s is ignored.
2. Typing a number in the editor added to the old value ("121 min"). **Fixed:** the number is selected when the field opens, so typing replaces it.
3. Paused didn't say which side. **Fixed:** "Paused on the left", "Carry on here" on that side, and the lock screen notice says the side too.
4. A typed in feed could end later than now. **Fixed:** refused with "With those minutes it would end later than now."; new unit test.

## Nice to haves: complexity check

| Feature | Cost | Verdict |
|---|---|---|
| Daily summary | One line per day header in History, computed from the feeds already loaded. No new screen, setting or library. | Kept |
| Timer on the lock screen | One extra notification through expo-notifications, which the reminder already needs. A true live counting Live Activity would need a native iPhone extension; the notice states the side and start time instead. | Kept, as a notice |
| Export to CSV | React Native's built in Share sheet with the CSV as text. No file or sharing library. One button in Settings. | Kept |
