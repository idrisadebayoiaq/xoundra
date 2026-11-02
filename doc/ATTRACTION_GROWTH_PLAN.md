# Xoundra Attraction & Growth Plan

Version 1.1 · 2 November 2026

Companion to `doc/IMPLEMENTATION_PLAN.md` and `doc/FEATURE_STRUCTURE.md`.  
Source of truth for habit features, Quiet points, screen redesign, and phased delivery.

**Product principle:** deepen **sessions and scenes**. Do not add another inbox, badge farm, or second AI chat.

**Design principle:** one job per screen; brand and listening first; tools second.

---

## 0. Already shipped (do not rebuild)

| Area | Status |
|---|---|
| Catalogue, Home, Explore, Library | Live |
| Mini-player + full player | Live (seek-bar crash fixed in 1.0.11) |
| Studio mixer, Sleep timer, AI Guide | Live |
| Favourites, playlists, downloads | Live |
| Artists, Premium, AdSense / AdMob unlocks | Live |
| Web + Android APK (arm64, minify/shrink) | Live |
| Password show/hide on sign-in / sign-up | Live |
| Home cards without download icons | Live |

---

## 1. Information architecture — how to restructure

### 1.1 Problem with today

| Pattern today | Cost |
|---|---|
| **5 equal tabs** (Home, Explore, Studio, Guide, Library) | Everything feels equally important; listening competes with tools |
| **Guide as a primary tab** | Chat UI dominates attention; most users want sound, not conversation |
| **Sleep buried in hamburger** | Core night use-case is secondary |
| **Studio opens as a mixer** | Intimidating; empty layer list before value |
| **Home = many shelves** | First viewport has no single composition; Continue / Trending / For you fight |
| **Menu duplicates tabs** | Studio + Guide in both tab bar and side menu |

### 1.2 Target structure (recommended)

Keep five routes under the hood if needed, but **present four listening-first destinations** on mobile:

| Tab / entry | Job (one sentence) | What moves here |
|---|---|---|
| **Home** | Start listening in under 5 seconds | Tonight/Now hero, Continue, streak chip, 1–2 shelves max above the fold |
| **Discover** (rename Explore) | Find sounds, scenes, artists, sessions | Search, moods, scenes rail, artists, sessions |
| **Library** | Your saved world | Liked, playlists, downloads, offline packs, history |
| **You** (Profile, visible in tab **or** keep avatar — pick one, not both competing) | Identity, plan, points, settings, artist tools | Quiet points, streak, Premium, settings |

**Tools become modes, not peers of Home:**

| Tool | Where it lives after restructure |
|---|---|
| **Scenes / Studio** | Discover “Scenes” + Home hero “Edit in Studio”; Studio screen becomes **Scenes gallery → Edit mix** |
| **Evening / Sleep** | Home night CTA + dedicated **Evening** flow (ritual → timer → optional Guide beat) — not only a menu item |
| **Guide** | Entry cards on Home/Evening/Discover (“Ask Guide to pick”); full Guide screen stays but **demote from default tab** to stack route *or* keep tab only if usage data says otherwise |
| **Downloads** | Library section (already natural); remove from side menu once Library is obvious |

**Recommended tab bar (mobile):**

```
Home · Discover · Library · You
```

Studio and Guide open from Home/Discover/Evening as stack screens.  
Mini-player stays above the tab bar everywhere.

**If demoting Guide/Studio tabs feels too aggressive for v1:** keep Studio as the 3rd tab but change its **first paint** to Scenes (see §3.4). Still demote Guide from the tab bar to a stack entry.

### 1.3 Navigation map (after)

```
Welcome → Sign in / Sign up → Confirm → Listen tip → Sound picks
        ↓
   [Tabs]
     Home ──────────► Player (expand mini)
       │                │
       ├ Evening ───────┼─► ritual / sleep timer
       ├ Scene play ────┘
       └ Guide (optional)
     Discover ─► Browse mood · Scene detail · Artist · Session
     Library ─► Liked · Playlist · Downloads · Packs
     You ─► Settings · Plans · Points spend · Artist dashboard
   [Global]
     Mini-player · Notifications · Plans / Pay · Support / Legal
```

### 1.4 Web vs app roles

