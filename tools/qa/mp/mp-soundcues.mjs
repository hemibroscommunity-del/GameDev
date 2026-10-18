/* ═══ v2.3.3343: THE MISSING SOUNDS, HEARD ON A PHONE ═══
 *
 * The owner, 2026-10-18, on the list of missing sounds: "Start adding the have
 * ones" -- every event that played nothing and can be made from a recording
 * the game already ships (data/eventSounds.js, played by game/eventSounds.js;
 * the table's shape, files and call sites are held by
 * server/test/sound-cues.test.mjs).  This plays them for real, on a page in the
 * Wheel's BroTown (every monster on its way in: ?wheelwhole) with a friend
 * beside it (a bare socket speaking the game's protocol, mp-farpeer's walker):
 *
 *   0. the sound is up, and every sample a cue plays was decoded on the
 *      loading screen (nothing is fetched on first use);
 *   1. every cue in the table starts when asked;
 *   2. your own, through the keys: a jump's push-off and landing (X), a weapon
 *      change (2, 1), the shield up and down (Q), a door (the bank's Enter);
 *   3. monsters, through the real handlers (window.__btDispatch): a snowball's,
 *      a fireball's and a glob's throw beside you and none 2,000 px off; a
 *      mummy's wrappings tearing; a blow on you dodged (the rush, never the
 *      armour's clang), one on your shield (the clang), a parried one (no
 *      clang: the parry plays); each creature's own death, and none for the
 *      slimes the renderer already splats;
 *   4. the friend: its footsteps, its jump (push-off, then the landing), its
 *      roll and its shield coming up, each at about half your own level; ten
 *      jumps at once held to PEER_BURST;
 *   5. Bro Pond heard on its bank, not from the town square, and the loop let
 *      go once you are away from it;
 *   6. no page errors.
 *
 *   node tools/qa/mp/run.mjs soundcues
 */
import * as H from './harness.mjs';

