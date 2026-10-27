/* ═══ FIVE PLAYERS, A LONG SESSION: DOES ANYTHING GROW? (v2.3.3638) ═══
 *
 * The owner, 2026-10-27: "simulate about 5 players doing the main quest lines,
 * mining, fishing, combat, trading, partying, no mans land combat,
 * buying/selling, dungeon, waking around different zones, farming, to check
 * for memory leaks in long form play sessions. Want to make sure everything
 * works. Also note anything that might be worth bringing to my attention".
 *
 * Five real game pages against one real worker, in the world, for as long as
 * BT_LONGPLAY_MS says (40 minutes by default), each with a part to play:
 *
 *   Questy  (a phone)     the tour's quest line, giver to giver, round after
 *                         round (the Mayor, Blacksmith Bro, Diego), the tour
 *                         started over at its end;
 *   Gathry  (a computer)  mining, fishing and chopping by E held, then selling
 *                         what it gathered to Diego;
 *   Fighty  (a phone)     fights in a land with the real attack disc, the
 *                         kills through the worker's kill path (drops, loot,
 *                         the codex), the loot picked up; the Goo Grotto with
 *                         Tradey in his party;
 *   Tradey  (a computer)  Fighty's party, a trade with Farmy, a No man's land
 *                         fight with Farmy (the window's Attack, swings),
 *                         buying and selling at Diego's;
 *   Farmy   (a phone)     the farm (seeds bought, the farm visited, beds dug,
 *                         planted, watered and harvested, out by the gate),
 *                         and walks across the lands.
 *
 * In ROUNDS: everyone's solo part at the same time, then the parts that take
 * two (the party once, then the dungeon, the trade and No man's land in
 * turn), then every page MEASURED -- what memprobe.mjs reads for the memory
 * budget (art from files, the GPU's textures, the game's own canvases,
 * decoded sound, the JS heap after two forced collections, buffers), plus
 * what a reload would clear and nothing else counts (live timers and
 * intervals, event listeners, Web Audio nodes: mp-fightsoak's counters), the
 * page's DOM nodes, and mp-soak's PROBE (every array and map on the game
 * state, the Pixi pools and the scene graph).  And the worker: the room's
 * own overview and the worker process's memory.
 *
 * At the end, for every page and line: the reading after the first round (the
 * warm-up: every system loaded once) against the last, and the slope of a
 * straight line through every round after it, per hour of play.  A line that
 * keeps climbing is a leak; one that rises and settles is a cache filling.
 * Every activity's tries and failures are counted, with the reason, so "does
 * everything work" has an answer too.
 *
 *   BT_LONGPLAY_MS=2400000   how long to play (40 minutes)
 *   BT_LONGPLAY_DPR=1        the pages' pixel ratio (1 keeps five pages
 *                            drawing on this box's software GL)
 *
 * Writes tools/qa/mp/out/longplay.json (every reading) and longplay.md (the
 * report).  docs/specs/long-play-soak.md says what it found.
 */
import * as H from './harness.mjs';
import { MEM_INIT, memSampler } from './memprobe.mjs';
import { PROBE } from './mp-soak.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { FARM_BEDS, FARM_GATE } from '../../../src/data/farmLayout.js';
import { QUEST_REWARDS } from '../../../server/src/data.js';

const SOAK_MS = +(process.env.BT_LONGPLAY_MS || 40 * 60000);
const DPR = +(process.env.BT_LONGPLAY_DPR || 1);
const PHONE = { width: 390, height: 844 };
const DESK = { width: 1000, height: 780 };
const OUT = join(H.REPO, 'tools/qa/mp/out');

/* mp-fightsoak's counters, before the bundle runs: live timers and intervals,
   event listeners, and Web Audio nodes (created minus disconnected) -- the
   three things a reload clears that no other probe can see */
const LEAK_INIT = `(() => {
  const _si = window.setInterval, _ci = window.clearInterval;
  const _st = window.setTimeout, _ct = window.clearTimeout;
  const live = { iv: new Set(), to: new Set(), ls: 0, lsByType: Object.create(null), an: 0, anMade: 0 };
  window.__leak = live;
  window.setInterval = function (fn, ms, ...r) { const id = _si.call(window, fn, ms, ...r); live.iv.add(id); return id; };
  window.clearInterval = function (id) { live.iv.delete(id); return _ci.call(window, id); };
  window.setTimeout = function (fn, ms, ...r) {
    let id;
    const wrapped = typeof fn === 'function' ? function () { live.to.delete(id); return fn.apply(this, arguments); } : fn;
    id = _st.call(window, wrapped, ms, ...r); live.to.add(id); return id;
  };
  window.clearTimeout = function (id) { live.to.delete(id); return _ct.call(window, id); };
  const bump = (proto, name) => {
    const orig = proto && proto[name];
    if (typeof orig !== 'function') return;
    proto[name] = function (...a) { const n = orig.apply(this, a); live.an++; live.anMade++; return n; };
  };
  if (window.AudioContext) {
    bump(window.AudioContext.prototype, 'createBufferSource');
    bump(window.AudioContext.prototype, 'createGain');
    const _dis = AudioNode.prototype.disconnect;
    AudioNode.prototype.disconnect = function (...a) { if (!this.__counted) { this.__counted = 1; live.an--; } return _dis.apply(this, a); };
  }
  /* the listeners HELD: an add counts until its remove, its once, its
     signal's abort, or until the thing it was added to is collected (a
     FinalizationRegistry).  Adds minus removes alone called every image
     loaded and every sound played a listener for good: the farmer's page read
     +100 a farm visit that a forced GC let go (mp-listeners: 608 -> 609
     over three visits) */
  const _ael = EventTarget.prototype.addEventListener, _rel = EventTarget.prototype.removeEventListener;
  const per = new WeakMap(), fnIds = new WeakMap();
  let fnN = 0;
  const fnId = (f) => { if (!f || (typeof f !== 'function' && typeof f !== 'object')) return 0; let i = fnIds.get(f); if (!i) { i = ++fnN; fnIds.set(f, i); } return i; };
  const gone = new FinalizationRegistry((box) => { for (const t of box.types) { live.ls--; live.lsByType[t] = (live.lsByType[t] || 0) - 1; } });
  const capOf = (o) => (typeof o === 'boolean' ? o : !!(o && o.capture));
  EventTarget.prototype.addEventListener = function (t, fn, o) {
    try {
      if (fn) {
        let rec = per.get(this);
        if (!rec) { rec = { sigs: new Set(), box: { types: [] } }; per.set(this, rec); gone.register(this, rec.box); }
        const sig = t + '|' + capOf(o) + '|' + fnId(fn);
        if (!rec.sigs.has(sig)) {
          rec.sigs.add(sig); rec.box.types.push(t);
          live.ls++; live.lsByType[t] = (live.lsByType[t] || 0) + 1;
          const drop = () => { if (!rec.sigs.delete(sig)) return; const i = rec.box.types.indexOf(t); if (i >= 0) rec.box.types.splice(i, 1); live.ls--; live.lsByType[t] = (live.lsByType[t] || 0) - 1; };
          if (o && o.once) _ael.call(this, t, drop, { once: true });
          if (o && o.signal) _ael.call(o.signal, 'abort', drop, { once: true });
        }
      }
    } catch (e) { /* counting only */ }
    return _ael.call(this, t, fn, o);
  };
  EventTarget.prototype.removeEventListener = function (t, fn, o) {
    try {
      const rec = per.get(this);
      const sig = t + '|' + capOf(o) + '|' + fnId(fn);
      if (rec && rec.sigs.delete(sig)) { const i = rec.box.types.indexOf(t); if (i >= 0) rec.box.types.splice(i, 1); live.ls--; live.lsByType[t] = (live.lsByType[t] || 0) - 1; }
    } catch (e) { /* counting only */ }
    return _rel.call(this, t, fn, o);
  };
})();`;
const INIT = '(' + MEM_INIT.toString() + ')();\n' + LEAK_INIT;

