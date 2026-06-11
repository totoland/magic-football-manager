/* ============================================================
   Football Manager — app root, state model, persistence, wiring
   ============================================================ */
const FMx = window.FM;
const LS_KEY = "football_team_state";
const THEME_KEY = "fm_theme";

/* ---------- baked design defaults (tweaks panel stripped) ---------- */
const ORIENT = "vertical";
const ZONE_STYLE = "badge";
const DENSITY = "comfortable";

/* =========================================================
   STATE FACTORIES
   ========================================================= */
function emptyHalf(formation) {
  const a = FMx.emptyAssignments(formation);
  return { assignments: a, baseline: FMx.cloneAssignments(a), completed: false, summary: [] };
}

function defaultState() {
  const formation = "4-3-3";
  const totalHalves = 4;
  return {
    schemaVersion: FMx.SCHEMA_VERSION,
    formation, totalHalves, currentHalf: 1,
    players: [],
    halves: Array.from({ length: totalHalves }, () => emptyHalf(formation)),
    playerInputText: "",
  };
}

/* ---------- first-run demo seed (in-progress match, all states visible) ---------- */
function buildSeed() {
  const players = FMx.SAMPLE_PLAYERS.map((p) => ({ ...p }));
  const id = {};
  players.forEach((p) => (id[p.name] = p.id));
  const formation = "4-3-3";
  const totalHalves = 4;
  const halves = Array.from({ length: totalHalves }, () => emptyHalf(formation));

  const set = (h, slot, st, sub) => { h.assignments[slot] = { starter: st || null, sub: sub || null }; };
  const h1 = halves[0];
  set(h1, "s0", id.Alex, id.Theo);
  set(h1, "s1", id.Sam, null);
  set(h1, "s2", id.Jordan, null);
  set(h1, "s3", id.Casey, null);
  set(h1, "s4", id.Reese, null);
  set(h1, "s5", id.Noah, id.Rowan);
  set(h1, "s6", id.Quinn, null);
  set(h1, "s7", id.Micah, null);
  set(h1, "s8", id.Kai, null);
  set(h1, "s9", id.Luca, id.Remy);
  set(h1, "s10", id.Finley, null);
  h1.baseline = FMx.cloneAssignments(FMx.emptyAssignments(formation)); // started from empty
  h1.completed = true;
  h1.summary = deltasToRows(FMx.halfDeltas(h1.assignments));

  // Half 2 — current, cloned from H1 then rotated (vs its own baseline => "changed" glow)
  const h2 = halves[1];
  h2.assignments = FMx.cloneAssignments(h1.assignments);
  h2.baseline = FMx.cloneAssignments(h1.assignments); // baseline = the plan it inherited
  h2.assignments.s9 = { starter: id.Remy, sub: id.Luca };   // CHANGED
  h2.assignments.s5 = { starter: id.Noah, sub: id.Devin };  // CHANGED
  h2.assignments.s2 = { starter: id.Jordan, sub: id.Drew }; // CHANGED

  return {
    schemaVersion: FMx.SCHEMA_VERSION,
    formation, totalHalves, currentHalf: 2,
    players, halves, playerInputText: "",
  };
}
function deltasToRows(d) {
  return Object.keys(d).map((playerId) => ({ playerId, delta: d[playerId] }));
}

/* =========================================================
   PERSISTENCE — load / migrate / validate (PRD §9)
   ========================================================= */
function isPlainObj(o) { return o && typeof o === "object" && !Array.isArray(o); }

// Migrate older shapes forward. v1 (prototype) used { completedCount } + bare
// assignment maps per half; v2 uses per-half {assignments,baseline,completed,summary}.
function migrate(raw) {
  if (!isPlainObj(raw)) return null;
  let s = raw;
  const ver = s.schemaVersion || 1;
  if (ver < 2) {
    const formation = s.formation || "4-3-3";
    const completedCount = typeof s.completedCount === "number" ? s.completedCount : 0;
    const halves = (Array.isArray(s.halves) ? s.halves : []).map((h, i) => {
      const assignments = isPlainObj(h) && isPlainObj(h.assignments) ? h.assignments : (isPlainObj(h) ? h : {});
      const norm = FMx.cloneAssignments({ ...FMx.emptyAssignments(formation), ...assignments });
      const completed = i < completedCount;
      return { assignments: norm, baseline: FMx.cloneAssignments(norm), completed, summary: completed ? deltasToRows(FMx.halfDeltas(norm)) : [] };
    });
    s = {
      schemaVersion: 2,
      formation,
      totalHalves: s.totalHalves || halves.length || 4,
      currentHalf: s.currentHalf || 1,
      players: Array.isArray(s.players) ? s.players : [],
      halves,
      playerInputText: s.playerInputText || "",
    };
  }
  return s;
}