const VIEW = { width: 900, height: 700 };   /* a keyboard: X, 1, 2, Q */
const NEAR = 60, FAR = 2000;
const SPEED = 165;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* the friend: a bare socket speaking the game's protocol (mp-farpeer's walker) */
function friend(wsPort) {
  const w = { x: 0, y: 0, ws: null, synced: false, timer: null };
  w.id = 'scfriend' + Math.random().toString(36).slice(2, 10);
  w.open = () => new Promise((resolve, reject) => {
    /* the main room, the page's: the admin levers (H.devOp) reach only it */
    const ws = new WebSocket(`ws://127.0.0.1:${wsPort}/ws?rf=1`);
    w.ws = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: 'join', id: w.id, name: 'Friend', protocolVersion: 2, httpAuth: true,
      data: { x: 1000, y: 1000, d: 'down', z: 'town', name: 'Friend' } }));
    ws.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      if (ev.data.startsWith('{"type":"ping"')) { try { ws.send(JSON.stringify({ type: 'pong', ts: JSON.parse(ev.data).ts })); } catch {} return; }
      if (!w.synced && ev.data.startsWith('{"type":"state_sync"')) { w.synced = true; resolve(); }
    };
    ws.onerror = () => reject(new Error('friend socket error'));
  });
  w.move = (x, y, z = 'wheel', vx = 0, vy = 0) => {
    w.x = x; w.y = y;
    w.ws.send(JSON.stringify({ type: 'move', x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, d: vx > 0 ? 'right' : vx < 0 ? 'left' : 'down',
      f: vx > 0 ? 'east' : vx < 0 ? 'west' : 'south', eqc: 'none', eql: 'none', eqs: 'none', ex: null, z,
      vx: Math.round(vx * SPEED / 60 * 100), vy: Math.round(vy * SPEED / 60 * 100),
      dodging: false, blocking: false, ba: null, dead: false }));
  };
  /* to anywhere: through town and back (its first way in is not judged) */
  w.place = async (x, y) => { w.move(w.x, w.y, 'town'); await sleep(300); w.move(x, y, 'wheel'); };
  /* a relay, as a phone's channel sends one (the worker names the sender) */
  w.relay = (type, payload) => w.ws.send(JSON.stringify({ type, payload: Object.assign({ id: w.id }, payload) }));
  /* back and forth for `ms`, a phone's 30 moves a second */
  w.walk = (ms) => new Promise((resolve) => {
    const x0 = w.x, t0 = Date.now();
    const tick = () => {
      const t = Date.now() - t0;
      if (t >= ms) { w.move(x0, w.y, 'wheel', 0, 0); resolve(); return; }
      const dir = Math.floor(t / 1000) % 2 ? -1 : 1;
      w.move(Math.max(x0 - 120, Math.min(x0 + 120, w.x + dir * SPEED * 0.033)), w.y, 'wheel', dir, 0);
      w.timer = setTimeout(tick, 33);
    };
    tick();
  });
  w.close = () => { clearTimeout(w.timer); try { w.ws.close(); } catch {} };
  return w;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Earful', wsPort, webPort, viewport: VIEW, world: 'wheel', query: 'wheelwhole' });
  const errs = [];
  P.page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await H.enterWorld(P);
  let zone = null;
  for (let i = 0; i < 120; i++) {
    zone = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
    if (zone === 'wheel') break;
    await P.page.waitForTimeout(500);
  }
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  const W = friend(wsPort);
  const done = async () => { stopAlive = true; W.close(); await P.ctx.close().catch(() => {}); };
  const myId = await H.readState(P, (S) => S.myId);
  /* past the Mayor gate (it holds a new bro in the commons), and out of harm's way */
  await H.devOp(wsPort, 'quests', myId);
  await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });
  await P.page.waitForTimeout(1500);

  /* ── 0. the sound is up, every cue's sample decoded ── */
  const audio = await P.page.evaluate(async () => {
    const A = window.BT_AUDIO, C = window.__btCues;
    if (!A || !C) return { probe: !!C, audio: !!A };
    if (!A.ctx) { try { A.unlock(); } catch (e) { /* reported below */ } }
    if (A.ctx && A.ctx.state !== 'running') { try { await A.ctx.resume(); } catch (e) { /* reported below */ } }
    const keys = C.keys();
    const t0 = Date.now();
    while (Date.now() - t0 < 25000 && !keys.every((k) => A._samples && A._samples[k])) await new Promise((r) => setTimeout(r, 250));
    return { probe: true, ctx: !!A.ctx, state: A.ctx && A.ctx.state, muted: !!A.muted, names: C.names().length, keys: keys.length,
      missing: keys.filter((k) => !(A._samples && A._samples[k])), water: !!window.__btWater };
  });
  rec.ok(`setup: in the Wheel (${zone}), the probes, the sound up (${audio.state}), and all ${audio.keys} samples the ${audio.names} cues play decoded`,
    zone === 'wheel' && audio.probe && audio.water && audio.ctx && !audio.muted && audio.names >= 100 && (audio.missing || []).length === 0, audio);
  if (!audio.ctx || audio.muted) { await done(); return; }

  /* one thing done on the page, and the cues it played: name and share */
  const cues = (fn, arg) => P.page.evaluate(async ({ src, arg }) => {
    const C = window.__btCues;
    C.reset();
    const f = new Function('arg', 'return (' + src + ')(arg)');
    const out = await f(arg);
    return { out, cues: C.stats.log.map((c) => ({ name: c.name, k: Math.round(c.k * 1000) / 1000, played: c.played })) };
  }, { src: fn.toString(), arg });
  const named = (r, name) => r.cues.filter((c) => c.name === name);

  /* ── 1. every cue starts when asked ── */
  const all = await P.page.evaluate(() => {
    const C = window.__btCues;
    C.reset();
    const bad = [];
    for (const n of C.names()) if (!C.play(n, 0.05)) bad.push(n);
    return { n: C.names().length, bad };
  });
  rec.ok(`1. every one of the ${all.n} cues starts a sound when asked (its samples are in)`, all.bad.length === 0, all.bad);

  /* ── 2. your own ── */
  await P.page.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); window.__btCues.reset(); });
  await P.page.keyboard.press('x');
  const jump = await H.waitFor(P, () => ({ up: window.__btCues.stats.played.jumpUp || 0, land: window.__btCues.stats.played.jumpLand || 0 }),
    (v) => v.up >= 1 && v.land >= 1, { timeout: 8000, label: 'the jump heard' }).catch(() => null);
  rec.ok('2a. a jump (X): its push-off, then its landing', !!jump && jump.up === 1 && jump.land === 1, jump);

  await P.page.evaluate(() => window.__btCues.reset());
  const slot0 = await H.readState(P, (S) => S.rpg && S.rpg.activeSlot);
  await P.page.keyboard.press('2');
  await P.page.waitForTimeout(400);
  await P.page.keyboard.press('1');
  await P.page.waitForTimeout(400);
  const swap = await P.page.evaluate(() => ({ n: window.__btCues.stats.played.weaponSwap || 0, slot: window._gameState.current.rpg.activeSlot }));
  rec.ok(`2b. a weapon changed and changed back (2, 1): the blade drawn each time (${swap.n})`, slot0 === 'melee' && swap.n === 2 && swap.slot === 'melee', { slot0, swap });

  /* the shield the admin panel hands out, worn as the bag's Equip wears it */
  await H.devOp(wsPort, 'kit', myId, { what: 'shield' });
  const pine = await H.waitFor(P, (S) => ((S.rpg && S.rpg.shieldStash) || []).find((p) => p && p.gid && /Pine Shield/.test(p.name)) || null,
    (v) => !!v, { timeout: 10000, label: 'the Pine Shield' }).catch(() => null);
  if (pine) {
    await P.page.evaluate((gid) => {
      const S = window._gameState.current, R = S.rpg;
      const i = R.shieldStash.findIndex((p) => p && p.gid === gid);
      if (R.shield) R.shieldStash.push(R.shield);
      R.shield = R.shieldStash.splice(i, 1)[0];
      S.channel.send({ type: 'shield_wear', payload: { gid } });
      window.__btCues.reset();
    }, pine.gid);
    /* on a keyboard Q is HELD: down raises it, up lowers it (desktopControls) */
    await P.page.keyboard.down('q');
    await P.page.waitForTimeout(500);
    const up = await P.page.evaluate(() => ({ on: !!window._gameState.current._shieldUp, n: window.__btCues.stats.played.shieldUp || 0, d: window.__btCues.stats.played.shieldDown || 0 }));
    await P.page.keyboard.up('q');
    await P.page.waitForTimeout(500);
    const down = await P.page.evaluate(() => ({ on: !!window._gameState.current._shieldUp, n: window.__btCues.stats.played.shieldDown || 0 }));
    rec.ok('2c. the shield held up (Q) and let down: the buckle each way, once each', up.on && up.n === 1 && up.d === 0 && !down.on && down.n === 1, { up, down });
  } else {
    rec.ok('2c. the admin panel\'s shield reached the bag (guard)', false, null);
  }

  /* the bank's door: stand at its steps and tap Enter */
  const bank = await P.page.evaluate(() => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []).find((d) => d.id === 'bank') || null);
  let door = null;
  if (bank) {
    const dy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g.y - S.player.y; });
    await H.hopTo(P, bank.x, bank.y + 30 - dy, { step: 100, gap: 260, tries: 90 });
    const btn = await H.waitFor(P, () => !!Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')),
      (v) => v === true, { timeout: 6000, label: 'the Enter button' }).catch(() => false);
    const at0 = await P.page.evaluate(() => window.BT_AUDIO._lastDoor || 0);
    await P.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')); if (b) b.click(); });
    door = await H.waitFor(P, () => ({ at: window.BT_AUDIO._lastDoor || 0, panel: (document.querySelector('.bt-inspect-card') || { getAttribute: () => null }).getAttribute('data-building-panel') }),
      (v) => v.at > at0 && !!v.panel, { timeout: 5000, label: 'the door heard' }).catch(() => null);
    rec.ok(`2d. the bank's door: a knock of wood as it opens (${door && door.panel})`, btn === true && !!door, { btn, door });
    await P.page.evaluate(() => { const b = document.querySelector('.bt-inspect-close'); if (b) b.click(); });
    await P.page.waitForTimeout(400);
  } else {
    rec.ok('2d. the bank\'s door is known (guard)', false, null);
  }

  /* ── 3. monsters, through the real handlers ── */
  const mons = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const ms = (S.monsters || []).filter((m) => m && m.alive);
    return ms.slice(0, 3).map((m) => m.id);
  });
  rec.ok(`3. three real monsters to borrow (of the arrival's list)`, mons.length === 3, mons);
  if (mons.length < 3) { await done(); return; }

  /* a monster's throw at dx px from you, as a given creature */
  const throwAt = (arch, kind, dx) => cues(async ({ id, arch, kind, dx }) => {
    const S = window._gameState.current;
    const m = S.monsters.find((q) => q.id === id);
    const was = m.archetype;
    m.archetype = arch;
    const x = Math.round(S.player.x + dx), y = Math.round(S.player.y);
    window.__btDispatch({ type: 'monster_projectile', payload: { zone: S.currentZone, monsterId: id, x, y, tx: Math.round(S.player.x), ty: Math.round(S.player.y), kind, travelMs: 900 } });
    m.archetype = was;
    return true;
  }, { id: mons[0], arch, kind, dx });
  const snow = await throwAt('snowman', 'snowball', NEAR);
  const fire = await throwAt('fireGoblin', 'slime', NEAR);
  const goo = await throwAt('blueSlime', 'slime', NEAR);
  const far = await throwAt('snowman', 'snowball', FAR);
  rec.ok(`3a. a throw beside you is heard as what it is: a snowball's whoosh, a fireball's cast and hiss, a glob's plop (${[snow, fire, goo].map((r) => r.cues.map((c) => c.name).join('+')).join(', ')})`,
    named(snow, 'throwSnow').length === 1 && named(fire, 'throwFire').length === 1 && named(goo, 'throwGoo').length === 1
      && [snow, fire, goo].every((r) => r.cues.length === 1 && r.cues[0].k === 1 && r.cues[0].played), { snow, fire, goo });
  rec.ok(`3b. ...and one ${FAR} px away is not`, far.cues.length === 0, far);

  const unwrap = await cues(({ id }) => {
    const S = window._gameState.current;
    const m = S.monsters.find((q) => q.id === id);
    const keep = { x: m.x, y: m.y, rx: m.renderX, ry: m.renderY, a: m.archetype, t: m.type };
    m.x = m.renderX = S.player.x + 50; m.y = m.renderY = S.player.y;
    window.__btDispatch({ type: 'monster_transform', payload: { id, fromVariant: 'mummy', toVariant: 'skeleton' } });
    m.x = keep.x; m.y = keep.y; m.renderX = keep.rx; m.renderY = keep.ry; m.archetype = keep.a; m.type = keep.t;
    m._transformStart = null;
    return true;
  }, { id: mons[1] });
  rec.ok('3c. a mummy\'s wrappings tearing away beside you', named(unwrap, 'unwrap').length === 1, unwrap);

  /* a blow on you from a real monster, as the worker sends it */
  const blow = (extra) => cues(({ id, extra }) => {
    const S = window._gameState.current, A = window.BT_AUDIO;
    const hero0 = A._lastHero ? A._lastHero.at : 0;
    const hp = Math.round((S.rpg && S.rpg.hp) || 100);
    S.screenShake = 0;
    const sparks0 = (S.hitParticles || []).length;
    window.__btDispatch({ type: 'monster_attack', payload: Object.assign({
      monsterId: id, targetId: S.myId, dmg: 12, dmgTaken: 0, dodged: false, hp, zone: S.currentZone,
      attackerX: Math.round(S.player.x + 20), attackerY: Math.round(S.player.y) }, extra) });
    return { clang: !!(A._lastHero && A._lastHero.at > hero0), shake: S.screenShake || 0, sparks: (S.hitParticles || []).length - sparks0 };
  }, { id: mons[2], extra });
  const dodged = await blow({ dodged: true });
  const landed = await blow({ dmgTaken: 1 });
  const blocked = await blow({ blocked: true });
  const parried = await blow({ blocked: true, parried: true });
  rec.ok(`3d. a blow the worker rolled as dodged: the rush of air, never the armour's clang, and no shake or red sparks (shake ${dodged.out.shake}, sparks ${dodged.out.sparks}; a landed blow: clang ${landed.out.clang}, shake ${landed.out.shake}, sparks ${landed.out.sparks})`,
    named(dodged, 'dodged').length === 1 && !dodged.out.clang && dodged.out.shake === 0 && dodged.out.sparks === 0
      && landed.out.clang && landed.out.shake === 3 && landed.out.sparks === 4 && named(landed, 'dodged').length === 0, { dodged, landed });
  rec.ok('3e. a blow on your raised shield: the shield\'s clang (it was silent)', named(blocked, 'shieldBlock').length === 1, blocked);
  rec.ok('3f. ...a parried one: not the clang (its own parry event plays the parry)', named(parried, 'shieldBlock').length === 0, parried);

  /* each creature's own death (BT_AUDIO.monsterDeath, as a kill calls it) */
  const deaths = await P.page.evaluate(() => {
    const A = window.BT_AUDIO;
    const out = {};
    for (const arch of ['fireGoblin', 'rockmonster', 'thornShambler', 'fishman', 'bogLurker', 'mummy', 'blueSlime', 'mireWisp']) {
      A._lastDeath = null;
      const asked = [];
      const pl = A.play;
      A.play = function (key, opts) { asked.push(key); return pl.apply(this, arguments); };
      try { A.monsterDeath(arch, null, 1); } finally { A.play = pl; }
      out[arch] = { cue: A._lastDeath ? A._lastDeath.cue : null, asked };
    }
    return out;
  });
  rec.ok(`3g. each creature dies as what it is: ${Object.entries(deaths).map(([a, d]) => a + ' ' + (d.cue || 'its splat')).join(', ')}`,
    deaths.fireGoblin.cue === 'dieGoblin' && deaths.rockmonster.cue === 'dieRock' && deaths.thornShambler.cue === 'dieRock'
      && deaths.fishman.cue === 'dieFish' && deaths.bogLurker.cue === 'dieLurker' && deaths.mummy.cue === 'monster-death'
      && deaths.fireGoblin.asked.join() === 'monster-hit,pan-sizzle', deaths);
  rec.ok('3h. ...and the Blue Slime and the Mire Wisp play nothing here: the renderer plays their splat (they died twice over)',
    deaths.blueSlime.cue === null && deaths.blueSlime.asked.length === 0 && deaths.mireWisp.cue === null && deaths.mireWisp.asked.length === 0, deaths);

  /* ── 4. the friend ── */
  const me = await H.readState(P, (S) => ({ x: Math.round(S.player.x), y: Math.round(S.player.y) }));
  await W.open();
  await W.place(me.x + 150, me.y);
  await P.page.evaluate((id) => { window.__scFriend = id; }, W.id);
  const there = await H.waitFor(P, (S) => { const o = (S.others || {})[window.__scFriend]; return o ? Math.round(Math.hypot(o.x - S.player.x, o.y - S.player.y)) : null; },
    (v) => v != null && v < 220, { timeout: 15000, label: 'the friend beside you' }).catch(() => null);
  rec.ok(`4. setup: the friend beside you (${there} px)`, there != null, there);
  if (there == null) { await done(); return; }

  await P.page.evaluate(() => window.__btCues.reset());
  await W.walk(4000);
  const steps = await P.page.evaluate(() => window.__btCues.stats.peerSteps || 0);
  rec.ok(`4a. the friend walking beside you is heard stepping (${steps} steps in 4 s)`, steps >= 2, steps);

  const pk = await P.page.evaluate(() => window.__btCues.consts.PEER_K);
  await P.page.evaluate(() => window.__btCues.reset());
  W.relay('player_jump', { ts: Date.now(), dur: 560, peak: 68 });
  const pj = await H.waitFor(P, () => window.__btCues.stats.log.map((c) => ({ name: c.name, k: Math.round(c.k * 1000) / 1000 })),
    (v) => v.some((c) => c.name === 'jumpUp') && v.some((c) => c.name === 'jumpLand'), { timeout: 8000, label: 'the friend\'s jump' }).catch(() => null);
  const pjUp = pj && pj.find((c) => c.name === 'jumpUp');
  rec.ok(`4b. the friend's jump: its push-off, then its landing, at about half your own level (${pjUp && pjUp.k}, PEER_K ${pk})`,
    !!pjUp && Math.abs(pjUp.k - pk) < 0.08 && pj.some((c) => c.name === 'jumpLand'), pj);

  await P.page.evaluate(() => window.__btCues.reset());
  W.relay('player_dodge', { angle: 0, kind: 'dodge', dur: 300, walk: false });
  W.relay('player_shield', { up: true });
  const pd = await H.waitFor(P, () => window.__btCues.stats.log.map((c) => ({ name: c.name, k: Math.round(c.k * 1000) / 1000 })),
    (v) => v.some((c) => c.name === 'dodgeRoll') && v.some((c) => c.name === 'peerShield'), { timeout: 6000, label: 'the friend\'s roll and shield' }).catch(() => null);
  W.relay('player_shield', { up: false });
  const pdRoll = pd && pd.find((c) => c.name === 'dodgeRoll'), pdSh = pd && pd.find((c) => c.name === 'peerShield');
  rec.ok(`4c. the friend's roll and its shield coming up, each at about half your level (${pdRoll && pdRoll.k}, ${pdSh && pdSh.k})`,
    !!pdRoll && !!pdSh && Math.abs(pdRoll.k - pk) < 0.08 && Math.abs(pdSh.k - pk) < 0.08, pd);

  await P.page.waitForTimeout(1500);
  await P.page.evaluate(() => window.__btCues.reset());
  for (let i = 0; i < 10; i++) W.relay('player_jump', { ts: Date.now() + i, dur: 560, peak: 68 });
  await P.page.waitForTimeout(2500);
  const burst = await P.page.evaluate(() => ({ up: window.__btCues.stats.played.jumpUp || 0, capped: window.__btCues.stats.peerCapped, max: window.__btCues.consts.PEER_BURST }));
  rec.ok(`4d. ten of the friend's jumps at once: at most PEER_BURST (${burst.max}) push-offs heard (${burst.up}), the rest held back (${burst.capped})`,
    burst.up >= 1 && burst.up <= burst.max && burst.capped >= 1, burst);
  W.close();

  /* ── 5. Bro Pond ── */
  const G = await H.wheelGeom();
  const map = await G.map();
  const pond = (map.places || []).find((p) => p.kind === 'pond');
  const water0 = await P.page.evaluate(() => window.__btWater.state());
  if (pond) {
    const dy = await P.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g.y - S.player.y; });
    await H.hopTo(P, pond.x, pond.y + 380 - dy, { step: 100, gap: 260, tries: 200 });
    const by = await H.waitFor(P, () => window.__btWater.state(), (v) => v.playing && v.k > 0.95, { timeout: 6000, label: 'the pond heard' }).catch(() => null);
    const atPond = by || await P.page.evaluate(() => window.__btWater.state());
    rec.ok(`5a. on Bro Pond's bank its water is heard in full (share ${atPond.k}, ${Math.round(atPond.d)} px from it)`, !!by, atPond);
    await H.hopTo(P, G.arrival.x, G.arrival.y, { step: 100, gap: 260, tries: 200 });
    const away = await H.waitFor(P, () => window.__btWater.state(), (v) => !v.playing && v.k === 0, { timeout: 8000, label: 'the pond let go' }).catch(() => null);
    rec.ok(`5b. back on the town square it is gone, and the loop let go (${away ? Math.round(away.d) + ' px from any water' : 'still playing'})`,
      !!away, away || await P.page.evaluate(() => window.__btWater.state()));
  }
  rec.ok(`5. the Wheel's water is known (${water0.lines} river line(s), ${water0.ponds} pond(s) and falls), and silent on the way in (share ${water0.k})`,
    !!pond && water0.lines >= 1 && water0.ponds >= 1, { water0, pond });

  rec.ok('6. no page errors', errs.length === 0, errs.slice(0, 4));
  await done();
}
