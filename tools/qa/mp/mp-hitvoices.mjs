/* ═══ HITS SOUND LIKE WHAT THEY HIT (v2.3.3001) ═══
 *
 * Owner, 2026-10-03: "modify hit sound effects based on material type so
 * hitting wood vs plants etc for props and also against monsters (arrow,
 * melee, magic hit sound for snowmen vs slime etc should all sound like their
 * material type).  Same with when monster projectiles break on you".
 *
 * Through the REAL hit paths -- a real swing, a real arrow, a real bolt at a
 * client-local monster in town (mp-hitmat's fixture), a real monster_hit and
 * monster_attack through the game's own dispatcher, a real monster_projectile
 * flown by the game's own simulator -- read back through the probes the sound
 * code keeps (BT_AUDIO._lastHit / _lastShot / _lastHero, window.__btHitSounds)
 * and a spy on BT_AUDIO.play.  The Wheel's footstep clips are loaded here as
 * the Wheel's overlay loads them (BT_AUDIO.loadGroundSteps), so the voices are
 * whole:
 *   1. every Wheel monster x sword, arrow and bolt plays ITS voice (snow, goo,
 *      ember, stone, bone, wet, mud) at the weapon's level (0.55 / 0.6 / 0.22,
 *      a bolt with its magic on top) -- the mummy still bony;
 *   2. an arrow or a bolt into a snowman is ONE hit: his voice, never the
 *      slime's thud on top (the old double);
 *   3. hits nobody here played are heard, quieter: a teammate's blow, your own
 *      Shield Bash -- and not your own lunge (heard where it landed), not a
 *      burn tick, not a monster you just heard hit, not one across the map,
 *      not twelve at once;
 *   4. a monster's ball breaks in its material -- a snowball's crunch, a
 *      fireball's sizzle, a glob's squelch -- on you at full, on your shield at
 *      half, on the ground quieter and further off quieter still;
 *   5. the worker's blow for that ball is not a sword's: the clang muted in
 *      armour, gone without -- whichever arrives first, the ball or the blow --
 *      while a melee blow keeps its clang;
 *   6. no page errors.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
/* Every one of the Wheel's monsters, as mp-hitmat builds them, and its voice */
const MONSTERS = [
  { key: 'snowman',     arch: 'snowman', variant: null,          zone: 'frost',   voice: 'snow' },
  { key: 'fireGoblin',  arch: 'fodder',  variant: 'fireGoblin',  zone: 'ember',   voice: 'ember' },
  { key: 'mummy',       arch: 'fodder',  variant: 'mummy',       zone: 'sky',     voice: 'bone', noTransform: true },
  { key: 'skeleton',    arch: 'fodder',  variant: 'skeleton',    zone: 'sky',     voice: 'bone' },
  { key: 'rockmonster', arch: 'brute',   variant: 'rockmonster', zone: 'hollows', voice: 'stone' },
  { key: 'slime',       arch: 'fodder',  variant: null,          zone: null,      voice: 'goo' },
  { key: 'blueSlime',   arch: 'fodder',  variant: 'blueSlime',   zone: 'verdant', voice: 'goo' },
  { key: 'mireWisp',    arch: 'fodder',  variant: 'mireWisp',    zone: 'mist',    voice: 'goo' },
  { key: 'fishman',     arch: 'brute',   variant: 'fishman',     zone: 'tidal',   voice: 'wet' },
  { key: 'bogLurker',   arch: 'brute',   variant: 'bogLurker',   zone: 'mist',    voice: 'mud' },
];
/* What each voice is made of (gameDisplay.js HIT_VOICES) */
const WHOLE = {
  bone: ['sword-hit3'], goo: ['monster-hit', 'step-mud'], ember: ['monster-hit', 'cook-success'],
  stone: ['mine-strike', 'step-stone'], snow: ['snowman-hit', 'step-snow'],
  mud: ['step-mud', 'monster-hit'], wet: ['monster-hit', 'fish-on-hook'],
};
const WEAPONS = [{ w: 'sword', src: 'melee', vol: 0.55 }, { w: 'arrow', src: 'arrow', vol: 0.6 }, { w: 'bolt', src: 'bolt', vol: 0.22 }];