/* the tour's first steps, giver to giver (mp-questline's ARC: the objective
   seeded, the walking up, the dialogue, the claim all real) */
const ARC = [
  { id: 'tut_1', npc: 'mayor_bro', give: { invKey: 'slime-remnants', count: 4 } },
  { id: 'smith_1', npc: 'blacksmith_bro', give: { invKey: 'ore_copper_ore', count: 5 } },
  { id: 'smith_2', npc: 'blacksmith_bro', count: 1 },
  { id: 'fish_1', npc: 'shopkeeper_bro', give: { invKey: 'cooked_fish_minnow', count: 2 } },
  { id: 'tut_2', npc: 'mayor_bro', give: { invKey: 'snowman', count: 4 } },
  { id: 'tut_3', npc: 'mayor_bro', give: { invKey: 'skeleton-remnants', count: 5 } },
  { id: 'tut_4', npc: 'mayor_bro', give: { invKey: 'fire-goblin-remnants', count: 6 } },
];
const NAME_OF = { mayor_bro: 'mayor bro', blacksmith_bro: 'blacksmith bro', shopkeeper_bro: 'diego' };
/* where a harvester stands from a resource (mp-deskharvest) */
const STAND = { oreVein: [0, -70], tree: [0, -130], fishSpot: [52, -43] };
const FOOT_DY = 52;   /* a body's middle to its boots on the farm */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/* an activity never holds the run up: past `ms` it is called stuck */
const within = (p, ms, what) => Promise.race([p, sleep(ms).then(() => ({ ok: false, why: what + ': stuck past ' + Math.round(ms / 1000) + ' s' }))]);

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const t0 = Date.now();
  const CAST = [
    { key: 'quester', name: 'Questy', view: PHONE, touch: true },
    { key: 'gatherer', name: 'Gathry', view: DESK, touch: false },
    { key: 'fighter', name: 'Fighty', view: PHONE, touch: true },
    { key: 'trader', name: 'Tradey', view: DESK, touch: false },
    { key: 'farmer', name: 'Farmy', view: PHONE, touch: true },
  ];
  const who = Object.create(null);
  for (let i = 0; i < CAST.length; i++) {
    const c = CAST[i];
    c.P = await H.newPlayer(browser, { name: c.name, wsPort, webPort, viewport: c.view, touch: c.touch, dpr: DPR,
      world: 'wheel', guest: i > 0, init: INIT });
    c.errors = [];
    c.P.page.on('pageerror', (e) => c.errors.push(String((e && e.message) || e).slice(0, 240)));
    who[c.key] = c;
  }
  for (const c of CAST) await H.enterWorld(c.P);
  for (const c of CAST) {
    c.inW = await H.waitFor(c.P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l,
      { timeout: 150000, label: c.name + ' into the world' }).catch(() => null);
    c.id = await H.readState(c.P, (S) => S.myId);
    c.stopAlive = H.keepAlive(c.P, 15000);
    c.mem = await memSampler(c.P, browser);
    c.acts = Object.create(null);   /* activity -> {tries, ok, fails: [why]} */
    c.samples = [];
  }
  rec.ok('setup: five players in the world (' + CAST.map((c) => c.name + ':' + (c.inW ? 'in' : 'OUT')).join(', ') + ')', CAST.every((c) => !!c.inW));
  if (!CAST.every((c) => !!c.inW)) { for (const c of CAST) { c.stopAlive && c.stopAlive(); await c.P.ctx.close().catch(() => {}); } return; }

  /* ── the cast's kit: every tool, the first quest's weapons for the fighters,
        and a little money for the shop and the farm ── */
  for (const c of CAST) {
    for (const k of ['woodcutting_axe', 'fishing_pole', 'mining_pickaxe']) await H.grant(wsPort, c.id, 'item', { invKey: k, count: 1 }).catch(() => {});
    await H.grant(wsPort, c.id, 'gold', { amount: 4000 }).catch(() => {});
  }
  for (const c of [who.fighter, who.trader, who.farmer]) {
    await H.devOp(wsPort, 'tour', c.id, { at: 'smith_1' }).catch(() => {});   /* tut_1 in: armed, out of the commons */
  }
  await sleep(1500);
  for (const c of [who.fighter, who.trader, who.farmer]) await equipSword(c.P);
  const { WHEEL_SPAWNS, WHEEL_CENTRE } = await import(H.REPO + ((await H.wheelGeom()).long === 1 ? '/server/src/wheelspawns1.js' : '/server/src/wheelspawns.js'));
  const LANDS = Object.keys(WHEEL_SPAWNS);
  const home = await H.readState(who.quester.P, (S) => ({ x: Math.round(S.player.x), y: Math.round(S.player.y) }));

  const note = (c, act, r) => {
    const a = c.acts[act] || (c.acts[act] = { tries: 0, ok: 0, fails: [] });
    a.tries++;
    if (r && r.ok) a.ok++;
    else a.fails.push(((r && r.why) || 'failed').slice(0, 160));
  };
  const play = async (c, act, fn, ms = 240000) => {
    let r;
    try { r = await within(fn(), ms, act); } catch (e) { r = { ok: false, why: act + ': ' + String((e && e.message) || e).slice(0, 140) }; }
    note(c, act, r);
    await H.closeNpcDialogue(c.P).catch(() => {});
    return r;
  };

  /* ═══ THE PARTS ═══ */
  const ctx = { wsPort, WHEEL_SPAWNS, WHEEL_CENTRE, LANDS, home };
  let round = 0;
  const party = { made: false };
  while (Date.now() - t0 < SOAK_MS) {
    round++;
    const land = LANDS[round % LANDS.length];
    /* solo, all at once */
    await Promise.all([
      play(who.quester, 'quest', () => questStep(who.quester, ctx, round)),
      (async () => {
        for (const type of ['oreVein', 'fishSpot', 'tree']) await play(who.gatherer, 'gather:' + type, () => gather(who.gatherer, ctx, type));
        await play(who.gatherer, 'sell', () => sellToDiego(who.gatherer, ctx));
      })(),
      play(who.fighter, 'fight', () => fight(who.fighter, ctx, land)),
      play(who.trader, 'shop', () => shopRound(who.trader, ctx)),
      (async () => {
        if (round % 2 === 1) await play(who.farmer, 'farm', () => farmRound(who.farmer, ctx), 360000);
        else await play(who.farmer, 'walk-lands', () => walkLands(who.farmer, ctx, round));
      })(),
    ]);
    /* in pairs, one at a time */
    if (!party.made) {
      const r = await play(who.fighter, 'party', () => makeParty(who.fighter, who.trader, ctx));
      party.made = !!(r && r.ok);
    }
    const pairTurn = round % 3;
    if (pairTurn === 1) await play(who.fighter, 'dungeon', () => dungeonRun(who.fighter, who.trader, ctx), 360000);
    else if (pairTurn === 2) await play(who.trader, 'trade', () => tradeRound(who.trader, who.farmer, ctx));
    else await play(who.trader, 'nml-fight', () => nmlFight(who.trader, who.farmer, ctx), 300000);
    /* measured */
    for (const c of CAST) {
      try { c.samples.push(await measure(c, round, t0)); } catch (e) { c.samples.push({ round, t: Date.now() - t0, error: String(e).slice(0, 140) }); }
    }
    const srv = await serverRead(wsPort);
    for (const c of CAST) c.samples[c.samples.length - 1].server = srv;
    console.log(`    round ${round} (${Math.round((Date.now() - t0) / 60000)} min): ` + CAST.map((c) => {
      const s = c.samples[c.samples.length - 1];
      return `${c.name} heap ${s.heapMB} gpu ${s.gpu} cv ${s.canvasMB} dom ${s.dom} ls ${s.leak && s.leak.ls} an ${s.leak && s.leak.an}`;
    }).join(' | ') + ` | worker ${srv.rssMB} MB`);
    writeReport(CAST, t0, round, false);
  }

  /* ═══ THE VERDICT ═══ */
  const report = writeReport(CAST, t0, round, true);
  for (const c of CAST) {
    const g = report.growth[c.name] || {};
    const flagged = Object.entries(g).filter(([, v]) => v.flag).map(([k, v]) => `${k} +${v.perHour}/h`);
    rec.ok(`${c.name}: nothing kept climbing over ${round} rounds (${Math.round((Date.now() - t0) / 60000)} min)${flagged.length ? ': ' + flagged.join(', ') : ''}`, flagged.length === 0, g);
    const acts = Object.entries(c.acts).map(([k, a]) => `${k} ${a.ok}/${a.tries}`).join(', ');
    const dead = Object.entries(c.acts).filter(([, a]) => a.tries > 0 && a.ok === 0).map(([k, a]) => k + ' (' + a.fails.slice(-1)[0] + ')');
    rec.ok(`${c.name}: every part worked at least once (${acts})`, dead.length === 0, dead);
    rec.ok(`${c.name}: no page errors (${c.errors.length})`, c.errors.length === 0, c.errors.slice(0, 6));
  }
  for (const c of CAST) { try { c.stopAlive(); } catch (e) { /* gone */ } await c.P.ctx.close().catch(() => {}); }
}

