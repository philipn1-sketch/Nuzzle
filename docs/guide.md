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

## Put it on an Android phone

On the phone, open the **Nuzzle for Android** release in the GitHub repository (Releases, nuzzle-android), download **nuzzle.apk**, open it, and allow installing from this source when asked.

## Using it

* **Start a feed:** tap **Left** or **Right** at the bottom. The side to start on has a honey outline and says **Start here**.
* **During the feed:** tap the side that is feeding to pause; tap the other side to switch; tap either side to carry on after a pause. Tap **Done** to save.
* **Made a mistake?** Every start, save and delete shows **Undo** for six seconds. **Edit** right after saving fixes the start time or minutes.
* **The top card** shows how long since the last feed started and which side it ended on.
* **Reminder:** after the first feed, Nuzzle asks if she wants a reminder. It comes 2 hours after a feed starts unless she changes it in **Settings** (1 to 4 hours). It never arrives while a feed is running.
* **Lock screen:** while a feed runs, a quiet notice shows which side and since when.
* **History:** every feed by day, with the minutes on each side. Tap a feed to edit or delete it. **Add a feed** logs one she forgot.
* **Settings:** baby's name, reminder, Night or Day theme, and **Export** (a spreadsheet of every feed, through the phone's share menu).

Everything stays on her phone. Nothing is sent anywhere, and the app works with no signal.
