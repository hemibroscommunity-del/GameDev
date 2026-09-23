/* ═══ ONE ARROW IN EIGHT SNAPS  (v2.3.2731) ═══
 *
 * Owner: "I think it would be cool if some arrows snapped on hitting the target
 * (still causing the same amount of damage) in maybe every 1 out of every 8
 * hits."
 *
 * The rate and the roll are pinned in server/test/props.test.mjs section 8.
 * What only a real client can show is what a snap LOOKS like and what it does
 * not change, so this fires real arrows through updateArrows in town (client-
 * local, so the client's own hit and damage are the whole answer, the
 * mp-lockaim fixture):
 *
 *   SAME DAMAGE   an arrow the roll breaks and one it does not are fired at the
 *                 same monster: each takes exactly the arrow's dmg off it.
 *   THE PICTURE   the broken one leaves NO shaft in the body and draws a snap
 *                 instead -- two halves and splinters, in the particle layer,
 *                 the fletched half thrown back toward the shooter, all of it
 *                 landed and gone inside two seconds.  The whole one leaves its
 *                 shaft, and draws no snap.
 *   ON A PROP     the broken one is gone from the fountain face (no arrow left
 *                 standing in it) and snaps there; the whole one stands in it.
 *
 * Which arrow breaks is chosen, not hoped for: the page searches timestamps
 * with the game's own roll (__btArrowSnapRoll) for one that snaps and one that
 * does not, and stamps them on the arrows as `_shotTs`, the field the
 * auto-attack stamps.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const FOUNT = { id: 'fountain', x0: 831, x1: 1083, y0: 1426, y1: 1521 };
const PLAZA = { x: 957, y: 1551 };

/* A ts the roll says does (want=true) or does not (want=false) snap. */
const pickTs = (P, want) => P.page.evaluate((want) => {
  const id = window._gameState.current.myId;
  let ts = Date.now() + (want ? 0 : 7919);
  for (let i = 0; i < 5000; i++, ts++) if (!!window.__btArrowSnapRoll(id, ts) === want) return ts;
  return null;
}, want);

