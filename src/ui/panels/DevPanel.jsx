import React, { useEffect, useState, useCallback } from 'react';
import { COL, getState } from '../mobile/dash/common.js';
import { BT_API_BASE } from '../../networking/index.js';
import { WORLDVIEW_EXITS } from '../../data/index.js';

/* ═══ v2.3.2240: THE OWNER'S TEST PANEL ═══
 *
 * Owner: "Is there a test suite you can build that allows me to test features
 * directly without needing to play through the quest line?  Having to play
 * through slows down development greatly."
 *
 * Concretely: the fire trail (v2.3.2238) lives in ember, ember is gated
 * behind tut_4, and tut_4 is the fourth link of a chain that crosses three
 * other zones.  Looking at a new ember mechanic on a phone meant replaying
 * the tutorial, and a feature you cannot look at is a feature you cannot
 * judge.
 *
 * ── WHY THIS IS NOT A CHEAT SURFACE ──────────────────────────────────────
 * Every privileged action here is an HTTP call to the ADMIN_KEY-gated
 * operator API (server/src/devtools.js).  This file adds NO client->server
 * websocket message, which is the whole argument rather than a detail: the
 * socket is deny-by-default precisely because anything a client can SAY a
 * cheater can say too.  Without the owner's key this panel is scaffolding —
 * the worker answers 401, or 404 when no key is configured at all.
 *
 * The key is typed once and kept in localStorage on the owner's own device.
 * It is never bundled, never sent anywhere but the worker's admin routes,
 * and clearing it is one button.
 *
 * ── HOW YOU OPEN IT ──────────────────────────────────────────────────────
 * A 1.2s long-press on the zone name in the header (ZoneHeader).  Chosen
 * because it is always on screen in the world, it is not a control anybody
 * taps by accident, and it needs no new furniture in a HUD the owner has
 * repeatedly asked to keep clear.  There is no discovery affordance: a
 * player who does not know it is there never finds it, and if they did it
 * would ask for a key they do not have.
 *
 * ── WARP IS "STAND ME AT THE DOOR" ───────────────────────────────────────
 * Deliberately NOT a teleport.  Entering a zone is a long, load-bearing
 * sequence — per-zone asset preload behind the loading overlay (CLAUDE.md's
 * ZONE-ASSET EXCEPTION), freeing the previous map, zone dimensions, ambient
 * audio, encyclopedia discovery, quest flags, depth reset, and the server
 * move — all of it inside handleZoneTransitions.  A dev button that
 * re-implemented that would drift from the real path and start reporting
 * bugs that do not exist, and one that skipped the preload would break the
 * animation-preloading law outright.
 *
 * So this puts the player ON the trail-head and lets the game walk itself
 * through its own front door.  It works from the worldview map, where every
 * zone's door is (WORLDVIEW_EXITS); from anywhere else the panel says so
 * rather than half-working.
 */

const KEY_LS = 'bt_dev_key';

const box = {
  position: 'fixed', inset: 0, zIndex: 9800,
  background: 'rgba(5, 9, 12, 0.72)',
  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
  padding: '18px 12px', overflowY: 'auto',
};
const sheet = {
  width: '100%', maxWidth: 380, background: COL.bg,
  border: '1px solid ' + COL.borderStrong, borderRadius: 12,
  padding: 14, color: COL.text,
  font: '14px system-ui, -apple-system, sans-serif',
  boxShadow: '0 18px 48px rgba(0,0,0,0.55)',
};
const btn = (on) => ({
  appearance: 'none', width: '100%', textAlign: 'left',
  background: on ? COL.accentFill : COL.raised,
  border: '1px solid ' + (on ? COL.accent : COL.border),
  color: COL.text, borderRadius: 9, padding: '11px 12px',
  font: '600 14px system-ui, sans-serif', marginBottom: 8, cursor: 'pointer',
  minHeight: 44,     /* a real touch target — this is used on a phone */
});
const chip = {
  appearance: 'none', background: COL.raised, border: '1px solid ' + COL.border,
  color: COL.text, borderRadius: 8, padding: '9px 10px',
  font: '600 13px system-ui, sans-serif', cursor: 'pointer', minHeight: 40,
};
const label = { color: COL.muted, font: '600 11px system-ui, sans-serif', letterSpacing: '.06em', textTransform: 'uppercase', margin: '14px 0 7px' };

