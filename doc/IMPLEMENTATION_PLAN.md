# Xoundra Implementation Plan

Version 1.1 � 18 October 2026

This is the build specification for Xoundra. It follows the product plan, with three decisions now locked:

- The name **Xoundra** is approved. Use it in the app, store listing, and legal pages.
- **Paystack** is the payment provider.
- Each user chooses a **country**. The profile shows that country�s currency. Checkout charges only a currency Paystack can actually collect for this merchant.

Suggested line: �Find your quiet.�

---

## 1. What we are building

Xoundra is a premium relaxation-audio product for sleep, focus, meditation, and personal soundscapes. Listeners play a curated catalogue. Verified artists publish tracks as Free or Premium. The backend decides who can hear what.

Android ships first. The web app uses the same accounts, catalogue, and entitlements, with a wider set of Nigerian payment methods.

There are no ads.

### Platforms

| Surface | Job in the first release |
|---|---|
| Android app | Listening, library, studio, profile, card checkout |
| Web | Account, catalogue, checkout (cards plus Nigerian local methods), legal pages |
| Admin web | Artist review, track moderation, entitlements, lifetime-offer counter, audit log |

### Roles

Artist status and Premium status are separate. A verified artist does not receive Premium automatically. A Premium listener cannot publish.

| Role | Can do |
|---|---|
| Listener | Browse, play allowed tracks, favourites, playlists, history, eligible downloads |
| Premium listener | Studio mixes, saved soundscapes, sleep timer, scheduled listening, AI companion |
| Artist applicant | Submit profile and rights evidence. Cannot publish |
| Verified artist | Upload approved tracks and set Free or Premium |
| Restricted or suspended artist | Publishing disabled. Appeal path exists |
| Admin | Least-privilege moderation, review, finance, or support. Every sensitive action is audited |

---

## 2. How the app should work

The product should feel quiet, fast, and trustworthy. Playback and �did my payment work?� matter more than extra screens.

### First-run path

1. Open the app and see a short calm intro. One sentence, then continue.
2. Choose a starting intention: Sleep, Focus, Relax, or Meditate. This only tunes the first home screen.
3. Choose country. The profile currency updates immediately.
4. Create an account with email. Google sign-in can be added after email auth is solid.
5. Land on Home with a playable free track already selected, so the first successful action is hearing sound.

Guest browsing of Free tracks is allowed. Saving, downloading, mixing, and paying require an account. Premium tracks always require a verified entitlement.

### Everyday listening

- Home shows Continue, a time-of-day shelf (night leans sleep, day leans focus), new releases, and saved mixes.
- A mini-player stays on Home, Explore, Studio, Library, and Profile. It shows artwork, title, and play/pause. Tap opens the full player.
- The full player has seek, loop, volume, sleep timer, queue, and track details.
- Explore is search plus categories: Relaxation, Sleep, Meditation, Focus, Ambient, Nature, Rain, Ocean, Forest, White Noise. Filters are Free / Premium, duration, and mood tags.
- Library holds Favourites, Playlists, Downloads, History, and Soundscapes.
- Profile holds country, display currency, charge currency, subscription, downloads, privacy, and support. Artists also see their dashboard.

### Soundscape Studio

Studio is Premium. Free users can open it and hear one curated preset preview made only of Free layers, with a clear upgrade path. They cannot save a mix.

A mix stores track ids, order, gain, mute, loop, and fade. It does not copy audio files. Playback checks the user�s entitlement and every layer again. If one layer is locked, name that layer and offer restore.

Ship four presets first: Rainy Evening, Deep Focus, Forest Calm, Night Ocean.

### Sleep and schedules

These stay separate.

- Sleep timer: stop after a duration, stop at the end of the track, or fade out. Remaining time and Cancel stay visible on the player.
- Scheduled listening ships after the timer works. Copy must say that Android may not start sound if the app was force-stopped or alarm permission is off. If the chosen audio is streaming-only, recommend a download first.

### AI companion

The AI is a catalogue guide. It is not a therapist and must not be marketed as treatment.

It may only start tracks that exist and that this user can play. The orb state must match the real microphone and player: idle, listening, processing, speaking, selecting, playing, paused, error. Voice is optional. Text always works. Microphone permission is requested only after the user picks voice.