/* ═══ MEASURING ═══ */
async function measure(c, round, t0) {
  const m = await c.mem.sample('round ' + round);
  /* the collections' finalizers run a moment after them: the listeners on
     what was collected are counted off then */
  await c.P.page.waitForTimeout(300);
  const page = await c.P.page.evaluate((probeSrc) => {
    const probe = new Function('return (' + probeSrc + ')')();
    const L = window.__leak;
    const S = window._gameState && window._gameState.current;
    return {
      dom: document.getElementsByTagName('*').length,
      leak: L ? { iv: L.iv.size, to: L.to.size, ls: L.ls, an: L.an, anMade: L.anMade } : null,
      probe: probe(),
      frameMs: S && S._frameMs ? +S._frameMs.toFixed(1) : null,
      zone: S ? S.currentZone : null,
    };
  }, PROBE.toString());
  return { round, t: Date.now() - t0, ...m, ...page };
}

async function serverRead(wsPort) {
  let ov = null;
  try {
    const res = await fetch(`http://127.0.0.1:${wsPort}/api/admin/overview`, { headers: { Authorization: `Bearer ${H.ADMIN_KEY}` } });
    ov = await res.json();
  } catch (e) { ov = null; }
  let rssMB = null;
  try {
    const out = execSync('ps -C workerd -o rss=', { encoding: 'utf8' });
    rssMB = Math.round(out.split('\n').map((l) => +l.trim() || 0).reduce((a, b) => a + b, 0) / 1024);
  } catch (e) { rssMB = null; }
  return { rssMB, overview: ov ? pickOverview(ov) : null };
}
function pickOverview(ov) {
  const out = {};
  for (const [k, v] of Object.entries(ov)) if (typeof v === 'number' || (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length < 20)) out[k] = v;
  return out;
}

/* the lines a leak shows in, and how much a line may climb in an hour of play
   after the warm-up before it is called out (the readings' own noise is a
   fraction of these: mp-membudget's runs repeat within ~1 MB) */
