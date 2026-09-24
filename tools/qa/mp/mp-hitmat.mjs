/* A MONSTER REACTS LIKE WHAT IT IS MADE OF (v2.3.2803).
 *
 * Owner: "take a fresh look at monster hit reaction material effects.  Right
 * now they're low resolution and don't look great but I do like that they've
 * attempted to be material specific.  I want the materials to act like those
 * materials would in an aesthetic and physics reaction type of way upon
 * getting hit by the impacts from different weapon type (arrow, bolt, sword)
 * so snow effects for snowman, slime for slime, little blood and char from
 * fire goblin, ashy dust from mummy and bone fragments from skeleton".
 *
 * Every material x every weapon, through the REAL local hit paths (a real
 * swing, a real arrow, a real bolt at a client-local monster in town), read
 * back through the renderer's own report (window.__btDebris / __btHitFx),
 * because a screenshot of pooled sprites says nothing about where a piece is
 * going or whether it came down.  What is asserted is the physics the owner
 * asked for, one claim per line:
 *   - each monster throws ITS material (fx), and the burst knows the weapon;
 *   - pieces come DOWN and lie there (landed === parts), dust hangs instead;
 *   - an arrow's jet goes OUT OF THE FAR SIDE (along the shot);
 *   - a blade's sheet goes to the side facing the camera;
 *   - a bolt blasts both ways;
 *   - slime splats, snow crumbles, bone bounces;
 *   - heat does what heat does: a bolt makes slime sizzle (bubbles), the
 *     goblin sheds embers, steel on stone strikes sparks;
 *   - a piece thrown behind a monster is drawn behind it;
 *   - the pieces are crisp (the atlas samples NEAREST) and big enough to read;
 *   - a teammate's hit reads as their weapon (the worker's slot);
 *   - and the old soft decal is not laid beside any of it.
 * Plus one picture per material (out/hitmat-<key>.png) -- "reads clearly" is
 * the half no number can answer (TRAPS §21).
 *
 * v2.3.2804, the owner's follow-up: "remove the old blurry large hit effects"
 * and "I have the slimes recolored to blue ... Will this apply to its remnants
 * too?"  So also:
 *   - a slime's goo is the colour the slime is DRAWN in: a blue slime's is its
 *     recolour's blue, a mossy one's is the sheet times its tint;
 *   - the snowman's painted ice-burst plume is never even requested (it was the
 *     last blurred layer on a hit), though frost's art is warmed and a snowman
 *     is hit by all three weapons;
 *   - a teammate's hit no longer adds the old flat dots on top of the pieces.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';

const PHONE = { width: 390, height: 844 };
const OUT = `${H.REPO}/tools/qa/mp/out/hitmat`;
const MATS = [
  { key: 'slime',    arch: 'fodder',  variant: null,          fx: 'goo',    zone: null },
  { key: 'snowman',  arch: 'snowman', variant: null,          fx: 'snow',   zone: 'frost' },
  { key: 'goblin',   arch: 'fodder',  variant: 'fireGoblin',  fx: 'goblin', zone: 'ember' },
  /* a mummy sheds into a skeleton on its first hit (maybeTransformMonster);
     held here so all three weapons meet the MUMMY's material */
  { key: 'mummy',    arch: 'fodder',  variant: 'mummy',       fx: 'ash',    zone: 'sky', noTransform: true },
  { key: 'skeleton', arch: 'fodder',  variant: 'skeleton',    fx: 'bone',   zone: 'sky' },
  { key: 'rock',     arch: 'brute',   variant: 'rockmonster', fx: 'stone',  zone: 'hollows' },
];
const WEAPONS = ['sword', 'arrow', 'bolt'];
/* v2.3.2804: the slime family, and the goo colour each must throw -- written
   out here rather than read from the game, so a wrong derivation fails.
   blueSlime is a brightness RETINT to [58,122,208] (monsterRecolor.js), whose
   goo is the recolour itself; mossSlime is Pixi's multiplicative tint 0x55cc44
   over the sheet's sampled green 0x5ca84c, per channel: 0x1f8614. */