### Artist path

Apply, submit rights evidence, wait for human review, then upload. A track is invisible until an admin approves it. The artist chooses Free or Premium on upload. Changing that tier is audited.

Creator payouts stay out of the first public release. The dashboard can show plays and completion. It must not show money owed until a payout model, threshold, tax rules, and fraud checks exist.

### Payment path

1. Profile already has country, display currency, and charge currency.
2. Plan screen shows the price in the display currency. When the charge currency differs, the screen also shows the exact amount Paystack will collect, for example �About $23 � charged as ?35,000�.
3. Android opens Paystack with **card only**.
4. Web opens Paystack with the methods available for that country.
5. The app shows �Confirming payment� until the server verifies the transaction.
6. Only the server grants Premium or Lifetime.

---

## 3. What to keep, add, and leave out

### Keep

- Dark �Midnight Atmosphere� theme as the foundation.
- Persistent mini-player and reliable background playback.
- Server-side entitlements and short-lived media URLs.
- Free and Premium chosen per track by verified artists.
- Human review before a track is public.
- No ads.
- Separate sleep timer and scheduled listening.
- AI that can only play real, allowed tracks.
- First-50 Founding Lifetime as a one-time product with a server-side slot counter.

### Add for a better experience

- Country on the profile, with display currency and the real charge currency written in plain language.
- A three-step onboarding that ends by playing a sound.
- Time-of-day home shelves, using the device clock only.
- Mood tags on search so �rain� or �anxious� map to existing tags. No generated tracks.
- Fade-out on the sleep timer. This is the feature people will feel.
- Preset mixes as the front door to Studio.
- Honest payment states: pending, active, failed, expired, refunded.
- Card marks that match the user�s country. Nigeria can show Visa, Mastercard, Verve, and Amex. Other countries show Visa, Mastercard, and Amex. Verve is a Nigerian card network.
- An offline badge on the player, and a download action only when the user is allowed to download that track.
- Reduced-motion support from the first UI pass. The AI orb must have a still state.
- Account deletion and a way to export or delete listening history and AI transcripts.

### Leave out of the first Android release

- Ads, tips, and per-play artist payouts.
- Light theme until dark mode, player, and checkout are stable.
- Playback speed. Relaxation audio should stay at normal speed. Offer loop and fade instead.
- A public mood feed or any health inference.
- Guest access to Premium, downloads, or saved mixes.
- Hard-coded payment buttons. Render the method list the server returns for that country and surface.
- Amex for automatic monthly or annual renewal. Nigerian Paystack merchants cannot take recurring Amex charges. Amex can pay for Founding Lifetime, which is one-time.
- Exact-alarm promises. Scheduled listening comes after single-track playback and the sleep timer.
- AI on day one. Ship listening and payments first so the companion has a real catalogue to search.
- Web feature parity with Studio and AI in the first web release. Web v1 is account, browse, and checkout.

### Visual system

| Token | Value | Use |
|---|---|---|
| Midnight Navy | `#101725` | Background and navigation |
| Soft Mint | `#8BE1CF` | Primary action, active playback, progress |
| Muted Lavender | `#B8A9F5` | AI and secondary accents |
| Warm Amber | `#F2C879` | Highlights |
| Pale Surface | `#F3F6F8` | Reserved for a later light theme |

Use generous spacing, restrained rounded cards, and a quiet waveform. Animation respects the system reduced-motion setting.

---

## 4. Architecture

Recommended stack:

| Layer | Choice |
|---|---|
| Android | React Native with Expo, JavaScript |
| Audio | A native-capable playback service and media session. Prove background play and mixing on a real device before building the rest of the UI on top |
| API and data | Supabase: Postgres, Auth, Storage, Row Level Security, Edge Functions |
| Web | Next.js, same API and entitlement rules |
| Admin | Protected Next.js routes, separate admin role |
| Payments | Paystack Checkout, initialized and verified on the server |
| AI | Server-side model plus catalogue search. Added in a later phase |
| Observability | Crash reporting, structured logs, billing alerts |

The mobile app never holds the Paystack secret key, the Supabase service role key, or a permanent media URL for Premium audio.

### Repo layout to create