const LINES = {
  heapMB: { per: 6, of: 'the JS heap (MB, after GC)' },
  gpu: { per: 12, of: 'textures on the GPU (MB)' },
  canvasMB: { per: 12, of: 'the game\'s own canvases (MB)' },
  cache: { per: 12, of: 'art from files (MB)' },
  decodedMB: { per: 4, of: 'decoded sound (MB)' },
  buffersMB: { per: 8, of: 'buffers (MB)' },
  dom: { per: 400, of: 'DOM nodes' },
  'leak.ls': { per: 150, of: 'event listeners' },
  'leak.iv': { per: 10, of: 'live intervals' },
  'leak.to': { per: 60, of: 'pending timeouts' },
  'leak.an': { per: 60, of: 'connected audio nodes' },
};
const get = (s, k) => k.split('.').reduce((o, p) => (o == null ? o : o[p]), s);
/* the slope of a least-squares line through (t, v), per hour */
function slopePerHour(pts) {
  if (pts.length < 3) return 0;
  const n = pts.length, mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
  let num = 0, den = 0;
  for (const [x, y] of pts) { num += (x - mx) * (y - my); den += (x - mx) * (x - mx); }
  return den > 0 ? (num / den) * 3600000 : 0;
}

function writeReport(CAST, t0, round, final) {
  const growth = Object.create(null);
  const md = [];
  md.push('# Five players, a long session', '');
  md.push(`${round} rounds, ${Math.round((Date.now() - t0) / 60000)} minutes, pixel ratio ${DPR}. Generated by tools/qa/mp/mp-longplay.mjs.`, '');
  for (const c of CAST) {
    const ss = c.samples.filter((s) => !s.error);
    const after = ss.slice(1);   /* the first round is the warm-up */
    const g = growth[c.name] = Object.create(null);
    md.push(`## ${c.name}`, '');
    md.push('| line | after round 1 | last | highest | slope per hour (after the warm-up) |', '|---|---|---|---|---|');
    for (const [k, L] of Object.entries(LINES)) {
      const pts = after.map((s) => [s.t, get(s, k)]).filter((p) => typeof p[1] === 'number');
      if (!pts.length) continue;
      const per = +slopePerHour(pts).toFixed(1);
      const first = pts[0][1], last = pts[pts.length - 1][1], hi = Math.max(...pts.map((p) => p[1]));
      /* climbing: a slope past its allowance AND the last reading past the
         first by a third of an hour's allowance (a slope alone can be a
         single late spike) */
      const flag = final && pts.length >= 4 && per > L.per && last - first > L.per / 3;
      g[k] = { first, last, hi, perHour: per, flag };
      md.push(`| ${L.of} | ${first} | ${last} | ${hi} | ${per}${flag ? ' **climbing**' : ''} |`);
    }
    /* the game-state counters that grew the most */
    if (after.length >= 2) {
      const a = after[0].probe || {}, b = after[after.length - 1].probe || {};
      const grew = Object.keys(b).map((k) => [k, (b[k] || 0) - (a[k] || 0), a[k] || 0, b[k]]).filter((x) => x[1] > 0)
        .sort((x, y) => y[1] - x[1]).slice(0, 10);
      if (grew.length) {
        md.push('', 'Counters that grew most (after round 1 -> last):', '');
        for (const [k, d, from, to] of grew) md.push(`- ${k}: ${from} -> ${to} (+${d})`);
      }
    }
    md.push('', 'What it did (worked / tried):', '');
    for (const [k, a] of Object.entries(c.acts)) {
      md.push(`- ${k}: ${a.ok}/${a.tries}` + (a.fails.length ? ` -- last failure: ${a.fails[a.fails.length - 1]}` : ''));
    }
    if (c.errors.length) { md.push('', 'Page errors:', ''); for (const e of c.errors.slice(0, 10)) md.push('- ' + e); }
    md.push('');
  }
  const srv = CAST[0].samples.filter((s) => s.server && s.server.rssMB != null).map((s) => [s.t, s.server.rssMB]);
  if (srv.length) {
    md.push('## The worker', '', `Memory of the worker process: ${srv[0][1]} MB after round 1, ${srv[srv.length - 1][1]} MB last, ${slopePerHour(srv.slice(1)).toFixed(1)} MB per hour after the warm-up.`, '');
  }
  writeFileSync(join(OUT, 'longplay.md'), md.join('\n'));
  writeFileSync(join(OUT, 'longplay.json'), JSON.stringify({ round, ms: Date.now() - t0, dpr: DPR,
    cast: CAST.map((c) => ({ name: c.name, key: c.key, acts: c.acts, errors: c.errors, samples: c.samples })) }, null, 1));
  return { growth };
}

/* ═══ THE ACTIVITIES (each returns {ok, why}) ═══ */

async function equipSword(P) {
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const R = S && S.rpg;
    if (!R || !S.channel || R.weapon) return;
    const idx = (R.weaponStash || []).findIndex((w) => w && w.type === 'greatsword');
    if (idx >= 0) S.channel.send({ type: 'equip_request', payload: { stashIdx: idx, slot: 'weapon' } });
  }).catch(() => {});
  await P.page.waitForTimeout(800);
}

/* up to a townsperson, his own window open (mp-questline's approach) */
async function approach(P, npc) {
  const name = (NAME_OF[npc] || npc).toLowerCase();
  let open = await H.approachNpc(P, npc);
  for (let i = 0; open && i < 3; i++) {
    const n = await P.page.evaluate(() => { const e = document.querySelector('.bt-npcdlg-name'); return e ? (e.innerText || '').trim().toLowerCase() : null; });
    if (n === null || n === name) return open;
    await H.closeNpcDialogue(P);
    await H.talkToNpc(P, npc);
    await P.page.waitForTimeout(1100);
    open = await H.npcDialogueOpen(P);
  }
  return open;
}

/* one step of the tour: walked up to its giver, taken, the objective seeded,
   handed in through his dialogue, the worker asked */