const SLIMES = [
  { key: 'greenslime', arch: 'fodder', variant: null,        fx: 'goo', zone: null,      want: 0x5ca84c },
  { key: 'blueslime',  arch: 'fodder', variant: 'blueSlime', fx: 'goo', zone: 'verdant', want: 0x3a7ad0 },
  { key: 'mossslime',  arch: 'fodder', variant: 'mossSlime', fx: 'goo', zone: 'verdant', want: 0x1f8614 },
];

/* Equip `wpn`, put a fresh pinned monster at (dx, dy) and lock it. */
const arm = (P, mat, wpn, dx, dy) => P.page.evaluate(({ mat, wpn, dx, dy }) => {
  const S = window._gameState.current, R = S.rpg, F = window._gameFns || {};
  const pine = (F.WOODWORKING_TIERS || {}).pine, copper = (F.BLACKSMITH_TIERS || {}).copper;
  if (wpn === 'sword') { R.weapon = { type: 'sword', tierMult: copper ? copper.tierMult : 1, gearBase: 'copper', name: 'QA Sword', tier: 'common' }; R.activeSlot = 'melee'; }
  if (wpn === 'arrow') { R.rangedWeapon = { type: 'bow', tierMult: pine ? pine.tierMult : 1, gearBase: 'pine', name: 'QA Bow', tier: 'common' }; R.activeSlot = 'ranged'; }
  if (wpn === 'bolt') { R.staffWeapon = { type: 'staff', tierMult: pine ? pine.tierMult : 1, gearBase: 'pine', name: 'QA Staff', tier: 'common' }; R.activeSlot = 'staff'; }
  R.mana = R.maxMana = 900; R.hp = R.maxHp = 9000;
  S.arrows = []; S._debrisBursts = []; S.groundSplatter = [];
  const m = F.createMonster('hitmat-' + mat.key + '-' + wpn + '-' + Date.now(), mat.arch, 2, S.player.x + dx, S.player.y + dy, null);
  if (!m) return { err: 'no monster' };
  if (mat.variant) { m.archetype = mat.variant; m.type = mat.variant; }
  m.alive = true; m.curHp = m.maxHp = 1e6; m._frozenUntil = 0; m.spd = 0; m.speed = 0; m._atkCd = 1e12;
  if (mat.noTransform) m._transformStart = 1;
  S.monsters = [m];
  S.lockedTarget = { ref: m, type: 'monster', src: 'tap', ts: Date.now() };
  S.autoAttack = false; S.isSwinging = false; S.swingTimer = 0;
  const ang = Math.atan2(dy, dx);
  S._facingAngle = ang; S._aimAngle = ang; S._lastAimAngle = ang;
  S._facing = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'right' : 'left') : (dy >= 0 ? 'down' : 'up');
  const hx = window.__btHitFx ? window.__btHitFx() : null;
  return { id: m.id, bursts0: hx ? hx.bursts : 0 };
}, { mat, wpn, dx, dy });

/* Land ONE hit of `wpn` and read its burst twice: EARLY (the airborne effects
   -- bubbles, embers, sparks live well under a second) and after 1.4 s (the
   pieces have come down). */
