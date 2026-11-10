/* ═══ THE CROWD TOUR: WHAT A CROWD OF DIFFERENTLY-DRESSED PLAYERS HOLDS THE PAGE FOR (v2.3.4494) ═══
 *
 * The owner, 2026-11-10: "I keep catching performance issues piecemeal" --
 * and then asked for the PATTERN to be used to see the next ones coming.  The
 * pattern of every freeze found so far (TRAPS 281, 283, 317, 318;
 * docs/specs/held-sweep.md) is one shape: art made on the page the FIRST time
 * it comes on screen.  mp-heldsweep's `peer` station is ONE player riding up.
 * Wherever ANOTHER player brings something new on screen the same shape is
 * open, and nobody had measured a crowd.  This does, with mp-heldsweep's own
 * meter (makeStation / analyse) and its budget (held-budget.mjs judgeHeld).
 *
 * One real phone watches.  Scripted players (plain sockets speaking the
 * phone's protocol, as tools/qa/load/bots.mjs and mp-boards do: `ws: [1, 5]`,
 * TRAPS 196; `bp_` characters, so the boards know their faces) arrive round it
 * in groups, each dressed to test one forecast (docs/specs/held-sweep.md, "The
 * crowd tour"):
 *
 *   a  an eye style, a tattoo, a trouser print: each pose and facing they
 *      show baked on the page (playerSkins.js lookBodyRefused -> buildBodySheet);
 *   b  two players FISHING in the shirt every new player wears (the cast takes
 *      getFishFrame -> buildBodySheet('fish'), a 32-frame sheet);
 *   c  one armoured player, then seven more (the head sheet, the armour cut);
 *   d  ten different drawn shirts in hit, roll, gather and swing (gearSheets.js
 *      MAX_ART_KEYS is 8: do they bake in turn?);
 *   f  the phone walks into groups a to d (23) standing together;
 *   g  the Leaderboards opened, every board, faces it has never drawn;
 *   e  eight species-and-skin pairs (speciesArt.js _BUILD_CAP is 6), LAST:
 *      they bury the page in pictures (docs/specs/held-sweep.md);
 *   h  the garbage collector with one armoured player walking about, then
 *      eight (entityRenderer.js builds arrays and strings per armoured peer
 *      every frame);
 *   i  the graphics chip's bytes (window.__btGpuTex) before the crowd and
 *      after it has shown every pose.
 *
 * Each group arrives, turns through the eight facings walking, stands,
 * swings, is hit, rolls, mines and casts a line beside the phone (the
 * station), then waits far off in the world until the walk-in.  Each group
 * joins just before its turn.  The report: tools/qa/mp/out/crowdsweep.json.
 *
 *   NODE_OPTIONS=--max-old-space-size=8192 npx vite build --minify false --outDir dist-prof && mv src/dist-prof dist-prof
 *   QA_DIST=dist-prof node tools/qa/mp/run.mjs crowdsweep
 *   BT_CS_STATIONS=a-ink,b-fish   only these groups (see STATION_NAMES; f and g always want the crowd that came before)
 *
 * About 15 minutes.  The numbers are this box's: its JavaScript runs at about
 * a phone's speed, its drawing in software does not (held-sweep.md).
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeStation } from './mp-heldsweep.mjs';
import { HOLD_MAX_MS, FRAME_JS_MAX_MS, KNOWN, judgeHeld } from './held-budget.mjs';

const PHONE = { width: 430, height: 932 };
const STATION_NAMES = ['a-ink', 'b-fish', 'c-armour1', 'h-one', 'c-armour8', 'h-eight', 'd-prints', 'f-walkin', 'g-boards', 'e-species'];
const WANT = (process.env.BT_CS_STATIONS || STATION_NAMES.join(',')).split(',').map((s) => s.trim()).filter(Boolean);
const FACINGS = [['north', 0, -1], ['northeast', 1, -1], ['east', 1, 0], ['southeast', 1, 1], ['south', 0, 1], ['southwest', -1, 1], ['west', -1, 0], ['northwest', -1, -1]];
const SPEED = 160;   /* px a second: a phone's walk, under movement.js's bound */