/* One real arrow at a local monster standing `gap` px east of the player. */
const shootMonster = (P, o) => P.page.evaluate((o) => new Promise((resolve) => {
  const S = window._gameState.current;
  S._serverMonsters = false; S.autoAttack = false; S.lockedTarget = null;
  if (S.rpg) S.rpg.activeSlot = 'ranged';
  S._aiming = true; S._aimAngle = 0; S._lastAimAngle = 0;
  const mx = S.player.x + o.gap, my = S.player.y;
  const m = {
    id: 'qa-snap-' + o.tag, arch: 'fodder', archetype: 'fodder', type: 'fodder',
    x: mx, y: my, renderX: mx, renderY: my, spawnX: mx, spawnY: my, targetX: mx, targetY: my,
    hp: 99999, curHp: 99999, maxHp: 99999, dmg: 0, level: 1, gold: 0, xp: 1, spd: 0,
    alive: true, statuses: {}, _hitThisSwing: false, _atkCd: 0, _stunUntil: 0,
    respawnAt: 0, moveTimer: 0, _stuckArrows: [],
  };
  S.monsters = [m];
  const before = (window.__btArrowSnapFx ? window.__btArrowSnapFx() : []).length;
  /* aimed at the body centre (23px above the feet for a slime) */
  const a = {
    ang: Math.atan2(-23, o.gap), dist: 0, fromGrip: false, dmg: o.dmg, life: 400, maxLife: 400,
    hitIds: new Set(), isStaff: false, speedPx: 20, _bornTs: Date.now() - 500, _released: true,
    _qaId: 'qa-snap-' + o.tag, _pathX: S.player.x, _pathY: S.player.y, _shotTs: o.ts,
  };
  S.arrows = (S.arrows || []).filter((x) => x._qaId == null);
  S.arrows.push(a);
  let n = 0;
  const tick = () => {
    const alive = (S.arrows || []).indexOf(a) >= 0;
    if (!alive || a.hitIds.has(m.id) || ++n >= 120) {
      requestAnimationFrame(() => resolve({
        hit: a.hitIds.has(m.id), hpLost: 99999 - m.curHp, stuck: m._stuckArrows.length,
        snaps: (window.__btArrowSnapFx ? window.__btArrowSnapFx() : []).length - before,
        at: [+(a._renderX || 0).toFixed(1), +(a._renderY || 0).toFixed(1)], mx, my,
      }));
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}), o);

/* One real arrow north at the fountain face from under it. */
const shootProp = (P, o) => P.page.evaluate((o) => new Promise((resolve) => {
  const S = window._gameState.current;
  S.monsters = []; S.lockedTarget = null;
  if (S.rpg) S.rpg.activeSlot = 'ranged';
  S._aiming = true; S._aimAngle = -Math.PI / 2; S._lastAimAngle = -Math.PI / 2;
  const before = (window.__btArrowSnapFx ? window.__btArrowSnapFx() : []).length;
  const a = {
    ang: -Math.PI / 2, dist: 0, fromGrip: false, dmg: 1, life: 400, maxLife: 400,
    hitIds: new Set(), isStaff: false, speedPx: 20, _bornTs: Date.now() - 500, _released: true,
    _qaId: 'qa-snapp-' + o.tag, _pathX: S.player.x, _pathY: S.player.y, _shotTs: o.ts,
  };
  S.arrows = (S.arrows || []).filter((x) => x._qaId == null);
  S.arrows.push(a);
  let n = 0;
  const tick = () => {
    const alive = (S.arrows || []).indexOf(a) >= 0;
    if (!alive || a.planted || ++n >= 120) {
      requestAnimationFrame(() => resolve({
        alive, planted: !!a.planted, inProp: a._inProp || null,
        snaps: (window.__btArrowSnapFx ? window.__btArrowSnapFx() : []).length - before,
        at: [+(a._renderX || 0).toFixed(1), +(a._renderY || 0).toFixed(1)],
      }));
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}), o);

const snapFx = (P) => P.page.evaluate(() => (window.__btArrowSnapFx ? window.__btArrowSnapFx() : null));

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Snapper', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  const probes = await P.page.evaluate(() => ({
    roll: typeof window.__btArrowSnapRoll === 'function',
    zone: window._gameState.current.currentZone,
  }));
  rec.ok('setup: in town, with the snap roll probe', probes.roll && probes.zone === 'town', probes);
  await H.hopTo(P, PLAZA.x, PLAZA.y);
  await P.page.waitForTimeout(600);

  const snapTs = await pickTs(P, true);
  const wholeTs = await pickTs(P, false);
  rec.ok('setup: a shot timestamp the roll breaks, and one it does not (guard)', snapTs != null && wholeTs != null, { snapTs, wholeTs });

  /* ── 1. ON A MONSTER: SAME DAMAGE, DIFFERENT PICTURE ── */
  const whole = await shootMonster(P, { tag: 'whole', gap: 150, dmg: 37, ts: wholeTs });
  rec.ok('monster, whole arrow: it hit and took exactly its damage off', whole.hit && whole.hpLost === 37, whole);
  rec.ok('monster, whole arrow: ...and left its shaft in the body, with no snap drawn', whole.stuck === 1 && whole.snaps === 0, whole);
  const broke = await shootMonster(P, { tag: 'broke', gap: 150, dmg: 37, ts: snapTs });
  rec.ok('monster, SNAPPED arrow: it hit and took EXACTLY THE SAME damage off', broke.hit && broke.hpLost === 37, broke);
  rec.ok('monster, SNAPPED arrow: ...left NO shaft in the body, and drew a snap instead', broke.stuck === 0 && broke.snaps === 1, broke);
  await P.page.waitForTimeout(120);
  const f1 = await snapFx(P);
  const s1 = (f1 || [])[f1 ? f1.length - 1 : 0];
  const halves = s1 ? s1.pieces.filter((pc) => pc.kind !== 'splinter') : [];
  const splinters = s1 ? s1.pieces.filter((pc) => pc.kind === 'splinter') : [];
  rec.ok('snap: two halves and five splinters, visible, in the particle layer (over the monster, under you)',
    halves.length === 2 && splinters.length === 5 && s1.pieces.every((pc) => pc.visible && pc.layer === 'particles'), s1);
  const backHalf = halves.find((pc) => pc.kind === 'back');
  rec.ok('snap: ...the fletched half is thrown BACK toward the shooter (west of the hit, for a shot fired east)',
    !!backHalf && backHalf.x < s1.x - 4, { back: backHalf, hitX: s1 && s1.x });
  await P.page.waitForTimeout(700);
  const f1b = await snapFx(P);
  const s1b = (f1b || []).find((z) => s1 && z.x === s1.x && z.y === s1.y);
  rec.ok('snap: ...the pieces come down and lie on the ground under the hit',
    !!s1b && s1b.pieces.filter((pc) => pc.kind !== 'splinter').every((pc) => pc.landed && Math.abs(pc.y - broke.my) < 8), s1b);
  await P.page.waitForTimeout(1500);
  const f1c = await snapFx(P);
  rec.ok('snap: ...and are gone again inside two seconds, nothing left behind',
    !(f1c || []).some((z) => s1 && z.x === s1.x && z.y === s1.y), f1c);

  /* ── 2. ON A PROP ── */
  const pw = await shootProp(P, { tag: 'whole', ts: wholeTs });
  rec.ok('fountain, whole arrow: it stands in the face (v2.3.2730), no snap', pw.planted && !!pw.inProp && pw.inProp.id === FOUNT.id && pw.snaps === 0, pw);
  await P.page.waitForTimeout(300);
  const ps = await shootProp(P, { tag: 'broke', ts: snapTs });
  rec.ok('fountain, SNAPPED arrow: gone from the face -- nothing left standing in it -- and snapped there',
    !ps.alive && !ps.planted && ps.snaps === 1 && Math.abs(ps.at[1] - FOUNT.y1) < 1, ps);

  await P.ctx.close().catch(() => {});
}
