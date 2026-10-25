# Nuzzle: install and use

## Put it on her iPhone (TestFlight)

You do this once; it takes about 30 minutes, mostly waiting. Everything runs on Expo's build servers, so you don't need a Mac. You need your Apple Developer login and any computer with an internet connection.

1. **Make a free Expo account** at expo.dev (Sign up). Expo builds the iPhone app in the cloud. The free plan covers this.
2. **Install Node.js** on the computer from nodejs.org (the LTS button).
3. **Get the code.** Open Terminal (Mac) or PowerShell (Windows) and paste, one line at a time:
   ```
   git clone -b claude/breastfeeding-tracker-app-dyycl7 https://github.com/philipn1-sketch/Game.git
   cd Game/mobile
   npm install
   npx eas-cli@latest login
   npx eas-cli@latest init
   ```
   Log in with your Expo account when asked. `init` links the app to your account. Say yes to its questions.
4. **Build it:**
   ```
   npx eas-cli@latest build --platform ios --profile production
   ```
   When it asks, log in with **your Apple Developer account** and let it create the certificates for you (answer yes). The build takes 15 to 25 minutes; you can close the window and watch it on expo.dev.
5. **Send it to TestFlight:**
   ```
   npx eas-cli@latest submit --platform ios --latest
   ```
   Log in with Apple again if asked. It creates the app in App Store Connect and uploads the build. Apple then checks it, usually within an hour.
6. **Invite her.** At appstoreconnect.apple.com go to **Users and Access** and add her as a user (role: Customer Support is enough), then in **Apps, Nuzzle, TestFlight** add her under **Internal Testing**. She gets an email.
7. **On her iPhone:** install **TestFlight** from the App Store, open the email, tap **View in TestFlight**, then **Install**.

TestFlight builds last 90 days. To renew, run steps 4 and 5 again; her feeds stay on the phone.

## Using it

* **Start a feed:** tap **Left** or **Right** at the bottom. The side to start on has a honey outline and says **Start here**.
* **During the feed:** tap the side that is feeding to pause; tap the other side to switch; tap either side to carry on after a pause. Tap **Done** to save.
* **Made a mistake?** Every start, save and delete shows **Undo** for six seconds. **Edit** right after saving fixes the start time or minutes.
* **The top card** shows how long since the last feed started and which side it ended on.
* **Reminder:** after the first feed, Nuzzle asks if she wants a reminder. It comes 2 hours after a feed starts unless she changes it in **Settings** (1 to 4 hours). It never arrives while a feed is running.
* **Lock screen:** while a feed runs, a quiet notice shows which side and since when.
* **History:** every feed by day, with the minutes on each side. Tap a feed to edit or delete it. **Add a feed** logs one she forgot.
* **Bottles:** tap **Log a bottle** on Home. Choose the amount (ml or oz, set in Settings) and breast milk or formula. A bottle counts as the last feed for the timer and the reminder; the Left or Right suggestion still follows the last breast feed.
* **Notes:** every feed and bottle has a Note box in its editor. Notes show in History and under the last feed on Home.
* **Week view:** in History, tap **Week** for a bar per day of time on the breast (tap a bar for that day's numbers) and a 24 hour strip per day showing when each feed happened. Left is the tall rose block, Right the shorter peach block, a bottle a thin line.
* **Age:** set the birthday in Settings and Home shows how old she is under her name.
* **Two babies:** **Add another baby** in Settings. Home then shows a switch between them; each baby has their own feeds, side suggestion and reminder.
* **Daily reminders:** Settings, **Also remind me every day at**, for a reminder at a set clock time (up to four).
* **Home screen widget:** touch and hold the home screen, tap **Edit**, then **Add Widget**, find **Nuzzle**. Small or medium. It shows the time since the last feed, how it ended and the side to start on next, and a live timer during a feed. The same widget works on the lock screen (Customize the lock screen, then add Nuzzle).
* **Lock screen timer:** starting a feed puts a live timer on the lock screen and in the Dynamic Island. It stops counting on pause and goes away on Done. If it doesn't show, check iPhone Settings, Nuzzle, Live Activities.
* **Siri:** "Hey Siri, when was the last feed in Nuzzle", "Start left in Nuzzle", "Start right in Nuzzle", "Stop the feed in Nuzzle". They also show in the Shortcuts app, where they can go on the Action button or the home screen.
* **Apple Watch:** the Watch app installs with Nuzzle (on the iPhone, open the Watch app, find Nuzzle, tap Install if it isn't on). It shows the time since the last feed and the side to start on, with Left, Right and Done buttons. Taps go to the iPhone, which keeps the feeds, with the time of the tap.
* **Backup and your phone too:** on her phone, Settings, **Start backup and sharing**. It shows a family code. On your phone, Settings, **Join with a code**, and type it in. Both phones then show the same feeds and the same running timer, within about 20 seconds, and everything is backed up online. If one phone has no signal it keeps working and catches up later. A new phone gets everything back by joining with the same code.
* **Settings:** babies, reminders, bottle units, Night, Day or Phone theme (Phone follows the iPhone's dark mode), and **Export** (a spreadsheet of every feed, through the phone's share menu).

Until backup and sharing is turned on, everything stays on her phone. With it on, feeds also go to the online backup and to the phone that joined, and nothing else is sent anywhere. The app works with no signal either way.