/* a drawing (16 x 16 cells, one hex character a cell, 0 blank): `seed` makes each one different, so each is its own
   art key (gearSheets.js keys a drawn shirt by its drawing) */
function drawing(seed) {
  let s = '';
  for (let i = 0; i < 256; i++) {
    const x = i % 16, y = i >> 4;
    const on = ((x * 7 + y * 3 + seed * 5) % 11) < 3 || (y === (seed % 16));
    s += on ? String(1 + ((seed + x + y) % 5)) : '0';
  }
  return s;
}

/* ── a scripted player: a plain socket speaking the phone's protocol ── */
async function bot(wsPort, room, { id, name, look }) {
  const ws = new WebSocket(`ws://127.0.0.1:${wsPort}/ws?room=${encodeURIComponent(room)}&rf=1`);
  let synced = null;
  const syncP = new Promise((res) => { synced = res; });
  ws.onmessage = (ev) => {
    if (typeof ev.data !== 'string' || ev.data.startsWith('{"type":"tick"')) return;
    if (ev.data.startsWith('{"type":"ping"')) { try { ws.send(JSON.stringify({ type: 'pong', ts: JSON.parse(ev.data).ts })); } catch { /* gone */ } return; }
    if (ev.data.startsWith('{"type":"state_sync"')) synced(true);
  };
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('bot socket failed')); });
  const b = { id, name, look, x: 1000, y: 1000, z: 'town', f: 'south', ex: null, ws, closed: null };
  ws.onclose = (ev) => { b.closed = ev.code || 1006; clearInterval(b.idle); };
  const raw = (o) => { try { ws.send(JSON.stringify(o)); } catch { /* gone */ } };
  ws.send(JSON.stringify({
    type: 'join', id, name, phrase: 'p-' + id, device: { id: 'dev' + id }, protocolVersion: 2, httpAuth: true, ws: [1, 5],
    data: { x: 1000, y: 1000, d: 'south', z: 'town', name, ...look },
  }));
  b.synced = await Promise.race([syncP, new Promise((r) => setTimeout(() => r(false), 20000))]);
  /* a standing phone still tells the worker it is there: its keepalive and its 2 s look, which says it is awake (`aw: 0`;
     a move that changes nothing does not count, index.js).  Without it the worker closes a socket after two minutes
     (4006, tick.js), and the first tours lost groups d and e that way */
  b.idle = setInterval(() => { if (Date.now() - (b.lastMove || 0) > 2500) b.move(); b.track(); }, 3000);
  /* a phone's move: the armour rides every one (BroTown.jsx), the harvest code `ex` too */
  b.move = (vx = 0, vy = 0) => (b.lastMove = Date.now(), raw({ type: 'move', x: Math.round(b.x * 10) / 10, y: Math.round(b.y * 10) / 10,
    d: vx > 0 ? 'right' : vx < 0 ? 'left' : vy < 0 ? 'up' : 'down', f: b.f, z: b.z,
    vx: Math.round(vx * 100), vy: Math.round(vy * 100), eqc: look.eqc || 'none', eql: look.eql || 'none', eqs: 'none', ex: b.ex,
    dodging: false, blocking: false, ba: null, dead: false }));
  /* the 2 s look a phone sends (`track`): the look the renderer reads off the wire */
  b.track = () => raw({ type: 'track', data: { name, zone: b.z, aw: 0, ...look } });   /* aw 0: awake (index.js: a standing move does not count) */
  b.relay = (type, payload) => raw({ type, payload: { id, ...payload } });
  /* to anywhere: out to the town's zone and back in, the zone change skipping the walk's bound (mp-farpeer) */
  b.place = async (x, y) => {
    b.z = 'town'; b.move();
    await new Promise((r) => setTimeout(r, 250));
    b.x = x; b.y = y; b.z = 'wheel'; b.move(); b.track();
  };
  b.walk = async (dx, dy, ms) => {
    const n = Math.max(1, Math.round(ms / 66)), len = Math.hypot(dx, dy) || 1;
    for (let i = 0; i < n; i++) {
      b.x += dx / len * SPEED * 0.066; b.y += dy / len * SPEED * 0.066;
      b.move(dx / len * SPEED / 60, dy / len * SPEED / 60);
      await new Promise((r) => setTimeout(r, 66));
    }
    b.move();
  };
  b.close = () => { clearInterval(b.idle); try { ws.close(); } catch { /* gone */ } };
  return b;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* what one player of a group does beside the phone: every facing walking, a stand, two swings, two hits taken, a roll,
   a mining swing and a cast.  `only` narrows it (the fishers only fish; the walkers of h only walk). */
