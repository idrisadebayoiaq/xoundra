# Xoundra Attraction & Growth Plan

Version 1.0 · 2 November 2026

Companion to `doc/IMPLEMENTATION_PLAN.md` and `doc/FEATURE_STRUCTURE.md`.  
This plan covers features and redesigns that make Xoundra habit-forming, shareable, and hard to ignore — without bloating the APK or turning the product into a noisy social feed.

**Principle:** deepen sessions and scenes. Do not add another inbox, badge farm, or second AI chat.

---

## 0. Already shipped (do not rebuild)

| Area | Status |
|---|---|
| Catalogue, Home, Explore, Library | Live |
| Mini-player + full player | Live (seek-bar crash fixed in 1.0.11) |
| Studio mixer, Sleep timer, AI Guide | Live |
| Favourites, playlists, downloads | Live |
| Artists, Premium, AdSense / AdMob unlocks | Live |
| Web + Android APK | Live |

---

## 1. Feature backlog (prioritised)

### Phase A — Ship first (habit + share)

| # | Feature | Why it matters | Surfaces | Effort | Notes |
|---|---|---|---|---|---|
| A1 | **Smart scenes** | One-tap Studio mixes with big covers (“Deep Work 45”, “3am storm”). Sells mixing without teaching it. | Home, Explore, Studio | M | Prebuilt layer sets + artwork; Premium can save edits |
| A2 | **Crossfade + continuous night** | Seamless queue / “keep similar” overnight. Stopping feels worse than leaving it on. | Player, Sleep | M | Crossfade length setting; battery-aware on Android |
| A3 | **Share listening cards** | Organic growth: cover + title + “Listening on Xoundra” + optional QR to web. | Player, Library | S | Static image first; short loop later |
| A4 | **Soft rituals + streak** | Morning / night wind-down sequences. Streak = nights completed, not points spam. | Home, Sleep, notifications | M | Ties into Points (§2) |

### Phase B — Presence outside the app

| # | Feature | Why it matters | Surfaces | Effort | Notes |
|---|---|---|---|---|---|
| B1 | **Home-screen widget + lock quick play** | Ambient apps live outside the app. One tap “Tonight’s sound”. | Android widget, notification | M | Keep APK lean: one medium widget only |
| B2 | **Web focus surface / PWA** | Desktop daytime product; installable mobile web. | Web | M | Full-bleed player, hide chrome “Focus mode”, Add to Home Screen |

### Phase C — Differentiation

| # | Feature | Why it matters | Surfaces | Effort | Notes |
|---|---|---|---|---|---|
| C1 | **Weather / place-aware hint** | Soft: “Raining near you — open Rain Room.” Optional, privacy-clear. | Home | M | Opt-in location or coarse IP weather; never required |
| C2 | **Breath / body sync layer** | Optional breathing cue under any sound. Session, not playlist. | Player, Guide, Sleep | M | Toggle; Guide can start a 4-7-8 or box-breath bed |
| C3 | **Artist sessions** | Timed journeys (20-min focus, 60-min sleep story + sound). Premium drops. | Explore, Artist page | M | Catalogue type `session` with chapters |
| C4 | **Personal sound DNA** | Weekly “You’re a night-rain + soft pads person” mix. | Home, Profile | M | From listen history; regenerates weekly |

### Phase D — Later / optional

| # | Feature | Why it matters | Surfaces | Effort | Notes |
|---|---|---|---|---|---|
| D1 | **Collaborative scenes** | Two accounts sync one mix (“same storm, different cities”). | Studio, share link | L | Nice emotionally; ship after A–C |
| D2 | **Offline packs by intent** | “Flight pack”, “Exam week”. Free: one pack via ads; Premium: unlimited. | Downloads, Plans | M | Bundled scene + tracks |
| D3 | **Calendar / focus blocks** | “Focus until 11:30” auto-starts a scene. | Sleep / new Focus | M | Extends sleep-timer UX |

---

## 2. Streaks & points (new)

### Goal

Make return visits feel rewarding **without** turning Xoundra into a noisy game. Calm product, quiet rewards.

### Streak (soft)

| Rule | Detail |
|---|---|
| What counts | Completing a **ritual** or **15+ continuous minutes** of listening in a calendar day (local time) |
| Display | “4 nights in a row” / “Focus streak: 3 days” — never aggressive red badges |
| Break | Miss a day → streak resets to 0; optional 1× weekly “streak freeze” for Premium |
| Cap noise | At most one gentle reminder push per day if streak is at risk |

### Points (“Quiet points”)

Earn slowly. Spend on calm unlocks — never on pay-to-win audio quality.

#### Earn

| Action | Points (suggested) | Cap / day |
|---|---|---|
| Complete a ritual | 10 | 2 rituals |
| 15 min continuous listen | 5 | 20 |
| Finish a Guide session that starts playback | 8 | 2 |
| 7-day streak milestone | 40 | once / week |
| Share a listening card (confirmed share sheet) | 5 | 1 |
| Watch rewarded ads (existing free path) | 15 | align with current ad costs |

Premium users still earn (habit), but get better spend options.

#### Spend (what points are *for*)

Pick a small set. Do not invent a marketplace.

