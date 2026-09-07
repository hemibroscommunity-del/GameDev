import React, { useEffect, useRef, useState } from 'react';
import { COL, getState } from './dash/common.js';
import { ZONES } from '../../data/zones.js';
import { DEPTH_CONFIG } from '../../data/lifeSkills.js';

/* v2.3.1333: zone header rail (owner + ChatGPT spec).  The floating
   zone label kept getting lost against bright world art, and the
   circular back-arrow FAB read as navigation, not logout.  One slim
   recessed rail replaces both: raised logout chip (door + outward
   arrow, CONFIRMATION required) on the left, zone name centered, an
   empty right column the same width as the chip so the title is
   optically centered on the SCREEN, not in the leftover space.
   Deliberately shallower than the dashboard band — a header rail, not
   another panel.  Assets: zone-header-bar.svg (9-slice, styled in
   game.css .bt-zone-header) + logout-door-icon.svg. */

const V = '?v=2.3.1333c'; /* v2.3.1333c: bigger logout glyph */

/* Same zone + depth suffix the old floating label showed — the info
   survives, only the housing changed.  Title stays white per spec
   (the old per-element tint fought the recessed navy face). */
function zoneTitle(S) {
  const zoneId = (S && S.currentZone) || 'town';
  const z = ZONES[zoneId];
  const name = (z && z.name) || 'Town';
  const depth = S && S._currentDepth;
  if (depth && depth !== 'shallow' && zoneId !== 'town') {
    const lr = (DEPTH_CONFIG[depth] && DEPTH_CONFIG[depth].lvlRange) || [1, 10];
    return `${name} — ${depth.toUpperCase()} (Lv${lr[0]}-${lr[1]})`;
  }
  if (z && z.level && z.level[1] > 0) return `${name} (Lv${z.level[0]}-${z.level[1]})`;
  return name;
}