async function hitOnce(P, mat, wpn, dx, dy) {
  const armed = await arm(P, mat, wpn, dx, dy);
  if (armed.err) return { err: armed.err };
  await P.page.evaluate((wpn) => {
    const S = window._gameState.current, F = window._gameFns;
    if (wpn === 'sword') F.swingAttack(); else S.autoAttack = true;
  }, wpn);
  const t0 = Date.now();
  let early = null;
  while (Date.now() - t0 < 5000) {
    const r = await P.page.evaluate((b0) => {
      const S = window._gameState.current;
      if ((S.arrows || []).length) S.autoAttack = false;
      const hx = window.__btHitFx ? window.__btHitFx() : null;
      if (!hx || hx.bursts <= b0) return null;
      S.autoAttack = false;
      const db = window.__btDebris ? window.__btDebris() : [];
      return db[db.length - 1] || null;
    }, armed.bursts0);
    if (r) { early = r; break; }
    await P.page.waitForTimeout(40);
  }
  if (!early) return { err: 'no burst within 5s' };
  await P.page.waitForTimeout(160);
  const early2 = await P.page.evaluate((id) => (window.__btDebris ? window.__btDebris() : []).find((b) => b.id === id) || null, early.id);
  await P.page.waitForTimeout(1250);
  const readLate = () => P.page.evaluate((id) => (window.__btDebris ? window.__btDebris() : []).find((b) => b.id === id) || null, early.id);
  let late = await readLate();
  /* v2.3.2804: a bone shard bounces twice and skitters, so one thrown hard can
     still be moving at 1.4 s (7/9 landed on one run, 9/9 on the next).  The
     claim is that pieces come DOWN, not by when: give stragglers until 3.4 s,
     still well inside the 4.2 s before the burst starts to fade. */
  for (let i = 0; i < 20 && late && late.parts > late.landed; i++) {
    await P.page.waitForTimeout(100);
    late = (await readLate()) || late;
  }
  const decals = await P.page.evaluate(() => (window._gameState.current.groundSplatter || []).length);
  return { early: early2 || early, late, decals };
}

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Hitter', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2 });
  /* v2.3.2804: every URL the page asks for, so the retired plume can be shown
     to be gone rather than merely unseen */
  const reqs = [];
  P.page.on('request', (r) => { try { reqs.push(r.url()); } catch (e) { /* closing */ } });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  const hook = await P.page.evaluate(() => typeof (window._gameFns || {}).preloadZoneArt === 'function');
  rec.ok('the zone-art hook is on the autotest surface (guard)', hook);
  for (const z of [...new Set([...MATS.map((m) => m.zone), ...SLIMES.map((m) => m.zone)].filter(Boolean))]) {
    await P.page.evaluate((z) => window._gameFns.preloadZoneArt(z), z).catch(() => {});
  }
  await P.page.evaluate(() => { for (const el of document.querySelectorAll('button[aria-label="Close"], button[aria-label="Dismiss"]')) try { el.click(); } catch (e) {} });
  await P.page.waitForTimeout(600);

  const probe0 = await P.page.evaluate(() => (window.__btHitFx ? window.__btHitFx() : null));
  const rows = [];
  for (const mat of MATS) {
    for (const wpn of WEAPONS) {
      const r = await hitOnce(P, mat, wpn, wpn === 'sword' ? 46 : 150, 2);
      rows.push({ mat, wpn, ...r });
      const e = r.early || {}, l = r.late || {};
      console.log(`    ${mat.key.padEnd(8)} ${wpn.padEnd(5)} fx=${e.fx} w=${e.weapon} parts ${l.parts}/${l.landed} dust ${e.dust} flakes ${e.flakes} embers ${e.embers} glints ${e.glints} bubbles ${e.bubbles}`
        + ` meanDx ${l.meanDx} meanDy ${l.meanDy} dx[${l.minDx},${l.maxDx}] front ${l.front} back ${l.back}${r.err ? ' ERR ' + r.err : ''}`);
      if (wpn === 'sword') {
        /* one picture per material, a beat after the blade lands */
        const box = await P.page.evaluate(() => {
          const S = window._gameState.current, m = S.monsters && S.monsters[0];
          if (!m || !S.camera) return null;
          const c = document.querySelector('canvas').getBoundingClientRect();
          const kx = S._worldScaleX || 1, ky = S._worldScaleY || 1;
          const cx = c.left + (m.x - S.camera.x) * kx, cy = c.top + (m.y - 26 - S.camera.y) * ky;
          return { x: Math.max(0, Math.round(cx - 110)), y: Math.max(0, Math.round(cy - 80)), width: 220, height: 150 };
        });
        if (box) await P.page.screenshot({ path: `${OUT}/hitmat-${mat.key}.png`, clip: box }).catch(() => {});
      }
      await P.page.evaluate(() => { const S = window._gameState.current; S.autoAttack = false; S.monsters = []; S.lockedTarget = null; });
      await P.page.waitForTimeout(250);
    }
  }
  const probe1 = await P.page.evaluate(() => (window.__btHitFx ? window.__btHitFx() : null));

  /* ── every hit threw its monster's material, and knew the weapon ── */
  for (const r of rows) {
    const e = r.early || {};
    rec.ok(`${r.mat.key} x ${r.wpn}: throws ${r.mat.fx}, and knows it was ${r.wpn === 'arrow' ? 'an' : 'a'} ${r.wpn}`,
      !r.err && e.fx === r.mat.fx && e.weapon === r.wpn, { err: r.err, fx: e.fx, weapon: e.weapon });
  }
  /* ── pieces come down and lie there; dust hangs ── */
  for (const r of rows) {
    const l = r.late || {};
    if (r.mat.fx === 'ash') {
      rec.ok(`${r.mat.key} x ${r.wpn}: a cloud of ashy dust and fluttering flakes (no hard pieces)`,
        (r.early || {}).dust > 0 && (r.early || {}).flakes > 0, r.early);
    } else if (!(r.mat.fx === 'goblin' && r.wpn === 'bolt')) {
      rec.ok(`${r.mat.key} x ${r.wpn}: its pieces come DOWN and lie there (${l.landed}/${l.parts} landed by ${((l.age || 0) / 1000).toFixed(1)} s)`,
        l.parts > 0 && l.landed === l.parts, l);
    }
  }
  /* ── the weapon shapes the spray ── */
  const pieced = rows.filter((r) => r.late && r.late.parts >= 3 && r.mat.fx !== 'ash');
  for (const r of pieced.filter((x) => x.wpn === 'arrow')) {
    rec.ok(`${r.mat.key}: an arrow's jet goes out of the FAR side (mean ${r.late.meanDx} px along the shot)`,
      r.late.meanDx > 3, r.late);
  }
  for (const r of pieced.filter((x) => x.wpn === 'sword')) {
    rec.ok(`${r.mat.key}: a blade's sheet lands on the camera side (mean ${r.late.meanDy} px toward the camera)`,
      r.late.meanDy > 2, r.late);
  }
  for (const r of pieced.filter((x) => x.wpn === 'bolt')) {
    rec.ok(`${r.mat.key}: a bolt blasts both ways (pieces from ${r.late.minDx} to ${r.late.maxDx} px)`,
      r.late.minDx < -2 && r.late.maxDx > 2, r.late);
  }
  /* ── what each material does when it lands ── */
  rec.ok(`slime splats (${probe1.splats - probe0.splats} splats)`, probe1.splats > probe0.splats, { probe0, probe1 });
  rec.ok(`packed snow crumbles when it thuds down (${probe1.crumbles - probe0.crumbles} clumps broke)`, probe1.crumbles > probe0.crumbles, { probe0, probe1 });
  rec.ok(`bone clatters: shards bounce before they settle (${probe1.bounces - probe0.bounces} bounces)`, probe1.bounces > probe0.bounces, { probe0, probe1 });
  /* ── heat and steel ── */
  const at = (key, wpn) => rows.find((r) => r.mat.key === key && r.wpn === wpn) || {};
  rec.ok('a bolt makes slime SIZZLE (bubbles rise off the wound)', ((at('slime', 'bolt').early || {}).bubbles || 0) > 0, at('slime', 'bolt').early);
  rec.ok('the fire goblin sheds embers when struck', WEAPONS.every((w) => ((at('goblin', w).early || {}).embers || 0) > 0),
    WEAPONS.map((w) => (at('goblin', w).early || {}).embers));
  rec.ok('...and char flakes flutter off it', WEAPONS.every((w) => ((at('goblin', w).early || {}).flakes || 0) > 0),
    WEAPONS.map((w) => (at('goblin', w).early || {}).flakes));
  rec.ok('..."a little blood" from blade and arrow (drops), less off a bolt that burns',
    ((at('goblin', 'sword').late || {}).parts || 0) > 0 && ((at('goblin', 'arrow').late || {}).parts || 0) > 0
      && ((at('goblin', 'bolt').late || {}).parts || 0) <= ((at('goblin', 'sword').late || {}).parts || 0),
    WEAPONS.map((w) => (at('goblin', w).late || {}).parts));
  rec.ok('steel on stone strikes sparks (sword and arrow)',
    ((at('rock', 'sword').early || {}).embers || 0) > 0 && ((at('rock', 'arrow').early || {}).embers || 0) > 0,
    { sword: at('rock', 'sword').early, arrow: at('rock', 'arrow').early });
  rec.ok('snow glitters as it bursts (glints)', WEAPONS.some((w) => ((at('snowman', w).early || {}).glints || 0) > 0),
    WEAPONS.map((w) => (at('snowman', w).early || {}).glints));

  /* ── depth: a piece thrown behind a monster is drawn behind it ── */
  const north = await hitOnce(P, MATS[0], 'arrow', 0, -150);
  rec.ok(`shot NORTH, the jet flies on behind the slime and is drawn behind it (${north.late && north.late.back} pieces behind)`,
    !!(north.late && north.late.back > 0 && north.late.meanDy < 0), north.late);
  await P.page.evaluate(() => { const S = window._gameState.current; S.monsters = []; S.lockedTarget = null; });

  /* ── crisp and readable ── */
  rec.ok('the pieces are CRISP: the atlas samples nearest, never linear', !!(probe1 && probe1.nearest), probe1);
  rec.ok(`...and drawn big enough to read (${probe1 && probe1.pieceScale} world px per art pixel, 2x the characters')`,
    !!(probe1 && probe1.pieceScale > 2.4 && probe1.pieceScale < 2.7), probe1);
  rec.ok('no soft ground decal is laid beside any hit any more', rows.every((r) => r.decals === 0), rows.map((r) => r.decals));

  /* ── v2.3.2804: a slime sheds the colour it is drawn in ── */
  const hex = (n) => (typeof n === 'number' ? '0x' + n.toString(16).padStart(6, '0') : String(n));
  for (const sl of SLIMES) {
    const r = await hitOnce(P, sl, 'sword', 46, 2);
    const e = r.early || {};
    console.log(`    ${sl.key.padEnd(10)} goo tint ${hex(e.tint)} (want ${hex(sl.want)})`);
    if (sl.variant) {
      const box = await P.page.evaluate(() => {
        const S = window._gameState.current, m = S.monsters && S.monsters[0];
        if (!m || !S.camera) return null;
        const c = document.querySelector('canvas').getBoundingClientRect();
        const kx = S._worldScaleX || 1, ky = S._worldScaleY || 1;
        const cx = c.left + (m.x - S.camera.x) * kx, cy = c.top + (m.y - 26 - S.camera.y) * ky;
        return { x: Math.max(0, Math.round(cx - 110)), y: Math.max(0, Math.round(cy - 80)), width: 220, height: 150 };
      });
      if (box) await P.page.screenshot({ path: `${OUT}/hitmat-${sl.key}.png`, clip: box }).catch(() => {});
    }
    rec.ok(`${sl.key}: its goo is the colour it is drawn in (${hex(e.tint)})`, !r.err && e.fx === 'goo' && e.tint === sl.want,
      { err: r.err, fx: e.fx, tint: hex(e.tint), want: hex(sl.want) });
    await P.page.evaluate(() => { const S = window._gameState.current; S.monsters = []; S.lockedTarget = null; });
    await P.page.waitForTimeout(250);
  }

  /* ── v2.3.2804: the snowman's painted plume is retired, not just hidden ── */
  const plumeReqs = reqs.filter((u) => /\/snowman\/impact\.png/.test(u));
  rec.ok(`the snowman's blurry ice-burst plume sheet is never requested (frost warmed, ${WEAPONS.length} snowman hits)`,
    plumeReqs.length === 0 && rows.filter((r) => r.mat.key === 'snowman' && !r.err).length === WEAPONS.length, plumeReqs);

  /* ── a teammate's hit reads as their weapon (the worker's slot) ── */
  await arm(P, MATS[0], 'sword', 60, 30);
  const peer = await P.page.evaluate(() => new Promise((resolve) => {
    const S = window._gameState.current, m = S.monsters[0];
    const dots0 = (S.hitParticles || []).length;
    window.__btDispatch({ type: 'monster_hit', payload: { monsterId: m.id, attackerId: 'qa-teammate', dmg: 5, hpPct: 0.9, isCrit: false, slot: 'ranged' } });
    const dots1 = (S.hitParticles || []).length;
    setTimeout(() => { const db = window.__btDebris ? window.__btDebris() : []; resolve({ b: db[db.length - 1] || null, dots: dots1 - dots0 }); }, 120);
  }));
  rec.ok('a teammate\'s arrow reads as an arrow (slot "ranged" from the worker)', !!(peer && peer.b && peer.b.weapon === 'arrow' && peer.b.fx === 'goo'), peer);
  rec.ok(`...with no old flat dots added on top of its pieces (${peer && peer.dots} added)`, !!(peer && peer.dots === 0), peer);
  await P.ctx.close().catch(() => {});
}
