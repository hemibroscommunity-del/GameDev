import React, { useState } from 'react';
import { COL, panelStyle } from './common.js';
import { AccountKeyCard } from '../../account/AccountKeyCard.jsx';
import { AccountLoginForm } from '../../account/AccountLoginForm.jsx';
import { rosterCount } from '../../../networking/charRoster.js';   /* v2.3.4082: one bro or more, as the top bar's door asks */
import { keptQuery } from '../../keepSwitches.js';                 /* v2.3.4082: the door's address, as GameApp's */
import { swallowTapClick } from '../../swallowTapClick.js';

/* v2.3.1143: Account panel (More -> Account).  Two jobs: show this
   device's Login Key so the player can save it, and accept a key from
   another device to continue that character here.  All the actual
   logic lives in the shared account components + the networking
   helpers (see docs/specs/account-login.md). */
/* v2.3.1232: Lantern Slate pass — the two flows read as separate
   modules via spacing + the spec divider token, not cards
   (docs/LANTERN-SLATE-SPEC.md: no full cards around groupable
   content).  The shared account components own their own copy. */

/* ═══ v2.3.4082: LOG OUT / SWITCH CHARACTER, AT THE TOP OF ACCOUNT ═══
   The owner, adopting the review of his dashboard: "Switch character /
   logout: More → Account".  The top bar's door (ZoneHeader.jsx) does this
   today and comes off the bar once this is on main (the top-bar lane), so
   this is the same door: the same words, the same confirm window and the
   same "more than one bro" rule (v2.3.2421: "Switch Bro" when this device
   holds more than one, "Log Out" when it holds one), the same dim and
   spinner, the same one-shot note that opens the list of bros (v2.3.2447),
   and the same address GameApp hands the door (noresume + login, the page's
   switches kept: v2.3.1840, v2.3.3888).  Copied rather than imported because
   ZoneHeader is the other lane's file and its door is about to go. */
const manyBros = () => { try { return rosterCount() > 1; } catch (e) { return false; } };

function leaveTheWorld(many) {
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
  } catch (e) { /* no document: the navigation below still goes */ }
  if (many) { try { sessionStorage.setItem('bt_open_list', '1'); } catch (e) { /* private window */ } }
  requestAnimationFrame(() => setTimeout(() => {
    window.location.href = '/' + keptQuery(undefined, [['noresume', '1'], ['login', '1']]);
  }, 30));
}

const LogoutConfirm = ({ many, onCancel }) => (
  <div
    data-account-confirm={many ? 'switch' : 'logout'}
    onPointerDown={(e) => { e.stopPropagation(); onCancel(); }}
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
      <div style={{ fontSize: 15, fontWeight: 700, color: COL.text }}>{many ? 'Switch bro?' : 'Leave the world?'}</div>
      <div style={{ fontSize: 12, color: COL.text2, marginTop: 4 }}>
        {many
          ? 'You’ll go to your list of bros. This one is saved.'
          : 'You’ll return to the character screen.'}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          type="button"
          data-esc=""
          className="bt-chisel bt-chisel--chip"
          style={{ flex: 1, minHeight: 40, fontSize: 13, fontWeight: 700, color: COL.text2, touchAction: 'manipulation' }}
          onPointerUp={(e) => { e.stopPropagation(); swallowTapClick(e); onCancel(); }}
          onClick={(e) => { if (e.detail === 0) onCancel(); }}
        >
          Cancel
        </button>
        <button
          type="button"
          data-enter=""
          data-account-leave={many ? 'switch' : 'logout'}
          /* v2.3.2421's rule: the destroy red only when it reads as an exit */
          className={many ? 'bt-chisel bt-chisel--chip' : 'bt-chisel bt-chisel--danger'}
          style={{ flex: 1, minHeight: 40, fontSize: 13, fontWeight: 800, color: many ? COL.text : undefined, touchAction: 'manipulation' }}
          onClick={() => leaveTheWorld(many)}
        >
          {many ? 'Switch Bro' : 'Log Out'}
        </button>
      </div>
    </div>
  </div>
);

export const AccountPanel = () => {
  const [confirming, setConfirming] = useState(false);
  const many = manyBros();
  return (
    <div style={panelStyle}>
      <div style={{ paddingTop: 4 }}>
        <button
          type="button"
          data-account-door={many ? 'switch' : 'logout'}
          className="bt-chisel bt-chisel--chip"
          aria-label={many ? 'Switch bro, or log out' : 'Log out to the character screen'}
          onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
          style={{
            width: '100%', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontSize: 14, fontWeight: 800, color: COL.text, touchAction: 'manipulation', cursor: 'pointer',
          }}
        >
          <img src="/icons/ui/logout-door-icon.svg?v=2.3.1333c" alt="" draggable={false}
            style={{ width: 20, height: 20, objectFit: 'contain', pointerEvents: 'none' }} />
          {many ? 'Switch character' : 'Log out'}
        </button>
      </div>
      <div style={{ height: 1, background: COL.divider, margin: '12px 0' }} />
      <AccountKeyCard />
      <div style={{ height: 1, background: COL.divider, margin: '16px 0' }} />
      <AccountLoginForm />
      {confirming ? <LogoutConfirm many={many} onCancel={() => setConfirming(false)} /> : null}
    </div>
  );
};