async function routine(b, { only } = {}) {
  const want = (k) => !only || only.includes(k);
  if (want('walk')) for (const [f, dx, dy] of FACINGS) { b.f = f; await b.walk(dx, dy, 500); await sleep(250); }
  if (want('stand')) { b.f = 'south'; b.move(); await sleep(800); }
  if (want('swing')) for (let i = 0; i < 2; i++) { b.relay('player_swing', { ang: i * 1.6, wpn: 'greatsword' }); await sleep(700); }
  if (want('hit')) for (let i = 0; i < 2; i++) { b.relay('player_hurt_by_monster', { dmg: 3 }); await sleep(450); }
  if (want('roll')) { b.relay('player_dodge', { angle: 0.4, kind: 'dodge', dur: 450, walk: true }); await b.walk(1, 0.4, 450); await sleep(400); }
  if (want('mine')) { b.ex = 'mine'; for (let i = 0; i < 6; i++) { b.move(); await sleep(500); } b.ex = null; b.move(); await sleep(300); }
  if (want('fish')) { b.ex = 'fish'; for (let i = 0; i < 9; i++) { b.move(); await sleep(500); } b.ex = null; b.move(); await sleep(300); }
}

/* the graphics chip's bytes (pixiApp.js __btGpuTex, mp-gpuaudit's hook): in all, by kind (a picture from a file, one
   the page made), the gear's share by name (the armour strips' cache, effectsRenderer.js _gearStrips, is bounded by the
   catalogue: about 22 MB when every pose has been seen), and the made pictures grouped by size */
