# Releasing Blockhaus to Google Play

The config is ready in `app/app.json` (package `com.khizrim.blockhaus`) and
`app/eas.json` (production profile builds an `.aab`; submit goes to the
internal testing track as a draft). The steps below need the owner's own
accounts, so they are run by hand from `app/`.

The GitHub "Android APK" workflow is separate: it builds a debug-signed APK
for sideloading and is never uploaded to Play.

## One time

1. **Expo account and project.** `npx eas-cli@latest login`, then
   `npx eas-cli@latest init`. Init writes `extra.eas.projectId` (and `owner`)
   into `app.json`; commit that.
2. **Upload key.** On the first `eas build -p android` EAS offers to generate
   a keystore and keeps it on Expo's servers. Say yes, and download a backup
   with `npx eas-cli@latest credentials -p android`. Play App Signing (on by
   default for new apps) holds the real signing key; this is the upload key.
3. **Play Console app.** Create the app in Play Console (developer account,
   one-time $25 fee). Fill in the store listing and "App content" from
   `docs/store-listing.md`.
4. **Service account for `eas submit`.** Follow
   https://docs.expo.dev/submit/android/ to create a Google Cloud service
   account, give it release access in Play Console, and save its JSON key as
   `app/google-service-account.json`. That file is gitignored; never commit
   it. (Alternatively upload it to EAS with `eas credentials` and drop
   `serviceAccountKeyPath` from `eas.json`.)

## Each release

```bash
cd app
npx eas-cli@latest build -p android --profile production
npx eas-cli@latest submit -p android --profile production --latest
```

- `versionCode` is kept by EAS (`appVersionSource: "remote"`,
  `autoIncrement: true`), so the `versionCode` in `app.json` is only the
  starting point. Bump `expo.version` in `app.json` for a user-visible
  version change.
- The release lands on the **internal** track as a **draft**. Open Play
  Console, add testers, and roll it out there. Promote to closed or production
  testing from the Console when ready.
- New personal developer accounts must run a closed test with at least 12
  testers for 14 days before production access is granted. Plan for it.
  (**GUESS** that this still applies to your account; the Console says so on
  the dashboard if it does.)

## Before the first submit

- [ ] Screenshots from a phone (2 to 8), light theme, one with the lesson,
      one mid-game with a chain, one with a personal record.
- [ ] Contact email chosen for the listing.
- [ ] `docs/privacy.md` is on `main`, so the privacy URL resolves.
- [ ] A production build installed from the internal track and played once
      start to finish on a real device.