async function questStep(c, ctx, round) {
  const P = c.P;
  c.q = c.q || 0;
  const step = ARC[c.q % ARC.length];
  if (c.q % ARC.length === 0) await H.devOp(ctx.wsPort, 'tour', c.id, { at: 'tut_1' });
  c.q++;
  await P.page.waitForTimeout(1200);
  if (!(await approach(P, step.npc))) return { ok: false, why: step.id + ': his window did not open' };
  const landed = await H.advanceNpcDialogue(P);
  if (landed !== 'offer') return { ok: false, why: step.id + ': his lines did not reach the offer (' + landed + ')' };
  /* five pages on this box: a click can land and still be reported as timed
     out (the soak's first runs: the retry found the Mayor's "how's it going"
     line, the quest taken), so the worker is asked before a second, longer
     try -- and on a real miss, what lay where Accept should be */
  const takenNow = async () => {
    const a = await H.adminPlayer(ctx.wsPort, c.id).catch(() => null);
    const st = a && a.rpg && a.rpg._quests ? a.rpg._quests[step.id] : null;
    return st === 'active';
  };
  if (!(await H.confirmQuestOffer(P)) && !(await takenNow()) && !(await H.confirmQuestOffer(P, { timeout: 15000 })) && !(await takenNow())) {
    const seen = await P.page.evaluate(() => {
      const b = document.querySelector('[data-tut="qoffer-confirm"]');
      if (!b) return { button: false, panel: !!document.querySelector('.bt-qoffer') };
      const r = b.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { button: true, disabled: b.getAttribute('aria-disabled'), box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
        over: top ? (top.className || top.tagName) + '' : null, text: (b.innerText || '').trim() };
    }).catch(() => null);
    await P.page.screenshot({ path: join(OUT, `longplay-${step.id}-noaccept.png`) }).catch(() => {});
    return { ok: false, why: step.id + ': no Accept ' + JSON.stringify(seen) };
  }
  await P.page.waitForTimeout(1500);
  if (step.id === 'tut_1') { await H.closeNpcDialogue(P).catch(() => {}); await equipSword(P); }
  if (step.give) await H.grant(ctx.wsPort, c.id, 'item', step.give);
  if (step.count) await H.devOp(ctx.wsPort, 'questcount', c.id, { quest: step.id, n: step.count });
  await P.page.waitForTimeout(1500);
  if (!(await approach(P, step.npc))) return { ok: false, why: step.id + ': his window did not open for the hand-in' };
  if (!(QUEST_REWARDS[step.id] && QUEST_REWARDS[step.id].xp > 0)) {
    await H.claimOnLastLine(P);
  } else {
    const back = await H.advanceNpcDialogue(P);
    if (back !== 'offer') return { ok: false, why: step.id + ': the claim panel did not come (' + back + ')' };
    const card = await P.page.evaluate(() => { const e = document.querySelector('.bt-qoffer') || document.querySelector('.bt-npcdlg'); return e ? e.innerText || '' : ''; });
    if (/Choose/i.test(card)) await H.chooseQuestSkill(P, 'Melee');
    await H.clickSel(P, 'button.bt-quest-turnin').catch(() => {});
  }
  await P.page.waitForTimeout(2200);
  const a = await H.adminPlayer(ctx.wsPort, c.id).catch(() => ({}));
  const st = a && a.rpg && a.rpg._quests ? a.rpg._quests[step.id] : null;
  await H.closeNpcDialogue(P).catch(() => {});
  return st === 'turnedIn' ? { ok: true } : { ok: false, why: step.id + ': the worker has it ' + st };
}

/* the nearest resource of a type a level-1 hand can work */
async function nearestNode(P, type) {
  return P.page.evaluate((t) => {
    const S = window._gameState.current, p = S.player;
    let best = null, d = Infinity;
    for (const n of S.gatherNodes || []) {
      if (n.nodeType !== t || !n.alive || (n.gatherLvl || 1) !== 1) continue;
      const dd = Math.hypot(n.x - p.x, n.y - p.y);
      if (dd < d) { d = dd; best = { id: n.id, x: n.x, y: n.y }; }
    }
    return best;
  }, type);
}

/* a harvest by E held, as a computer works one (mp-deskharvest) */
async function gather(c, ctx, type) {
  const P = c.P;
  await H.hopTo(P, ctx.home.x, ctx.home.y, { tries: 80 }).catch(() => {});
  const node = await nearestNode(P, type);
  if (!node) return { ok: false, why: 'no ' + type + ' near town' };
  const st = STAND[type];
  await H.hopTo(P, node.x + st[0], node.y + st[1], { tries: 80 });
  await P.page.waitForTimeout(1200);
  await H.closeNpcDialogue(P).catch(() => {});
  const inv0 = await H.readState(P, (S) => JSON.stringify((S.rpg && S.rpg.inventory) || {}));
  await P.page.keyboard.down('e');
  const started = await H.waitFor(P, (S) => (S._extraction ? S._extraction.status : null), (v) => !!v, { timeout: 8000, label: 'a harvest starts' }).catch(() => null);
  if (!started) { await P.page.keyboard.up('e'); return { ok: false, why: type + ': no harvest started' }; }
  const done = await H.waitFor(P, (S) => (S._extraction ? S._extraction.status : 'gone'), (v) => v === 'gone', { timeout: 150000, label: 'the harvest ends' }).catch(() => null);
  await P.page.keyboard.up('e');
  await P.page.waitForTimeout(1500);
  const inv1 = await H.readState(P, (S) => JSON.stringify((S.rpg && S.rpg.inventory) || {}));
  return done && inv1 !== inv0 ? { ok: true } : { ok: false, why: type + (done ? ': nothing reached the bag' : ': the harvest never ended') };
}

/* Diego, by a tap, and one thing sold to him (ShopkeeperPanel's own messages) */
async function sellToDiego(c, ctx) {
  const P = c.P;
  await H.hopTo(P, ctx.home.x, ctx.home.y, { tries: 80 }).catch(() => {});
  const open = await H.approachNpc(P, 'shopkeeper_bro');
  const key = await H.readState(P, (S) => {
    const inv = (S.rpg && S.rpg.inventory) || {};
    return Object.keys(inv).find((k) => inv[k] > 0 && /^(ore_|fish_|wood_)/.test(k)) || null;
  });
  if (!key) { await H.closeNpcDialogue(P).catch(() => {}); return { ok: false, why: 'nothing gathered to sell' + (open ? '' : ' (and Diego did not open)') }; }
  const coins0 = await H.readState(P, (S) => (S.rpg && S.rpg.coins) || 0);
  await P.page.evaluate((k) => { const S = window._gameState.current; S.channel.send({ type: 'shop_quote', payload: { key: k, qty: 1, mode: 'sell' } }); S.channel.send({ type: 'shop_sell', payload: { key: k, qty: 1 } }); }, key);
  const paid = await H.waitFor(P, (S) => (S.rpg && S.rpg.coins) || 0, (v) => v > coins0, { timeout: 8000, label: 'Diego pays' }).catch(() => null);
  await H.closeNpcDialogue(P).catch(() => {});
  return paid ? { ok: true } : { ok: false, why: 'Diego did not pay for ' + key };
}