const gpu = (P) => P.page.evaluate(() => {
  const g = window.__btGpuTex ? window.__btGpuTex(4000) : null;
  if (!g || g.err) return g;
  let gearMb = 0, gearN = 0;
  for (const r of g.list || []) if (/gear|armou?r|plate|greave/i.test(String(r.label || ''))) { gearMb += r.mb || 0; gearN++; }
  /* the pictures the page MADE (not files), grouped by size: which kind of sheet it is shows in its size */
  const bySize = new Map();
  for (const r of g.list || []) {
    if (r.kind === 'file') continue;
    const key = r.kind + ' ' + r.w + 'x' + r.h + (r.label ? ' ' + r.label.slice(0, 40) : '');
    const v = bySize.get(key) || { n: 0, mb: 0 };
    v.n++; v.mb += r.mb || 0;
    bySize.set(key, v);
  }
  const made = [...bySize.entries()].sort((a, b) => b[1].mb - a[1].mb).slice(0, 10).map(([k, v]) => [k, v.n, +v.mb.toFixed(1)]);
  return { n: g.n, mb: g.mb, byKind: g.byKind, gear: { n: gearN, mb: +gearMb.toFixed(1) }, made };
}).catch((e) => ({ err: String(e && e.message || e) }));

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const A = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, viewport: PHONE, touch: true, dpr: 1, world: 'wheel', query: 'manual=0' + (process.env.BT_CS_QUERY ? '&' + process.env.BT_CS_QUERY : '') });
  const stopA = H.keepAlive(A, 15000);
  const bots = [];
  const report = { stations: [], gpu: {} };
  /* a crowd from one address: the worker's flood lines would turn the twentieth away (flood.js) */
  await H.liveFlag(wsPort, 'ip_sockets', 500).catch(() => null);
  await H.liveFlag(wsPort, 'ip_joins_min', 5000).catch(() => null);
  try {
    await H.enterWorld(A);
    const ok = await H.waitFor(A, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'into the world' }).then(() => true).catch(() => false);
    rec.ok('the phone is in BroTown (guard)', ok);
    if (!ok) return;
    const me = await H.readState(A, (S) => S.myId);
    await A.page.evaluate(() => { const S = window._gameState.current; const R = S.rpg; R._quests = R._quests || {}; R._quests.tut_1 = true; }).catch(() => {});
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 40 }).catch(() => null);
    await A.page.waitForTimeout(6000);
    let here = await H.readState(A, (S) => ({ x: S.player.x, y: S.player.y }));
    const room = await fetch(`http://127.0.0.1:${wsPort}/api/lobby`).then((r) => r.json()).then((j) => (j && j.room) || 'brotown-1').catch(() => 'brotown-1');
    report.gpu.before = await gpu(A);
    console.log('  the chip before the crowd:', JSON.stringify(report.gpu.before));

    const cdp = await A.page.context().newCDPSession(A.page);
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 400 });
    const station = makeStation(A, cdp, report, WANT);
    const stamp = Date.now().toString(36);
    let k = 0;
    const spec = (name, look) => ({ name, look });
    const make = async (name, look) => {
      const b = await bot(wsPort, room, { id: `bp_cs${k++}_${stamp}`, name, look });
      bots.push(b);
      return b;
    };
    /* round the phone, on its screen: a ring 90 to 170 px out */
    const spot = (i, n) => { const a = (i / Math.max(1, n)) * Math.PI * 2; const r = 90 + (i % 3) * 40; return [here.x + Math.cos(a) * r, here.y + Math.sin(a) * r * 0.8]; };
    const arrive = async (group) => { for (let i = 0; i < group.length; i++) { const [x, y] = spot(i, group.length); await group[i].place(x, y); } await sleep(1500); };
    /* how many others the phone has in its own world (S.others holds the whole room, the town's zone too) */
    const seen = () => A.page.evaluate(() => Object.values(window._gameState.current.others || {}).filter((o) => o && o.zone === 'wheel').length).catch(() => -1);
    /* what the phone holds of a group's looks: the guard that the look under test reached it (peerCosmetics.js names) */
    const looks = (group) => A.page.evaluate((ids) => ids.map((id) => {
      const o = (window._gameState.current.others || {})[id];
      if (!o) return null;
      return [o.zone, o.eyeStyle || '', o.species || '', o.skin || '', !!o.tattooArt, !!o.pantsArt, !!o.shirtArtFront, o.shirtPattern || '', (o.equip && o.equip.chest) || o.eqc || '', o.equip && o.equip.shirt || o.eqst || '', o._ex || ''].join('|');
    }), group.map((b) => b.id)).catch(() => null);
    const groups = {};
    const shirt = { eqst: 'tshirt', st: 'tshirt' };

    /* a: an eye style, tattoos, a trouser print */
    groups.a = [
      spec('Sleepy', { ...shirt, sk: 'ebony', es: 'sleepy', pt: 'red', sh: 'blue' }),
      spec('Inked', { ...shirt, sk: 'pale', ta: drawing(1), tf: drawing(2), tm: drawing(3) }),
      spec('Printed', { ...shirt, sk: 'olive', pa: drawing(4), pb: drawing(5), pt: 'blue' }),
    ];
    /* b: two fishers in the shirt everyone starts in */
    groups.b = [spec('Fisher', { ...shirt }), spec('Angler', { ...shirt, sk: 'deep', pt: 'red', sh: 'red' })];
    /* c / h: one armoured player, then seven more of other looks */
    const SK = ['tan', 'fair', 'brown', 'honey', 'rosy', 'sand', 'deep', 'pale'];
    groups.c1 = [spec('Plate0', { ...shirt, sk: 'ebony', pt: 'red', sh: 'blue', eqc: 'copperplate', eql: 'coppergreaves' })];
    groups.c8 = [];
    for (let i = 1; i < 8; i++) groups.c8.push(spec('Plate' + i, { ...shirt, sk: SK[i], pt: i % 2 ? 'blue' : 'red', eqc: 'copperplate', eql: i % 3 ? 'coppergreaves' : 'none' }));
    /* d: ten drawn shirts, two with a pattern too */
    groups.d = [];
    for (let i = 0; i < 10; i++) groups.d.push(spec('Shirt' + i, { ...shirt, sk: SK[i % 8], sa: drawing(20 + i), sb: drawing(40 + i), ...(i < 2 ? { sp: ['check:3', 'stripe-v:5'][i] } : {}) }));
    /* e: eight species-and-skin pairs */
    const FUR = ['purple', 'yellow', 'red', 'orange', 'green', 'blue', 'pink', 'gray'];
    groups.e = [];
    for (let i = 0; i < 8; i++) groups.e.push(spec((i % 2 ? 'Alien' : 'Monkey') + i, { ...shirt, sc: i % 2 ? 'alien' : 'monkey', sk: FUR[i] }));
    /* each group joins just before its turn and waits in the world, far off, after it (the first tours joined them all
       at the start and parked them in the town's zone: the worker closed every socket left there two or three minutes,
       and groups d and e were gone before their turn) */
    const G = await H.wheelGeom();
    const park = G.along(Object.keys(G.W.byId || {})[0], 1);
    const joinGroup = async (specs) => { const out = []; for (const x of specs) out.push(await make(x.name, x.look)); await sleep(1500); return out; };

    /* the chip after each station, outside its profile (the reading itself walks every texture) */
    const chip = async (name) => { if (!WANT.includes(name)) return; report.gpu[name] = await gpu(A); console.log(`  the chip after ${name}: ${report.gpu[name] && report.gpu[name].mb} MB`, JSON.stringify(report.gpu[name] && report.gpu[name].made).slice(0, 400)); };
    const play = async (name, label, group, opts) => (await stationOf(name, label, group, opts), await chip(name));
    const stationOf = async (name, label, group, opts) => station(name, label, async () => {
      await arrive(group);
      const n = await seen(), held = await looks(group);
      await Promise.all(group.map((b) => routine(b, opts)));
      await A.page.waitForTimeout(1500);
      return { players: group.length, seen: n, looks: held, closed: group.filter((b) => b.closed).length };
    });
    const away = async (all) => { const group = all.filter((b) => b.place); for (let i = 0; i < group.length; i++) await group[i].place(park.x + (i % 6) * 40, park.y + Math.floor(i / 6) * 40); await sleep(1200); };

    if (WANT.includes('a-ink')) groups.a = await joinGroup(groups.a);
    await play('a-ink', 'a: an eye style, tattoos and a trouser print, every pose and facing', groups.a);
    await away(groups.a);
    if (WANT.includes('b-fish')) groups.b = await joinGroup(groups.b);
    await play('b-fish', 'b: two players fishing in a shirt', groups.b, { only: ['fish', 'stand'] });
    await away(groups.b);
    if (WANT.includes('c-armour1')) groups.c1 = await joinGroup(groups.c1);
    await play('c-armour1', 'c: one armoured player arrives, every pose and facing', groups.c1);
    await station('h-one', 'h: one armoured player walks about (20 s)', async () => {
      const t0 = Date.now();
      while (groups.c1[0].place && Date.now() - t0 < 20000) await routine(groups.c1[0], { only: ['walk'] });
      return { players: 1 };
    });
    await chip('h-one');
    if (WANT.includes('c-armour8')) groups.c8 = await joinGroup(groups.c8);
    await play('c-armour8', 'c: seven more armoured players arrive, every pose and facing', groups.c8);
    await station('h-eight', 'h: eight armoured players walk about (20 s)', async () => {
      const all = [...groups.c1, ...groups.c8].filter((b) => b.place);
      const t0 = Date.now();
      await Promise.all(all.map(async (b) => { while (Date.now() - t0 < 20000) await routine(b, { only: ['walk'] }); }));
      return { players: all.length, seen: await seen() };
    });
    await chip('h-eight');
    await away([...groups.c1, ...groups.c8]);
    if (WANT.includes('d-prints')) groups.d = await joinGroup(groups.d);
    await play('d-prints', 'd: ten drawn shirts in every pose (more than the 8 kept baked)', groups.d);
    await away(groups.d);

    /* f: the whole crowd stands together out of sight; the phone walks into it */
    const far = { x: here.x + 1500, y: here.y };
    if (WANT.includes('f-walkin')) {
      for (let i = 0; i < bots.length; i++) { const a = (i / bots.length) * Math.PI * 2; await bots[i].place(far.x + Math.cos(a) * 140, far.y + Math.sin(a) * 110); }
      await sleep(2000);
    }
    await station('f-walkin', `f: the phone walks into ${bots.length} players standing together`, async () => {
      await H.glideTo(A, far.x - 60, far.y, { speed: 450, timeoutMs: 60000 });
      await A.page.waitForTimeout(4000);
      return { players: bots.length, seen: await seen(), wheel: !!G };
    });
    await chip('f-walkin');

    /* g: the Leaderboards, every board: faces the phone has not drawn */
    await station('g-boards', 'g: the Leaderboards opened, every board', async () => {
      await H.unfoldBand(A).catch(() => null);
      /* a real tap, as mp-boards does (Ranks on the band's row) */
      await A.page.locator('.bt-navrail [data-nav="leaderboard"]').first().click({ force: true, timeout: 8000 }).catch(() => null);
      await A.page.waitForSelector('[data-lb-page]', { timeout: 15000 }).catch(() => {});
      await A.page.waitForTimeout(2500);
      const cats = await A.page.evaluate(() => document.querySelectorAll('[data-lb-rail] [data-lb-cat]').length).catch(() => 0);
      let faces = 0;
      for (let i = 0; i < cats; i++) {
        await A.page.evaluate((i) => { const c = document.querySelectorAll('[data-lb-rail] [data-lb-cat]')[i]; if (c) c.click(); }, i);
        await A.page.waitForTimeout(1500);
        faces = Math.max(faces, await A.page.evaluate(() => document.querySelectorAll('[data-lb-icon] img, [data-lb-board] img, [data-lb-board] canvas').length).catch(() => 0));
      }
      await A.page.evaluate(() => { const x = document.querySelector('[data-esc]'); if (x) x.click(); }).catch(() => {});
      await H.closeDest(A, { timeout: 3000 }).catch(() => {});
      return { boards: cats, mostFaces: faces };
    });

    /* e, LAST: eight species looks churn their builds and bury the page in pictures (the first full tours played it
       before f and g, and those two then measured only the buried page) -- round where the phone stands now */
    here = await H.readState(A, (S) => ({ x: S.player.x, y: S.player.y }));
    if (WANT.includes('e-species')) groups.e = await joinGroup(groups.e);
    await play('e-species', 'e: eight species-and-skin pairs (more than the 6 kept built)', groups.e);

    const { ranked, over } = judgeHeld(report.stations);
    report.ranked = ranked;
    report.over = over;
    writeFileSync(join(OUT, 'crowdsweep.json'), JSON.stringify(report, null, 1));
    console.log('\n  ══ WHAT HELD THE PAGE IN THE CROWD, WORST FIRST ══');
    console.log('     longest   times   in all   where                          what');
    for (const f of ranked.slice(0, 40)) console.log(`     ${String(f.longest).padStart(6)} ms ${String(f.n).padStart(5)} ${String(f.sum).padStart(7)} ms  ${f.where.padEnd(30).slice(0, 30)} [${f.key}] ${f.what === f.key ? '' : f.what}${f.via ? '   via ' + f.via : ''}`);
    /* h: the collector, one armoured player against eight */
    const gcOf = (name) => {
      const s = report.stations.find((x) => x.name === name);
      if (!s) return null;
      const outside = s.held.filter((h) => h.key === 'gc'), inside = ((s.frames && s.frames.long) || []).filter((f) => f.key === 'gc');
      const all = [...outside, ...inside].map((h) => h.ms);
      return { secs: s.secs, n: all.length, longest: all.length ? Math.max(...all) : 0, sum: Math.round(all.reduce((t, v) => t + v, 0)), medFrameJs: s.frames.medJs };
    };
    report.gc = { one: gcOf('h-one'), eight: gcOf('h-eight') };
    console.log('  h, the collector: one armoured', JSON.stringify(report.gc.one), ' eight', JSON.stringify(report.gc.eight));
    writeFileSync(join(OUT, 'crowdsweep.json'), JSON.stringify(report, null, 1));

    rec.ok(`the profile reads by name (the game's loop found in ${report.stations.filter((s) => s.readable).length} of ${report.stations.length} stations)`,
      report.stations.length >= 1 && report.stations.every((s) => s.readable), 'build with: npx vite build --minify false --outDir dist-prof, and run with QA_DIST=dist-prof');
    rec.ok(`the crowd came (guard): ${bots.filter((b) => b.synced).length} of ${bots.length} players joined, ${bots.filter((b) => b.closed).length} sockets closed by the end`,
      bots.length > 0 && bots.every((b) => b.synced && !b.closed), bots.filter((b) => !b.synced || b.closed).map((b) => [b.name, b.closed]));
    rec.ok('the phone saw the crowd (guard: each group was on its screen)', report.stations.filter((s) => s.note && typeof s.note.seen === 'number').every((s) => s.note.seen >= 1),
      report.stations.map((s) => [s.name, s.note && s.note.seen]));
    const listed = over.filter((o) => o.listed), fresh = over.filter((o) => !o.listed);
    const say = (l) => l.slice(0, 6).map((o) => `${o.key} ${o.longest} ms > ${o.line} (${o.where}${o.times > 1 ? ', ' + o.times + ' times' : ''})`).join('; ');
    rec.ok(`the budget: nothing NEW holds the page past its line -- ${HOLD_MAX_MS} ms a job outside the frame, ${FRAME_JS_MAX_MS} ms of the game's own code inside one (${fresh.length} over${fresh.length ? ': ' + say(fresh) : ''})`,
      fresh.length === 0, fresh);
    rec.ok(`...and nothing on the debt list has grown past its own line (${Object.keys(KNOWN).length} listed; ${listed.length} over${listed.length ? ': ' + say(listed) : ''})`,
      listed.length === 0, listed);
    rec.ok(`every station asked for was played (${report.stations.map((s) => s.name).join(', ')})`, WANT.every((w) => report.stations.some((s) => s.name === w)), WANT);
  } finally {
    stopA();
    for (const b of bots) b.close();
    await H.liveFlag(wsPort, 'ip_sockets', null).catch(() => null);
    await H.liveFlag(wsPort, 'ip_joins_min', null).catch(() => null);
    await A.ctx.close().catch(() => {});
  }
}