/* Equip `wpn`, put one fresh pinned monster at (dx, dy) and lock it (mp-hitmat's arm) */
const arm = (P, mon, wpn, dx, dy) => P.page.evaluate(({ mon, wpn, dx, dy }) => {
  const S = window._gameState.current, R = S.rpg, F = window._gameFns || {};
  const pine = (F.WOODWORKING_TIERS || {}).pine, copper = (F.BLACKSMITH_TIERS || {}).copper;
  if (wpn === 'sword') { R.weapon = { type: 'sword', tierMult: copper ? copper.tierMult : 1, gearBase: 'copper', name: 'QA Sword', tier: 'common' }; R.activeSlot = 'melee'; }
  if (wpn === 'arrow') { R.rangedWeapon = { type: 'bow', tierMult: pine ? pine.tierMult : 1, gearBase: 'pine', name: 'QA Bow', tier: 'common' }; R.activeSlot = 'ranged'; }
  if (wpn === 'bolt') { R.staffWeapon = { type: 'staff', tierMult: pine ? pine.tierMult : 1, gearBase: 'pine', name: 'QA Staff', tier: 'common' }; R.activeSlot = 'staff'; }
  R.mana = R.maxMana = 900; R.hp = R.maxHp = 9000;
  S.arrows = [];
  const m = F.createMonster('hv-' + mon.key + '-' + wpn + '-' + Date.now(), mon.arch, 2, S.player.x + dx, S.player.y + dy, null);
  if (!m) return { err: 'no monster' };
  if (mon.variant) { m.archetype = mon.variant; m.type = mon.variant; }
  m.alive = true; m.curHp = m.maxHp = 1e6; m._frozenUntil = 0; m.spd = 0; m.speed = 0; m._atkCd = 1e12;
  if (mon.noTransform) m._transformStart = 1;
  S.monsters = [m];
  S.lockedTarget = { ref: m, type: 'monster', src: 'tap', ts: Date.now() };
  S.autoAttack = false; S.isSwinging = false; S.swingTimer = 0;
  const ang = Math.atan2(dy, dx);
  S._facingAngle = ang; S._aimAngle = ang; S._lastAimAngle = ang;
  S._facing = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'right' : 'left') : (dy >= 0 ? 'down' : 'up');
  window.__qaPlays.length = 0;
  return { id: m.id, n0: window.__btHitSounds.stats.local };
}, { mon, wpn, dx, dy });

/* Land ONE hit of `wpn` and read what it sounded like */
async function hitOnce(P, mon, wpn, dx, dy) {
  const armed = await arm(P, mon, wpn, dx, dy);
  if (armed.err) return { err: armed.err };
  await P.page.evaluate((wpn) => {
    const S = window._gameState.current, F = window._gameFns;
    if (wpn === 'sword') F.swingAttack(); else S.autoAttack = true;
  }, wpn);
  const t0 = Date.now();
  let got = null;
  while (Date.now() - t0 < 6000) {
    got = await P.page.evaluate((n0) => {
      const S = window._gameState.current;
      if ((S.arrows || []).length) S.autoAttack = false;
      const st = window.__btHitSounds.stats;
      if (st.local <= n0) return null;
      S.autoAttack = false;
      return { last: { ...st.last }, hit: window.BT_AUDIO._lastHit ? { ...window.BT_AUDIO._lastHit } : null };
    }, armed.n0);
    if (got) break;
    await P.page.waitForTimeout(40);
  }
  if (!got) return { err: 'no hit sound within 6 s' };
  await P.page.waitForTimeout(150);
  got.plays = await P.page.evaluate(() => window.__qaPlays.map((p) => p.key));
  await P.page.evaluate(() => { const S = window._gameState.current; S.autoAttack = false; S.monsters = []; S.lockedTarget = null; S.arrows = []; });
  await P.page.waitForTimeout(200);
  return got;
}

/* One monster standing at (dx, dy), not locked: for the dispatched events */
const seed = (P, list) => P.page.evaluate((list) => {
  const S = window._gameState.current, F = window._gameFns;
  S.monsters = list.map((q, i) => {
    const m = F.createMonster('hv-' + q.key + '-' + i + '-' + Date.now(), q.arch, 2, S.player.x + q.dx, S.player.y + q.dy, null);
    if (q.variant) { m.archetype = q.variant; m.type = q.variant; }
    m.alive = true; m.curHp = m.maxHp = 1e6; m.spd = 0; m.speed = 0; m._atkCd = 1e12; m._frozenUntil = 0;
    if (q.noTransform) m._transformStart = 1;
    return m;
  });
  S.lockedTarget = null; S.autoAttack = false;
  return S.monsters.map((m) => m.id);
}, list);

