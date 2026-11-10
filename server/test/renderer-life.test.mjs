/* THE RENDERER'S LIFE ON THE PHONE: WHAT A REBUILD FORGETS, AND LOADERS THAT
 * REPORT WRONGLY -- v2.3.4415 (state-machine sweep V17a, V17b R10-8).
 *
 * Four slips, each a phone that kept a state the game had lost:
 *   1. a black screen's rebuild in the world left every building still (no
 *      smoke, lamps, sparks or waving flag) for the rest of the visit: only
 *      the way in made the buildings' life, and a rebuild keeps the trip
 *      entered.  The new renderer's WheelObjects makes it again; the dead
 *      one's copies are freed first, by its own destroy (read in the files);
 *   2. the loading screen's report (window.__btPreloadReport) could only say
 *      "fulfilled": every group was caught before Promise.allSettled.  The
 *      rule (src/rendering/preloadReport.js, no imports) runs here;
 *   3. one failed request for a bar's picture hid that bar over every head
 *      for the session (a latch set before the request).  The loader
 *      (src/rendering/loadSetLater.js) runs here on a stand-in Assets.load
 *      and stand-in clocks: a failure and a stall are each asked for again,
 *      later, past the cache; `?barretry=0` is the game as it was;
 *   4. after a reconnect or a deploy the phone drew you seated while no
 *      worker holds a pose (every join makes the player's state afresh):
 *      rejoinClear (src/game/rejoinSlots.js) stands you up, whatever the
 *      worker's re-send count, and the registry has its row. */
import { readFileSync } from 'node:fs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS', name); }
  else { failed++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const tryImport = async (p) => { try { return await import(p); } catch (e) { return {}; } };

/* ── 1. the buildings' life after a rebuild ── */
{
  const wo = src('src/rendering/wheelObjects.js');
  const ctor = wo.slice(wo.indexOf('export class WheelObjects {'), wo.indexOf('  update(cx, cy, viewW, viewH, S) {'));
  check('1a the Wheel\'s objects, made by a new renderer, make the buildings\' life when none is held',
    /if \(this\.life && !wheelLifeReady\(\)\) wheelLifeWarm\(\);/.test(ctor));
  const free = wo.slice(wo.indexOf('export function wheelObjectsFree() {'), wo.indexOf('export function wheelObjectsResetCounts'));
  const dtor = wo.slice(wo.lastIndexOf('if (_live === this) _live = null;') - 600, wo.indexOf('let _live = null;'));
  check('1b the dead renderer\'s copies are freed first: its WheelObjects.destroy runs wheelObjectsFree, which runs wheelLifeFree',
    /wheelLifeFree\(\);/.test(free) && /wheelObjectsFree\(\);/.test(dtor));
  const pr = src('src/rendering/pixiRenderer.js');
  const d = pr.slice(pr.indexOf('  function destroy() {'), pr.indexOf('  function destroy() {') + 600);
  check('1c ...and the renderer\'s destroy (a rebuild\'s cleanup) destroys its WheelObjects', /wheelObjects\.destroy\(\)/.test(d));
  const wl = src('src/rendering/wheelLife.js');
  const warm = wl.slice(wl.indexOf('export function wheelLifeWarm() {'), wl.indexOf('export function wheelLifeFree() {'));
  check('1d wheelLifeWarm makes nothing while a set is held (never two sets of canvases)', /if \(_tex \|\| typeof document === 'undefined'\) return;/.test(warm));
}

/* ── 2. the loading screen's report ── */
{
  const PR = await tryImport('../../src/rendering/preloadReport.js');
  if (typeof PR.settleGroups !== 'function') check('2a preloadReport.js settleGroups exists', false);
  else {
    const rep = await PR.settleGroups({ ok: Promise.resolve(1), bad: Promise.reject(new Error('404')), val: 7, nul: null }, {});
    check('2a a group that failed reads "rejected"; the others "fulfilled"',
      rep.bad === 'rejected' && rep.ok === 'fulfilled' && rep.val === 'fulfilled' && rep.nul === 'fulfilled', rep);
    const into = { first: 'fulfilled' };
    const r2 = await PR.settleGroups({ second: Promise.reject(new Error('x')) }, into);
    check('2b the second wave writes into the same report', r2 === into && into.first === 'fulfilled' && into.second === 'rejected', into);
  }
  const pa = src('src/rendering/preloadAnimations.js');
  const body = pa.slice(pa.indexOf('export async function preloadWorldAnimations()'));
  check('2c preloadWorldAnimations settles both waves through settleGroups, and no group is caught before allSettled',
    /await settleGroups\(groups, \{\}\)/.test(body) && /await settleGroups\(wave2, report\)/.test(body) && !/\.catch\(\(\) => \{\}\)\)\)/.test(body));
}

