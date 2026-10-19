# Xoundra Execution Plan

Version 1.1 � 18 October 2026

Use this as the step-by-step build order. Finish a step�s exit check before starting the next step in that phase. Details and product rules live in `doc/IMPLEMENTATION_PLAN.md`. Environment variable names live in `doc/ENV.example`.

Work Android-first. Use Paystack test keys until the Phase 6 exit check passes.

---

## Phase 0 � Project shell

**Goal:** a running Expo app and a Supabase project, with no product features yet.

1. Create the Expo app (JavaScript, Expo Router) in this repo and a `web/` Next.js app placeholder.
2. Add `doc/ENV.example` values to a local `.env` for Expo and a local `.env.local` for web and Supabase functions. Do not commit those files.
3. Add `.gitignore` entries for `.env`, `.env.local`, and Paystack key files.
4. Create the Supabase project. Enable email auth. Create private storage buckets: `track-audio`, `artist-evidence`, `artwork`.
5. Add the Midnight Atmosphere colors as theme tokens and a blank five-tab shell: Home, Explore, Studio, Library, Profile.
6. Confirm the app builds on an Android device or emulator.

**Exit check:** the tab shell opens, and the app reads the public Supabase URL from env without crashing.

---

## Phase 1 � Accounts, country, and currency

**Goal:** a signed-in profile that shows the user�s country currency.

1. Add migrations for `profiles`, `countries`, and `fx_rates`.
2. Seed countries. Nigeria charges NGN and allows local web methods. Map other launch countries to USD as the charge currency, with their own display currency.
3. Seed a first FX table for display-only conversions. Mark non-charge currencies as approximate.
4. Enable Row Level Security so a user can read and update only their profile.
5. Build email sign-up and sign-in.
6. Build onboarding: intention, country, then Home.
7. On Profile, show country, display currency, and charge currency. Changing country updates all three from the `countries` row.
8. Add sign-out.

**Exit check:** two test users in different countries see different display currencies. Neither user can read the other�s profile through the API.

---

## Phase 2 � Audio prototype

**Goal:** prove playback before building screens around it.

1. Add one public-domain or licensed test file to private storage.
2. Implement a single-track player: play, pause, seek, loop.
3. Add an Android foreground service / media session: notification controls and lock-screen controls.
4. Test a phone call interrupting playback, then returning.
5. Add a queue mode: next, previous, repeat.
6. Keep this behind a temporary dev screen if the real Home is not ready.

**Exit check:** on a physical Android phone, audio keeps playing with the screen locked, and the notification pause button works.

If the Expo audio module cannot do this, stop and swap in a native playback module before Phase 3. Do not design the rest of the app on a player that only works in the foreground.

---

## Phase 3 � Catalogue and listener app

**Goal:** a person can find a sound and listen.

1. Add migrations for artists, tracks, assets, categories, tags, favourites, playlists, and history.
2. Seed a small Free catalogue so design and playback can be tested without artists.
3. Add a `media-sign` function. Free published tracks return a short-lived URL. Premium tracks return access denied until Phase 4.
4. Build Home: continue listening, time-of-day shelf, new releases.
5. Build Explore: categories, search, Free/Premium filter, track and artist pages.
6. Build the mini-player and full player.
7. Build Library: favourites, playlists, history. Leave Downloads as an empty state until entitlements exist.
8. Record listening history when a signed-in user plays.

**Exit check:** a guest can play a Free track. A Premium track id returns denied. Search by tag returns the seeded track.

---

## Phase 4 � Paystack and entitlements

**Goal:** test money grants Premium, and only the server can do it.

1. Add `plans`, `plan_prices`, `purchases`, `subscriptions`, `entitlements`, `lifetime_slots`, and `webhook_events`.
2. Seed Free, Premium Monthly (?1,500), Premium Annual (?12,000), and Founding Lifetime (?35,000, cap 50). Add USD prices only after they are decided.
3. Create matching Paystack **test** plans for monthly and annual.
4. Implement `checkout-init`:
   - Resolve charge currency from the user�s country on the server.
   - Set amount from `plan_prices` in minor units.
   - Android channel list: `card`.
   - Web Nigeria: `card`, `bank`, `bank_transfer`, `ussd`.
   - Web elsewhere: `card`.
   - For Lifetime, atomically reserve a slot or return sold out.
5. Open Paystack Checkout in the app (card) and on the web (country methods).
6. Implement the webhook. Verify the signature. Verify the transaction. Grant one entitlement per reference.
7. Reflect status in the app: confirming, active, failed, expired.
8. On the plan screen, show display currency and, when different, the exact charge amount.
9. Block automatic renewal when the card brand is American Express. Offer Lifetime or a manual renewal with Visa, Mastercard, or Verve.
10. Implement refund and failed-payment paths so they do not leave `active` entitlements.
11. Teach `media-sign` to allow Premium tracks only for an active entitlement.
12. Add restore: Profile re-reads the server entitlement. There is no client-side �I paid� flag.

**Exit check:**

- A test card turns a user Premium, and that user can play a Premium track.
- The same webhook sent twice does not create two entitlements.
- A failed payment does not.
- Two parallel Lifetime checkouts cannot confirm a 51st slot.
- The Android sheet requests card only.
- A Nigerian web session can be initialized with local methods. A non-Nigerian web session is card only.
- Profile currency matches the selected country.

