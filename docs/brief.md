# Brief

| Item | Value |
|---|---|
| goal | Replace the breastfeeding tracking she does in Huckleberry with our own free app on her phone. |
| user | A new mum breastfeeding a newborn, often at 3 am, one hand free, half asleep. |
| must have | One tap start on left or right. Live timer that survives closing and locking. Pause, resume, switch. Stop and save. Last side and suggestion. Time since the last feed started. Reminder a set time after the last feed started (2 hours default, adjustable). History by day. Edit, delete, add a forgotten feed. |
| nice to have | Daily summary. Timer on the lock screen. Export to CSV. |
| out of scope | Accounts, sign in, sleep, nappies, bottles, pumping, growth, ads, analytics, anything paid, sharing between phones. |
| name | **Nuzzle** (see below) |
| platform | Expo (React Native) with TypeScript, one codebase for iPhone and Android. |
| data | On the phone only (SQLite), fully offline. |
| notifications | Local scheduled notifications, rescheduled on every start, save, edit, delete and undo. |
| install | iPhone through TestFlight on Philip's Apple Developer account; Android as an installable APK. |
| design | Original look: calm, warm, rounded, big targets, night theme by default, day theme available. |

## Name

Shortlist, checked against App Store and Google Play search results on 24 October 2026:

| Name | Check | Verdict |
|---|---|---|
| Nuzzle | No baby or feeding app found. "Nuzzel" was a news app, closed in 2021. | **Picked** |
| Moonfeed | No app found. | Strong runner up; a little long to say half asleep. |
| Snugtime | No app found. | Sounds like a sleep app. |
| Dozy | No baby app found. | Sounds like sleep, not feeding. |
| Hush | Many unrelated apps named Hush. | Too generic to find in a store. |
| Lull | No app found, but "Lulla" is a breastfeeding tracker. | Too close. |
| Milkmoon | "Milk & Moon Breastfeeding" exists. | Too close. |
| Nightfeed | "The Night Feed" exists. | Taken. |

**Pick: Nuzzle.** Two soft syllables that are easy to say half asleep, and it describes the closeness of a feed without sounding medical or like a sleep app.

The name lives in one constant, `APP_NAME` in `src/config.ts`, plus `name` in `app.json` (the store name the phone shows under the icon).

## Platform notes and deviations

Each line is a choice the brief left open or something the platform forced.

* **Android exact alarms.** Android 12 and later delay ordinary scheduled notifications by several minutes to save battery. The app declares `SCHEDULE_EXACT_ALARM` and `USE_EXACT_ALARM` so the reminder fires on time. Allowed because the app is not going through the Play Store.
* **CSV export without extra libraries.** The CSV goes through React Native's built in Share sheet as text, so she can save it to Files, Notes or email. No file system or sharing library needed.
* **Lock screen timer.** A true live counting timer on the iPhone lock screen needs a native Live Activity extension, which Expo cannot build without extra native tooling. We use an ongoing notification instead ("Feeding on the left since 3:02") that sits on the lock screen while a feed runs; the start time does the counting.
* **Web preview for design work only.** `react-dom`, `react-native-web` and `@expo/metro-runtime` are dev only so screens can be rendered and screenshotted on this build machine, which has no phone simulator. Storage and notifications have small `.web.ts` stand ins. None of this ships in the phone builds.
* **Testing on a real emulator.** The end to end test runs on an Android emulator on GitHub's machines with Maestro, which also takes the screenshots. No iPhone simulator is available without paid macOS minutes, so iPhone is covered by the shared code and TestFlight.
* **TestFlight needs Philip.** Building for TestFlight needs Philip to log in to Expo (EAS) and Apple. Everything is prepared; that last step is his.
