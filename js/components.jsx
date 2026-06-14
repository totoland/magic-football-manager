/* ============================================================
   Football Manager — presentational + interactive components
   ============================================================ */
const { useState, useEffect, useRef, useMemo } = React;

/* ---------- Icons (inline, stroke-based) ---------- */
const Ic = {
  shield: <svg viewBox="0 0 24 24" fill="none"><path d="M12 2.5 4.5 5.2v6.1c0 4.7 3.1 8.4 7.5 10.2 4.4-1.8 7.5-5.5 7.5-10.2V5.2L12 2.5Z" fill="#fff" fillOpacity=".15" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round"/><path d="M12 7v9M7.5 11.5h9" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  sun: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>,
  moon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z"/></svg>,
  flag: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>,
  reset: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 4v4h4"/></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  chev: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>,
  upload: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5M5 20h14"/></svg>,
  download: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v12M7 11l5 5 5-5M5 20h14"/></svg>,
};

/* =========================================================
   TOAST (transient notifications — §8 final-half notice etc.)
   ========================================================= */
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={"fm-toast " + (toast.kind || "info")} role="status" aria-live="polite">
      <span className="fm-toast-dot" />{toast.msg}
    </div>
  );
}

/* =========================================================
   HEADER
   ========================================================= */
function Header({ half, totalHalves, completed, formation, theme, onToggleTheme }) {
  return (
    <header className="fm-header">
      <div className="fm-crest">{Ic.shield}</div>
      <div className="fm-title-wrap">
        <h1 className="fm-title">Football <em>Manager</em></h1>
        <div className="fm-subline">
          <span className={"fm-tag" + (completed ? " done" : "")}>
            Half&nbsp;<b>{half}/{totalHalves}</b>{completed ? " · completed" : ""}
          </span>
          <span className="fm-dot" />
          <span className="fm-tag">Form&nbsp;<b>{formation}</b></span>
        </div>
      </div>
      <div className="fm-header-actions">
        <button className="fm-icon-btn" onClick={onToggleTheme} title="Toggle theme" aria-label="Toggle light/dark theme">
          {theme === "dark" ? Ic.sun : Ic.moon}
        </button>
      </div>
    </header>
  );
}

/* =========================================================
   CONTROLS
   ========================================================= */