/* the shop as a player uses it: Diego's window opened, a quote, a sale back */
async function shopRound(c, ctx) {
  const P = c.P;
  await H.grant(ctx.wsPort, c.id, 'item', { invKey: 'fish_minnow', count: 2 }).catch(() => {});
  return sellToDiego(c, ctx);
}

/* a land's monsters, fought with the real attack disc; then each finished
   through the worker's kill path, and the loot walked over */
async function fight(c, ctx, land) {
  const P = c.P;
  await H.devOp(ctx.wsPort, 'vitals', c.id, { heal: true, god: true, godMinutes: 8 });
  const pts = ctx.WHEEL_SPAWNS[land] && ctx.WHEEL_SPAWNS[land].points;
  if (!pts || !pts.length) return { ok: false, why: 'no monsters baked in ' + land };
  const at = pts[Math.floor(Math.random() * Math.min(6, pts.length))];
  await H.hopTo(P, at[0] + 120, at[1] + 160, { tries: 300 });
  await P.page.waitForTimeout(1500);
  let kills = 0, swings = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < 70000 && kills < 4) {
    const m = await P.page.evaluate(() => {
      const S = window._gameState.current, p = S.player;
      const ms = (S.monsters || []).filter((q) => q && q.alive !== false && q.curHp > 0 && !q.boss).map((q) => ({ id: q.id, x: q.x, y: q.y, d: Math.hypot(q.x - p.x, q.y - p.y) })).sort((a, b) => a.d - b.d);
      return ms[0] || null;
    });
    if (!m) { await P.page.waitForTimeout(1000); continue; }
    if (m.d > 120) await H.hopTo(P, m.x, m.y + 70, { tries: 30 });
    /* real swings: the attack disc, tapped (mp-firefight's tapSel) */
    for (let i = 0; i < 4; i++) { if (await tapDisc(P)) swings++; await P.page.waitForTimeout(450); }
    await H.devOp(ctx.wsPort, 'killroll', c.id, { next: 1 + Math.floor(Math.random() * 9999), kill: m.id }).catch(() => {});
    kills++;
    await P.page.waitForTimeout(1200);
    /* the loot: walked over (the pickup is the worker's) */
    const pile = await P.page.evaluate(() => {
      const S = window._gameState.current;
      const l = (S.groundLoot || []).filter((x) => x && typeof x.lootId === 'string' && x.lootId.indexOf('mk-') === 0).pop();
      return l ? { x: l.x, y: l.y } : null;
    });
    if (pile) { await H.hopTo(P, pile.x, pile.y - 30, { tries: 20 }); await P.page.waitForTimeout(900); }
  }
  return kills >= 2 && swings >= 4 ? { ok: true } : { ok: false, why: `${land}: ${kills} kills, ${swings} swings` };
}

async function tapDisc(P) {
  return P.page.evaluate(() => {
    const el = document.querySelector('[data-joyzone="R"]');
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const x = r.left + r.width * 0.5, y = r.top + r.height * 0.4;
    const mk = (t) => new TouchEvent(t, { bubbles: true, cancelable: true,
      touches: t === 'touchend' ? [] : [new Touch({ identifier: 7, target: el, clientX: x, clientY: y })],
      changedTouches: [new Touch({ identifier: 7, target: el, clientX: x, clientY: y })] });
    el.dispatchEvent(mk('touchstart'));
    setTimeout(() => el.dispatchEvent(mk('touchend')), 260);
    return true;
  }).catch(() => false);
}

/* across three lands' inner ends and back home: each land's looks loaded as
   you come and let go as you leave, its music, its banner */
async function walkLands(c, ctx, round) {
  const P = c.P;
  await H.devOp(ctx.wsPort, 'vitals', c.id, { heal: true, god: true, godMinutes: 8 });
  const picks = [0, 1, 2].map((k) => ctx.LANDS[(round + k * 3) % ctx.LANDS.length]);
  let seen = 0;
  for (const land of picks) {
    const a = ctx.WHEEL_SPAWNS[land].points[0];
    await H.hopTo(P, a[0] + 200, a[1] + 200, { tries: 400 });
    await P.page.waitForTimeout(2500);
    const where = await P.page.evaluate(() => { const S = window._gameState.current; const T = window.__btWorldTrial; const h = T && T.here ? T.here(S.player.x, S.player.y) : null; return h ? h.region : null; });
    if (where) seen++;
  }
  await H.hopTo(P, ctx.home.x, ctx.home.y, { tries: 400 });
  return seen >= 2 ? { ok: true } : { ok: false, why: `${seen} of 3 lands reached (${picks.join(', ')})` };
}