```text
app/                      Expo Router screens
src/components/           Player, cards, sheets
src/features/             auth, catalogue, player, library, billing, studio, artist
src/lib/                  supabase client, formatters
supabase/migrations/      schema and RLS
supabase/functions/       paystack-init, paystack-webhook, media-sign, ai-recommend
web/                      Next.js site and admin
doc/                      these plans
```

### Playback manager

One manager, three modes:

| Mode | Behavior | Who |
|---|---|---|
| Single | One track, pause, seek, loop | Everyone for tracks they can access |
| Playlist | Queue, next, previous, shuffle, repeat | Everyone for tracks they can access |
| Soundscape | Several tracks at once, per-layer gain, master volume | Premium, and only while every layer is allowed |

Android must handle audio focus, phone calls, Bluetooth, lock screen, notification controls, and process restart.

---

## 5. Country and currency

The profile stores the user�s country. Currency shown on the profile is the country�s currency. The amount sent to Paystack is the charge amount.

Paystack will not charge every currency in the world. For a Nigerian merchant, plan on **NGN** and **USD** until the Paystack account shows more enabled currencies. Confirm the live list in the Paystack dashboard before coding the map.

| User country | Display currency on profile | Charge currency | Web methods |
|---|---|---|---|
| Nigeria | NGN | NGN | Card, Pay with Bank, Bank Transfer, USSD |
| United States and other countries mapped to USD | Local currency code for display | USD | Card |
| A country whose local currency Paystack cannot charge | That local currency, marked approximate | USD | Card |

Rules:

- The user picks a country. They do not type an arbitrary currency.
- Display currency is derived from the country table.
- Charge currency is derived from the same row on the server.
- Plan prices are stored in minor units for each charge currency (kobo for NGN, cents for USD).
- If display currency and charge currency differ, show both. The charged figure is exact. The local figure is labeled approximate and comes from a server FX table refreshed on a schedule.
- The client never calculates the Paystack amount.
- Android `channels` is always `["card"]`.
- Web Nigeria `channels` is `["card", "bank", "bank_transfer", "ussd"]`, filtered by what Paystack actually returns as available.
- Web outside Nigeria `channels` is `["card"]`.
- Card network marks: Nigeria shows Visa, Mastercard, Verve, and Amex. Other countries show Visa, Mastercard, and Amex.
- Monthly and annual auto-renew use Visa, Mastercard, or Verve. If the card is Amex, offer Founding Lifetime or a non-renewing period the user renews manually with a supported card.
- USSD, bank transfer, and Pay with Bank can pay a defined period or Lifetime. They do not start a card subscription. The entitlement has a clear end date, and the app asks the user to renew.

### Plans

Prices below match the product plan and are still hypotheses. Store them in the database so they can change without an app release. Display them with the currency rules above.

| Plan | Nigeria | Other countries | Entitlement |
|---|---|---|---|
| Free | NGN 0 | USD 0 | Free catalogue and single-track listening. No offline downloads |
| Premium Monthly | NGN 1,500 / month | USD 1.99 / month | Premium catalogue, premium features, and offline downloads while active |
| Premium Annual | NGN 12,000 / year | USD 10.99 / year | Same benefits, annual billing |
| Founding Lifetime | NGN 35,000 once, first 50 | USD 34.99 once, first 50 | Lifetime terms, including offline downloads. Not every future feature |

Paystack settles every payment in naira, including international cards. Users outside Nigeria see the dollar price, and the screen also shows the naira amount that will be collected.

### First 50 Lifetime slots

- Count only successful, server-verified purchases.
- Reserve a slot atomically, with a short expiry, then confirm it on verified payment.
- Release the slot if the payment fails or the reservation expires.
- After 50 completed qualifying purchases, close the offer and show �Founding Lifetime sold out.�
- A refund or chargeback removes the entitlement. Decide in the terms whether that slot reopens. Recommended default: the slot does not reopen, so the cap cannot be gamed.

---

## 6. Data model

Create these tables in order. Use UUID primary keys and `created_at` / `updated_at` on every table.

### Identity

- `profiles`: user id, first name, country code, onboarding intention, created_at
- `countries`: code, name, display_currency, charge_currency, local_web_methods boolean, card_networks
- `fx_rates`: base currency, quote currency, rate, fetched_at