function validate(s) {
  if (!isPlainObj(s)) return false;
  if (!FMx.FORMATIONS[s.formation]) return false;
  if (!Array.isArray(s.players)) return false;
  if (!Array.isArray(s.halves) || s.halves.length === 0) return false;
  if (typeof s.totalHalves !== "number" || s.totalHalves < 2 || s.totalHalves > 6) return false;
  if (typeof s.currentHalf !== "number") return false;
  for (const p of s.players) {
    if (!p || typeof p.id !== "string" || typeof p.name !== "string") return false;
  }
  return true;
}

// Coerce a loaded/imported object into a fully-valid state, repairing what we can.
function normalizeState(input) {
  // Must look like a match at all — reject arbitrary JSON (e.g. a wrong file on import).
  if (!isPlainObj(input) || !(
    Array.isArray(input.halves) || Array.isArray(input.players) ||
    input.formation || input.totalHalves || input.schemaVersion
  )) return null;
  const migrated = migrate(input);
  if (!migrated) return null;
  const formation = FMx.FORMATIONS[migrated.formation] ? migrated.formation : "4-3-3";
  let totalHalves = Math.min(6, Math.max(2, parseInt(migrated.totalHalves, 10) || 4));
  let halves = (Array.isArray(migrated.halves) ? migrated.halves : []).slice(0, totalHalves).map((h) => {
    const base = FMx.emptyAssignments(formation);
    const assignments = FMx.cloneAssignments({ ...base, ...(isPlainObj(h) && h.assignments) });
    const baseline = FMx.cloneAssignments({ ...base, ...(isPlainObj(h) && h.baseline ? h.baseline : assignments) });
    return { assignments, baseline, completed: !!(h && h.completed), summary: Array.isArray(h && h.summary) ? h.summary : [] };
  });
  while (halves.length < totalHalves) halves.push(emptyHalf(formation));
  const players = (Array.isArray(migrated.players) ? migrated.players : [])
    .filter((p) => isPlainObj(p) && typeof p.name === "string")
    .map((p) => ({ id: typeof p.id === "string" ? p.id : FMx.nextId(), name: p.name, pos: FMx.POSITIONS.includes(p.pos) ? p.pos : "UNKNOWN" }));
  const state = {
    schemaVersion: FMx.SCHEMA_VERSION,
    formation, totalHalves,
    currentHalf: Math.min(Math.max(1, parseInt(migrated.currentHalf, 10) || 1), totalHalves),
    players, halves,
    playerInputText: typeof migrated.playerInputText === "string" ? migrated.playerInputText : "",
  };
  return validate(state) ? state : null;
}

function loadState() {
  let raw = null;
  try { raw = localStorage.getItem(LS_KEY); } catch (e) {}
  if (!raw) return buildSeed();              // first run → demo match
  try {
    const parsed = JSON.parse(raw);
    const norm = normalizeState(parsed);
    if (norm) return norm;
  } catch (e) {}
  return defaultState();                     // corrupt → safe empty default (§9)
}

/* =========================================================
   APP
   ========================================================= */