/* the farm, from the Feed & Seed's "Visit Your Farm" to its gate (mp-farmwalk) */
async function farmRound(c, ctx) {
  const P = c.P;
  const until = async (fn, pred, ms = 8000) => { let v = null; for (const t = Date.now(); Date.now() - t < ms;) { v = await fn(); if (pred(v)) return v; await P.page.waitForTimeout(200); } return v; };
  await until(() => P.page.evaluate(() => !!window.__btFarm), (v) => v, 5000);
  await P.page.evaluate(() => { try { window.__btFarm.buy(window._gameState.current, 'seed_carrot', 3); } catch (e) { /* the check says */ } });
  await P.page.waitForTimeout(1500);
  await P.page.evaluate(() => { try { window._uiPanels.building('farm'); } catch (e) { /* the check says */ } });
  const visit = await until(() => P.page.evaluate(() => { const b = document.querySelector('[data-farm-visit]'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }), (v) => !!v, 8000);
  if (!visit) return { ok: false, why: 'no "Visit Your Farm"' };
  await P.page.touchscreen.tap(visit.x, visit.y);
  const on = await until(() => H.readState(P, (S) => ({ zone: S.currentZone, hold: !!S._farmArtHold })), (v) => v.zone === 'farm_home' && !v.hold, 30000);
  if (!on || on.zone !== 'farm_home') return { ok: false, why: 'never reached the farm (' + (on && on.zone) + ')' };
  await P.page.waitForTimeout(1500);
  /* two beds worked through every step the worker lets this visit take */
  let acts = 0;
  for (const i of [0, 1]) {
    const B = FARM_BEDS[i];
    await H.hopTo(P, B.x + B.w / 2, B.y - 16 - FOOT_DY, { step: 80, gap: 220, tries: 60 });
    for (let k = 0; k < 4; k++) {
      const before = await P.page.evaluate(() => (window.__btFarm && window.__btFarm.view ? JSON.stringify(window.__btFarm.view.plots) : null));
      await P.page.keyboard.press('e');
      await P.page.waitForTimeout(2600);
      const after = await P.page.evaluate(() => (window.__btFarm && window.__btFarm.view ? JSON.stringify(window.__btFarm.view.plots) : null));
      if (after && after !== before) acts++;
    }
  }
  await H.devOp(ctx.wsPort, 'farmripe', c.id).catch(() => {});
  await P.page.waitForTimeout(1500);
  for (const i of [0, 1]) {
    const B = FARM_BEDS[i];
    await H.hopTo(P, B.x + B.w / 2, B.y - 16 - FOOT_DY, { step: 80, gap: 220, tries: 60 });
    await P.page.keyboard.press('e');
    await P.page.waitForTimeout(2600);
  }
  await H.hopTo(P, FARM_GATE.x, 1376 - FOOT_DY, { step: 80, gap: 220, tries: 80 });
  const out = await until(() => H.readState(P, (S) => ({ zone: S.currentZone, l: !!S._zoneLoading })), (v) => v.zone === 'wheel' && !v.l, 40000);
  return out && out.zone === 'wheel' && acts >= 2 ? { ok: true } : { ok: false, why: `${acts} farm steps taken, back: ${out && out.zone}` };
}

/* Fighty asks Tradey into his party, Tradey says yes (the strip's messages) */
async function makeParty(a, b, ctx) {
  await a.P.page.evaluate((id) => { const S = window._gameState.current; S.channel.send({ type: 'broadcast', event: 'party_invite', payload: { target: id } }); }, b.id);
  await b.P.page.waitForTimeout(1500);
  await b.P.page.evaluate((id) => { const S = window._gameState.current; S.channel.send({ type: 'broadcast', event: 'party_accept', payload: { target: id } }); }, a.id);
  const ok = await H.waitFor(a.P, (S) => (S._party && Array.isArray(S._party.members) ? S._party.members.length : (S.party && S.party.members ? S.party.members.length : 0)), (n) => n >= 2,
    { timeout: 10000, label: 'the party' }).catch(() => null);
  return ok ? { ok: true } : { ok: false, why: 'the party never formed' };
}

/* the Goo Grotto: both at its mouth, Fighty enters (his party comes), the
   waves cleared by the QA op, the boss, out again (mp-googrotto) */
async function dungeonRun(a, b, ctx) {
  for (const c of [a, b]) await H.devOp(ctx.wsPort, 'vitals', c.id, { heal: true, god: true, godMinutes: 8 });
  let doors = [];
  for (let i = 0; i < 20 && !doors.some((d) => d.id === 'verdant'); i++) {
    doors = await a.P.page.evaluate(() => (window.__btWheelDungeons ? window.__btWheelDungeons.doors() : []));
    if (!doors.some((d) => d.id === 'verdant')) await a.P.page.waitForTimeout(500);
  }
  const goo = doors.find((d) => d.id === 'verdant');
  if (!goo) return { ok: false, why: 'the Goo Grotto is not on the map' };
  await Promise.all([H.hopTo(a.P, goo.x, goo.y + 60, { tries: 300 }), H.hopTo(b.P, goo.x + 60, goo.y + 90, { tries: 300 })]);
  let btn = false;
  for (let i = 0; i < 20 && !btn; i++) {
    btn = await a.P.page.evaluate(() => !!document.querySelector('[data-wheel-door]'));
    if (!btn) await a.P.page.waitForTimeout(400);
  }
  if (!btn) return { ok: false, why: 'no Enter button at the mouth' };
  await a.P.page.evaluate(() => { const e = document.querySelector('[data-wheel-door]'); if (e) e.click(); });
  const inZ = await H.waitFor(a.P, (S) => S.currentZone, (z) => /^dungeon:/.test(z || ''), { timeout: 40000, label: 'into the Grotto' }).catch(() => null);
  if (!inZ) return { ok: false, why: 'never entered the Grotto' };
  const bIn = await H.waitFor(b.P, (S) => S.currentZone, (z) => /^dungeon:/.test(z || ''), { timeout: 20000, label: 'the party member in' }).catch(() => null);
  await a.P.page.waitForTimeout(3000);
  for (let k = 0; k < 8; k++) {
    for (let i = 0; i < 3; i++) { await tapDisc(a.P); await a.P.page.waitForTimeout(400); }
    await H.devOp(ctx.wsPort, 'clearwave', a.id).catch(() => {});
    await a.P.page.waitForTimeout(1500);
    const z = await H.readState(a.P, (S) => S.currentZone);
    if (!/^dungeon:/.test(z || '')) break;
  }
  const back = await H.waitFor(a.P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 90000, label: 'back out' }).catch(() => null);
  await H.waitFor(b.P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 90000, label: 'the party member out' }).catch(() => null);
  return back ? { ok: true, why: bIn ? '' : 'the party member stayed outside' } : { ok: false, why: 'never came back out of the Grotto' };
}

/* a trade: both open the window on each other, a coin each way, ready, confirm */
async function tradeRound(a, b, ctx) {
  for (const c of [a, b]) await H.hopTo(c.P, ctx.home.x + (c === a ? 0 : 60), ctx.home.y + 40, { tries: 120 }).catch(() => {});
  const send = (c, event, payload) => c.P.page.evaluate(({ event, payload }) => { const S = window._gameState.current; S.channel.send({ type: 'broadcast', event, payload }); }, { event, payload });
  const coinsB0 = await H.readState(b.P, (S) => (S.rpg && S.rpg.coins) || 0);
  await send(a, 'trade2_open', { target: b.id });
  await b.P.page.waitForTimeout(1200);
  await send(b, 'trade2_open', { target: a.id });
  await b.P.page.waitForTimeout(1500);
  await send(a, 'trade2_set', { offer: { _gold: 3 } });
  await b.P.page.waitForTimeout(1200);
  await send(a, 'trade2_ready', { ready: true });
  await send(b, 'trade2_ready', { ready: true });
  /* the accept waits out the window's cooldown after the last change */
  await b.P.page.waitForTimeout(3500);
  await send(a, 'trade2_confirm', {});
  await send(b, 'trade2_confirm', {});
  const got = await H.waitFor(b.P, (S) => (S.rpg && S.rpg.coins) || 0, (v) => v >= coinsB0 + 3, { timeout: 10000, label: 'the trade settles' }).catch(() => null);
  await send(a, 'trade2_cancel', {}).catch(() => {});
  await send(b, 'trade2_cancel', {}).catch(() => {});
  return got ? { ok: true } : { ok: false, why: 'the 3 gold never arrived' };
}