function Controls(props) {
  const {
    formation, setFormation, totalHalves, setTotalHalves, currentHalf, setCurrentHalf,
    completedCount, onEndHalf, onReset, onClear, onExport, onImportFile,
  } = props;
  const halfDone = currentHalf <= completedCount;
  const fileRef = useRef(null);
  return (
    <section className="fm-card">
      <div className="fm-sec-head">
        <h2 className="fm-sec-title"><span className="bar" />Match Setup</h2>
        <div className="fm-sec-tools">
          <button className="fm-mini-btn" onClick={onExport} title="Export match as JSON">{Ic.download}Export</button>
          <button className="fm-mini-btn" onClick={() => fileRef.current && fileRef.current.click()} title="Import match JSON">{Ic.upload}Import</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden
            onChange={(e) => { const f = e.target.files[0]; if (f) onImportFile(f); e.target.value = ""; }} />
        </div>
      </div>
      <div className="fm-controls">
        <div className="fm-control-grid">
          <Field label="Formation">
            <Select value={formation} onChange={(e) => setFormation(e.target.value)} opts={["4-3-3", "4-4-2", "3-5-2"]} />
          </Field>
          <Field label="Total Halves">
            <Select value={totalHalves} onChange={(e) => setTotalHalves(+e.target.value)} opts={[2, 3, 4, 5, 6]} />
          </Field>
          <Field label="Current Half">
            <Select value={currentHalf} onChange={(e) => setCurrentHalf(+e.target.value)}
              opts={Array.from({ length: totalHalves }, (_, i) => i + 1)} />
          </Field>
        </div>
        <div className="fm-btn-row">
          <button className="fm-btn primary" onClick={onEndHalf}>
            {Ic.flag}{halfDone ? "Re-end Half" : "End Half"}
          </button>
          <button className="fm-btn ghost" onClick={onReset}>{Ic.reset}Reset Match</button>
          <button className="fm-btn danger" onClick={onClear}>{Ic.trash}Clear All</button>
        </div>
      </div>
    </section>
  );
}
function Field({ label, children }) {
  return <div className="fm-field"><label>{label}</label>{children}</div>;
}
function Select({ value, onChange, opts }) {
  return (
    <div className="fm-select-wrap">
      <select className="fm-select" value={value} onChange={onChange}>
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

/* =========================================================
   TACTICAL BOARD
   ========================================================= */
function PitchLines() {
  return (
    <div className="fm-pitch-lines">
      <div className="ln" style={{ left: "8%", right: "8%", top: "49.4%", height: 0, borderWidth: "2px 0 0" }} />
      <div className="ln" style={{ left: "32%", right: "32%", top: "50%", aspectRatio: "1", borderRadius: "50%", transform: "translateY(-50%)" }} />
      <div className="ln" style={{ left: "26%", right: "26%", top: "-2px", height: "12%", borderTop: "none", borderRadius: "0 0 8px 8px" }} />
      <div className="ln" style={{ left: "38%", right: "38%", top: "-2px", height: "5%", borderTop: "none", borderRadius: "0 0 6px 6px" }} />
      <div className="ln" style={{ left: "26%", right: "26%", bottom: "-2px", height: "12%", borderBottom: "none", borderRadius: "8px 8px 0 0" }} />
      <div className="ln" style={{ left: "38%", right: "38%", bottom: "-2px", height: "5%", borderBottom: "none", borderRadius: "6px 6px 0 0" }} />
    </div>
  );
}

function Slot({ slot, assignment, changed, players, over, onRemove, onPick }) {
  const starterP = players[assignment.starter];
  const subP = players[assignment.sub];
  const hotStarter = over && over.slot === slot.id && over.kind === "starter";
  const hotSub = over && over.slot === slot.id && over.kind === "sub";
  return (
    <div className={"fm-slot" + (changed ? " changed" : "")} style={{ left: slot.x + "%", top: slot.y + "%" }}>
      <div className="fm-slot-label">
        {slot.label}
        {changed && <span className="fm-changed-badge">!</span>}
      </div>
      <div className="fm-slot-zones">
        <div className={"fm-zone-starter " + (starterP ? "filled" : "empty") + (hotStarter ? " drop-hot" : "")}
          data-dropzone="slot" data-slot={slot.id} data-kind="starter"
          role={!starterP ? "button" : undefined} tabIndex={!starterP ? 0 : undefined}
          aria-label={!starterP ? "Pick starter for " + slot.label : undefined}
          onClick={!starterP ? () => onPick(slot.id, "starter") : undefined}>
          {!starterP && <span className="fm-zone-plus" aria-hidden="true">+</span>}
          {!starterP && <span className="fm-zone-tag">Starter</span>}
          {starterP && <Token player={starterP} onRemove={() => onRemove(slot.id, "starter")} onTap={() => onPick(slot.id, "starter")} />}
        </div>
        <div className={"fm-zone-sub " + (subP ? "filled" : "empty") + (hotSub ? " drop-hot" : "")}
          data-dropzone="slot" data-slot={slot.id} data-kind="sub"
          role={!subP ? "button" : undefined} tabIndex={!subP ? 0 : undefined}
          aria-label={!subP ? "Pick substitute for " + slot.label : undefined}
          onClick={!subP ? () => onPick(slot.id, "sub") : undefined}>
          {!subP && <span className="fm-zone-plus" aria-hidden="true">+</span>}
          {!subP && <span className="fm-zone-tag">Sub</span>}
          {subP && <Token player={subP} small onRemove={() => onRemove(slot.id, "sub")} onTap={() => onPick(slot.id, "sub")} />}
        </div>
      </div>
    </div>
  );
}

function Token({ player, onRemove, onTap }) {
  const drag = useDragController();
  return (
    <div className="fm-token" title="Drag to move · tap to swap"
      onPointerDown={(e) => { e.stopPropagation(); drag.startDrag(player, e, { onTap }); }}>
      <span className="fm-token-name">{player.name}</span>
      <button className="fm-token-x" aria-label={"Remove " + player.name}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onRemove(); }}>×</button>
    </div>
  );
}