/* monster_hit(s) through the game's own dispatcher, as the worker sends them --
   several in ONE breath when given a list (a whirlwind's hits arrive together) */
const echo = (P, p) => P.page.evaluate((p) => {
  const S = window._gameState.current, st = window.__btHitSounds.stats;
  const n0 = { echo: st.echo, skipped: st.echoSkipped, throttled: st.echoThrottled };
  for (const q of Array.isArray(p) ? p : [p]) {
    window.__btDispatch({ type: 'monster_hit', payload: Object.assign({ zone: S.currentZone, dmg: 3, isCrit: false, hpPct: 0.9 }, q, { attackerId: q.attackerId === 'ME' ? S.myId : q.attackerId }) });
  }
  return { played: st.echo - n0.echo, skipped: st.echoSkipped - n0.skipped, throttled: st.echoThrottled - n0.throttled, last: st.lastEcho ? { ...st.lastEcho } : null, hit: window.BT_AUDIO._lastHit ? { ...window.BT_AUDIO._lastHit } : null };
}, p);

/* A ball thrown by monster `id` from where it stands at the point (tx, ty) off
   you -- a real monster_projectile, flown by the game's own simulator -- and
   what it sounded like when it ended.  `blow`: 'after' sends the worker's blow
   for it the moment it ends (as the worker's impact tick does, a beat later),
   'first' while it is still in the air (the worker's tick a beat AHEAD of the
   drawing); either in the same breath, so no round trip to the test sits
   between them. */