| Surface | Job |
|---|---|
| **Android** | Bedside + pocket: rituals, sleep, widget, downloads, offline |
| **Web (signed-in)** | Daytime focus: wide player, Focus mode, Studio editing, catalogue |
| **Web (signed-out)** | Brand landing: one hero listen + CTA (open app / APK / sign in) — not the full five-tab shell first |

---

## 2. Feature backlog (prioritised)

### Phase A — Habit + share

| # | Feature | Why | Surfaces | Effort | Notes |
|---|---|---|---|---|---|
| A1 | **Smart scenes** | One-tap mixes with covers | Home, Discover, Studio | M | Prebuilt layers; Premium can fork/edit |
| A2 | **Crossfade + continuous night** | Overnight stay | Player, Evening | M | “Same energy” queue; battery-aware |
| A3 | **Share listening cards** | Organic growth | Player, Library | S | Image + optional web QR |
| A4 | **Soft rituals + streak** | Daily return | Home, Evening | M | Ties to Quiet points (§4) |

### Phase B — Presence outside the app

| # | Feature | Why | Surfaces | Effort | Notes |
|---|---|---|---|---|---|
| B1 | **Widget + lock quick play** | One-tap Tonight | Android | M | One medium widget only (APK size) |
| B2 | **Web Focus mode + PWA install** | Desktop daytime product | Web | M | Hide chrome; Add to Home Screen |

### Phase C — Differentiation

| # | Feature | Why | Surfaces | Effort | Notes |
|---|---|---|---|---|---|
| C1 | **Weather / place hint** | Magical, optional | Home | M | Opt-in; never required |
| C2 | **Breath / body sync layer** | Session feel | Player, Guide, Evening | M | Toggle under any sound |
| C3 | **Artist sessions** | Timed journeys | Discover, Artist | M | Catalogue type `session` |
| C4 | **Personal sound DNA** | Weekly custom mix | Home, You | M | From history |

### Phase D — Later

| # | Feature | Why | Surfaces | Effort | Notes |
|---|---|---|---|---|---|
| D1 | **Collaborative scenes** | Emotional sticky | Studio, share link | L | After A–C |
| D2 | **Offline packs by intent** | Travel / exams | Library, Plans | M | Free: 1 via ads; Premium: more |
| D3 | **Calendar / focus blocks** | “Until 11:30” | Evening / Focus | M | Extends timer UX |

### Extra (capped)

| # | Feature | One-liner |
|---|---|---|
| X1 | **Gentle wake** | Alarm rises through a scene |
| X2 | **Same-energy radio** | Endless similar sounds (feeds A2) |
| X3 | **Keep-listening after signup** | Restore scene/position post-auth |

---

## 3. Screen-by-screen redesign

### 3.0 Layout rules (every screen)

1. **One job** — one headline, one primary action above the fold.  
2. **Listening > tooling** — if a control doesn’t start or shape sound, it goes secondary.  
3. **No card chrome by default** — cards only for scenes, plans, spend, selectable packs.  
4. **Motion budget** — scene cover breathe, progress fade, ritual crossfade (2–3 total).  
5. **Keep mint / existing dark language** — no purple-glow or cream-serif AI defaults.

---

### 3.1 Home — “Start now”

**Today:** greeting + menu + many shelves + followed artists + most played → crowded first paint.

**Restructure:**

```
[ menu ]   Good evening, Ada          [ bell ] [ avatar / streak ]
────────────────────────────────────
 HERO — Tonight / Continue / Scene
   large cover (edge-aware, not inset card)
   title + one line
   [ Play ]  [ Evening ]   optional [ Ask Guide ]
────────────────────────────────────
 Quiet strip: streak · points (tap → spend) · weather hint (if on)
────────────────────────────────────
 One shelf only above fold: "Because you listen at night" OR Continue row
────────────────────────────────────
 Below fold (scroll): Scenes · Artists you follow · More for you
```

| Change | Detail |
|---|---|
| Hero replaces first three shelves | Single composition; brand/ritual name can sit in hero title at night (“Evening on Xoundra”) |
| Artists / Most played | Move below fold or into Discover |
| Side menu | Slim: Evening, Downloads (until Library owns it), Support — not Studio/Guide duplicates |
| Offline | Keep banner; hero swaps to last download / offline pack |

