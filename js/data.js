/* ============================================================
   Football Manager — domain layer (framework-agnostic, pure)
   Plain JS, attaches everything to window.FM.
   Scoring follows PRD §5.1. Parser follows PRD §5.3.
   ============================================================ */
(function () {
  "use strict";

  const SCHEMA_VERSION = 2;
  const POSITIONS = ["GK", "DF", "MF", "FW", "UNKNOWN"];
  const VALID_POS = new Set(["GK", "DF", "MF", "FW"]);

  // Pitch coordinates are percentages on a VERTICAL pitch:
  //   x: 0 (left) .. 100 (right)
  //   y: 0 (top / attacking end) .. 100 (bottom / own goal, GK)
  const FORMATIONS = {
    "4-3-3": [
      { id: "s0", label: "GK", pos: "GK", x: 50, y: 91 },
      { id: "s1", label: "LB", pos: "DF", x: 16, y: 71 },
      { id: "s2", label: "CB", pos: "DF", x: 38, y: 75 },
      { id: "s3", label: "CB", pos: "DF", x: 62, y: 75 },
      { id: "s4", label: "RB", pos: "DF", x: 84, y: 71 },
      { id: "s5", label: "CM", pos: "MF", x: 28, y: 50 },
      { id: "s6", label: "CM", pos: "MF", x: 50, y: 53 },
      { id: "s7", label: "CM", pos: "MF", x: 72, y: 50 },
      { id: "s8", label: "LW", pos: "FW", x: 20, y: 23 },
      { id: "s9", label: "ST", pos: "FW", x: 50, y: 15 },
      { id: "s10", label: "RW", pos: "FW", x: 80, y: 23 },
    ],
    "4-4-2": [
      { id: "s0", label: "GK", pos: "GK", x: 50, y: 91 },
      { id: "s1", label: "LB", pos: "DF", x: 16, y: 71 },
      { id: "s2", label: "CB", pos: "DF", x: 38, y: 75 },
      { id: "s3", label: "CB", pos: "DF", x: 62, y: 75 },
      { id: "s4", label: "RB", pos: "DF", x: 84, y: 71 },
      { id: "s5", label: "LM", pos: "MF", x: 16, y: 48 },
      { id: "s6", label: "CM", pos: "MF", x: 40, y: 51 },
      { id: "s7", label: "CM", pos: "MF", x: 60, y: 51 },
      { id: "s8", label: "RM", pos: "MF", x: 84, y: 48 },
      { id: "s9", label: "ST", pos: "FW", x: 38, y: 18 },
      { id: "s10", label: "ST", pos: "FW", x: 62, y: 18 },
    ],
    "3-5-2": [
      { id: "s0", label: "GK", pos: "GK", x: 50, y: 91 },
      { id: "s1", label: "CB", pos: "DF", x: 30, y: 75 },
      { id: "s2", label: "CB", pos: "DF", x: 50, y: 78 },
      { id: "s3", label: "CB", pos: "DF", x: 70, y: 75 },
      { id: "s4", label: "LM", pos: "MF", x: 13, y: 50 },
      { id: "s5", label: "CM", pos: "MF", x: 35, y: 53 },
      { id: "s6", label: "CM", pos: "MF", x: 50, y: 49 },
      { id: "s7", label: "CM", pos: "MF", x: 65, y: 53 },
      { id: "s8", label: "RM", pos: "MF", x: 87, y: 50 },
      { id: "s9", label: "ST", pos: "FW", x: 40, y: 18 },
      { id: "s10", label: "ST", pos: "FW", x: 60, y: 18 },
    ],
  };

  const POS_LABEL = {
    GK: "Goalkeeper", DF: "Defender", MF: "Midfielder",
    FW: "Forward", UNKNOWN: "Unassigned",
  };

  /* ---------- id generator (monotonic + random suffix, no collisions) ---------- */
  let _seq = 0;
  function nextId() {
    _seq += 1;
    return "p_" + _seq.toString(36) + "_" + Math.floor(Math.random() * 1e6).toString(36);
  }

  const P = (name, pos) => ({ id: nextId(), name, pos });
  const SAMPLE_PLAYERS = [
    P("Alex", "GK"), P("Theo", "GK"), P("Sam", "DF"), P("Jordan", "DF"),
    P("Casey", "DF"), P("Reese", "DF"), P("Drew", "DF"), P("Noah", "MF"),
    P("Quinn", "MF"), P("Micah", "MF"), P("Rowan", "MF"), P("Devin", "MF"),
    P("Kai", "FW"), P("Luca", "FW"), P("Finley", "FW"), P("Remy", "FW"),
    P("Ari", "UNKNOWN"),
  ];

  /* ---------- assignment helpers ---------- */
  // Empty assignment map for a formation: { slotId: { starter, sub } }
  function emptyAssignments(formation) {
    const slots = FORMATIONS[formation] || FORMATIONS["4-3-3"];
    const a = {};
    slots.forEach((s) => (a[s.id] = { starter: null, sub: null }));
    return a;
  }

  function cloneAssignments(assignments) {
    const out = {};
    Object.keys(assignments).forEach((k) => {
      const a = assignments[k] || { starter: null, sub: null };
      out[k] = { starter: a.starter || null, sub: a.sub || null };
    });
    return out;
  }

  /* ---------- PRD §5.1 — end-half scoring ---------- */
  // Per slot: both present -> +0.5 each; starter only -> +1.0; sub only -> +1.0.
  function halfDeltas(assignments) {
    const d = {};
    const add = (id, v) => { if (id) d[id] = (d[id] || 0) + v; };
    Object.values(assignments).forEach((a) => {
      const s = a && a.starter, b = a && a.sub;
      if (s && b) { add(s, 0.5); add(b, 0.5); }
      else if (s) { add(s, 1.0); }
      else if (b) { add(b, 1.0); }
    });
    return d;
  }

  // FR-4.3 — totals recalculated from ALL completed halves.
  function computePlaytime(players, halves) {
    const tally = {};
    players.forEach((p) => (tally[p.id] = 0));
    halves.forEach((h) => {
      if (!h || !h.completed) return;
      const d = halfDeltas(h.assignments || {});
      Object.keys(d).forEach((pid) => { if (tally[pid] != null) tally[pid] += d[pid]; });
    });
    return tally;
  }

  // PRD §5.2 — status relative to squad average.
  function statusFor(value, average) {
    if (value <= 0) return "not-played";
    if (average > 0 && value < average) return "low";
    return "high";
  }

  // Players not placed (starter or sub) in the given assignments.
  function unplacedPlayers(players, assignments) {
    const placed = new Set();
    Object.values(assignments || {}).forEach((a) => {
      if (a && a.starter) placed.add(a.starter);
      if (a && a.sub) placed.add(a.sub);
    });
    return players.filter((p) => !placed.has(p.id));
  }

  // FR-2.8 — slots that differ from the half's own baseline snapshot.
  function changedSlots(formation, baseline, assignments) {
    const slots = FORMATIONS[formation] || [];
    const changed = {};
    slots.forEach((s) => {
      const b = (baseline && baseline[s.id]) || {};
      const c = (assignments && assignments[s.id]) || {};
      changed[s.id] = (b.starter || null) !== (c.starter || null) ||
                      (b.sub || null) !== (c.sub || null);
    });
    return changed;
  }

  // FR-2.7 — remap assignments onto a new formation BY SLOT LABEL where possible.
  // Same-label slots are filled in order; occupants with no matching slot go to the pool.
  function remapFormation(oldFormation, newFormation, assignments) {
    const oldSlots = FORMATIONS[oldFormation] || [];
    const newSlots = FORMATIONS[newFormation] || [];
    const na = emptyAssignments(newFormation);
    const queueByLabel = {};
    newSlots.forEach((s) => { (queueByLabel[s.label] = queueByLabel[s.label] || []).push(s.id); });
    oldSlots.forEach((os) => {
      const a = assignments[os.id];
      if (!a || (!a.starter && !a.sub)) return;
      const q = queueByLabel[os.label];
      if (q && q.length) {
        na[q.shift()] = { starter: a.starter || null, sub: a.sub || null };
      }
    });
    return na;
  }

  /* ---------- dedup (FR-1.4) ---------- */
  function normalizeName(name) {
    return String(name || "").trim().toLowerCase().replace(/\s+/g, " ");
  }
  function dupKey(name, pos) {
    return normalizeName(name) + "|" + pos;
  }

  /* ---------- import parser (PRD §5.3) ---------- */
  function parseImport(text) {
    const out = [];
    String(text || "").split(/\r?\n/).forEach((raw) => {
      let line = raw.trim();                                  // (1) trim
      if (!line) return;
      line = line.replace(/^\s*\d+\s*[.)\-]\s*/, "");         // (2) strip "1." "2)" "3-"
      line.split("+").forEach((seg) => {                      // (6) multiple names via "+"
        let name = seg.trim();
        if (!name) return;
        let pos = "UNKNOWN";                                  // (5) default

        // (4a) position after comma or dash: "Name, FW" / "Name - FW"
        const parts = name.split(/\s*[,–—\-]\s*/);
        if (parts.length > 1) {
          const tail = parts[parts.length - 1].trim().toUpperCase();
          if (VALID_POS.has(tail)) { pos = tail; name = parts.slice(0, -1).join(" "); }
        }

        name = name.replace(/\s+/g, " ").trim();              // (3) collapse spaces

        // (4b) final token as position: "Name FW"
        if (pos === "UNKNOWN") {
          const toks = name.split(" ");
          const last = (toks[toks.length - 1] || "").toUpperCase();
          if (toks.length > 1 && VALID_POS.has(last)) { pos = last; toks.pop(); name = toks.join(" "); }
        }

        name = name.replace(/[*•]/g, "").replace(/\s+/g, " ").trim(); // (7) strip * •
        if (!name) return;                                    // (8) ignore empty name
        out.push({ name, pos });
      });
    });
    return out;
  }

  // Merge parsed/added players into a roster, skipping duplicates (FR-1.4).
  // Returns { players, added, skipped }.
  function addUnique(players, candidates) {
    const seen = new Set(players.map((p) => dupKey(p.name, p.pos)));
    const next = players.slice();
    let added = 0, skipped = 0;
    candidates.forEach((c) => {
      const pos = VALID_POS.has(c.pos) || c.pos === "UNKNOWN" ? c.pos : "UNKNOWN";
      const k = dupKey(c.name, pos);
      if (seen.has(k)) { skipped += 1; return; }
      seen.add(k);
      next.push({ id: nextId(), name: c.name, pos });
      added += 1;
    });
    return { players: next, added, skipped };
  }

  window.FM = {
    SCHEMA_VERSION, POSITIONS, VALID_POS, POS_LABEL, FORMATIONS, SAMPLE_PLAYERS,
    nextId, emptyAssignments, cloneAssignments, halfDeltas, computePlaytime,
    statusFor, unplacedPlayers, changedSlots, remapFormation,
    normalizeName, dupKey, parseImport, addUnique,
  };
})();
