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

/* ═══ v2.3.2436: AN ADMIN CALL THAT NEVER ANSWERS ═══
 *
 * Owner, on a phone, against production: "I tapped the flags button and
 * nothing was happening."  The panel said "Working…" and stayed there.
 *
 * Every control here is `disabled={busy}`, and `busy` was cleared only in
 * the `finally` of the fetch.  `fetch` has NO timeout — so a request the
 * network swallows never settles, the finally never runs, and the whole
 * panel sits dead behind one word with no error and no way back except
 * closing it.  From the outside that is indistinguishable from a button
 * that does nothing, which is exactly how it was reported.
 *
 * Two separate defects came out of that, and both are fixed here:
 *
 *   1. Every admin call now aborts at ADMIN_TIMEOUT_MS and SAYS SO.  A
 *      stalled request can no longer take the panel with it.  The point is
 *      not the twelve seconds — it is that the promise always settles, so
 *      `finally` always runs and `busy` can never stick.
 *
 *   2. The refresh that fires automatically when the panel opens is now
 *      QUIET.  It used to set `busy`, which disabled the flags button the
 *      owner had not pressed yet — one request's stall silencing a control
 *      that has nothing to do with it.  It also used to write its failure
 *      into the status line, so a panel opened while your character was not
 *      in the room greeted you with "this worker does not have the test
 *      routes yet" about a request you never made.  An automatic background
 *      probe now neither disables anything nor narrates.
 */
const ADMIN_TIMEOUT_MS = 12000;
const fetchWithTimeout = async (url, init) => {
  /* AbortController + setTimeout rather than AbortSignal.timeout(): this
     runs on whatever Safari the owner's phone is carrying, and the two-line
     version needs no version floor to reason about. */
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ADMIN_TIMEOUT_MS);
  try { return await fetch(url, Object.assign({}, init || {}, { signal: ac.signal })); }
  finally { clearTimeout(t); }
};
const isAbort = (e) => !!e && (e.name === 'AbortError' || e.name === 'TimeoutError');
const TIMEOUT_MSG = 'No answer from the server after ' + (ADMIN_TIMEOUT_MS / 1000)
  + 's. Check your connection and press it again.';

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

/* ═══ v2.3.2436: WHAT THIS WORKER SAYS IT CAN DO ═══
 *
 * The live-flags rail below answers "WHY is a system off".  It needs the
 * admin key, a network round trip and a working admin surface — and when
 * any of those is missing it can say nothing at all, which is how the owner
 * ended up staring at a panel that would not tell them anything.
 *
 * This answers the question they were actually asking — "IS a system off?"
 * — from state the client is already holding.  No key, no request, nothing
 * that can stall.  It is the first thing in the panel for that reason.
 *
 * `state_sync.caps` is how a worker advertises what it handles, and the
 * client gates a legacy fallback path on each one (handoff rule 19).  A cap
 * that is FALSE and a cap that is ABSENT read identically to the client —
 * both mean "this worker has not claimed the job" — so both list as off
 * here.  Pretending to distinguish them would be a lie about how the gates
 * actually read.
 *
 * CAP_GATES is a REGISTRY, not a nice-to-have list: precheck's cap-registry
 * check fails the push if the client reads a `_serverCaps.<name>` that is
 * not in it.  Without that, the next capability added to the client would
 * be invisible here, and this panel would quietly report "all clear" while
 * the very system the owner is chasing was switched off.
 */
const CAP_GATES = [
  'abil', 'amuletForge', 'areaChat', 'arena', 'blockScale', 'botfp', 'broVerify',
  'charLock', 'chatMute', 'clans', 'dungeon', 'elemBurst', 'eventCapes', 'friends',
  'gamble', 'gemExtract', 'gems', 'guilds', 'harden', 'hpEndGrids', 'jackpot',
  'laststand', 'party', 'partyChat', 'petLoot', 'pets', 'potionBag', 'prog3',
  'prog3Chan', 'prog3x', 'questTrack', 'sponsor', 't2bench', 't2simple', 't2uniform',
  'trade', 'trade2', 'trade2Review', 'trade2Weapons', 'weaponDrops', 'whisper',
];

/* Plain language for the ones whose absence the owner has actually reported
   as a bug.  Deliberately NOT a full glossary: a made-up description is
   worse than the cap's own name, which at least matches what the flag is
   called and what OPERATIONS.md says about it. */
const CAP_NOTES = {
  prog3: 'the Points screen — combat levels read 0 without it',
  prog3x: 'the extra Points stats',
  prog3Chan: 'per-weapon point pools',
  abil: 'special moves — the sword dash, shield bash and whirlwind',
  elemBurst: 'the elemental burst',
  blockScale: 'the shield block count',
};