---

### 3.2 Discover (Explore) — “Find”

**Today:** search + moods + lists; no scenes language.

**Restructure:**

```
Search
Mood chips (Sleep · Focus · Rain · …)
Scenes (horizontal covers)     ← new primary rail
Sessions (if any)
Browse all / categories
Artists
```

Studio entry: tapping a scene **plays**; long-press or “Edit” opens Studio with layers loaded.

---

### 3.3 Library — “Yours”

**Today:** liked, playlists, grid/list — solid. Extend, don’t reinvent.

**Restructure sections (order):**

1. Liked  
2. Playlists  
3. Downloads / Offline packs  
4. History (collapsible)  
5. Your saved scenes / mixes  

Downloads leave the hamburger once this section is obvious. Share / download actions stay on **rows**, not Home tiles.

---

### 3.4 Studio — “Scenes first”

**Today:** mixer-first empty state.

**Restructure two modes on one route:**

| Mode | UI |
|---|---|
| **Gallery** (default) | 4–6 signature scenes + “Your mixes”; big covers; Play / Edit |
| **Edit** | Current layer list + LevelBars + mute/remove — only after Edit or “Custom mix” |

Empty custom mix: show “Start from a scene” before blank layers.

---

### 3.5 Evening (Sleep + ritual) — new primary flow

**Today:** `/sleep` in menu; timer disconnected from Home night use.

**Restructure as a stack flow** (from Home hero or menu):

```
1. Choose ritual / scene (or Continue)
2. Duration (15 / 30 / 45 / 60 / end of track)
3. Optional: breath layer · Guide one-line suggestion
4. Start → player with sleep end · streak credit on complete
```

Sleep timer controls can remain on the full player as a secondary chip; Evening is how most people **start** the night.

---

### 3.6 Guide — “Suggest, then play”

**Today:** full-tab chat.

**Restructure:**

```
Top: 3 session cards (e.g. “Rain for focus”, “Wind down”, “Can’t sleep”)
Then: composer / chat (existing)
Playback strip when a pick is playing
```

IA: prefer **stack route** from Home/Evening/Discover. If tab stays temporarily, first paint must be session cards, not an empty thread.

---

### 3.7 Player + mini-player

**Full player**

```
chevron-down          close
      [ large artwork ]
 title
 category · artist
 stats / output (muted)
 ♡  bookmark  ···(menu: download, playlist, studio, share)
 timeline
 shuffle  prev  play  next  repeat
 sleep chip · share · breath toggle (later)
```

Fewer equal-weight icons; share + sleep as text chips under transport.

**Mini-player:** art · title · artist · play · close. Progress hairline. No extra chrome.

**Web desktop shell:** Focus mode — hide sidebar/nav, max art, Space = play/pause, Esc = exit Focus.

---

### 3.8 You (Profile)

```
Avatar · name · country
Streak · Quiet points [ Spend ]
Plan (Free / Premium) → Plans
Artist (if verified) → dashboard
Settings · Support · Legal
Sign out
```

Points spend opens a **sheet** (same language as ad-unlock / Plans), not a new tab.

---

### 3.9 Auth & onboarding

| Screen | Direction |
|---|---|
| Welcome | Full-bleed quiet art + **Xoundra** as hero + one line + Sign in / Create |
| Sign in / Sign up | Keep fields; show/hide password (done); soft art header optional |
| Listen tip → Sound picks | End on **Play** a free track/scene — never dump into settings |
| Confirm email | Unchanged flow; calm copy |

---

### 3.10 Plans / Pay / Ads

- Plans: one column, clear Free vs Premium; point-discount line when eligible.  
- Ad unlock + point spend: **one sheet pattern** (purpose, cost, Watch / Spend / Not now).  
- Never put banners in the player hero or Evening start step.

---

### 3.11 Web signed-out landing

Separate from the app shell:

```
Brand (hero) · one sentence · [ Listen sample ] [ Get the app ] [ Sign in ]
```

Sample plays a free track without forcing the five-tab UI first. Signed-in users go straight to Home / Focus.

---

## 4. Streaks & Quiet points

### Goal

Reward return visits without a noisy game layer.