Display currency and charge currency are read from `countries`, not typed onto the profile, so a country change cannot desync them.

### Catalogue

- `artist_profiles`: user id, display name, bio, status (`applicant`, `under_review`, `verified`, `rejected`, `restricted`, `suspended`)
- `artist_applications`: evidence paths, decision, reviewer, reason
- `tracks`: title, description, artist, duration, category, language, access tier (`free` or `premium`), status (`draft`, `in_review`, `published`, `rejected`, `taken_down`), loop_ok, download_ok
- `track_assets`: storage path, mime, bytes, checksum. Private bucket
- `track_tags`
- `categories`

### Library

- `favorites`
- `playlists`, `playlist_tracks`
- `listening_history`
- `downloads`: user, track, device, status
- `soundscapes`, `soundscape_layers`

### Billing

- `plans`
- `plan_prices`: plan, currency, amount_minor, interval
- `purchases`: user, plan, provider (`paystack`), reference, provider ids, currency, amount_minor, status, country code, raw event id
- `subscriptions`: user, plan, paystack subscription code, status, current period end
- `entitlements`: user, plan, source purchase, status (`pending`, `active`, `expired`, `cancelled`, `refunded`, `revoked`), starts_at, ends_at (null for active lifetime)
- `lifetime_slots`: sequence, user, purchase, status (`reserved`, `confirmed`, `released`), reserved_until
- `webhook_events`: provider event id, unique, processed_at

### Later tables

- `scheduled_sessions`
- `ai_sessions` with minimal metadata. Transcripts live in a restricted table with their own retention
- `reports`, `moderation_actions`, `admin_audit_logs`
- `creator_earnings`, `payouts` only after the payout model exists

### Access rules

- Users read and update their own profile.
- Published track metadata is readable by signed-in users and by the guest catalogue policy you choose. Asset paths are not public.
- Premium playback goes through an Edge Function that checks the entitlement, then returns a short-lived signed URL.
- Users read their own purchases and entitlements. They cannot insert them.
- Service role writes purchases, entitlements, and slots from webhooks only.
- Admins read moderation tables through admin policies. Support cannot read AI transcripts by default.

---

## 7. Paystack flow

```text
App or web                Edge Function                 Paystack
    |                          |                            |
    | POST /checkout/init      |                            |
    |------------------------->| create pending purchase    |
    |                          | reserve lifetime slot      |
    |                          | transaction/initialize     |
    |                          |--------------------------->|
    | authorization_url        |                            |
    |<-------------------------|                            |
    | user pays                |                            |
    |                          |  webhook charge.success    |
    |                          |<---------------------------|
    |                          | verify transaction         |
    |                          | grant entitlement once     |
    | poll or realtime status  |                            |
    |<-------------------------|                            |
```

Implementation rules:

- Initialize on the server with email, amount in minor units, charge currency, channels, metadata (`user_id`, `plan_id`, `purchase_id`), and a callback URL on the real domain.
- Verify the webhook signature (`x-paystack-signature`, HMAC SHA512 of the raw body with the secret key).
- Verify the transaction with Paystack�s verify endpoint as well. Trust the verified server result.
- Use the Paystack reference as an idempotency key so repeated webhooks do not grant Premium twice.
- Handle `pending`, `success`, `failed`, `abandoned`, refunds, and chargebacks.
- Keep the secret key in server environment variables only.
- Android uses the public key plus the `authorization_url` from your server. Do not build a custom card form that collects PAN, expiry, and CVV yourselves.

### Subscription lifecycle

- Create Paystack plans for monthly and annual in each charge currency.
- On renewal webhooks, extend `current_period_end` and keep the entitlement active.
- On cancellation, keep access until the period end, then expire it.
- On refund or chargeback, revoke access.
- Lifetime never goes through the subscription renewal job.

### Google Play note

Xoundra sells digital access. Google Play�s policy generally requires Play Billing for digital purchases inside a Play-distributed app unless a documented exception applies. This plan implements Paystack because that is the chosen provider. Before store submission, confirm the current Play policy and, if required, route Play-store purchases through an approved billing program. Keep checkout behind one server endpoint so the provider can change without rewriting the app.