| Spend | Cost (suggested) | Who | Why it fits |
|---|---|---|---|
| **1 download credit** | 40 | Free | Bridges ads ↔ downloads without cash |
| **Unlock 1 scene for 24h** | 30 | Free | Try Premium-feeling mixes |
| **Studio unlock 24h** | 50 | Free | Same spirit as current ad unlocks |
| **Sleep / ritual pack 24h** | 35 | Free | Extends sleep gate |
| **Streak freeze (1 day)** | 60 | Free + Premium | Soft insurance |
| **Exclusive scene cover / name colour** | 80 | Everyone | Cosmetic, zero content entitlement risk |
| **Tip an artist (points → artist pool)** | 100 | Everyone | Later; needs clear conversion rules |
| **Discount next Premium month** (e.g. 10%) | 500 | Free → convert | Big sink; drives upgrade |

**Do not spend points on:** removing all ads forever, unlocking the whole catalogue permanently, or cash withdrawal.

#### UX

- Profile row: **Quiet points** + streak under the name.
- Player / ritual end: one-line toast (“+10 · 4-night streak”), not a modal.
- Spend sheet: short list, same visual language as Plans / ad unlock modal.

#### Implementation sketch

- Table `user_rewards` (`user_id`, `points`, `streak_days`, `streak_at`, `freeze_tokens`).
- Ledger `point_events` (earn/spend, reason, delta, created_at) for audit.
- Client: soft counters in AppState; server validates spends that grant entitlements.
- Align spend unlocks with existing `AdState` / unlock windows so Premium and ads stay coherent.

---

## 3. Extra features (keep the list short)

Only three additions beyond §1–2 — if something else appears, park it.

| # | Feature | One-liner |
|---|---|---|
| X1 | **Fade-out alarm / gentle wake** | Alarm that rises through a chosen scene instead of a harsh tone. |
| X2 | **“Same energy” radio** | Endless similar sounds from the track you’re on (powers night continuous play). |
| X3 | **Guest → account keep-listening** | After signup, restore the exact scene/position so web/app conversion doesn’t break flow. |

---

## 4. Redesign opportunities (app + web)

Not a full rebrand — targeted polish where the product currently feels like a toolkit instead of a place to stay.

### 4.1 First viewport (Home)

| Today | Direction |
|---|---|
| Shelves + cards compete | One hero: **Tonight / Now** scene or Continue, then one shelf |
| Brand secondary in chrome | Brand or ritual name as the calm hero signal on web landing and empty Home |
| Download marks removed from home cards (good) | Keep list density for Explore/Library only |

### 4.2 Player

| Today | Direction |
|---|---|
| Controls-heavy full player | Cover-dominant, fewer icons; sleep / share / points toast secondary |
| Mini-player utilitarian | Slight glass/progress; art + title + play/close only |
| Desktop shell player | Web **Focus mode**: max art, hide nav, keyboard space to play/pause |

### 4.3 Studio

| Today | Direction |
|---|---|
| Mixer-first (intimidating) | **Scenes first**, “Edit mix” second |
| Empty state weak | Show 4–6 signature scenes with covers before the layer list |

### 4.4 Sleep / Guide

| Today | Direction |
|---|---|
| Separate tools in the menu | One **Evening** path: ritual → Guide optional → sleep timer |
| Guide chat-like | Session cards (“Start rain focus”) above free chat |

### 4.5 Auth & onboarding

| Today | Direction |
|---|---|
| Sign-in / sign-up functional (password show/hide added) | Calmer illustration or full-bleed quiet art; one intention question again |
| Onboarding tips | End on a **playable** free track or scene, not a settings dump |

### 4.6 Web marketing / download

| Today | Direction |
|---|---|
| App-shell web | Lightweight marketing landing for logged-out visitors: brand, one line, listen sample, APK / open app CTA |
| Download button | Keep direct APK link current after every EAS preview build |

### 4.7 Visual system (guardrails)

- Keep existing mint / dark language; avoid purple-glow or generic AI cream themes.
- Prefer motion: scene cover breathe, progress fade, ritual start crossfade — 2–3 intentional motions, not confetti.
- Cards only where they aid interaction (scenes, plans, spend sheet).

---

## 5. Suggested build order

```
1. A1 Scenes (catalogue + Home/Studio entry)
2. A2 Crossfade + continuous night
3. A4 Rituals + streak (points earn starts here)
4. Points spend v1 (download credit + 24h scene/studio unlock)
5. A3 Share cards
6. B1 Widget (Android)
7. B2 Web focus mode + PWA bit
8. Redesign pass: Home hero, Studio scenes-first, Player calm
9. C2 Breath layer · C4 Sound DNA · C1 Weather hint
10. C3 Artist sessions · D2 Offline packs
11. D1 Collaborative · D3 Focus blocks · X1 Gentle wake
```

---

## 6. Success metrics (lightweight)

| Signal | Target idea |
|---|---|
| D1 → D7 return | Lift after rituals + streak ship |
| Share card opens | Track link hits / installs |
| Scene starts / user / week | Primary engagement KPI |
| Points earn → spend rate | 20–40% of earners spend ≥1× / month |
| Free → Premium | Scene / Studio point unlocks as a trial bridge |
| APK size | Stay arm64-only + minify; no huge local audio packs in the binary |

---

## 7. Out of scope (explicit)

- Social feed, comments, DMs
- Leaderboards that shame quiet users
- Crypto / cash-out points
- Second AI product surface beside Guide
- Rebuilding the whole design system in one go

---

## 8. Open decisions (resolve before coding §2)

1. Brand name for points: **Quiet points** vs **Pulse** vs **Stills**?
2. First spend SKU: download credit only, or download + 24h scene?
3. Do streak freezes cost points, Premium perk, or both?
4. Artist tip-with-points: ship in v1 of points or park until creator payouts are clearer?

When these are decided, break Phase A into tickets against `app/` + Supabase migrations and keep this file as the source of truth for attraction work.
