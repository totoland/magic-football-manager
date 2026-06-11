# Football Manager — Lineup & Substitution Planner

A mobile/tablet-first, **offline-capable PWA** for planning football lineups and
substitutions across halves, with fair-playtime tracking. No backend, no login,
no build step — open `index.html` and it runs.

Built from the Claude Design handoff (bold/sporty, dark-first, vertical pitch,
pointer-based drag) and the v2.0 PRD. Business logic follows the PRD exactly.

---

## Run it

It's a static PWA. Serve the folder over HTTP (a service worker needs a real
origin — `file://` won't register one):

```bash
cd magic-football-manager
python3 -m http.server 8080
# open http://localhost:8080
```

Then **Add to Home Screen** (mobile) or install from the address bar (desktop
Chromium) to get the full-screen standalone experience. First online load caches
the shell + CDN libs; after that it works offline.

First launch seeds a demo match (Half 2 of 4) so every state is visible. Use
**Clear All** to start empty.

### Just open a file (no server) — `file://`

The multi-file `index.html` needs a server (Babel fetches the `.jsx` files, which
`file://` blocks). For double-click-to-open use the **self-contained build**:

```bash
node build/build-standalone.mjs       # → football-manager-standalone.html
```

`football-manager-standalone.html` has the JSX **pre-compiled** and React inlined
from `vendor/`, so it runs from `file://` with **no server and no internet**.
Rebuild it whenever you change `styles.css` or anything in `js/`. (Note:
`localStorage` under `file://` can be flaky across browsers — the built-in JSON
**Export/Import** is your save/restore there.)

---

## Architecture

Layered, with framework-agnostic domain logic kept pure and testable (PRD §3):

```
index.html              PWA shell — fonts, manifest, SW registration, React+Babel (CDN)
styles.css              design tokens + components (dark/light themes, safe-area)
manifest.webmanifest    installable PWA metadata
sw.js                   service worker — precache shell, network-first nav, cache-first assets
icon.svg / icons/*.png  app icons (192/512/maskable/apple-touch)
js/
  data.js               DOMAIN — pure, framework-agnostic (window.FM). Scoring, parser,
                        dedup, formation remap, baseline diff, status. No DOM, no React.
  drag.jsx              pointer-based drag system (touch + mouse) — PRD UX-10
  components.jsx        presentational + interactive React components
  app.jsx              app root — state model, persistence/migration, History API, wiring
```

- **`js/data.js`** has zero dependencies and runs in Node — that's where the
  PRD "critical" logic lives and where the tests point.
- The React layer is loaded via Babel-standalone (per the design handoff's
  no-build constraint). The design-tool chrome (device-frame toggle, tweaks
  panel) was stripped; the app is genuinely responsive instead.

### Data model (`schemaVersion: 2`, localStorage key `football_team_state`)

```jsonc
{
  "schemaVersion": 2,
  "formation": "4-3-3",
  "totalHalves": 4,
  "currentHalf": 2,
  "players": [{ "id": "p_..", "name": "Alex", "pos": "GK" }],
  "halves": [
    {
      "assignments": { "s0": { "starter": "p_..", "sub": "p_.." }, "...": {} },
      "baseline":    { "s0": { "starter": "p_..", "sub": "p_.." } },  // snapshot for change-highlight
      "completed": true,
      "summary": [{ "playerId": "p_..", "delta": 0.5 }]
    }
  ],
  "playerInputText": ""
}
```

---

## Business logic (PRD §5)

**End-half scoring (§5.1) — co-occupancy matters:**

| Slot occupancy            | Result            |
|---------------------------|-------------------|
| Starter **and** Substitute | +0.5 each         |
| Starter only              | Starter +1.0      |
| Substitute only           | Substitute +1.0   |
| Empty                     | no change         |

Totals are recomputed from **all completed halves** (FR-4.3). This deliberately
differs from the original prototype mock (which always gave starter 1.0 / sub
0.5) — the PRD scoring table is the source of truth.

**Status (§5.2):** `0 → Not played`, `< team avg → Low`, `≥ avg → High`.

**Import parser (§5.3):** trims, strips list prefixes (`1.` `2)` `3-`), collapses
spaces, detects position as a trailing token or after a comma/dash (`Name, FW`),
supports multiple names per line via `+`, strips decorative chars (`* •`), and
skips empties. Never discards text it can't positively identify as a position
(so `Fernandes, Bruno` survives intact). Defaults to `UNKNOWN`.

**Dedup (FR-1.4):** normalized `name + position`.

---

## PRD coverage

- **Roster:** add (modal + validation), delete (confirm, removes from all halves),
  import (full §5.3 parser), duplicate prevention.
- **Board:** 3 formations × exactly 11 slots, starter + sub drop zones, pool↔slot
  and slot↔slot drag, no duplicates per half, **formation change remaps by slot
  label**, changed-from-baseline glow.
- **Match flow:** 2–6 halves, End Half scoring + clone-forward + auto-advance,
  confirmations for re-ending / overwriting a completed next half, final-half
  notice, minimum-assignment guard before ending.
- **Summary:** totals, team average, per-player table with status pills.
- **Reset / Clear:** both confirmed; Clear All wipes persistence + inputs.
- **PWA hardening:** manifest + service worker (offline), History-API back gesture
  closes the modal, safe-area insets, pointer-event drag (`touch-action: none`),
  dark/light themes, responsive single↔two-column.
- **Resilience:** `schemaVersion` + forward migration (v1 prototype → v2),
  validate-on-load with safe fallback, **JSON export/import** safety net.

---

## Tests

Pure domain logic (`js/data.js`) is verified with a dependency-free Node harness
covering §5.1 scoring, completed-only totals, §5.2 status, the §5.3 parser,
FR-1.4 dedup, FR-2.7 label remap, and baseline diff. The React wiring,
v1→v2 migration, seed status distribution (3 / 6 / 8), End-Half advance, and
persistence were smoke-tested under jsdom during development.

```bash
node tests/domain.test.js
```

---

## Notes & next steps

- Loaded via Babel-standalone to honor the no-build handoff. For a production
  pipeline, the same `js/` modules port cleanly to Vite + React (precompile the
  JSX, swap the CDN scripts) with the domain layer unchanged.
- Phase 4 ideas not yet built: undo/redo for drags, minute-based playtime,
  board pan/zoom.
