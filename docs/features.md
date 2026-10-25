# Huckleberry's breastfeeding tracker, studied

Sources: the eight screenshots Philip took of Huckleberry on his wife's phone (October 2026), Huckleberry's App Store and Google Play listings, its help centre article on reminders, and published reviews (links at the bottom). This file copies how things work, never how they look.

## How the feeding flow works in Huckleberry

1. **Home dashboard.** Coloured category tiles (Sleep, Nursing, Bottle, Solids, Diaper, Pumping). The Nursing tile shows time since the last feed ("37m ago") and the minutes per side, with a star on the side the feed ended on: "(L) 0m, (R*) 13m". An alarm clock icon on the tile sets a reminder.
2. **Add feeding screen.** Opened from the Nursing tile. Tabs for Nursing and Bottle. A Start Time row ("Set time"). Two large round LEFT and RIGHT buttons with a play symbol. A "Last Side" badge sits on the side used last. A "Manual entry" link below.
3. **Timing.** Tap a side to start; tap again to pause; tap the other side to switch. Each side has its own running total. Stop and Save ends the feed.
4. **Manual entry.** Start time, minutes per side, used for feeds that were not timed.
5. **Reminders.** From the alarm icon: "Remind in" a set time after the last logged session, or "Remind at" a fixed clock time.
6. **Reports.** Day, Week, List and Summary views. A row of dates. The day view shows total breastfeeding time ("1h 16m 31s"), the number of sessions, and a timeline with a bar per feed and its length.
7. **Editing.** Feeds can be opened from reports and edited or deleted.
8. **Settings.** Light, Dark or System theme; units; 12h or 24h clock. Widgets, Live Activities, Siri, Apple Watch and AI logging all sit behind a paid upgrade.

## What parents complain about

* The end time of a feed is the moment the whole session ended, not how long the baby actually fed, so durations look wrong when pauses happen.
* They want to see the side the last feed **started** on as well as ended on, to know where to begin.
* Timers sometimes reset or fail to update, especially between two phones.
* Starting a timer needs the phone in hand; hands free and watch control are paid and patchy.
* The lock screen timer and widgets are paywalled.
* The app has grown heavy (sleep plans, AI logging, upsell banners) and occasionally fails to open or save.

## Features for our app

| Feature | How it behaves in ours | Priority |
|---|---|---|
| Start on left or right in one tap | Two big buttons at the bottom of the home screen. One tap starts the feed and the timer. | Must have |
| Live timer that survives closing | The feed is stored as timestamped segments. Every number on screen is now minus stored times, so killing the app, locking the phone, a restart or a dead battery change nothing. | Must have |
| Pause, resume, switch sides | Tap the running side to pause, tap either side to resume, tap the other side to switch. Each side keeps its own total. Paused time is not counted. | Must have |
| Stop and save | One Done button; an Undo snackbar for a few seconds puts the feed back to running. | Must have |
| Last side and suggestion | Home shows the side the last feed ended on, and a gentle "Start on the right" suggestion that pre highlights that button. | Must have |
| Time since last feed | Counts from the start of the last feed, always from stored timestamps. | Must have |
| Reminder | Local notification a set time after the latest feed started (2 hours by default; her own setting, from 1 to 4 hours in 15 minute steps). Rescheduled on every start, save, edit, delete and undo. | Must have |
| History by day | Days grouped newest first; each feed shows start time, sides with minutes, total, and gap since the feed before. | Must have |
| Edit, delete, add a forgotten feed | Tap a feed to edit start time, minutes per side and the side it ended on; delete with Undo; "Add a feed" for one she forgot. | Must have |
| Daily summary | Each day's header shows number of feeds and total minutes on each side. | Nice to have |
| Timer on the lock screen | An ongoing notification while a feed runs. Checked against the complexity rule before adding. | Nice to have |
| Export history to CSV | Shares a CSV through the phone's share sheet. | Nice to have |
| Start side as well as end side | Shown in history ("L then R"); answers a common complaint at no cost. | Nice to have (free with the segment model) |
| Bottle feeds | Phase 1: amount in ml or oz, breast milk or formula. Counts as the last feed; the side suggestion follows the last breast feed. | Added |
| Notes on a feed | Phase 1: a note on any feed or bottle, shown in History and on Home. | Added |
| Week chart and timeline | Phase 1: History, Week. Bars of time on the breast per day, plus a 24 hour strip per day. | Added |
| Baby's age | Phase 1: birthday in Settings; Home shows "2 weeks 3 days old". | Added |
| More than one baby | Phase 1: each baby has their own feeds, suggestion and reminder. Old feeds belong to the first baby. | Added |
| Theme follows the phone | Phase 1: Night, Day or Phone. | Added |
| Solids, nappies, sleep, pumping, growth | Not built. | Out of scope |
| Sync between two phones, cloud backup | Phase 2: a family code instead of accounts; both phones send and take in changes, the newer edit wins, and the online copy is the backup. | Added |
| Home screen widget, lock screen timer | Phase 3: a widget for the home and lock screens, and a Live Activity timer on the lock screen and Dynamic Island. | Added |
| Apple Watch, Siri | Phase 4: a Watch app with Left, Right and Done; Siri and Shortcuts to start, stop and ask about the last feed. | Added |
| Sleep plans, AI logging, upgrades, ads, analytics | Not built. | Out of scope |
| Reminder at a fixed clock time | Phase 1: up to four daily times, as well as the reminder after a feed. | Added |

## Sources

* [Huckleberry on the App Store](https://apps.apple.com/us/app/huckleberry-baby-tracker/id1169136078)
* [Huckleberry on Google Play](https://play.google.com/store/apps/details?id=com.huckleberry_labs.app&hl=en_US&gl=US)
* [Huckleberry help: How do I set up Reminders?](https://huckleberry.zendesk.com/hc/en-us/articles/360051424173-How-do-I-set-up-Reminders)
* [Huckleberry tracking page](https://huckleberrycare.com/product/tracking)
* [App Store reviews](https://apps.apple.com/us/app/huckleberry-baby-child/id1169136078?see-all=reviews&platform=iphone)
* [JustUseApp reviews](https://justuseapp.com/en/app/1169136078/huckleberry-baby-child/reviews)
* [Betteroo review of the free and paid tiers](https://betteroo.ai/guides/huckleberry-app-review/)
* [OT Dude review](https://www.otdude.com/patients/im-your-huckleberry-best-app-for-parents-with-newborn/)
