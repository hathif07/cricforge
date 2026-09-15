# CricForge — Unified Project

This is the **merged, bug-fixed, and re-themed** version of the five
independently-built CricForge modules:

1. `Login_module` — Authentication & User Management
2. `CricForge_Player_Team_Module` — Player & Team Management
3. `src` (Auction) — Player Auction
4. `CricForge` — Match Management & Ball-by-Ball Scoring Engine (+ real-time)
5. `files__2_` (Module 5) — Simulation, Statistics & Analytics

Everything now runs as **one backend** and **one frontend**, sharing a
single database and a single black-and-white visual design.

---

## Why a straight merge wasn't possible

Each module was built in isolation, with no shared contract between
teammates. Merging the five zips as-is would have crashed immediately or
silently misbehaved. The concrete problems found and fixed:

| # | Problem | Where | Fix |
|---|---|---|---|
| 1 | **Duplicate Mongoose models.** `Player`, `Team`, `Match`, and `Delivery` were each defined twice (once in the Player/Team module, once in Module 5; `Match`/`Delivery` also duplicated in the Match Engine module). Registering the same model name twice in one Node process throws `OverwriteModelError` and crashes the server. | Player/Team module + Module 5 + Match module | One canonical `Player`/`Team`/`Match`/`Delivery`/`Innings`/`Over` model set (`backend/models/`). Module 5's simulation-specific match/delivery representation is kept as its own clearly-named collections, `SimMatch`/`SimDelivery` (see the comment at the top of `SimMatch.js` for why — a simulated match and a full ball-by-ball-scored match are structurally different enough that forcing one schema on both would require rewriting the simulation engine). |
| 2 | **Auction module was frontend-only.** `AuctionModule.jsx` ran entirely on hardcoded mock arrays with **no backend calls at all**, and wasn't even imported by that module's own `App.jsx`. | `src` module | Built a real backend: `models/Auction.js`, `models/AuctionBid.js`, `controllers/auctionController.js`, `routes/auctionRoutes.js`. The frontend `Auction.jsx` page now calls these endpoints for creating auctions, bidding, and resolving sold/unsold players against real Team purses and Player records. |
| 3 | **Socket event name mismatch.** Frontend listened for camelCase events (`scoreUpdated`, `ballScored`, `overCompleted`, joined rooms via `joinMatch`); backend emitted/listened for snake_case (`score_updated`, `ball_scored`, `over_completed`, `join_match`). The names never matched, so **no live update was ever actually delivered** to spectators. | Match module (frontend `services/socket.ts` vs backend `sockets/matchSocket.js`) | Standardized both sides on the snake_case event contract from the project documentation (`match_started`, `ball_scored`, `wicket`, `boundary`, `over_completed`, `innings_completed`, `score_updated`, `match_completed`, `join_match`/`leave_match`). |
| 4 | **Wicketkeeper casing bug.** `matchService.setPlayingXI` checked `p.isWicketKeeper` (capital K) while the `MatchPlayer` schema field is `isWicketkeeper` (lowercase k). The check always compared against `undefined`, so a Playing XI with **zero** designated wicketkeepers was silently accepted. | Match module | Both model and service now consistently use `isWicketkeeper`. |
| 5 | **Broken team-comparison logic.** `startMatch()` determined the batting/bowling side by comparing `match.teamA.toString()` (an embedded `{id, name}` object — `.toString()` on a plain object yields `"[object Object]"`) against `match.toss.winner.toString()` (a plain string). This comparison could never actually match. | Match module | Rewritten to compare the actual `.id` fields (`match.teamA.id === match.toss.winner`). |
| 6 | **`Innings.isComplete` field silently dropped.** The scoring engine read/wrote `innings.isComplete` throughout, but the field was never declared in the Mongoose schema — Mongoose's default strict mode drops unknown fields on save, so it never persisted and always read back `undefined`/falsy. | Match module | Added `isComplete: Boolean` to the `Innings` schema. |
| 7 | **Validation logic defined but never called.** `deliveryValidator.validateBowlerEligibility` (no consecutive overs, max overs per bowler) and `validateBatterEligibility` (no batting again after dismissal) existed but were never invoked anywhere in the scoring flow. | Match module | Wired into `matchService.startNewOver()` and `matchService.setBatter()` respectively — both rules are now actually enforced. |
| 8 | **Circular `require('../server')` in controllers.** The scoring controller pulled the Socket.IO instance via a lazy require of the server file from inside each function. | Match module | Replaced with a small `sockets/ioInstance.js` singleton, set once from `server.js`. |
| 9 | **Mixed module systems.** The Auth module used ES Modules (`import`/`export`) while every other module used CommonJS (`require`). | Login module | Converted to CommonJS to match the rest of the codebase. |
| 10 | **No shared fields for cross-module features.** The original Player/Team schema had no rating fields (needed by Simulation) and no `basePrice` (needed by Auction); Team had no purse fields. | Player/Team module | Canonical `Player`/`Team` models extended with `battingRating`, `bowlingRating`, `basePrice`, `soldPrice`, `isSold` (Player) and `purseTotal`/`purseRemaining` (Team). |