export const DevPanel = ({ onClose }) => {
  const [key, setKey] = useState(() => { try { return localStorage.getItem(KEY_LS) || ''; } catch (e) { return ''; } });
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [state, setState] = useState(null);

  const S = getState();
  const myId = S && S.myId;

  const call = useCallback(async (path, body) => {
    if (!key) { setMsg('Enter your admin key first.'); return null; }
    setBusy(true);
    try {
      const res = await fetch(BT_API_BASE + '/api/admin' + path, {
        method: body ? 'POST' : 'GET',
        headers: Object.assign({ Authorization: 'Bearer ' + key },
          body ? { 'Content-Type': 'application/json' } : {}),
        body: body ? JSON.stringify(body) : undefined,
      });
      const j = await res.json().catch(() => ({}));
      /* Say WHICH failure it was.  401 and 404 mean very different things
         here — a typo in the key versus no key configured on the worker at
         all — and guessing between them wastes an afternoon. */
      if (res.status === 401) { setMsg('Key rejected (401). Check for a typo.'); return null; }
      if (res.status === 404 && !j.ok) {
        if (j.error !== 'Not found') { setMsg('Not found (404) — is that character online?'); return null; }
        /* ═══ TWO VERY DIFFERENT 404s, AND THEY LOOK IDENTICAL ═══
           The admin surface answers {ok:false, error:'Not found'} with a 404
           BOTH when no ADMIN_KEY is configured (the deliberate fail-closed
           posture — the surface must be indistinguishable from a route that
           does not exist) and when the key is fine but the worker predates
           these routes.  That second case is the normal one right after
           setting a key: Pages previews rebuild only the CLIENT, so the
           worker keeps running whatever main last deployed.

           Reported as "no key set", it sends the owner back to Cloudflare to
           re-add a key that was never the problem.  So probe /overview,
           which every worker since v2.3.1148 has had: if THAT answers, the
           key is good and the worker is simply behind.  Deliberately not
           solved by making the fail-closed 404 distinguishable — that would
           trade away the security property on purpose. */
        try {
          const probe = await fetch(BT_API_BASE + '/api/admin/overview', { headers: { Authorization: 'Bearer ' + key } });
          if (probe.ok) {
            setMsg('Your key works, but this worker does not have the test routes yet — it needs the deploy that ships them.');
          } else if (probe.status === 401) {
            setMsg('Key rejected (401). Check for a typo.');
          } else {
            setMsg('No ADMIN_KEY set on the worker (404). See OPERATIONS.md.');
          }
        } catch (e) {
          setMsg('No ADMIN_KEY set on the worker (404). See OPERATIONS.md.');
        }
        return null;
      }
      if (!res.ok || !j.ok) { setMsg('Failed: ' + (j.error || res.status)); return null; }
      return j;
    } catch (e) {
      setMsg('Network error: ' + String(e).slice(0, 80));
      return null;
    } finally { setBusy(false); }
  }, [key]);

  const refresh = useCallback(async () => {
    if (!key || !myId) return;
    const j = await call('/dev/state?id=' + encodeURIComponent(myId));
    if (j) { setState(j); setMsg(''); }
  }, [call, key, myId]);

  useEffect(() => { refresh(); }, [refresh]);

  const saveKey = () => {
    const k = draft.trim();
    if (!k) return;
    try { localStorage.setItem(KEY_LS, k); } catch (e) {}
    setKey(k); setDraft(''); setMsg('');
  };
  const forgetKey = () => {
    try { localStorage.removeItem(KEY_LS); } catch (e) {}
    setKey(''); setState(null); setMsg('Key cleared from this device.');
  };

  /* ═══ v2.3.2308: FROM WHEREVER YOU ARE STANDING ═══
     This used to place you on a trail-head and required you to already be on
     the World View; from town -- where a session starts -- the chips printed
     "head there first" and did nothing at all.  Proven, not assumed:
     mp-devwarp pressed the Flame Fields chip from town and the player was
     still in town thirty seconds later on both the client and the worker.

     Now it hands a DESTINATION to the game loop (driveDevWarp in
     zoneTransitions.js), which walks the game's own front doors one leg at a
     time -- town -> World View -> the spoke, or out of a spoke through its
     return marker first.  Every leg is a real zone entry, so the per-zone
     asset preload behind the loading overlay still happens and the
     animation-preloading law is untouched.  Nothing here reimplements a
     transition, which is why it cannot drift from the one players use. */
  const warp = (zoneId) => {
    const st = getState();
    if (!st || !st.player) return;
    if (st.currentZone === zoneId) { setMsg('You are already there.'); return; }
    const ex = WORLDVIEW_EXITS.find((e) => e.zoneId === zoneId);
    if (!ex) { setMsg('No door to ' + zoneId + ' on the World View.'); return; }
    st._devWarp = { to: zoneId, legs: 0, t: Date.now(), nextAt: 0 };
    setMsg('Heading to ' + (ex.label || zoneId) + '…');
    if (onClose) onClose();
  };

  const zoneRows = WORLDVIEW_EXITS.filter((e) => e.zoneId !== 'town');

  return (
    <div style={box} onPointerDown={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div style={sheet}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <strong style={{ font: '700 16px system-ui, sans-serif' }}>Test panel</strong>
          <button type="button" style={{ ...chip, minHeight: 34 }} onClick={onClose}>Close</button>
        </div>
        <div style={{ color: COL.muted, fontSize: 12, marginBottom: 6 }}>
          Owner tools. Everything here needs your admin key.
        </div>

        {!key && (
          <>
            <div style={label}>Admin key</div>
            <input
              type="password" value={draft} onChange={(e) => setDraft(e.target.value)}
              placeholder="paste your ADMIN_KEY"
              autoCapitalize="off" autoCorrect="off" spellCheck={false}
              style={{ width: '100%', boxSizing: 'border-box', background: COL.well, color: COL.text,
                border: '1px solid ' + COL.border, borderRadius: 8, padding: '11px 10px', marginBottom: 8, minHeight: 44 }}
            />
            <button type="button" style={btn(true)} onClick={saveKey}>Save key on this device</button>
            <div style={{ color: COL.muted, fontSize: 12 }}>
              Stored only in this browser. Set the key in Cloudflare → Workers → brotown-server → Settings → Variables (see OPERATIONS.md).
            </div>
          </>
        )}

        {key && (
          <>
            <div style={label}>Zones</div>
            <button type="button" style={btn(false)} disabled={busy}
              onClick={async () => { const j = await call('/dev/unlock', { playerId: myId }); if (j) { setMsg(j.opened.length ? 'Opened: ' + j.opened.join(', ') : 'Already open.'); refresh(); } }}>
              Unlock every gated zone
            </button>
            {state && (
              <div style={{ color: COL.text2, fontSize: 12, marginBottom: 8 }}>
                {Object.keys(state.zones || {}).map((z) => (
                  <span key={z} style={{ marginRight: 10, color: state.zones[z] ? COL.accent : COL.disabled }}>
                    {state.zones[z] ? '● ' : '○ '}{z}
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 4 }}>
              {zoneRows.map((e) => (
                <button key={e.zoneId} type="button" style={chip}
                  onClick={() => warp(e.zoneId)}>
                  {e.label}
                </button>
              ))}
            </div>
            <div style={{ color: COL.muted, fontSize: 12, marginBottom: 2 }}>
              Works from anywhere — it walks you through the doors, so each zone
              still loads properly on the way in.
            </div>

            <div style={label}>Character</div>
            <button type="button" style={btn(false)} disabled={busy}
              onClick={async () => { const j = await call('/dev/kit', { playerId: myId }); if (j) { setMsg('Kit granted (' + j.weapons + ' weapons) — check your bag.'); refresh(); } }}>
              Give weapons + levels
            </button>
            <button type="button" style={btn(false)} disabled={busy}
              onClick={async () => { const j = await call('/dev/vitals', { playerId: myId, heal: true }); if (j) { setMsg('Topped up.'); refresh(); } }}>
              Heal / refill
            </button>
            <button type="button" style={btn(state && state.god)} disabled={busy}
              onClick={async () => { const on = !(state && state.god); const j = await call('/dev/vitals', { playerId: myId, heal: false, god: on }); if (j) { setMsg(on ? 'God mode ON — expires on its own.' : 'God mode off.'); refresh(); } }}>
              {state && state.god
                ? 'God mode ON — ' + Math.ceil((state.godMsLeft || 0) / 60000) + ' min left (tap to stop)'
                : 'God mode (stop taking damage)'}
            </button>

            <div style={label}>Key</div>
            {/* ═══ v2.3.2277: RESOURCES FOR TESTING ═══
                Owner: "also having access to extract resources for testing".
                No new server code: /api/admin/grant has credited arbitrary
                inventory keys since the operator API existed, and the QA
                harness has used it all along -- what was missing was a button.
                The TOOLS row is the one that actually unblocks him: without an
                axe/pole/pickaxe the renderer draws no nodes at all and the
                worker refuses both extraction_start and node_strike, so a
                fresh character cannot test gathering however many logs you
                hand him. */}
            <div style={label}>Resources</div>
            <button
              type="button" style={btn(false)} disabled={busy || !myId}
              onClick={async () => {
                let n = 0;
                for (const invKey of ['woodcutting_axe', 'fishing_pole', 'mining_pickaxe']) {
                  const j = await call('/grant', { playerId: myId, kind: 'item', payload: { invKey, count: 1 }, note: 'Test panel: gathering tools' });
                  if (j) n++;
                }
                setMsg(n ? 'Gathering tools granted (' + n + '/3) — trees, ponds and veins will draw now.' : 'Nothing granted.');
                refresh();
              }}>Give gathering tools (axe, pole, pickaxe)</button>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '6px 0' }}>
              {[
                { k: 'wood_pine_log', label: 'Logs' },
                { k: 'ore_copper_ore', label: 'Copper' },
                { k: 'fish_minnow', label: 'Minnow' },
              ].map((r) => (
                <button
                  key={r.k} type="button" style={{ ...chip, minHeight: 34 }} disabled={busy || !myId}
                  onClick={async () => {
                    const j = await call('/grant', { playerId: myId, kind: 'item', payload: { invKey: r.k, count: 10 }, note: 'Test panel: resources' });
                    if (j) { setMsg('+10 ' + r.label + '.'); refresh(); }
                  }}>+10 {r.label}</button>
              ))}
            </div>

            {/* ═══ v2.3.2277: FINISH EVERY QUEST ═══
                Owner: "Having the finish all quests button will be good in
                that mode."  A server op, because the worker is the only
                durable writer of quest state and its echo overwrites any
                client-local mark.  It pays no rewards -- see the note on
                _devFinishQuests -- and it opens the gated zones as a side
                effect, because 'turnedIn' satisfies the same gate 'active'
                does.  Said on the button rather than left to be discovered. */}
            <button
              type="button" style={btn(false)} disabled={busy || !myId}
              onClick={async () => {
                const j = await call('/dev/quests', { playerId: myId });
                if (j) {
                  setMsg(j.finished
                    ? 'Finished ' + j.finished + ' of ' + j.total + ' quests (no rewards paid) — the gated zones are open too.'
                    : 'Every quest was already finished.');
                  refresh();
                }
              }}>Finish all quests (no rewards)</button>

            <button type="button" style={{ ...btn(false), borderColor: COL.danger, color: COL.danger }} onClick={forgetKey}>
              Forget key on this device
            </button>
          </>
        )}

        {msg && <div style={{ marginTop: 10, color: COL.text2, fontSize: 13 }}>{msg}</div>}
        {busy && <div style={{ marginTop: 6, color: COL.muted, fontSize: 12 }}>Working…</div>}
      </div>
    </div>
  );
};