export const DevPanel = ({ onClose }) => {
  const [key, setKey] = useState(() => { try { return localStorage.getItem(KEY_LS) || ''; } catch (e) { return ''; } });
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [state, setState] = useState(null);

  const S = getState();
  const myId = S && S.myId;

  /* v2.3.2412: `method` added so the flags section can DELETE.  Defaulted
     from `body` exactly as before, so every existing call site is unchanged
     -- the alternative was a second fetch helper that would have drifted from
     this one's 401/404 handling, which is the part worth having. */
  const call = useCallback(async (path, body, method, opts) => {
    /* v2.3.2436: `quiet` is for calls the owner did not make — see the
       header.  It suppresses BOTH halves of the feedback (busy + message),
       because a background probe that disables buttons or writes errors is
       reporting on a request nobody asked for. */
    const quiet = !!(opts && opts.quiet);
    const say = quiet ? () => {} : setMsg;
    if (!key) { say('Enter your admin key first.'); return null; }
    if (!quiet) setBusy(true);
    try {
      const _m = method || (body ? 'POST' : 'GET');
      const res = await fetchWithTimeout(BT_API_BASE + '/api/admin' + path, {
        method: _m,
        headers: Object.assign({ Authorization: 'Bearer ' + key },
          body ? { 'Content-Type': 'application/json' } : {}),
        body: body ? JSON.stringify(body) : undefined,
      });
      const j = await res.json().catch(() => ({}));
      /* Say WHICH failure it was.  401 and 404 mean very different things
         here — a typo in the key versus no key configured on the worker at
         all — and guessing between them wastes an afternoon. */
      if (res.status === 401) { say('Key rejected (401). Check for a typo.'); return null; }
      if (res.status === 404 && !j.ok) {
        if (j.error !== 'Not found') { say('Not found (404) — is that character online?'); return null; }
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
        if (quiet) return null;   /* v2.3.2436: no second round trip for a call nobody made */
        try {
          const probe = await fetchWithTimeout(BT_API_BASE + '/api/admin/overview', { headers: { Authorization: 'Bearer ' + key } });
          if (probe.ok) {
            say('Your key works, but this worker does not have the test routes yet — it needs the deploy that ships them.');
          } else if (probe.status === 401) {
            say('Key rejected (401). Check for a typo.');
          } else {
            say('No ADMIN_KEY set on the worker (404). See OPERATIONS.md.');
          }
        } catch (e) {
          say('No ADMIN_KEY set on the worker (404). See OPERATIONS.md.');
        }
        return null;
      }
      if (!res.ok || !j.ok) { say('Failed: ' + (j.error || res.status)); return null; }
      return j;
    } catch (e) {
      /* v2.3.2436: an abort is OUR timeout, not the network refusing —
         calling it a network error sends the owner to check their wifi when
         the request was simply never answered. */
      say(isAbort(e) ? TIMEOUT_MSG : 'Network error: ' + String(e).slice(0, 80));
      return null;
    } finally { if (!quiet) setBusy(false); }
  }, [key]);

  const refresh = useCallback(async (quiet) => {
    if (!key || !myId) return;
    const j = await call('/dev/state?id=' + encodeURIComponent(myId), null, null, { quiet: !!quiet });
    if (j) { setState(j); if (!quiet) setMsg(''); }
  }, [call, key, myId]);

  /* v2.3.2436: quiet — nobody pressed this.  See the header. */
  useEffect(() => { refresh(true); }, [refresh]);

  /* ═══ v2.3.2412: LIVE FLAGS, BECAUSE ONE OF THEM CAN BREAK THE GAME ═══
     Owner, 2026-09-09, on production: combat levels reading 0 on the Points
     screen while the panel behind it read Lv 1 for the same character.  That
     pair is diagnostic -- the grid is gated on prog3Live (worker cap AND
     blob) and the panel on prog3HasSkills (blob only) -- so the blob was fine
     and `caps.prog3` was false.  A clean worker built from this source
     advertises 42 caps with prog3 true, so the source was never the problem.

     The mechanism is in liveops.js's own header: the `liveflags` map is
     spread over the state_sync caps literal LAST, so a flag named after a
     capability overrides the baked-in `true`, and its warning says exactly
     what that costs -- "overriding a cap to false ... can re-enable legacy
     client-side fallback paths for some systems".  The legacy path is the one
     that prints Lv 0.

     The routes to read and clear that map have existed since v2.3.1150.  What
     did not exist was any way to reach them without a computer, and the owner
     runs this game from a phone.  So a flag set months ago in an emergency
     can sit in Durable Object storage indefinitely, silently disabling a
     system, with no surface anywhere that says so.  That is the actual bug
     this section fixes; the flags themselves are working as designed.

     Loaded on demand rather than with the state refresh: it is one more admin
     round trip on every panel open, and most opens are not about flags. */
  const [flags, setFlags] = useState(null);
  const loadFlags = useCallback(async () => {
    const j = await call('/flags');
    if (j) { setFlags(j.flags || {}); setMsg(''); }
  }, [call]);
  const clearFlag = useCallback(async (name) => {
    const j = await call('/flags?name=' + encodeURIComponent(name), null, 'DELETE');
    if (j) { setFlags(j.flags || {}); setMsg('Cleared "' + name + '". Reload the game to pick it up.'); }
  }, [call]);

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

        {/* ═══ v2.3.2436: THE KEYLESS ANSWER ═══
            See the note by CAP_GATES.  This reads the caps the client
            already received on join, so it works with no admin key, no
            network and no worker cooperation -- which is precisely when the
            owner needs it most. */}
        <div style={label}>This worker</div>
        {(() => {
          const caps = S && S._serverCaps;
          if (!caps) {
            return (
              <div style={{ color: COL.text2, fontSize: 12, marginBottom: 8 }}>
                Not joined yet — open this once you are standing in the world.
              </div>
            );
          }
          const off = CAP_GATES.filter((c) => !caps[c]);
          if (!off.length) {
            return (
              <div style={{ color: COL.text2, fontSize: 12, marginBottom: 8 }} data-caps-ok="1">
                All {CAP_GATES.length} systems claimed. Nothing is falling back to old behaviour.
              </div>
            );
          }
          return (
            <div data-caps-off={off.join(',')} style={{
              background: COL.accentFill, border: '1px solid ' + COL.accent,
              color: COL.accent, borderRadius: 9, padding: '10px 11px',
              fontSize: 12.5, lineHeight: 1.4, marginBottom: 9,
            }}>
              <b>{off.length === 1 ? 'This system is' : 'These ' + off.length + ' systems are'} switched
              off for you:</b>
              <div style={{ margin: '4px 0 5px' }}>
                {off.map((c) => (
                  <div key={c}>• {c}{CAP_NOTES[c] ? ' — ' + CAP_NOTES[c] : ''}</div>
                ))}
              </div>
              The game falls back to its old behaviour for {off.length === 1 ? 'it' : 'them'}, which
              usually looks like wrong numbers rather than a missing feature. A live flag of the same
              name is the usual cause — check Live flags below.
            </div>
          );
        })()}

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

            {/* ═══ v2.3.2412: LIVE FLAGS ═══
                See the note by loadFlags for why this exists.  Two jobs, and
                the second is the one that matters: list the map, and SAY OUT
                LOUD when a flag is overriding a server capability, because
                that is the case that silently breaks a system and it is
                indistinguishable from a bug unless something names it. */}
            <div style={label}>Live flags</div>
            <button type="button" style={btn(false)} disabled={busy}
              onClick={loadFlags}>
              {flags ? 'Reload live flags' : 'Show live flags'}
            </button>

            {flags && Object.keys(flags).length === 0 && (
              <div style={{ color: COL.text2, fontSize: 12, marginBottom: 8 }}>
                No flags set. Every capability is whatever the deployed worker bakes in.
              </div>
            )}

            {flags && Object.keys(flags).length > 0 && (() => {
              /* A flag is OVERRIDING a capability when its name is also a caps
                 key -- because that is precisely what the spread does.  Value
                 false is the harmful direction: it tells the client "this
                 worker has not claimed the job", and the client falls back to
                 a legacy path.  `disable_*` kill switches are server-side and
                 never collide with a cap name, so they list as ordinary. */
              const caps = (S && S._serverCaps) || {};
              const names = Object.keys(flags).sort();
              const overriding = names.filter((n) => (n in caps) && flags[n] === false);
              return (
                <>
                  {overriding.length > 0 && (
                    <div style={{
                      background: COL.accentFill, border: '1px solid ' + COL.accent,
                      color: COL.accent, borderRadius: 9, padding: '10px 11px',
                      fontSize: 12.5, lineHeight: 1.4, marginBottom: 9,
                    }}>
                      <b>{overriding.length === 1 ? 'This flag is' : 'These flags are'} switching a
                      system off:</b> {overriding.join(', ')}.<br />
                      The game falls back to its old behaviour for {overriding.length === 1 ? 'it' : 'them'},
                      which usually looks like wrong numbers rather than a missing feature.
                      Clear {overriding.length === 1 ? 'it' : 'them'} unless you set {overriding.length === 1 ? 'it' : 'them'} on purpose.
                    </div>
                  )}
                  {names.map((n) => {
                    const isOverride = (n in caps) && flags[n] === false;
                    return (
                      <div key={n} style={{
                        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
                        background: COL.raised, borderRadius: 8, padding: '8px 9px',
                        border: '1px solid ' + (isOverride ? COL.accent : COL.border),
                      }}>
                        <span style={{ flex: 1, minWidth: 0, font: '600 13px system-ui, sans-serif',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {n}
                        </span>
                        <span style={{
                          font: '600 12px system-ui, sans-serif',
                          color: flags[n] === false ? COL.danger : COL.text2,
                          fontVariantNumeric: 'tabular-nums',
                        }}>{String(flags[n])}</span>
                        <button type="button" style={{ ...chip, minHeight: 34, flex: 'none' }}
                          disabled={busy}
                          onClick={() => clearFlag(n)}>Clear</button>
                      </div>
                    );
                  })}
                  <div style={{ color: COL.muted, fontSize: 12, marginBottom: 2 }}>
                    Clearing takes effect on your next join — reload the game to see it.
                  </div>
                </>
              );
            })()}

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