/* ── 3. the bars over heads are asked for again ── */
{
  const L = await tryImport('../../src/rendering/loadSetLater.js');
  const RL = await import('../../src/rendering/retryLooks.js');
  if (typeof L.loadSetLater !== 'function') check('3a loadSetLater.js exists', false);
  else {
    const realNow = Date.now;
    let now = 1000000;
    Date.now = () => now;
    const flush = () => new Promise((r) => setTimeout(r, 0));
    /* a stand-in network: each url answers as `answer(url)` says */
    const asked = [], unloaded = [];
    const pending = new Map();   /* url -> { resolve, reject } for stalls */
    let answer = () => 'ok';
    const load = (url) => {
      asked.push(url);
      const a = answer(url);
      if (a === 'ok') return Promise.resolve({ tex: url });
      if (a === 'fail') return Promise.reject(new Error('404'));
      if (a === 'null') return Promise.resolve(null);
      return new Promise((resolve, reject) => pending.set(url, { resolve, reject }));   /* stall */
    };
    /* stand-in timers: the time limit fires when the test says */
    const timers = new Map(); let tid = 0;
    const setTimer = (fn) => { timers.set(++tid, fn); return tid; };
    const clearTimer = (h) => { timers.delete(h); };
    const fireTimers = () => { const fns = [...timers.values()]; timers.clear(); for (const f of fns) f(); };
    const files = { hp: '/bar-hp.webp?v=1', frame: '/hp-frame.png?v=2', node: '/node.png' };
    const into = { hp: null, frame: null, node: null };
    answer = (u) => (u.startsWith('/hp-frame') ? 'fail' : u.startsWith('/node') ? 'stall' : 'ok');
    const set = L.loadSetLater({ files, into, load, unload: (u) => unloaded.push(u), setTimer, clearTimer, later: RL.laterRounds('barretry') });
    set.ensure();
    await flush();
    check('3a the first ensure asks for every file once', asked.length === 3 && !!into.hp && !into.frame && !into.node, asked);
    set.ensure(); set.ensure();
    check('3b ...and asks nothing more before its round (no request a frame)', asked.length === 3, asked);
    fireTimers();   /* the stall's time limit */
    now += 5000;
    answer = () => 'ok';
    set.ensure();
    await flush();
    check('3c 5 s on: the failed frame AND the stalled node are asked for again, past the cache (g=1)',
      asked.includes('/hp-frame.png?v=2&g=1') && asked.includes('/node.png?g=1') && !!into.frame && !!into.node, asked);
    check('3d the frame is the one the round brought', into.frame && into.frame.tex === '/hp-frame.png?v=2&g=1', into.frame);
    /* the stalled first request answers late: one copy is kept, the other let go */
    pending.get('/node.png').resolve({ tex: '/node.png' });
    await flush();
    check('3e a late answer after its copy is in is let go (nothing held twice)', into.node.tex === '/node.png?g=1' && unloaded.includes('/node.png'), { node: into.node, unloaded });
    const n = asked.length;
    for (let i = 0; i < 50; i++) set.ensure();
    check('3f every file in: ensure asks for nothing', asked.length === n);
    /* a load that gives nothing is a failure too; a late answer to an empty slot is taken */
    {
      const into2 = { a: null }; const asked2 = [];
      let mode = 'null';
      const s2 = L.loadSetLater({ files: { a: '/a.png' }, into: into2, load: (u) => { asked2.push(u); return mode === 'null' ? Promise.resolve(null) : Promise.resolve({ u }); }, setTimer, clearTimer, later: RL.laterRounds('barretry') });
      s2.ensure(); await flush();
      now += 5000; mode = 'ok'; s2.ensure(); await flush();
      check('3g a load that resolves nothing is asked for again', asked2.length === 2 && asked2[1] === '/a.png?g=1' && !!into2.a, asked2);
    }
    {
      const into3 = { a: null }; let p = null;
      const s3 = L.loadSetLater({ files: { a: '/a.png' }, into: into3, load: () => new Promise((r) => { p = r; }), setTimer, clearTimer, later: RL.laterRounds('barretry') });
      s3.ensure(); fireTimers();
      p({ late: true }); await flush();
      check('3h a stalled request that answers after its time limit still fills an empty slot', !!into3.a && into3.a.late === true, into3);
    }
    /* `?barretry=0`: the game as it was -- one load, nothing more */
    {
      globalThis.location = { search: '?barretry=0' };
      const into4 = { a: null }; const asked4 = [];
      const s4 = L.loadSetLater({ files: { a: '/a.png' }, into: into4, load: (u) => { asked4.push(u); return Promise.reject(new Error('x')); }, setTimer, clearTimer, switchName: 'barretry' });
      s4.ensure(); await flush();
      now += 600000; s4.ensure(); s4.ensure(); await flush();
      check('3i `?barretry=0`: a failed bar is never asked for again (the off-ramp)', asked4.length === 1, asked4);
      globalThis.location = { search: '?retrylooks=0' };
      const asked5 = [];
      const s5 = L.loadSetLater({ files: { a: '/a.png' }, into: { a: null }, load: (u) => { asked5.push(u); return Promise.reject(new Error('x')); }, setTimer, clearTimer, switchName: 'barretry' });
      s5.ensure(); await flush(); now += 600000; s5.ensure(); await flush();
      check('3j ...and the shared `?retrylooks=0` too', asked5.length === 1, asked5);
      delete globalThis.location;
    }
    /* ten rounds at most (retry-looks.md) */
    {
      const asked6 = [];
      const s6 = L.loadSetLater({ files: { a: '/a.png' }, into: { a: null }, load: (u) => { asked6.push(u); return Promise.reject(new Error('x')); }, setTimer, clearTimer, later: RL.laterRounds('barretry') });
      s6.ensure(); await flush();
      for (let i = 0; i < 30; i++) { now += 60000; s6.ensure(); await flush(); }
      check('3k a file that never comes is asked for ten later rounds at most', asked6.length === 1 + RL.RETRY_ROUNDS, asked6.length);
    }
    Date.now = realNow;
  }
  const er = src('src/rendering/systems/entityRenderer.js');
  const a = er.indexOf('const _hudBarTex = {'), b = er.indexOf('function _ensureHudBarTextures()', a);
  const block = er.slice(a, b + 200);
  check('3l the bars\' loader is loadSetLater over all six files, with no load-once latch left',
    /loadSetLater\(\{[\s\S]*files: _HUD_BAR_FILES, into: _hudBarTex, switchName: 'barretry'/.test(block)
      && ['hp:', 'mp:', 'stam:', 'barFrame:', 'barFull:', 'nodeFull:'].every((k) => block.slice(block.indexOf('const _HUD_BAR_FILES')).includes(k))
      && !/_hudBarLoadStarted/.test(er) && /function _ensureHudBarTextures\(\) \{ _hudBarLoads\.ensure\(\); \}/.test(block));
}

/* ── 4. the held pose after a reconnect ── */
{
  const R = await tryImport('../../src/game/rejoinSlots.js');
  if (typeof R.rejoinClear !== 'function') check('4a rejoinSlots.js rejoinClear exists', false);
  else {
    const seated = () => ({ myId: 'bp_me', player: { x: 0, y: 0 }, _pose: { id: 'sit', at: 1, popAt: 1, x: 0, y: 0, zone: 'wheel' }, _inDuel: { opponent: 'bp_x' }, _activeDuel: { partnerId: 'bp_x' }, lockedTarget: null });
    const S1 = seated();
    const d1 = R.rejoinClear(S1, undefined, () => {});
    check('4a an old worker (no count): you stand up, and the duel is kept as before', S1._pose === null && d1.includes('pose') && !!S1._inDuel, d1);
    const S2 = seated();
    R.rejoinClear(S2, 0, () => {});
    check('4b the re-send kill switch (count 0): you stand up too (no worker keeps a pose)', S2._pose === null);
    const S3 = seated();
    const d3 = R.rejoinClear(S3, 2, () => {}, () => {});
    check('4c a count of 2: you stand up, beside the duel and trade clears', S3._pose === null && d3.includes('pose') && !S3._inDuel, d3);
    const S4 = { _pose: null };
    check('4d standing already: nothing to say', !R.rejoinClear(S4, 2, () => {}, () => {}).includes('pose'));
    const row = (R.REJOIN_SLOTS || []).find((r) => r.slot === 'pose');
    check('4e the registry has the pose\'s row: cleared by rejoinClear, since 0, no re-send and why',
      !!row && row.since === 0 && row.resend === null && row.clears.includes('rejoinClear') && /afresh/.test(row.why || ''), row);
    check('4f ...and it is off the "not yet" list', !(R.REJOIN_NOT_YET || []).some((s) => /pose/.test(s)));
  }
  /* the design the clear matches: no worker carries a pose across a join */
  const join = src('server/src/join.js');
  const fresh = join.slice(join.indexOf('this.playerState[msg.id] = {'), join.indexOf('this.playerState[msg.id] = {') + 300);
  check('4g every join makes the player\'s state afresh, with no pose in it', /x: 0, y: 0/.test(fresh) && !/\bpo\b/.test(fresh));
  check('4h poses.js still says a deploy stands everyone up', /a deploy stands everyone up/.test(src('server/src/poses.js')));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
