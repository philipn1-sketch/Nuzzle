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