Every fix above is also documented with an inline code comment at the
exact spot it applies, starting with `NOTE ON MERGE` or `BUG FIX`.

---

## Unified UI theme

All five modules previously had different, uncoordinated visual styles
(dark navy Tailwind, brown/gold inline styles, a separate gold/leather
auction theme, plain unstyled forms). Every page now shares one design
system: `frontend/src/theme.css` — a deliberately simple, high-contrast
**black & white** theme (serif display headings, clean sans body text,
black borders, flat drop-shadows, no color other than black/white/gray).

---

## Project structure

```
CricForge/
├── backend/
│   ├── server.js                 # single Express + Socket.IO entrypoint
│   ├── config/                   # db.js, jwt.js
│   ├── models/                   # canonical, deduplicated models
│   ├── controllers/, routes/     # one set per sub-module (auth, users,
│   │                                players, teams, auction, matches,
│   │                                scoring, module5)
│   ├── services/                 # scoringEngine, matchService, simulation,
│   │                                statistics, analytics
│   ├── sockets/                  # ioInstance.js, matchSocket.js
│   └── utils/                    # tokenUtils, cricketUtils, seed scripts
└── frontend/
    └── src/
        ├── theme.css              # shared black & white design system
        ├── context/AuthContext.jsx
        ├── services/api.js, socket.js
        ├── components/            # Layout, ProtectedRoute, RoleGuard, RoleBadge
        └── pages/                 # one page per screen across all modules
```

---

## Running it locally

### 1. Backend

```bash
cd backend
cp .env.example .env      # edit JWT secrets for anything beyond local demo use
npm install
npm run seed               # creates 5 demo users (one per role) + demo teams/players
npm run dev                 # starts on http://localhost:5000
```

If `MONGODB_URI` in `.env` is left as the local default and no MongoDB is
running, `config/db.js` automatically falls back to an in-memory MongoDB
instance (via `mongodb-memory-server`) so the app can still boot with zero
external setup — note that in-memory data does **not** persist across
restarts.

Demo accounts seeded by `npm run seed` (password for all: `Cricket@2026`):

| Email | Role |
|---|---|
| admin@cricforge.com | Admin |
| owner@cricforge.com | Team Owner |
| scorer@cricforge.com | Scorer |
| organizer@cricforge.com | Tournament Organizer |
| spectator@cricforge.com | Spectator |

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                 # starts on http://localhost:5173, proxies /api and /socket.io to :5000
```

Open `http://localhost:5173`, log in with any seeded account, and
everything — player/team management, the auction room, match creation
through live scoring, and the simulation/analytics dashboard — runs
against the one unified backend.

---

## Known, deliberate design trade-off

Module 5 (Simulation/Statistics/Analytics) keeps its **own** lightweight
match representation (`SimMatch`/`SimDelivery`) rather than being forced
onto the full production ball-by-ball engine's `Innings`/`Over` structure
used by manually-scored matches. Fully unifying the two would require
re-engineering the simulation engine to reason in terms of overs/innings
documents rather than whole-match arrays — worthwhile future work, but out
of scope for this integration pass. Both still reference the same
canonical `Player`/`Team` collections, so a player's rating, career stats,
and auction status are consistent everywhere.
