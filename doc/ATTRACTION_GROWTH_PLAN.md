# Xoundra Attraction & Growth Plan

Version 1.2 · 2 November 2026

Companion to `doc/IMPLEMENTATION_PLAN.md` and `doc/FEATURE_STRUCTURE.md`.  
Source of truth for habit features, Quiet points, screen redesign, and phased delivery.

**Product principle:** deepen **sessions and scenes**. Do not add another inbox, badge farm, or second AI chat.

**Design principle:** one job per screen; brand and listening first; tools second.

---

## Locked decisions (v1.2)

| Decision | Choice |
|---|---|
| Points name | **Quiet points** |
| Point spends (only two) | (1) **Download credit** — 40 pts · (2) **Studio 24h** — 50 pts |
| Tab bar | `Home · Discover · Studio · Library · You` |
| Guide | Stack route `/guide` (not a tab); session cards first |
| Studio | Tab kept; **Scenes-first** gallery, then Edit mixer |

---

## 0. Already shipped

| Area | Status |
|---|---|
| Catalogue, Home, Explore, Library | Live |
| Mini-player + full player | Live |
| Studio mixer, Sleep timer, AI Guide | Live |
| Favourites, playlists, downloads | Live |
| Artists, Premium, AdSense / AdMob | Live |
| Web + Android APK | Live |
| Password show/hide | Live |
| Home cards without download icons | Live |

---

## Implementation waves

| Wave | Scope | Status |
|---|---|---|
| 1 | IA + Home hero + Scenes gallery/rails | Done |
| 2 | Evening + streak + Quiet points (2 spends) | Done |
| 3 | Continuous play + share + Guide stack | Done |
| 4 | Widget + PWA + Focus mode + landing | Done |
| 5 | Weather + breath + DNA + sessions | Done |
| 6 | Packs + collab + focus blocks + gentle wake | Done |

---

## Feature backlog

### Phase A — Habit + share

| # | Feature | Notes |
|---|---|---|
| A1 | Smart scenes | Promote `studioPresets` + artwork; gallery + rails |
| A2 | Crossfade + continuous night | Same-energy queue |
| A3 | Share listening cards | Player + menu |
| A4 | Soft rituals + streak | Evening flow |

### Phase B–D / Extra

Widgets, PWA, Focus mode, weather, breath, sound DNA, artist sessions, offline packs, collaborative scenes, focus blocks, gentle wake — see waves 4–6.

---

## Quiet points (only two spends)

### Earn

| Action | Points | Cap / day |
|---|---|---|
| Complete ritual | 10 | 2 |
| 15 min continuous listen | 5 | 20 |
| 7-day streak milestone | 40 | 1 / week |

### Spend (v1 — only these)

| Spend | Cost | Effect |
|---|---|---|
| **1 download credit** | 40 | One `saveDownload` without ads |
| **Studio unlock 24h** | 50 | Sets `studioUntil` (same as ad unlock window) |

No streak freezes, cosmetics, tips, or Premium discounts in v1.

### Streak

Counts on ritual complete or 15+ continuous minutes listening per local day. Shown on Home quiet strip + You.

---

## Target IA

```
Home · Discover · Studio · Library · You
Guide → /guide (stack)
Evening → /sleep (stack, ritual flow)
```

Home: hero → quiet strip → one shelf → scenes / artists below fold.  
Studio: Scenes gallery → Edit mix.  
Discover: search → moods → scenes → sessions → browse.

---

## Out of scope

Social feed, cash-out points, second AI surface, full design-system rewrite.