---

## 8. Feature behavior to implement

### Catalogue

Each track stores title, description, creator, duration, category, tags, licensing evidence, loop suitability, status, access tier, download eligibility, and storage path.

A Free published track plays for guests and listeners. A Premium track plays only with an active entitlement. Tier changes write an audit row.

### Downloads

Offline download is a Premium feature for every track, including Free tracks. A Free user can stream a Free track and cannot save it for offline play. Encrypt or otherwise access-control files on device. When the entitlement ends, remove or disable the downloaded files.

### Studio

Add, remove, replace, and reorder layers. Per-layer volume, mute, master volume, loop, and fade. Save, rename, duplicate, delete. Offline playback of a mix works only when every layer is downloaded and still allowed.

### AI (later phase)

1. User opens the AI screen.
2. Greeting uses the first name: �Hello, [first name]. How are you feeling today?�
3. User types or speaks.
4. The server searches published tracks the user can access and returns track ids plus a short reason grounded in metadata.
5. The player starts only after playback is confirmed.
6. User can pause, stop, skip, change volume, or ask again.

Set a monthly budget and a per-user rate limit for speech and text. Define how long transcripts are kept, and let the user delete them.

### Admin

- Artist applications and appeals
- Track review, takedown, metadata, tier changes
- Entitlement lookup, refunds, lifetime counter
- Support actions with audit
- Listening and billing analytics

Privileged actions log actor, time, target, reason, and before/after values.

---

## 9. Security and legal pages before public launch

- Row Level Security on user, media, artist, entitlement, and admin data.
- Validate upload type, size, duration, and metadata.
- Rate-limit checkout initialization, sign-in, and AI.
- Privacy policy, terms, subscription terms, refund terms, Artist Agreement, takedown process, and an AI disclosure.
- Account deletion.
- Tests for webhook replay, duplicate callbacks, expired access, and shared Premium URLs.

Legal pages can start as drafts in the repo. Have them reviewed before production charges real cards.

---

## 10. Analytics worth collecting

| Area | Metrics |
|---|---|
| Activation | Sign-up completion, first play, time to first sound |
| Listening | Minutes, completion, playback failures |
| Retention | Day 1, Day 7, Day 30 |
| Monetization | Checkout start, verified purchase, renewal, refund |
| Catalogue | Search success, favourites, Free vs Premium plays |
| Reliability | Crash-free sessions, background playback success, download failures |

---

## 11. Build sequence

Follow `doc/EXECUTION_PLAN.md` for the ordered checklist. The technical sequence is:

1. Repo, environments, design tokens, Supabase project.
2. Schema, RLS, country and plan seed data.
3. Auth, profile, country, and currency display.
4. Audio prototype on a real Android device: single track, queue, background controls.
5. Catalogue read APIs and signed playback URLs.
6. Home, Explore, player, Library.
7. Paystack test checkout, webhooks, entitlements, first-50 slot logic.
8. Studio, saved mixes, sleep timer.
9. Scheduled listening.
10. AI companion.
11. Artist applications, upload, admin review.
12. Web checkout and account.
13. QA against the acceptance list, then production keys and store listing.

Do not start AI, payouts, or the marketing site before a real device can play audio in the background and a test payment can grant and revoke Premium.

---

## 12. Acceptance checks

- A Free track plays for a guest and for a listener. A Premium track is refused when the entitlement is missing or expired.
- Only verified artists can publish, and every tier change is audited.
- Lifetime confirmations never exceed 50 under two simultaneous test purchases.
- Pending, failed, refunded, and abandoned payments do not leave Premium active.
- Android checkout offers card only. Nigerian web checkout can offer card, Pay with Bank, bank transfer, and USSD. International web checkout offers card only.
- The profile shows the country currency. Checkout copy shows the charge currency whenever it differs.
- Monthly auto-renew is not started on Amex.
- Background playback survives lock screen and a phone-call interruption on a real device.
- A mix fades and loops with separate layer volumes.
- The sleep timer cancels cleanly.
- The AI starts only an existing track the user can play, and stops when asked.
- Webhook processing is idempotent.
- Account deletion removes or anonymises personal data according to the privacy policy.