function App() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) || "dark"; } catch (e) { return "dark"; }
  });
  const [st, setSt] = useState(loadState);
  const [modal, setModal] = useState(false);
  const [picker, setPicker] = useState(null);   // { slotId, kind } | null — tap-to-assign
  const [toast, setToast] = useState(null);
  const wide = useMediaQuery("(min-width: 880px)");
  const toastTimer = useRef(null);

  /* ---- debounced persistence (§9) ---- */
  const saveTimer = useRef(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify(st)); } catch (e) {}
    }, 250);
    return () => saveTimer.current && clearTimeout(saveTimer.current);
  }, [st]);

  /* ---- theme persistence + meta theme-color ---- */
  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0A0D0C" : "#EEF2F0");
  }, [theme]);

  const flash = (msg, kind) => {
    setToast({ msg, kind: kind || "info" });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  };

  const { players, formation, totalHalves, currentHalf, halves, playerInputText } = st;
  const completedCount = useMemo(() => {
    let c = 0;
    for (let i = 0; i < halves.length; i++) { if (halves[i].completed) c = i + 1; else break; }
    return c;
  }, [halves]);

  const slots = FMx.FORMATIONS[formation];
  const playersById = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players]);
  const playtime = useMemo(() => FMx.computePlaytime(players, halves), [players, halves]);
  const curHalf = halves[currentHalf - 1] || emptyHalf(formation);
  const changed = useMemo(
    () => FMx.changedSlots(formation, curHalf.baseline, curHalf.assignments),
    [formation, curHalf]
  );
  const isCompleted = curHalf.completed;

  /* ---- mutate current half's assignments ---- */
  const patchHalf = (mutator) => {
    setSt((s) => {
      const halves2 = s.halves.map((h, i) => (i === s.currentHalf - 1 ? { ...h, assignments: FMx.cloneAssignments(h.assignments) } : h));
      mutator(halves2[s.currentHalf - 1].assignments);
      return { ...s, halves: halves2 };
    });
  };

  const removeFromAssignments = (a, pid) => {
    Object.keys(a).forEach((sid) => {
      if (a[sid].starter === pid) a[sid] = { ...a[sid], starter: null };
      if (a[sid].sub === pid) a[sid] = { ...a[sid], sub: null };
    });
  };

  const onDrop = (player, zone) => {
    if (zone.pool) { patchHalf((a) => removeFromAssignments(a, player.id)); return; }
    if (!zone.slot) return;
    patchHalf((a) => {
      removeFromAssignments(a, player.id);                 // FR-2.6: no dup in a half
      const cur = { ...(a[zone.slot] || { starter: null, sub: null }) };
      cur[zone.kind] = player.id;                          // FR-2.5: replace occupant
      a[zone.slot] = cur;
    });
  };

  const onRemove = (slotId, kind) => {
    patchHalf((a) => { a[slotId] = { ...a[slotId], [kind]: null }; });
  };

  /* ---- controls ---- */
  const setFormation = (f) => setSt((s) => {
    if (f === s.formation) return s;
    const halves2 = s.halves.map((h) => ({
      ...h,
      assignments: FMx.remapFormation(s.formation, f, h.assignments),   // FR-2.7 by label
      baseline: FMx.remapFormation(s.formation, f, h.baseline),
    }));
    return { ...s, formation: f, halves: halves2 };
  });

  const setTotalHalves = (n) => setSt((s) => {
    let halves2 = s.halves.slice(0, n);                                 // FR-3.3 trim
    while (halves2.length < n) halves2.push(emptyHalf(s.formation));    // FR-3.3 grow
    return { ...s, totalHalves: n, halves: halves2, currentHalf: Math.min(s.currentHalf, n) };
  });

  const setCurrentHalf = (n) => setSt((s) => ({ ...s, currentHalf: n }));

  /* ---- End Half (PRD §5.1 + FR-3.4..3.8) ---- */
  const onEndHalf = () => {
    const idx = currentHalf - 1;
    const half = halves[idx];

    // Pre-end minimum-assignment check (Phase 3)
    const filled = Object.values(half.assignments).filter((a) => a.starter || a.sub).length;
    if (filled === 0) { flash("Add players to the board before ending the half.", "warn"); return; }

    // FR-3.6 re-ending a completed half
    if (half.completed && !confirm("This half is already completed. Re-end it and recompute playtime?")) return;

    const next = Math.min(currentHalf + 1, totalHalves);
    const isFinal = currentHalf >= totalHalves;

    // FR-3.7 overwriting an already-completed next half
    if (!isFinal) {
      const nh = halves[next - 1];
      const nextHasPlan = Object.values(nh.assignments).some((a) => a.starter || a.sub);
      if (nh.completed && nextHasPlan &&
        !confirm("The next half already has a completed plan. Overwrite it with this lineup?")) return;
    }

    setSt((s) => {
      const halves2 = s.halves.map((h, i) => ({ ...h }));
      const cur = halves2[idx];
      cur.completed = true;
      cur.summary = deltasToRows(FMx.halfDeltas(cur.assignments));
      cur.baseline = FMx.cloneAssignments(cur.assignments);            // new baseline (§5.1)

      if (!isFinal) {                                                   // FR-3.5 clone + advance
        const cloned = FMx.cloneAssignments(cur.assignments);
        halves2[next - 1] = {
          ...halves2[next - 1],
          assignments: cloned,
          baseline: FMx.cloneAssignments(cloned),
          completed: false,
          summary: [],
        };
      }
      return { ...s, halves: halves2, currentHalf: next };
    });

    if (isFinal) flash("Final half complete — match finished! 🏆", "good");   // FR-3.8
    else flash("Half " + currentHalf + " ended. Lineup carried to half " + next + ".", "good");
  };

  /* ---- reset / clear (FR-5) ---- */
  const onReset = () => {
    if (!confirm("Reset the match? Roster is kept; all lineups and playtime reset.")) return;
    setSt((s) => ({
      ...s, currentHalf: 1,
      halves: Array.from({ length: s.totalHalves }, () => emptyHalf(s.formation)),
    }));
    flash("Match reset. Roster kept.", "info");
  };

  const onClear = () => {
    if (!confirm("Clear everything? Removes all players, lineups, and saved data. This cannot be undone.")) return;
    try { localStorage.removeItem(LS_KEY); } catch (e) {}
    setSt(defaultState());
    flash("All data cleared.", "info");
  };

  /* ---- roster: import / add / delete ---- */
  const setInputText = (text) => setSt((s) => ({ ...s, playerInputText: text }));

  const onImport = () => {
    const text = st.playerInputText || "";
    if (!text.trim()) { flash("Paste some players first.", "warn"); return; }      // §8
    const parsed = FMx.parseImport(text);
    if (!parsed.length) { flash("No valid players found in that text.", "warn"); return; } // §8
    setSt((s) => {
      const { players: next, added, skipped } = FMx.addUnique(s.players, parsed);
      const msg = added + " player" + (added === 1 ? "" : "s") + " imported" + (skipped ? ", " + skipped + " duplicate" + (skipped === 1 ? "" : "s") + " skipped" : "") + ".";
      setTimeout(() => flash(msg, added ? "good" : "warn"), 0);
      return { ...s, players: next, playerInputText: "" };
    });
  };

  const onAddPlayer = (name, pos) => {
    const exists = players.some((p) => FMx.dupKey(p.name, p.pos) === FMx.dupKey(name, pos));
    if (exists) { flash("That player is already in the squad.", "warn"); return; }   // FR-1.4
    setSt((s) => ({ ...s, players: [...s.players, { id: FMx.nextId(), name, pos }] }));
    closeModal();
    flash(name + " added.", "good");
  };

  const onDeletePlayer = (player) => {
    if (!confirm('Delete "' + player.name + '"? They will be removed from every half.')) return;  // FR-1.2
    setSt((s) => {
      const halves2 = s.halves.map((h) => {
        const a = FMx.cloneAssignments(h.assignments);
        removeFromAssignments(a, player.id);
        const b = FMx.cloneAssignments(h.baseline);
        removeFromAssignments(b, player.id);
        return { ...h, assignments: a, baseline: b, summary: (h.summary || []).filter((r) => r.playerId !== player.id) };
      });
      return { ...s, players: s.players.filter((p) => p.id !== player.id), halves: halves2 };
    });
    flash(player.name + " deleted.", "info");
  };

  /* ---- JSON export / import (Phase 3 safety net) ---- */
  const onExport = () => {
    try {
      const blob = new Blob([JSON.stringify(st, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "football-manager-match.json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      flash("Match exported.", "good");
    } catch (e) { flash("Export failed.", "warn"); }
  };

  const onImportFile = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const norm = normalizeState(JSON.parse(reader.result));
        if (!norm) { flash("That file isn't a valid match.", "warn"); return; }
        if (!confirm("Load this match? Your current match will be replaced.")) return;
        setSt(norm);
        flash("Match loaded.", "good");
      } catch (e) { flash("Could not read that file.", "warn"); }
    };
    reader.onerror = () => flash("Could not read that file.", "warn");
    reader.readAsText(file);
  };

  /* ---- overlays + back gesture (History API, PRD §3.3) ---- */
  const openModal = () => { setModal(true); history.pushState({ fmOverlay: "modal" }, ""); };
  const closeModal = () => {
    if (history.state && history.state.fmOverlay) history.back(); else setModal(false);
  };
  const openPicker = (slotId, kind) => { setPicker({ slotId, kind }); history.pushState({ fmOverlay: "picker" }, ""); };
  const closePicker = () => {
    if (history.state && history.state.fmOverlay) history.back(); else setPicker(null);
  };
  const onPickPlayer = (player) => {
    if (picker) onDrop(player, { slot: picker.slotId, kind: picker.kind });   // reuse drop logic (no dup, replace)
    closePicker();
  };
  useEffect(() => {
    const onPop = () => { setModal(false); setPicker(null); };  // back closes whichever overlay is open
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /* ---- render ---- */
  const layout = wide ? "wide" : "narrow";
  const controlsEl = (
    <Controls formation={formation} setFormation={setFormation}
      totalHalves={totalHalves} setTotalHalves={setTotalHalves}
      currentHalf={currentHalf} setCurrentHalf={setCurrentHalf}
      completedCount={completedCount}
      onEndHalf={onEndHalf} onReset={onReset} onClear={onClear}
      onExport={onExport} onImportFile={onImportFile} />
  );
  const poolEl = <PlayerPool players={players} assignments={curHalf.assignments} playtime={playtime} />;
  const importEl = <ImportPanel text={playerInputText} setText={setInputText} onImport={onImport} />;
  const summaryEl = <Summary players={players} playtime={playtime} onDeletePlayer={onDeletePlayer} />;
  const boardEl = (
    <Board slots={slots} assignments={curHalf.assignments} changed={changed}
      players={playersById} orient={ORIENT} onRemove={onRemove} onPick={openPicker} />
  );
  const pickerSlot = picker ? slots.find((s) => s.id === picker.slotId) : null;

  return (
    <DragProvider onDrop={onDrop}>
      <div className="fm-app" data-theme={theme} data-density={DENSITY}
        data-zonestyle={ZONE_STYLE} data-orient={ORIENT} data-layout={layout}>
        <Header half={currentHalf} totalHalves={totalHalves} completed={isCompleted}
          formation={formation} theme={theme}
          onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")} />

        <div className="fm-scroll">
          {layout === "wide" ? (
            <React.Fragment>
              {boardEl}
              <div className="col-right">{controlsEl}{poolEl}{importEl}{summaryEl}</div>
            </React.Fragment>
          ) : (
            <React.Fragment>
              {controlsEl}{boardEl}{poolEl}{importEl}{summaryEl}
            </React.Fragment>
          )}
        </div>

        <button className="fm-fab" onClick={openModal} title="Add player" aria-label="Add player">{Ic.plus}</button>
        {modal && <AddPlayerModal onClose={closeModal} onAdd={onAddPlayer} />}
        {picker && pickerSlot && (
          <PlayerPickerModal slotLabel={pickerSlot.label} kind={picker.kind}
            players={players} assignments={curHalf.assignments} playtime={playtime}
            current={playersById[(curHalf.assignments[picker.slotId] || {})[picker.kind]] || null}
            onChoose={onPickPlayer}
            onClear={() => { onRemove(picker.slotId, picker.kind); closePicker(); }}
            onClose={closePicker} />
        )}
        <Toast toast={toast} />
      </div>
    </DragProvider>
  );
}

/* ---------- responsive layout hook ---------- */
function useMediaQuery(query) {
  const get = () => (typeof window.matchMedia === "function" ? window.matchMedia(query).matches : false);
  const [match, setMatch] = useState(get);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const on = () => setMatch(mql.matches);
    on();
    mql.addEventListener ? mql.addEventListener("change", on) : mql.addListener(on);
    return () => (mql.removeEventListener ? mql.removeEventListener("change", on) : mql.removeListener(on));
  }, [query]);
  return match;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
Object.assign(window, { App, loadState, normalizeState, migrate, buildSeed, defaultState });