function Board({ slots, assignments, changed, players, orient, onRemove, onPick }) {
  const drag = useDragController();
  const over = drag.over && drag.over.slot ? drag.over : null;
  return (
    <section className="fm-card fm-board-card">
      <div className="fm-sec-head">
        <h2 className="fm-sec-title"><span className="bar" />Tactical Board</h2>
        <span className="fm-sec-sub">Tap a slot or drag to assign</span>
      </div>
      <div className="fm-board-scroll">
        <div className="fm-pitch">
          <PitchLines />
          {slots.map((s) => (
            <Slot key={s.id} slot={s} assignment={assignments[s.id] || { starter: null, sub: null }}
              changed={changed[s.id]} players={players} over={over} onRemove={onRemove} onPick={onPick} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   PLAYER POOL
   ========================================================= */
function PlayerBadge({ player, halvesValue }) {
  const drag = useDragController();
  return (
    <div className="fm-badge" onPointerDown={(e) => drag.startDrag(player, e)}>
      <span className="fm-grip"><span /><span /><span /><span /><span /><span /></span>
      <span className={"fm-pos-chip pos-" + player.pos}>{player.pos}</span>
      <span className="fm-badge-body">
        <span className="fm-badge-name">{player.name}</span>
        <span className="fm-badge-meta"><b>{halvesValue.toFixed(1)}</b> halves</span>
      </span>
    </div>
  );
}

function PlayerPool({ players, assignments, playtime }) {
  const unplaced = window.FM.unplacedPlayers(players, assignments);
  const groups = ["GK", "DF", "MF", "FW", "UNKNOWN"];
  const byPos = {};
  groups.forEach((g) => (byPos[g] = []));
  unplaced.forEach((p) => (byPos[p.pos] || byPos.UNKNOWN).push(p));
  const drag = useDragController();
  const poolHot = drag.over && drag.over.pool;
  return (
    <section className="fm-card" data-dropzone="pool"
      style={poolHot ? { borderColor: "var(--accent-bright)", boxShadow: "0 0 0 3px color-mix(in oklab, var(--accent-bright) 25%, transparent)" } : null}>
      <div className="fm-sec-head">
        <h2 className="fm-sec-title"><span className="bar" />Player Pool</h2>
        <span className="fm-sec-sub">{unplaced.length} available</span>
      </div>
      <div className="fm-pool">
        {players.length === 0 && <div className="fm-pool-empty">No players yet. Tap <b>＋</b> to add one, or use <b>Import Players</b>.</div>}
        {players.length > 0 && unplaced.length === 0 && <div className="fm-pool-empty">Everyone is on the board. Drag a token back here to free them up.</div>}
        {groups.map((g) => byPos[g].length > 0 && (
          <div className="fm-pool-group" key={g}>
            <div className="fm-group-label">{window.FM.POS_LABEL[g]}<span className="count">{byPos[g].length}</span></div>
            <div className="fm-badges">
              {byPos[g].map((p) => <PlayerBadge key={p.id} player={p} halvesValue={playtime[p.id] || 0} />)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* =========================================================
   IMPORT PANEL (collapsible)
   ========================================================= */
function ImportPanel({ text, setText, onImport }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="fm-card">
      <button className={"fm-collapse-head" + (open ? " open" : "")} onClick={() => setOpen(!open)}>
        <h2 className="fm-sec-title"><span className="bar" />Import Players</h2>
        <span className="chev">{Ic.chev}</span>
      </button>
      {open && (
        <div className="fm-import-body">
          <textarea className="fm-textarea" value={text} onChange={(e) => setText(e.target.value)}
            placeholder={"Paste players, one per line...\n1. Alex Morgan, GK\n2) Sam - DF\nJordan FW + Riley MF"} />
          <div className="fm-import-hint">
            Position via comma, dash, or trailing token — <code>Name, FW</code>. List prefixes
            (<code>1.</code> <code>2)</code>) and <code>+</code> for multiple names per line are handled. Defaults to UNKNOWN.
          </div>
          <button className="fm-btn primary" style={{ flex: "0 0 auto", alignSelf: "flex-start" }}
            onClick={() => onImport()}>{Ic.upload}Import Players</button>
        </div>
      )}
    </section>
  );
}

/* =========================================================
   SUMMARY
   ========================================================= */
function Summary({ players, playtime, onDeletePlayer }) {
  const total = players.length;
  const values = players.map((p) => playtime[p.id] || 0);
  const avg = total ? values.reduce((a, b) => a + b, 0) / total : 0;
  const rows = [...players].sort((a, b) => (playtime[b.id] || 0) - (playtime[a.id] || 0));
  const statusLabel = { "not-played": "Not played", low: "Low", high: "High" };
  return (
    <section className="fm-card">
      <div className="fm-sec-head">
        <h2 className="fm-sec-title"><span className="bar" />Playtime Summary</h2>
      </div>
      <div className="fm-summary">
        <div className="fm-stat-row">
          <div className="fm-stat"><span className="num">{total}</span><span className="lbl">Total Players</span></div>
          <div className="fm-stat"><span className="num"><em>{avg.toFixed(1)}</em></span><span className="lbl">Average Halves</span></div>
        </div>
        {total === 0 ? (
          <div className="fm-pool-empty">Add players to see playtime fairness.</div>
        ) : (
          <table className="fm-table">
            <thead>
              <tr><th>Name</th><th>Pos</th><th className="r">Halves</th><th className="r">Status</th><th aria-label="Delete" /></tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const v = playtime[p.id] || 0;
                const st = window.FM.statusFor(v, avg);
                return (
                  <tr key={p.id}>
                    <td className="nm">{p.name}</td>
                    <td><span className={"fm-mini-chip pos-" + p.pos}>{p.pos}</span></td>
                    <td className="r hv">{v.toFixed(1)}</td>
                    <td className="r"><span className={"fm-pill " + st}><span className="pdot" />{statusLabel[st]}</span></td>
                    <td className="r"><button className="fm-row-del" title={"Delete " + p.name}
                      aria-label={"Delete " + p.name} onClick={() => onDeletePlayer(p)}>{Ic.trash}</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

/* =========================================================
   ADD PLAYER MODAL
   ========================================================= */
function AddPlayerModal({ onClose, onAdd }) {
  const [name, setName] = useState("");
  const [pos, setPos] = useState("UNKNOWN");
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current && inputRef.current.focus(); }, []);
  const submit = () => { if (name.trim()) onAdd(name.trim(), pos); };
  return (
    <div className="fm-modal-back" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fm-modal" role="dialog" aria-modal="true" aria-label="Add player">
        <div className="fm-modal-grip" />
        <h3>Add Player</h3>
        <p className="sub">Add a player to the squad for this match.</p>
        <div className="fm-field">
          <label>Name</label>
          <input ref={inputRef} className="fm-input" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Riley" onKeyDown={(e) => e.key === "Enter" && submit()} />
        </div>
        <div className="fm-field">
          <label>Position</label>
          <Select value={pos} onChange={(e) => setPos(e.target.value)} opts={window.FM.POSITIONS} />
        </div>
        <div className="fm-modal-actions">
          <button className="fm-btn ghost" onClick={onClose}>Cancel</button>
          <button className="fm-btn primary" onClick={submit} disabled={!name.trim()}>{Ic.plus}Add Player</button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   PLAYER PICKER (tap-to-assign — mobile-friendly)
   Tap an empty slot zone → choose from the pool → fills it.
   ========================================================= */
function PlayerPickerModal({ slotLabel, kind, players, assignments, playtime, current, onChoose, onClear, onClose }) {
  const unplaced = window.FM.unplacedPlayers(players, assignments);
  const groups = ["GK", "DF", "MF", "FW", "UNKNOWN"];
  const byPos = {};
  groups.forEach((g) => (byPos[g] = []));
  unplaced.forEach((p) => (byPos[p.pos] || byPos.UNKNOWN).push(p));
  const kindLabel = kind === "starter" ? "Starter" : "Substitute";
  return (
    <div className="fm-modal-back" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fm-modal fm-pick-modal" role="dialog" aria-modal="true" aria-label={(current ? "Swap " : "Choose ") + kindLabel}>
        <div className="fm-modal-grip" />
        <div className="fm-pick-head">
          <div className="fm-pick-titles">
            <h3>{current ? "Swap " : "Choose "}{kindLabel}</h3>
            <p className="sub">For <b>{slotLabel}</b>{current ? <span> · currently <b>{current.name}</b></span> : <span> · tap a player from the pool</span>}</p>
          </div>
          <button className="fm-pick-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        {current && (
          <button className="fm-pick-clear" onClick={onClear}>{Ic.trash}Remove {current.name} from {slotLabel}</button>
        )}
        <div className="fm-pick-list">
          {unplaced.length === 0 && (
            <div className="fm-pool-empty">{current ? "No other available players to swap in. Free someone from the board, or add players with " : "No available players. Free someone from the board, or add players with "}<b>＋</b>.</div>
          )}
          {groups.map((g) => byPos[g].length > 0 && (
            <div className="fm-pool-group" key={g}>
              <div className="fm-group-label">{window.FM.POS_LABEL[g]}<span className="count">{byPos[g].length}</span></div>
              <div className="fm-pick-rows">
                {byPos[g].map((p) => (
                  <button key={p.id} className="fm-pick-row" onClick={() => onChoose(p)}>
                    <span className={"fm-pos-chip pos-" + p.pos}>{p.pos}</span>
                    <span className="fm-pick-name">{p.name}</span>
                    <span className="fm-pick-meta"><b>{(playtime[p.id] || 0).toFixed(1)}</b> halves</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  Ic, Toast, Header, Controls, Board, Slot, Token, PlayerPool, PlayerBadge,
  ImportPanel, Summary, AddPlayerModal, PlayerPickerModal,
});