/* No man's land: both out on a Lv 6-10 ring, Tradey (a computer) clicks
   Farmy, the window's Attack, a few swings; both healed after */
async function nmlFight(a, b, ctx) {
  for (const c of [a, b]) await H.devOp(ctx.wsPort, 'vitals', c.id, { heal: true, god: true, godMinutes: 8 });
  /* the same level: two players may fight in No man's land N only N levels
     apart or closer, and Tradey has been through the Goo Grotto with Fighty
     by now (its XP into his weapon) while Farmy has only farmed -- in the
     first ring the window rightly never opened (the first 40-minute run:
     0 of 3, "no Attack? window") */
  for (const c of [a, b]) await H.devOp(ctx.wsPort, 'combat', c.id, { skill: 'all', level: 6 }).catch(() => null);
  await a.P.page.waitForTimeout(2500);
  const { NML } = await import(H.REPO + '/src/data/noMansLandRings.js');
  const LONG = (await H.wheelGeom()).long;
  const T = NML.TIER * LONG;
  const land = ctx.LANDS[0];
  const an = ctx.WHEEL_SPAWNS[land].anchor;
  const L = Math.hypot(an[0] - ctx.WHEEL_CENTRE[0], an[1] - ctx.WHEEL_CENTRE[1]);
  const ux = (an[0] - ctx.WHEEL_CENTRE[0]) / L, uy = (an[1] - ctx.WHEEL_CENTRE[1]) / L;
  const r = NML.HUB + T * 1.5;
  const x = Math.round(ctx.WHEEL_CENTRE[0] + ux * r), y = Math.round(ctx.WHEEL_CENTRE[1] + uy * r);
  await Promise.all([H.hopTo(a.P, x, y, { tries: 500 }), H.hopTo(b.P, x + 50, y, { tries: 500 })]);
  await a.P.page.waitForTimeout(2500);
  const lvl = await H.readState(a.P, (S) => S._nmlLevel || 0);
  if (!lvl) return { ok: false, why: 'not in No man\'s land at ' + x + ',' + y };
  await a.P.page.evaluate(() => { if (window.__btNmlAsk) window.__btNmlAsk.setMs(30000); });
  let asked = null;
  for (let i = 0; i < 4 && !asked; i++) {
    const at = await a.P.page.evaluate((pid) => {
      const S = window._gameState.current, o = S.others && S.others[pid];
      const cv = document.querySelector('canvas.brotown-canvas') || document.querySelector('canvas');
      if (!o || !S.camera || !cv) return null;
      const rr = cv.getBoundingClientRect();
      const ox = o.renderX != null ? o.renderX : o.x, oy = o.renderY != null ? o.renderY : o.y;
      return { x: rr.left + (ox - S.camera.x) * (S._worldScaleX || 1), y: rr.top + (oy - S.camera.y) * (S._worldScaleY || 1) };
    }, b.id);
    if (at) await a.P.page.mouse.click(at.x, at.y - 4);
    await a.P.page.waitForTimeout(600);
    asked = await a.P.page.evaluate(() => { const el = document.querySelector('[data-nml-ask-attack]'); if (!el) return null; const q = el.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
  }
  if (!asked) {
    const why = await a.P.page.evaluate((pid) => {
      const S = window._gameState.current, o = S.others && S.others[pid];
      return { me: S.rpg && (S.rpg.rpgLv || S.rpg.level), them: o ? o.rpgLv : null, ring: S._nmlLevel || 0, seen: !!o };
    }, b.id).catch(() => null);
    return { ok: false, why: 'no "Attack?" window ' + JSON.stringify(why) };
  }
  await a.P.page.mouse.click(asked.x, asked.y);
  /* Farmy mortal and healed, THEN read: a blow is a drop from the full bar */
  await H.devOp(ctx.wsPort, 'vitals', b.id, { heal: true, god: false });
  await a.P.page.waitForTimeout(800);
  const hp0 = ((await H.serverPlayer(ctx.wsPort, b.id)) || {}).hp;
  for (let i = 0; i < 6; i++) {
    const at = await a.P.page.evaluate((pid) => {
      const S = window._gameState.current, o = S.others && S.others[pid];
      const cv = document.querySelector('canvas.brotown-canvas') || document.querySelector('canvas');
      if (!o || !S.camera || !cv) return null;
      const rr = cv.getBoundingClientRect();
      const ox = o.renderX != null ? o.renderX : o.x, oy = o.renderY != null ? o.renderY : o.y;
      return { x: rr.left + (ox - S.camera.x) * (S._worldScaleX || 1), y: rr.top + (oy - S.camera.y) * (S._worldScaleY || 1) };
    }, b.id);
    if (!at) break;
    await a.P.page.mouse.move(at.x, at.y - 4);
    await a.P.page.mouse.down();
    await a.P.page.waitForTimeout(220);
    await a.P.page.mouse.up();
    await a.P.page.waitForTimeout(450);
  }
  const hp1 = ((await H.serverPlayer(ctx.wsPort, b.id)) || {}).hp;
  await H.devOp(ctx.wsPort, 'vitals', b.id, { heal: true, god: true, godMinutes: 8 });
  /* home again, out of the fight */
  await Promise.all([H.hopTo(a.P, ctx.home.x, ctx.home.y, { tries: 500 }), H.hopTo(b.P, ctx.home.x + 60, ctx.home.y, { tries: 500 })]);
  return typeof hp0 === 'number' && typeof hp1 === 'number' && hp1 < (hp0 || Infinity) ? { ok: true } : { ok: false, why: `no blow landed (hp ${hp0} -> ${hp1})` };
}
