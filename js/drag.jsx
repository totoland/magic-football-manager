/* ============================================================
   Pointer-based drag system (touch + mouse) — PRD UX-10.
   - <DragProvider onDrop> renders the floating ghost
   - useDragController() -> { startDrag, dragging, over }
   - startDrag(player, e, { onTap }) : a press that never crosses
     the movement threshold is treated as a TAP (calls onTap) rather
     than a drag — this powers tap-to-assign / tap-to-swap on mobile.
   - Drop zones are plain DOM nodes carrying:
       data-dropzone="slot|pool", data-slot="s3", data-kind="starter|sub"
   ============================================================ */
const DragCtx = React.createContext(null);
const DRAG_THRESHOLD = 6; // px before a press becomes a drag

function DragProvider({ onDrop, children }) {
  const [dragging, setDragging] = React.useState(null); // player object (only once moving)
  const [pos, setPos] = React.useState({ x: 0, y: 0 });
  const [over, setOver] = React.useState(null);         // {slot,kind} | {pool:true} | null
  const overRef = React.useRef(null);
  const draggingRef = React.useRef(null);
  const startRef = React.useRef({ x: 0, y: 0 });
  const movedRef = React.useRef(false);
  const onTapRef = React.useRef(null);

  const resolveZone = (x, y) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const zone = el.closest("[data-dropzone]");
    if (!zone) return null;
    if (zone.dataset.dropzone === "pool") return { pool: true };
    return { slot: zone.dataset.slot, kind: zone.dataset.kind };
  };

  const move = (e) => {
    const x = e.clientX, y = e.clientY;
    if (!movedRef.current) {
      const dx = x - startRef.current.x, dy = y - startRef.current.y;
      if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return; // still a potential tap
      movedRef.current = true;                  // crossed threshold → real drag begins
      setDragging(draggingRef.current);
      document.body.classList.add("fm-dragging");
    }
    setPos({ x, y });
    const z = resolveZone(x, y);
    overRef.current = z;
    setOver(z);
    if (e.cancelable) e.preventDefault();
  };

  const cleanup = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", finish);
    window.removeEventListener("pointercancel", abort);
    draggingRef.current = null;
    overRef.current = null;
    onTapRef.current = null;
    setDragging(null);
    setOver(null);
    document.body.classList.remove("fm-dragging");
  };

  const finish = () => {
    const moved = movedRef.current;
    const z = overRef.current;
    const player = draggingRef.current;
    const onTap = onTapRef.current;
    cleanup();
    if (moved) { if (player && z) onDrop && onDrop(player, z); }
    else if (onTap) onTap();                    // tap (no movement) → contextual action
  };

  const abort = () => { cleanup(); };           // pointercancel: neither drop nor tap

  const startDrag = (player, e, opts) => {
    draggingRef.current = player;
    startRef.current = { x: e.clientX, y: e.clientY };
    movedRef.current = false;
    onTapRef.current = opts && opts.onTap ? opts.onTap : null;
    setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", abort);
    if (e.cancelable) e.preventDefault();
  };

  return (
    <DragCtx.Provider value={{ startDrag, dragging, over }}>
      {children}
      {dragging && (
        <div className="fm-drag-ghost" style={{ left: pos.x, top: pos.y }}>
          <span className={"fm-pos-chip pos-" + dragging.pos}>{dragging.pos}</span>
          <span className="fm-ghost-name">{dragging.name}</span>
        </div>
      )}
    </DragCtx.Provider>
  );
}

function useDragController() {
  return React.useContext(DragCtx);
}

Object.assign(window, { DragProvider, useDragController, DragCtx });
