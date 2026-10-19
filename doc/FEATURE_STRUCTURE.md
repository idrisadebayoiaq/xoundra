# Xoundra feature structure

Version 1.2 · 18 October 2026

This is the structure to build. The starter sounds are in `catalog/catalogue.json`. The step order is still `doc/EXECUTION_PLAN.md`.

## 1. App shell

Android first. Five tabs, plus a mini-player that sits above them on every tab.

| Tab | Who sees it | Job |
|---|---|---|
| Home | Everyone | Continue, time-of-day shelf, starter picks |
| Explore | Everyone | Search, categories, Free filter |
| Studio | Everyone can open it. Saving a mix needs Premium | Presets and the mixer |
| Library | Signed-in users | Favourites, playlists, history, downloads, soundscapes |
| Profile | Everyone | Country, currencies, plan, settings. Artists later see their dashboard here |

Guests can play Free tracks. An account is required to save, download, mix, or pay.

## 2. Listener flow

1. Intention: Sleep, Focus, Relax, or Meditate. This only changes the first Home shelf.
2. Country. Profile currency comes from that country.
3. Email account.
4. Home opens on a Free track that can play immediately. For this catalogue, start with **Steady Rain** or **West African Night**.

### Home shelves, in this order

- Continue
- For this time of day (night leans Sleep and Rain, day leans Focus and Forest)
- Starter sounds from tracks marked `shelf: home` in the catalogue
- Your mixes, once any exist

### Explore

Categories that match the starter catalogue:

| Category | What belongs there |
|---|---|
| Rain | Rain and thunder |
| Ocean | Surf and underwater |
| Forest | Dawn, dusk, and forest beds |
| Nature | Rivers, gardens, birds |
| Ambient | Wind and ice |
| Focus | Rapids and steady noise beds |
| Meditation | Deep water and still drones |
| Sleep | A filter, not a separate folder. Any home track tagged `sleep` |

Search uses title and tags. A mood word such as “rain” or “night” must hit those tags.

Tracks marked `shelf: hold` stay out of Home and Explore until you review them. They are short foley, motors, traffic, dogs, or clips whose names were inferred. They remain in `catalog/audio` so nothing from the zip was thrown away.

### Player

- Mini-player: art, title, play, pause. Tap opens the full player.
- Full player: art, seek, loop, volume, queue, sleep timer, download when allowed.
- One playback manager with three modes: one track, a playlist, and a Premium mix.

### Library

Favourites, playlists, history, downloads, and saved soundscapes. Offline download is Premium only, including Free tracks. History is recorded only for signed-in users.

### Profile

- Country
- Display currency (the country’s currency)
- Plan status is only Free or Premium. Prices stay on the Plans screen.
- Plan status: Free, Premium Monthly, Premium Annual, or Founding Lifetime
- Settings, privacy, support

## 3. Premium features

Free users get single-track listening of Free catalogue audio.

Premium adds:

| Feature | First version |
|---|---|
| Studio | Four presets: Rainy Evening, Deep Focus, Forest Calm, Night Ocean. Built only from `loop_ok` starter tracks |
| Saved mixes | Track ids, order, volume, mute, loop, fade. Not copied audio files |
| Sleep timer | Duration, end of track, or fade out. Cancel stays visible |
| Scheduled listening | After the timer works. The screen must say Android may not start the sound if the app was force-stopped |
| AI companion | OpenRouter, catalogue only |

A mix re-checks every layer at play time. If one layer is locked, name that layer.

## 4. AI

The companion is a sound guide. It is not a therapist.

| Setting | Value |
|---|---|
| Provider | OpenRouter, called only from the server |
| First model | `google/gemini-2.5-flash-lite` |
| Fallback | `openai/gpt-4o-mini` if replies mention a track that is not in the list |
| Input | The user’s sentence plus the tracks that user is allowed to play |
| Output | A short reply and one or more track ids from that list |

The lite model was checked with a three-track list. It returned JSON and chose `rain-on-the-trees`. Voice input comes after text works. The orb state must match the real microphone and player.

## 5. Payments

Paystack is the provider. These two plans were created on the live Paystack account:

| Plan | Nigeria | Other countries | Paystack code |
|---|---|---|---|
| Premium Monthly | ₦1,500 | $1.99 | `PLN_v9kai01dhpq734y` |
| Premium Annual | ₦12,000 | $10.99 | `PLN_wyfygk070h6ifgv` |
| Founding Lifetime | ₦35,000 once | $34.99 once | One-time naira charge, first 50 purchases |

Paystack accepts international cards and settles every payment in naira. A user outside Nigeria sees the dollar price, and the plan screen also shows the naira amount Paystack will collect.

Checkout channels:

| Surface | Methods |
|---|---|
| Android | Card only: Visa, Mastercard, Verve, Amex |
| Web, Nigeria | Card, Pay with Bank, bank transfer, USSD |
| Web, other countries | Card only |

Verve is shown for Nigeria. Other countries see Visa, Mastercard, and Amex. Monthly and annual renewal stays on Visa, Mastercard, or Verve. Amex can pay the one-time Lifetime charge only.

The app shows “Confirming payment” until the server verifies the Paystack transaction. The plan codes above do not grant Premium by themselves.

## 6. What is not in the first build

- Artist upload and payouts
- Admin console
- Light theme
- Playback speed
- Web Studio and web AI
- Publishing the starter archive to the store

The zip is an internal catalogue. Its file notes match a professional sound-effects library. Use it to build and test. Replace it, or confirm the licence, before a public release.

## 7. Screen list to create

1. Splash
2. Intention
3. Country
4. Sign in / create account
5. Home
6. Explore and search
7. Track page
8. Mini-player and full player
9. Studio and mix editor
10. Library
11. Profile, country, and plan
12. Checkout status
13. AI screen, after playback and payments work