export const ZoneHeader = ({ onExit }) => {
  const [, force] = useState(0);
  const [confirming, setConfirming] = useState(false);
  /* v2.3.2240: the owner's test panel opens on a 1.2s press of the zone
     name (src/ui/panels/DevPanel.jsx).  Here rather than in a HUD button
     because the header is always on screen in the world and nobody
     press-and-holds a title by accident — and the owner has asked more than
     once to keep the HUD clear.  Lazily imported so the panel's code is not
     in the bundle every player downloads on the critical path.
     It is not a secret door: without the ADMIN_KEY the panel can do
     nothing, because every action it offers is an authenticated HTTP call
     (server/src/devtools.js). */
  const [showDev, setShowDev] = useState(false);
  const [DevPanelC, setDevPanelC] = useState(null);
  const holdRef = useRef(null);
  const openDev = () => {
    import('../panels/DevPanel.jsx')
      .then((m) => { setDevPanelC(() => m.DevPanel); setShowDev(true); })
      .catch(() => {});
  };
  const holdStart = () => {
    if (holdRef.current) clearTimeout(holdRef.current);
    holdRef.current = setTimeout(openDev, 1200);
  };
  const holdEnd = () => {
    if (holdRef.current) { clearTimeout(holdRef.current); holdRef.current = null; }
  };
  useEffect(() => holdEnd, []);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 500);
    return () => clearInterval(id);
  }, []);

  const S = getState();
  if (!S) return null;

  /* v2.3.2320: the same field, read the same way as every other readout in
     the game — `S.rpg.coins`, live, never cached here.  Under protocol v2
     `coins` arrives only in the ticks where it CHANGED (wsClient's
     present-gated write), so a component that kept its own copy would show a
     stale purse forever.  The 500ms force-render above already repaints this
     rail, so the number is at most half a second behind settlement. */
  const gold = (S.rpg && (S.rpg.coins || 0)) || 0;

  const doExit = () => {
    /* v2.3.785/786 lineage (moved from the retired bt-exit-fab):
       full-screen dim + spinner appended OUTSIDE the React tree so
       teardown can't remove it; navigate on the next frame so it
       paints first. */
    try {
      const dim = document.createElement('div');
      dim.className = 'bt-exit-dim';
      const sp = document.createElement('div');
      sp.className = 'bt-exit-loading';
      const lbl = document.createElement('div');
      lbl.className = 'bt-exit-label';
      lbl.textContent = 'Reloading…';
      dim.appendChild(sp);
      dim.appendChild(lbl);
      document.body.appendChild(dim);
    } catch (e) {}
    requestAnimationFrame(() => setTimeout(onExit, 30));
  };

  return (
    <>
      <header className="bt-zone-header" aria-label="Current zone">
        <button
          type="button"
          className="bt-chisel bt-chisel--chip bt-zone-header__logout"
          aria-label="Log out to the character screen"
          onClick={() => setConfirming(true)}
        >
          <img src={`/icons/ui/logout-door-icon.svg${V}`} alt="" draggable={false} />
        </button>
        <div
          className="bt-zone-header__title"
          onPointerDown={holdStart}
          onPointerUp={holdEnd}
          onPointerLeave={holdEnd}
          onPointerCancel={holdEnd}
          /* iOS Safari raises the callout/selection menu on a long press over
             text, which would cover the panel the moment it opened. */
          onContextMenu={(e) => e.preventDefault()}
          style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
        >{zoneTitle(S)}</div>
        {/* ═══ v2.3.2320: THE PURSE LIVES HERE NOW ═══
            Owner: "Move gold amount display to very top right on the top bar
            that lists the zone name."

            This column was an EMPTY 38px spacer whose only job was optical —
            match the logout chip so the title centred on the SCREEN rather
            than in the leftover (the v2.3.1333 note above).  It is named
            `__balance` because a balance is what it was always for; it just
            never held one.  Now it does, and the symmetry it was protecting
            is spent on the thing it was reserved for.

            THIS IS A MOVE, NOT A COPY.  The band purse (IdentityStrip) and
            the landscape chip (BottomDashboard's LandGoldChip) both retire in
            the same change — the one-count rule that killed the v2.3.1563
            floating chip ("two live gold counts on one screen disagree the
            moment one of them lags") applies to this one exactly as hard, and
            it is why the readout could not simply be added here.

            NO `.bt-coin-glimmer` ON THIS COPY.  The band's number wore it and
            the Hero strip still names it, and it is `background-clip:text` +
            `-webkit-text-fill-color: transparent` under a 2.8s infinite
            animation.  That was written for an opaque surface (the character
            card), and every surface it has run on since has been opaque too.
            This rail is `position:fixed` directly over the live WebGL canvas,
            which is the compositing arrangement TRAPS §42 records as the iOS
            grain hazard (the v2.3.948 charge pie, the v2.3.1236 joystick
            bases).  A flat gold fill costs one shimmer and buys the primary
            platform out of a known trap.

            `data-purse` travels with the number, so the trade receipt's gold
            toss still finds it (TradeWindowPanel's landingRect).  It flies UP
            to the rail now instead of down into the band — the coins go to
            where the coins are, which is the promise that animation makes.

            pointer-events stays inherited-`none` from the rail: this is a
            readout over the world, and anything here that took a touch would
            steal it from the game underneath. */}
        <div className="bt-zone-header__balance" data-purse="1"
          aria-label={`${gold} gold`}>
          <img src="/icons/popups/gold.webp" alt="" draggable={false} />
          <span>{Number(gold).toLocaleString()}</span>
        </div>
      </header>

      {showDev && DevPanelC && <DevPanelC onClose={() => setShowDev(false)} />}

      {confirming && (
        <div
          onPointerDown={() => setConfirming(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9500,
            background: 'rgba(5, 9, 12, 0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              width: 'min(280px, calc(100vw - 48px))',
              background: COL.bg,
              border: `1px solid ${COL.borderStrong}`,
              borderRadius: 12,
              padding: '14px 14px 12px',
              boxShadow: '0 14px 30px rgba(4,7,9,.38)',
              fontFamily: 'Source Sans 3, sans-serif',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: COL.text }}>Leave the world?</div>
            <div style={{ fontSize: 12, color: COL.text2, marginTop: 4 }}>
              You&apos;ll return to the character screen.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className="bt-chisel bt-chisel--chip"
                style={{ flex: 1, minHeight: 40, fontSize: 13, fontWeight: 700, color: COL.text2 }}
                onClick={() => setConfirming(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bt-chisel bt-chisel--danger"
                style={{ flex: 1, minHeight: 40, fontSize: 13, fontWeight: 800 }}
                onClick={doExit}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
