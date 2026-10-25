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

## Round 6: full recheck (critic F, fresh)

Verdict: one more pass. Confirmed: 30 unit tests pass, running and paused feeds survive a reload, a fast L then R switches inside one feed, every round 1 to 5 fix is built, warm dark palette, no dashes, nothing like Huckleberry.

1. A double tap on Done could land on the snackbar's Undo, which appears where Done was, and silently reopen the feed. **Fixed:** snackbar buttons ignore taps in their first 0.6 seconds.
2. Typed minutes could be lost on a real phone (no return key on the iPhone number pad; Save doesn't blur the field), and the keyboard could cover Save. **Fixed:** the value is saved as she types, and the editor moves up with the keyboard.
3. "Past your 2h reminder time" showed with reminders off. **Fixed:** the due line and its honey colour only appear when reminders are on.
4. Screen readers would read "1h 40m" oddly. **Fixed:** big numbers, side buttons and the last feed line have spoken labels in full words ("1 hour 40 minutes", "left 10 minutes").
5. "Left side last" echoed Huckleberry. **Fixed:** "Feed added. Ended on the left."

## Round 7: full recheck (critic G, fresh)

Verdict: one more pass, on testing grounds. No remaining design or flow problems: every round 1 to 6 item is built, the 3 am path is one tap, palette and words hold, nothing like Huckleberry.

1. The latest build had not yet run on an emulator, and no end to end step typed a number. **Fixed:** the Android run now types minutes in the editor and saves; a full run is started on the current code. The editor moves above the keyboard on Android too.
2. At the largest text sizes the snackbar and Done text had no ceiling. **Fixed:** capped like the side buttons.
3. The due line showed when phone notifications were refused. **Fixed:** it only shows when a reminder can actually ring.

## Redesign: soft midnight plum (Philip's call after seeing the screenshots)

Philip found the warm brown and honey look ugly and chose "soft midnight plum" with a big ring on Home. Changes:

* New six colour palette per theme (plum, aubergine, pink cream, lilac grey, rose, peach); all text pairs measured at 4.5:1 or better.
* Apple's rounded system font on iPhone.
* Home is built around a ring: time since the last feed fills it at rest; while feeding it shows the timer and sweeps once a minute in the feeding side's colour. It steps aside for question cards so their buttons always fit.
* Left is rose and Right is peach on every screen, so the sides can be told apart by colour alone. Main actions are a neutral outline so Done is never mistaken for a side.
* Side buttons became soft pills with the side's name, a filled "Start here" or "Carry on here" chip, and their own timer.
* History rows got coloured side chips; day headings are larger.
* New icon in the same palette.
* "Reminder at" on Home now reads the reminder the phone actually has queued, which the iPhone end to end run checks.
* Android dropped at Philip's request; testing moved to an iPhone simulator on GitHub's Macs.

## Round 8: critic on the plum redesign (first of the two Philip allowed before he checks it)

Verdict: one more pass ("clearly better than brown and honey ... not premium yet"). Fixed:

1. Done was the weakest button while feeding. **Now** a filled lilac button with plum text; Save and Add a feed match.
2. The solid side tile glared at 3 am, and the day Right colour read brown. **Now** the feeding side is a soft tint with a coloured outline and a filled "Tap to pause" chip; day Right is coral `#B0503F`.
3. The ring's meaning clashed with the side colours and swept every minute for no reason. **Now** lilac at rest, filling towards her reminder time; a calm full circle in the feeding side's colour while feeding; no sweep.
5. Card buttons had the wrong emphasis and wrapped. **Now** the main choice is filled and full width, the other is quiet text under it; copy rewritten to avoid orphans.
6. Rose meant too many things. **Now** errors and links are in the text colour (links with ›).
7. Polish: titles truly centred; History list sits above a divider; snackbar actions are bold text, not web links; top bar pills lighter.

Not changed: the ring stepping aside for question cards (kept on purpose so card buttons always fit), and Done above the side buttons (moving it below would make the side buttons jump when a feed starts, which round 5 fixed).

## iPhone simulator run (found by the real iOS end to end check)

* Typing in the minutes box added to the old number on iPhone ("1" then typing 15 gave "115"), because iOS doesn't select the existing text when the field opens. **Fixed:** the box opens empty with the old value as a hint, so typing replaces it.
* Confirmed on iPhone 17, iOS 26.5: first launch, start, switch, pause, carry on, Done, Undo, the reminder question, the reminder actually queued by iOS, closing the app for over a minute with the timer still right on reopening, History, and editing by typing.

## Round 9: design and the 3 am test on everything new (critic J, fresh, drove the preview in Night and Day)

Verdict: one more pass. The 3 am basics still pass; the new features had crowded Home.

1. Starting a feed with the baby switch and sleep bar showing cut the ring off behind the snackbar. **Fixed:** the sleep bar and quick buttons step aside while a feed runs, and when the ring has too little room Home shows the same answer as plain text.
2. After a bottle, "which side next" left the ring. **Fixed:** "Ended on the right" always stays in the ring; the bottle is the small line below.
3. Day theme side chip measured 3.7:1. **Fixed:** in the day the chips have a plain fill and a coloured outline (Home and History).
4. "Asleep for just now". **Fixed:** "Just fell asleep".
5. Not clear which baby was asleep. **Fixed:** the bar sits under the baby switch and names the baby when there are two.
6. Woke up showed twice. **Fixed:** only the bar has it.
7. Quick and top pills were 48 tall. **Fixed:** 56.
8. "2 nappies, 2 wet, 1 dirty" was confusing. **Fixed:** each nappy counted once: "2 nappies today: 1 wet, 1 wet and dirty".
9. The summary showed empty days as zeros a health visitor could misread. **Fixed:** "Nothing logged", and it says feeds include bottles.
10. Large text broke the ring. **Fixed:** the label and chip are capped and centred, like the side buttons.
11. Rose used for the selected day in the week chart, and a white bottle tick. **Fixed:** ink and lilac.
12. Wording mismatches. **Fixed:** "Add a weight" opens "Weight"; "Export everything as a spreadsheet".
13. Save overlapping the note on Pumping, a clipped italic note, kinks in the icon's heart. **Fixed.**
Cuts taken: Pump moved off Home into History; the age line hides when the baby switch shows. Kept: quiet hours (Philip asked for it).

## Round 10: code and data safety on everything new (critic I, fresh, ran the SQL in Postgres)

Verdict: one more pass. Two must fix, five should fix, all done:

1. A discarded feed was erased locally but stayed running on the server, so the other phone showed it running forever and the first phone got it back. **Fixed:** discard, Undo on start and under five seconds are soft deletes; tested with two phones in the preview.
2. Changes saved at the same moment could be skipped for good by the sync cursor. **Fixed:** the database function handles one sync per family at a time; reproduced and rechecked in Postgres.
3. A phone with a fast clock could make the other phone's later edit lose. **Fixed:** every change stamps later than the version it replaces.
4. Merging the babies list could hide a baby that has feeds. **Fixed:** a baby with anything logged is kept and the list goes back up.
5. Remove this baby ignored nappies, sleep and growth. **Fixed.**
6. A Watch tap made while the iPhone app was closed was lost. **Fixed:** taps queue until the app listens, and the app listens before reading the queue.
7. No size limits on the sync function. **Fixed:** limits on payload, babies list and rows per family; bad ids and change times are ignored.
Nits fixed: reminders are scheduled one call at a time; the CSV can't run formulas and handles line breaks.

## Found on her iPhone (Philip, testing)

1. Typing 15 minutes into a recent feed wouldn't save. The feed would have ended later than now, so it was refused, and the message sat under the keyboard, so nothing seemed to happen. **Fixed:** typed minutes that run past now move the start back so the feed ends now, saved with "Start moved to 2:31 PM so it ends now."; any other problem shows right above Save; Save closes the keyboard first. Unit test added.
2. Holding plus kept counting by itself. The repeat only stopped on a normal finger lift, and iPhone can take the touch away without one (the keyboard closing or the list moving under the finger). **Fixed:** the repeat stops on lift, cancel or a lost touch, checks it is still held before every step, never runs past 6 seconds, and pressing a button ends typing first so the number shown is the one saved.
