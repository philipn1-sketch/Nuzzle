# Put Nuzzle on the App Store

For a Claude session running on Philip's Mac in this repo. It needs the browser, Xcode and Philip's Apple login, so it can't be done from a cloud session. Ask Philip whenever a step needs his login, two factor code, a payment or tax agreement, or a legal answer.

## House rules (must follow)
* Philip's preference: **never use hyphens or dashes in messages to him**, and never add a sign off to emails.
* Only touch Nuzzle. The developer account is the **QuickQuote Group** team (Team ID 9QLBWXC74X) and also holds other QuickQuote apps and settings: don't change anything that isn't Nuzzle.
* Commit to `main` only if you change repo files, and never put model names in commits.

## Facts
* Bundle ID `com.philipnader.nuzzle` (widget `com.philipnader.nuzzle.widgets`, watch `com.philipnader.nuzzle.watch`). App Group `group.com.quickquotegroup.nuzzle`.
* Support URL https://philipn1-sketch.github.io/Nuzzle/support
* Privacy URL https://philipn1-sketch.github.io/Nuzzle/privacy
* Marketing URL https://philipn1-sketch.github.io/Nuzzle/
* All listing text in 10 languages, plus review notes and App Privacy answers: `docs/appstore/listing.md`. `npm run check:listing` checks Apple's limits.
* Screenshots, 1320x2868 for the 6.9 inch display, six per language: `docs/appstore/screenshots/<lang>/01.jpg` to `06.jpg`.
* `app.json` already sets `usesNonExemptEncryption: false`, so the export compliance answer is "no".

## Steps
1. **App record.** App Store Connect, Apps, +, New App: iOS, name "Nuzzle: Feeding Tracker" (if taken, try "Nuzzle Feeding Tracker" and tell Philip), primary language English (Australia), bundle ID `com.philipnader.nuzzle`, SKU `NUZZLE001`, full access. If the bundle ID isn't in the list, register it at developer.apple.com, Identifiers (App ID, with App Groups and Push Notifications).
2. **Agreements.** Check Business (Agreements, Tax and Banking) has the Paid Apps agreement active. If not, tell Philip. Only he can accept it and add bank and tax details.
3. **Nuzzle Plus purchases** (product IDs must match exactly; the app looks for these IDs):
   * Subscription group "Nuzzle Plus", auto renewable subscription "Nuzzle Plus Monthly", ID `com.philipnader.nuzzle.plus.monthly`, 1 month, A$1.99, Family Sharing on.
   * Non consumable "Nuzzle Plus for Life", ID `com.philipnader.nuzzle.plus.lifetime`, A$9.99, Family Sharing on.
   * Each needs an English display name ("Nuzzle Plus" / "Nuzzle Plus for Life"), a short description, and a review screenshot of the paywall.
4. **Listing.** For each of the 10 languages (add the localisations), paste name, subtitle, promotional text, keywords and description from `docs/appstore/listing.md`, and upload that language's six screenshots. Then set:
   * Support, privacy and marketing URLs
   * Category Health and Fitness (secondary Lifestyle)
   * Age rating questionnaire: all "none", so 4+
   * Copyright "2026 QuickQuote Group"
   * App Privacy answers from the listing file
   * App Review notes from the listing file, with contact details from Philip
5. **Build.** In this repo:
   ```
   git pull
   npm install
   npx expo prebuild --clean --platform ios
   ```
   Open `ios/*.xcworkspace` in Xcode. Set signing to team 9QLBWXC74X for the app, widget and watch targets, then run Product, Archive and Distribute App to App Store Connect. Wait for processing.
6. **Submit.** On the 1.0 version page, choose the build, attach both in app purchases to the version, answer export compliance "no", and Add for Review. Ask Philip before the final Submit.

## When done
Tell Philip, without hyphens or dashes:
* what was created
* anything still waiting on him (agreements, banking, tax, contact details)
* the review status

Note to him that a native speaker check of the translations is advised.