### Streak (soft)

| Rule | Detail |
|---|---|
| Counts | Complete a **ritual** or **15+ continuous minutes** listening (local calendar day) |
| Display | “4 nights in a row” — Home quiet strip + You |
| Break | Miss a day → 0; optional streak freeze |
| Push | Max one gentle “streak at risk” reminder / day |

### Earn

| Action | Points | Cap / day |
|---|---|---|
| Complete ritual | 10 | 2 |
| 15 min continuous listen | 5 | 20 |
| Guide session that starts playback | 8 | 2 |
| 7-day streak milestone | 40 | 1 / week |
| Share listening card | 5 | 1 |
| Rewarded ad (aligned with existing unlocks) | 15 | match ad economy |

### Spend

| Spend | Cost | Who |
|---|---|---|
| 1 download credit | 40 | Free |
| Unlock 1 scene 24h | 30 | Free |
| Studio unlock 24h | 50 | Free |
| Sleep / ritual pack 24h | 35 | Free |
| Streak freeze 1 day | 60 | Free + Premium |
| Cosmetic scene accent | 80 | Everyone |
| Tip artist (later) | 100 | Everyone |
| ~10% off next Premium month | 500 | Convert |

**Never:** permanent ad-free forever, whole catalogue unlock, cash out.

### Data

- `user_rewards` — points, streak_days, streak_at, freeze_tokens  
- `point_events` — ledger  
- Server validates entitlement spends; align windows with existing `AdState` unlocks  

---

## 5. Visual system & motion

- Keep current mint / canvas / card tokens; extend for **scene covers** and **quiet strip**.  
- Hero artwork: full-bleed or large edge-to-edge on Home/Evening/Player — not small inset tiles.  
- Motion: (1) hero breathe, (2) mini-player progress, (3) ritual start crossfade.  
- Typography: keep Outfit; hero titles one step larger only on Home/Evening/Welcome.

---

## 6. Build order

```
IA + Home hero + Studio scenes-first     ← redesign foundation
A1 Scenes data + rails
A2 Crossfade + continuous / same-energy
A4 Rituals + Evening flow + streak
Quiet points earn + spend v1
A3 Share cards
Demote Guide tab / session-cards first paint
B1 Widget
B2 Web Focus + signed-out landing
C2 Breath · C4 DNA · C1 Weather
C3 Sessions · D2 Packs
D1 Collab · D3 Focus blocks · X1 Gentle wake
```

Redesign and A1 should land together so Scenes have a home on Home/Discover/Studio.

---

## 7. Success metrics

| Signal | Intent |
|---|---|
| Time-to-first-play (cold open) | Down after Home hero |
| D1 → D7 return | Up after Evening + streak |
| Scene starts / user / week | Primary engagement |
| Guide opens that result in play | Quality > raw Guide opens |
| Points earn → spend | 20–40% of earners spend monthly |
| Free → Premium | Scene/Studio unlocks as trial bridge |
| APK size | Stay arm64 + minify; no fat local packs |

---

## 8. Out of scope

- Social feed, comments, DMs, shaming leaderboards  
- Crypto / cash-out points  
- Second AI product beside Guide  
- Full design-system rewrite in one PR  
- More than one Android widget family at first  

---

## 9. Open decisions

1. **Tab bar:** `Home · Discover · Library · You` (recommended) vs keep Studio as 3rd tab with Scenes-first paint?  
2. **Guide:** stack-only vs stay in tab with session-card first paint?  
3. **Points name:** Quiet points vs Pulse vs Stills?  
4. **First spend SKU:** download credit only, or download + 24h scene?  
5. **Streak freeze:** points, Premium perk, or both?  
6. **Artist tips with points:** v1 or park?

---

## 10. How this relates to older docs

| Doc | Role |
|---|---|
| `IMPLEMENTATION_PLAN.md` | Original product/build spec (payments, roles, platforms) |
| `FEATURE_STRUCTURE.md` | Early feature structure |
| `EXECUTION_PLAN.md` | Historical step order |
| **This file** | Attraction features, points, **and screen redesign/IA** going forward |

When IA decisions in §9 are locked, implement redesign foundation + Phase A against `app/` and Supabase, and treat this document as the checklist.