const throwBall = (P, { id, kind, tx, ty, travelMs = 900, blow = null }) => P.page.evaluate(({ id, kind, tx, ty, travelMs, blow }) => new Promise((resolve) => {
  const S = window._gameState.current, A = window.BT_AUDIO, st = window.__btHitSounds.stats;
  const m = S.monsters.find((q) => q.id === id);
  const shots0 = st.shots, at0 = Date.now();
  const strike = () => {
    window.__qaPlays.length = 0;
    window.__btDispatch({ type: 'monster_attack', payload: { monsterId: id, targetId: S.myId, dmg: 1, dmgTaken: 1, zone: S.currentZone, attackerX: S.player.x, attackerY: S.player.y } });
    return { hero: st.lastHero ? { ...st.lastHero } : null, plays: window.__qaPlays.map((p) => p.key) };
  };
  window.__btDispatch({ type: 'monster_projectile', payload: { monsterId: id, kind, zone: S.currentZone, x: m.x, y: m.y,
    tx: S.player.x + tx, ty: S.player.y + ty, travelMs } });
  let hit = blow === 'first' ? strike() : null;
  const t0 = performance.now();
  const tick = () => {
    const ended = st.shots > shots0 || !(S.slimeProjectiles || []).some((b) => b.ownerId === id);
    if (ended || performance.now() - t0 > 6000) {
      if (ended && blow === 'after') hit = strike();
      resolve({ played: st.shots - shots0, shot: A._lastShot && A._lastShot.at >= at0 ? { ...A._lastShot } : null,
        last: st.lastShot ? { ...st.lastShot } : null, hit, ms: Math.round(performance.now() - t0),
        d: st.lastShot ? Math.round(Math.hypot(tx, ty)) : null });
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}), { id, kind, tx, ty, travelMs, blow });

/* The worker's blow on you from monster `id`, with no ball of its in sight */
const blowOf = (P, id) => P.page.evaluate((id) => {
  const S = window._gameState.current, st = window.__btHitSounds.stats;
  window.__qaPlays.length = 0;
  window.__btDispatch({ type: 'monster_attack', payload: { monsterId: id, targetId: S.myId, dmg: 1, dmgTaken: 1, zone: S.currentZone, attackerX: S.player.x, attackerY: S.player.y } });
  return { hero: st.lastHero ? { ...st.lastHero } : null, plays: window.__qaPlays.map((p) => p.key) };
}, id);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Hearer', wsPort, webPort, viewport: PHONE, touch: true });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String(e && e.message || e).slice(0, 200)));
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  await H.hopTo(P, H.TOWN_CLEAN_SPOT.x, H.TOWN_CLEAN_SPOT.y).catch(() => {});
  await P.page.waitForTimeout(600);
  for (const z of [...new Set(MONSTERS.map((m) => m.zone).filter(Boolean))]) {
    await P.page.evaluate((z) => window._gameFns.preloadZoneArt(z), z).catch(() => {});
  }
  await P.page.evaluate(() => { for (const el of document.querySelectorAll('button[aria-label="Close"], button[aria-label="Dismiss"]')) try { el.click(); } catch (e) { /* gone */ } });
  /* the Wheel's footstep clips, as its overlay loads them; and a spy on play() */
  const setup = await P.page.evaluate(async () => {
    const A = window.BT_AUDIO;
    if (!A.ctx && A.init) A.init();
    A.loadSfxManifest && A.loadSfxManifest();
    await A.loadGroundSteps();
    const t0 = Date.now();
    const need = ['monster-hit', 'sword-hit3', 'snowman-hit', 'mine-strike', 'cook-success', 'fish-on-hook', 'slime-projectile-hit', 'magic-hit'];
    while (Date.now() - t0 < 15000 && !need.every((k) => A._samples[k])) await new Promise((r) => setTimeout(r, 100));
    window.__qaPlays = [];
    if (!A.__hvSpied) {
      A.__hvSpied = true;
      const orig = A.play.bind(A);
      A.play = function (key, opts) { window.__qaPlays.push({ key, vol: opts && opts.vol, t: Date.now() }); return orig(key, opts); };
    }
    return { probe: !!window.__btHitSounds, voices: Object.keys(A.HIT_VOICES || {}), clips: ['step-mud', 'step-snow', 'step-stone', 'step-grass'].filter((k) => !!A._samples[k]),
      manifest: need.filter((k) => !!A._samples[k]), zone: window._gameState.current.currentZone };
  });
  rec.ok(`setup: the probes, the eight voices, the Wheel's clips (${setup.clips.join(', ')}) and the manifest's (${setup.manifest.length}/8) decoded`,
    setup.probe && setup.voices.length === 8 && setup.clips.length === 4 && setup.manifest.length === 8, setup);

  /* ── 1. every monster x every weapon: its voice ── */
  const rows = [];
  for (const mon of MONSTERS) {
    for (const W of WEAPONS) {
      const r = await hitOnce(P, mon, W.w, W.w === 'sword' ? 46 : 150, 2);
      rows.push({ mon, W, ...r });
      console.log(`    ${mon.key.padEnd(12)} ${W.w.padEnd(5)} ${r.err ? 'ERR ' + r.err : `${r.last.mat} ${r.last.how} [${(r.last.keys || []).join('+')}] vol ${r.last.vol} src ${r.last.src} plays ${r.plays.join(',')}`}`);
    }
  }
  for (const r of rows) {
    const want = WHOLE[r.mon.voice];
    /* (a mummy held from unwrapping as mp-hitmat holds it; were it to unwrap
       first it would be the skeleton, as bony) */
    const archOk = r.last && (r.last.arch === (r.mon.variant || r.mon.arch) || (r.mon.key === 'mummy' && r.last.arch === 'skeleton'));
    /* read off the hit's own record (an arrow that snaps plays the bone crack
       straight after it, which is then BT_AUDIO._lastHit) */
    rec.ok(`${r.mon.key} x ${r.W.w}: its ${r.mon.voice} voice, ${want.join(' + ')}, at the ${r.W.w}'s ${r.W.vol}`,
      !r.err && r.last.mat === r.mon.voice && r.last.src === r.W.src && archOk
        && r.last.how === 'voice' && JSON.stringify(r.last.keys) === JSON.stringify(want)
        && Math.abs(r.last.vol - r.W.vol) < 1e-6 && want.every((k) => r.plays.includes(k)),
      { err: r.err, last: r.last, hit: r.hit, plays: r.plays });
  }
  const bolts = rows.filter((r) => r.W.w === 'bolt' && !r.err);
  rec.ok('...a bolt keeps its magic on top of the material', bolts.length === MONSTERS.length && bolts.every((r) => r.plays.some((k) => /^magic-hit/.test(k))), bolts.map((r) => r.plays));
  rec.ok('...the mummy and the skeleton stay bony: sword-hit3 alone, every weapon',
    rows.filter((r) => r.mon.voice === 'bone').every((r) => !r.err && (r.last.keys || []).join() === 'sword-hit3'), rows.filter((r) => r.mon.voice === 'bone').map((r) => r.last));
  rec.ok('...the rock monster takes the pickaxe, never the sword clang',
    rows.filter((r) => r.mon.key === 'rockmonster').every((r) => !r.err && r.plays.includes('mine-strike') && !r.plays.includes('sword-hit2')), rows.filter((r) => r.mon.key === 'rockmonster').map((r) => r.plays));

  /* ── 2. the snowman is one hit, not two ── */
  const snow = rows.filter((r) => r.mon.key === 'snowman' && !r.err);
  rec.ok('an arrow, a bolt or a sword into a snowman is ONE hit: his thud once, a crunch, never the slime\'s thud',
    snow.length === 3 && snow.every((r) => r.plays.filter((k) => k === 'snowman-hit').length === 1 && !r.plays.includes('monster-hit') && r.plays.includes('step-snow')),
    snow.map((r) => ({ w: r.W.w, plays: r.plays })));

  /* ── 3. hits nobody here played ── */
  const ids = await seed(P, [
    { key: 'near', arch: 'fodder', variant: 'blueSlime', dx: 120, dy: 0 },
    { key: 'snowy', arch: 'snowman', variant: null, dx: -120, dy: 0 },
    { key: 'far', arch: 'brute', variant: 'rockmonster', dx: -1300, dy: -900 },
    { key: 'a', arch: 'fodder', variant: null, dx: 0, dy: 140 },
    { key: 'b', arch: 'fodder', variant: null, dx: 60, dy: 140 },
    { key: 'c', arch: 'fodder', variant: null, dx: -60, dy: 140 },
    { key: 'd', arch: 'fodder', variant: null, dx: 0, dy: -140 },
    { key: 'e', arch: 'fodder', variant: null, dx: 60, dy: -140 },
  ]);
  const peer = await echo(P, { monsterId: ids[0], attackerId: 'qa-peer', slot: 'melee' });
  rec.ok(`a teammate's blow is HEARD: the blue slime's goo, about a third of your own (${peer.last ? peer.last.vol.toFixed(3) : 'none'})`,
    peer.played === 1 && peer.last.mat === 'goo' && peer.last.vol > 0.1 && peer.last.vol <= 0.55 * 0.35 + 1e-6 && (peer.last.keys || []).join() === 'monster-hit,step-mud', peer);
  await P.page.waitForTimeout(450);
  const bash = await echo(P, { monsterId: ids[1], attackerId: 'ME', ability: 'bash' });
  rec.ok(`your own Shield Bash is heard on what it hit (a snowman: ${bash.last ? bash.last.mat : 'none'})`, bash.played === 1 && bash.last.mat === 'snow' && bash.last.mine, bash);
  await P.page.waitForTimeout(450);
  const lunge = await echo(P, { monsterId: ids[0], attackerId: 'ME', ability: 'lunge' });
  const swing = await echo(P, { monsterId: ids[0], attackerId: 'ME', slot: 'melee' });
  const tickE = await echo(P, { monsterId: ids[0], attackerId: 'qa-peer', status: 'burn' });
  rec.ok('...but not your own lunge or swing (heard where they landed), nor a burn tick', lunge.played === 0 && swing.played === 0 && tickE.played === 0, { lunge, swing, tickE });
  const far = await echo(P, { monsterId: ids[2], attackerId: 'qa-peer', slot: 'ranged' });
  rec.ok('...nor a blow across the map (1,580 px off)', far.played === 0, far);
  await P.page.evaluate((id) => { const m = window._gameState.current.monsters.find((q) => q.id === id); if (m) m._hitSndAt = Date.now(); }, ids[0]);
  const twice = await echo(P, { monsterId: ids[0], attackerId: 'qa-peer', slot: 'melee' });
  rec.ok('...nor a monster you heard hit a moment ago (never twice for one blow)', twice.played === 0 && twice.skipped === 1, twice);
  await P.page.waitForTimeout(450);
  const burst = await echo(P, [3, 4, 5, 6, 7].map((i) => ({ monsterId: ids[i], attackerId: 'ME', ability: 'whirlwind' })));
  rec.ok(`...and a whirlwind into a pack of five is three voices, not five (${burst.played} played, ${burst.throttled} held back)`, burst.played === 3 && burst.throttled === 2, burst);

  /* ── 4 + 5. a monster's ball ── */
  /* (inside the town's map: it is 68 x 72 tiles, and TOWN_CLEAN_SPOT is 1,350 px in from its corner) */
  const throwers = await seed(P, [
    { key: 'snowman', arch: 'snowman', variant: null, dx: 130, dy: 0 },
    { key: 'goblin', arch: 'fodder', variant: 'fireGoblin', dx: -130, dy: 0 },
    { key: 'blue', arch: 'fodder', variant: 'blueSlime', dx: 0, dy: 130 },
    { key: 'melee', arch: 'fodder', variant: null, dx: 40, dy: 0 },
    { key: 'faraway', arch: 'snowman', variant: null, dx: -1300, dy: -900 },
  ]);
  const want = { 0: ['snowball', 'snowball', ['step-snow']], 1: ['slime', 'fire', ['cook-success']], 2: ['slime', 'goo', ['step-mud', 'slime-projectile-hit']] };
  for (const i of [0, 1, 2]) {
    const [kind, style, keys] = want[i];
    const b = await throwBall(P, { id: throwers[i], kind, tx: 0, ty: 0, blow: 'after' });
    rec.ok(`a ${style} ball breaks ON YOU in its material: ${keys.join(' + ')} at full (${b.shot ? b.shot.keys.join(' + ') + ' ' + b.shot.how + ' ' + b.shot.vol : 'nothing'})`,
      b.played === 1 && !!b.shot && b.shot.style === style && b.shot.how === 'player' && Math.abs(b.shot.vol - 1) < 1e-6 && keys.every((k) => b.shot.keys.includes(k)), b);
    const h = b.hit || {};
    const wantVol = h.hero && h.hero.armored ? 0.85 * 0.3 : 0;
    rec.ok(`...and the worker's blow for it is not a sword's: the clang ${h.hero && h.hero.armored ? 'muted to 0.255 in armour' : 'gone (no armour on)'}`,
      !!h.hero && h.hero.ball && Math.abs(h.hero.vol - wantVol) < 1e-6
        && (h.hero.armored ? h.plays.some((k) => /^armor-hit/.test(k)) : !h.plays.some((k) => k === 'monster-hit' || /^armor-hit/.test(k))), h);
    await P.page.waitForTimeout(450);
  }
  const mel = await blowOf(P, throwers[3]);
  rec.ok(`a melee blow keeps its full clang or thud (${mel.hero ? mel.hero.vol : 'none'})`, !!mel.hero && !mel.hero.ball && mel.hero.vol === 0.85, mel);
  /* the blow first, the ball still flying */
  await P.page.waitForTimeout(500);
  const early = await throwBall(P, { id: throwers[0], kind: 'snowball', tx: 0, ty: 0, blow: 'first' });
  rec.ok('...whichever comes first: the blow while its ball is still in the air is the ball\'s, and the ball still breaks on you',
    !!early.hit && !!early.hit.hero && early.hit.hero.ball && !!early.shot && early.shot.how === 'player', early);
  /* on your shield, facing the thrower */
  await P.page.waitForTimeout(500);
  await P.page.evaluate((id) => {
    const S = window._gameState.current, m = S.monsters.find((q) => q.id === id);
    S._shieldUp = true; S._shieldAngle = Math.atan2(m.y - S.player.y, m.x - S.player.x); if (S.rpg) S.rpg.stamina = 999;
  }, throwers[0]);
  const shielded = await throwBall(P, { id: throwers[0], kind: 'snowball', tx: 0, ty: 0 });
  await P.page.evaluate(() => { const S = window._gameState.current; S._shieldUp = false; S.shieldEnd = 0; });
  rec.ok(`on your raised shield it breaks at half (${shielded.shot ? shielded.shot.how + ' ' + shielded.shot.vol : 'nothing'})`,
    !!shielded.shot && shielded.shot.how === 'shield' && Math.abs(shielded.shot.vol - 0.5) < 1e-6, shielded);
  /* on the ground: aimed a few steps off, then across the map */
  await P.page.waitForTimeout(500);
  const ground = await throwBall(P, { id: throwers[0], kind: 'snowball', tx: 320, ty: 200 });
  rec.ok(`on the ground a few steps off it breaks quieter, by its distance (${ground.shot ? ground.shot.how + ' ' + ground.shot.vol.toFixed(3) : 'nothing'})`,
    !!ground.shot && (ground.shot.how === 'land' || ground.shot.how === 'prop') && ground.shot.vol <= 0.45 + 1e-6 && ground.shot.vol > 0.02, ground);
  const gone = await throwBall(P, { id: throwers[4], kind: 'snowball', tx: -1300, ty: -1000 });
  rec.ok('...and one landing across the map is not heard at all', gone.played === 0 && !gone.shot, gone);

  rec.ok('no page errors', errors.length === 0, errors);
  await P.page.evaluate(() => { const S = window._gameState.current; S.monsters = []; S.slimeProjectiles = []; try { window.BT_AUDIO.dropGroundSteps(); } catch (e) { /* tidy */ } });
}
