import React, { useEffect, useState } from 'react';
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
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 500);
    return () => clearInterval(id);
  }, []);

  const S = getState();
  if (!S) return null;

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
        <div className="bt-zone-header__title">{zoneTitle(S)}</div>
        <div className="bt-zone-header__balance" aria-hidden="true" />
      </header>

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