---

## Phase 5 � Studio and sleep timer

**Goal:** the premium listening tools that do not depend on the clock.

1. Add `soundscapes` and `soundscape_layers`.
2. Build concurrent mixing with per-layer volume, mute, master volume, loop, and fade. Test on a real phone for heat, clipping, and backgrounding.
3. Ship the four presets. Saving a mix requires Premium.
4. Re-check every layer at play time. If a layer is locked, name it.
5. Add the sleep timer on the full player: duration, end of track, fade out, visible remaining time, cancel.
6. Enable downloads for entitled tracks, with remove controls. A saved mix plays offline only when every layer is on the device.

**Exit check:** a Premium user saves a two-layer mix, locks the phone, and hears both layers. A Free user cannot save. The timer fades out and can be cancelled.

---

## Phase 6 � Scheduled listening

**Goal:** optional schedules without promising the OS will always fire them.

1. Add `scheduled_sessions`.
2. Let a Premium user pick time, days, a track or saved mix, duration, and fade-in.
3. Schedule with Android alarms where the OS allows. Request only the permissions this needs.
4. Show the in-product sentence: scheduled listening may need alarm permission and may not run if the app is force-stopped.
5. If the audio is not downloaded, prompt the user to download it first.
6. After reboot, restore schedules the OS still allows, and show any schedule that cannot run.

**Exit check:** a schedule fires on a test phone with permission granted, and the UI explains the failure when permission is denied.

---

## Phase 7 � AI mood companion

**Goal:** a guide that only plays the real catalogue.

1. Add a restricted transcript store and a minimal `ai_sessions` record.
2. Build the orb screen with text input first. Add voice after text works.
3. Request the microphone only when the user chooses voice.
4. Server endpoint: read the message, search allowed published tracks, return ids and a metadata-based reason, enforce Premium and rate limits.
5. Hand those ids to the existing player. Show playing only after playback starts.
6. Add delete-conversation and document retention in the privacy policy.
7. Add a budget alert for provider cost.

**Exit check:** �stressful day� starts a real seeded track the user can access. Asking to stop stops playback. A Free user gets the upgrade path. The assistant does not claim a track exists when search returns nothing.

---

## Phase 8 � Artists and admin

**Goal:** verified people can publish, and nobody else can.

1. Add application, report, moderation, and audit tables.
2. Build artist apply: profile, rights evidence upload, agreement acceptance.
3. Build the admin queue: approve, reject with reason, restrict, suspend.
4. After verification, allow upload. New tracks stay `in_review`.
5. Admin publish sets `published`. Artist chooses Free or Premium. Tier edits write an audit row.
6. Show the artist listening stats. Do not show earnings or a withdraw button.
7. Add takedown. A taken-down track disappears from search and will not refresh its signed URL.

**Exit check:** an applicant cannot publish. A verified artist�s track is invisible until approval. A Premium track from that artist still obeys Phase 4 entitlements.

---

## Phase 9 � Web

**Goal:** the same person can pay on the web and listen on Android.

1. Responsive pages: home, explore, auth, plans, account, legal.
2. Reuse `checkout-init` with the web channel rules.
3. Account page shows country, currencies, and subscription status from the same tables as the app.
4. Skip Studio and AI on the web until Android versions are stable.
5. Replace the domain placeholder with the production domain in callback URLs only when the domain is final.

**Exit check:** a Nigerian test user can start checkout with local methods, and a non-Nigerian test user sees card checkout. A successful web payment unlocks Premium in the Android app for that account.

---

## Phase 10 � Release

**Goal:** real charges and a store build.

1. Run the acceptance list in `doc/IMPLEMENTATION_PLAN.md` section 12 on a physical phone and the web.
2. Complete privacy policy, terms, subscription terms, refunds, and the Artist Agreement review.
3. Confirm the Google Play billing position for a Paystack digital purchase before submitting the store listing.
4. Switch Paystack to live keys in the hosting environment, not in the app binary beyond the public key.
5. Confirm card logos against the live Paystack account: Visa, Mastercard, Verve, Amex, and that Amex renewal stays disabled.
6. Set crash reporting, webhook failure alerts, and a playback-failure alert.
7. Prepare store screenshots of Home, player, Studio, and Profile currency.
8. Ship Android. Keep the first-50 counter monitored on launch day.

**Exit check:** a live small-value purchase (or Paystack�s live test process, if you do a staff purchase and refund) grants and revokes correctly, and the lifetime counter matches confirmed rows.

---

## Suggested order if you build alone

Do the phases in numeric order. Inside a phase, do the steps in numeric order.

The longest risks are Phase 2 (real-device audio) and Phase 4 (webhook idempotency and the lifetime cap). Schedule device testing on those two before polishing UI.

Leave these out until after Phase 10:

- Light theme
- Creator payouts
- Playback speed
- Web Studio and web AI
- Extra sign-in providers

---

## Definition of a finished step

A step is finished when:

- The behavior works on Android for app steps, or in the browser for web steps.
- Access rules are enforced in Supabase or an Edge Function, not only by hiding a button.
- New secrets exist only in local or hosted env files.
- You can describe the failure case (denied, offline, unpaid, sold out) and you have seen it once.
