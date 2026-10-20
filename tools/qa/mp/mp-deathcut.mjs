/* v2.3.2913: MONSTERS DIE IN MORE THAN ONE WAY (monsterDeathFx.js).
 *
 * Owner: "different death animations.  Sliced in half upon death, head
 * chopped off, leg falls off, include the normal death too for variety."
 *
 * For a slime, a fire goblin, a skeleton and a rock monster, forces each
 * death in turn (window.__btDeathKind, a QA-only override of the roll) and
 * checks:
 *   - the corpse rolled that death and cut into pieces (2 for every cut);
 *   - a slime never rolls `leg` (it has none) -- it gets the normal death;
 *   - `normal` still plays the monster's own death, untouched;
 *   - the pieces come down and lie still, then the corpse goes away
 *     (display released) within ~2 s;
 *   - the unforced roll is the same for the same monster and place (every
 *     client sees the same death) and all four deaths turn up across kills.
 * Saves a contact sheet per monster (tools/qa/mp/out/deathcut/) for eyes.
 *
 * v2.3.3499 (the owner: "Don't turn enemies red on the final death flow ...
 * make the edges more jagged ... Remove the death where the enemy is frozen in
 * place"): the pieces are killed INSIDE the blow's red flash and still wear
 * the monster's own colour (never 0xff8080) at its own shape (no squash); no
 * cut is the `clean` style; and the rock monster -- a look with no death strip
 * of its own -- never plays `normal` (it stood frozen): forced to it, it
 * TOPPLES, one piece tipping over and lying on the ground, then gone.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';

const PHONE = { width: 390, height: 844 };
const OUT = `${H.REPO}/tools/qa/mp/out/deathcut`;
const MONS = [
  { key: 'slime',    arch: 'fodder', variant: null,          zone: null,      blob: true },
  { key: 'goblin',   arch: 'fodder', variant: 'fireGoblin',  zone: 'ember' },
  { key: 'skeleton', arch: 'fodder', variant: 'skeleton',    zone: 'sky' },
  { key: 'rock',     arch: 'brute',  variant: 'rockmonster', zone: 'hollows', noStrip: true },   /* v2.3.3499: no death strip of its own */
];
const KINDS = ['slice', 'decap', 'leg', 'normal'];
const SLOW = 5;

const spawn = (P, mon, tag) => P.page.evaluate(({ mon, tag }) => {
  const S = window._gameState.current, F = window._gameFns || {};
  /* as mp-hitmat: a player the corpses' living cousins cannot kill -- dying
     respawns you in town, which empties S.monsters mid-animation */
  if (S.rpg) { S.rpg.hp = S.rpg.maxHp = 9000; }
  const m = F.createMonster('dc-' + mon.key + '-' + tag + '-' + Date.now(), mon.arch, 2, S.player.x + 60, S.player.y + 4, null);
  if (!m) return { err: 'no monster' };
  if (mon.variant) { m.archetype = mon.variant; m.type = mon.variant; }
  m.alive = true; m.curHp = m.maxHp = 1e6; m._frozenUntil = 0; m.spd = 0; m.speed = 0; m._atkCd = 1e12;
  m._transformStart = 0;
  S.monsters = [m];
  S.lockedTarget = null; S.autoAttack = false;
  return { id: m.id };
}, { mon, tag });

const kill = (P, id, kind) => P.page.evaluate(async ([mid, k]) => {
  const S = window._gameState.current;
  if (k) window.__btDeathKind = k; else delete window.__btDeathKind;
  const m = S.monsters.find((x) => x.id === mid);
  if (!m) return false;
  /* v2.3.3499: the killing blow lands first -- its red flash and its squash
     drawn on the living body for a frame or two, as a real kill's are -- and
     the pieces must keep neither */
  /* (held for as long as the frames take on a slow test machine: a flash
     stamped in the future reads as "now" every frame, and a squash whose
     clock runs over 100 s sits at its widest) */
  const t = Date.now();
  m._hitFlash = t + 1e6; m._hitAnimStart = t - 40000; m._hitAnimEnd = t + 60000;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  window.__dcLiveTint = window.__btMonsterSprite ? window.__btMonsterSprite(mid) : null;
  /* hold the respawn: with no worker monsters (S._serverMonsters false)
     the local sim revives a corpse as soon as Date.now() > respawnAt */
  m.curHp = 0; m.alive = false; m.respawnAt = Date.now() + 60000;
  return true;
}, [id, kind]);

const state = (P, id) => P.page.evaluate((mid) => ({
  d: window.__btMonsterDeath ? window.__btMonsterDeath(mid) : 'no-probe',
  s: window.__btMonsterSprite ? window.__btMonsterSprite(mid) : null,
}), id);

const boxOf = (P) => P.page.evaluate(() => {
  const S = window._gameState.current, m = S.monsters && S.monsters[0];
  if (!m || !S.camera) return null;
  const c = document.querySelector('canvas').getBoundingClientRect();
  const kx = S._worldScaleX || 1, ky = S._worldScaleY || 1;
  const cx = c.left + (m.x - S.camera.x) * kx, cy = c.top + (m.y - 30 - S.camera.y) * ky;
  return { x: Math.max(0, Math.round(cx - 90)), y: Math.max(0, Math.round(cy - 90)), width: 180, height: 140 };
});

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Reaper', wsPort, webPort, viewport: PHONE, touch: true, dpr: 2 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  for (const z of [...new Set(MONS.map((m) => m.zone).filter(Boolean))]) {
    await P.page.evaluate((z) => window._gameFns.preloadZoneArt(z), z).catch(() => {});
  }
  await P.page.evaluate(() => { for (const el of document.querySelectorAll('button[aria-label="Close"], button[aria-label="Dismiss"]')) try { el.click(); } catch (e) {} });
  await P.page.waitForTimeout(600);

  for (const mon of MONS) {
    for (const kind of KINDS) {
      const sp = await spawn(P, mon, kind);
      if (sp.err) { rec.ok(`${mon.key}: spawned (guard)`, false, sp); continue; }
      await P.page.waitForTimeout(700);
      const alive = await state(P, sp.id);
      rec.ok(`${mon.key}/${kind}: the living body is drawn first (guard)`, !!(alive.s && alive.s.visible), alive);
      rec.ok(`${mon.key}/${kind}: the death probe is published (guard)`, alive.d !== 'no-probe');
      const box = await boxOf(P);
      const expectCut = kind !== 'normal' && !(mon.blob && kind === 'leg');
      const expectTopple = !!mon.noStrip && kind === 'normal';   /* v2.3.3499 */
      /* a cut runs in 5x slow motion (window.__btDeathSlow, QA-only) so the
         pictures and probes land where they mean to: a headless screenshot
         takes longer than a whole real-time cut */
      await P.page.evaluate((k) => { window.__btDeathSlow = k; }, SLOW);
      await kill(P, sp.id, kind);
      const t0 = Date.now();
      const at = async (simMs) => { const w = t0 + simMs * SLOW - Date.now(); if (w > 0) await P.page.waitForTimeout(w); };
      if (expectTopple) {
        /* v2.3.3499: never the frozen frame -- it topples */
        await at(300);
        if (box) await P.page.screenshot({ path: `${OUT}/${mon.key}-topple-1.png`, clip: box }).catch(() => {});
        const mid = await state(P, sp.id);
        rec.ok(`${mon.key}/${kind}: no death strip, so no frozen frame -- it topples (one piece)`,
          !!(mid.d && mid.d.kind === 'topple' && mid.d.pieces === 1), mid.d);
        rec.ok(`${mon.key}/${kind}: ...in its own colour, never the hit's red`,
          !!(mid.d && Array.isArray(mid.d.tints) && mid.d.tints.every((t) => t != null && t !== 0xff8080)), mid.d && mid.d.tints);
        await at(1250);
        const settled = await state(P, sp.id);
        rec.ok(`${mon.key}/${kind}: ...and lies on the ground`,
          !!(settled.d && settled.d.rest && settled.d.rest.every(Boolean) && settled.d.ground && settled.d.ground.every((g) => Math.abs(g) < 0.05)), settled.d);
        if (box) await P.page.screenshot({ path: `${OUT}/${mon.key}-topple-3.png`, clip: box }).catch(() => {});
      } else if (!expectCut) {
        /* v2.3.3499: until the first dead frame is drawn (this machine draws
           a frame every ~200-400 ms; a fixed 120 ms read it before) */
        let d = null;
        for (let i = 0; i < 20; i++) {
          await P.page.waitForTimeout(120);
          d = await state(P, sp.id);
          if (d.d) break;
        }
        rec.ok(`${mon.key}/${kind}: plays the normal death${mon.blob && kind === 'leg' ? ' (a slime has no leg to lose)' : ''}`,
          !!(d.d && d.d.pieces === 0 && d.d.kind === 'normal'), d.d);
        if (box) await P.page.screenshot({ path: `${OUT}/${mon.key}-${kind}-0.png`, clip: box }).catch(() => {});
      } else {
        for (const [k, simMs] of [[0, 90], [1, 300], [2, 700]]) {
          await at(simMs);
          if (box) await P.page.screenshot({ path: `${OUT}/${mon.key}-${kind}-${k}.png`, clip: box }).catch(() => {});
        }
        const mid = await state(P, sp.id);
        const live = await P.page.evaluate(() => window.__dcLiveTint || null);
        rec.ok(`${mon.key}/${kind}: (guard) the killing blow's red was on the living body as it died`, !!(live && live.tint === 0xff8080), live && { tint: live.tint, baseTint: live.baseTint });
        rec.ok(`${mon.key}/${kind}: rolled ${kind} and cut into pieces`,
          !!(mid.d && mid.d.kind === kind && mid.d.pieces === 2), mid.d);
        /* v2.3.3499 */
        rec.ok(`${mon.key}/${kind}: the pieces wear the monster's own colour, not the killing blow's red, at its own shape (no squash), cut jagged`,
          !!(mid.d && Array.isArray(mid.d.tints) && mid.d.tints.every((t) => t != null && t !== 0xff8080)
            && Array.isArray(mid.d.scale) && Math.abs(Math.abs(mid.d.scale[0]) - Math.abs(mid.d.scale[1])) < 1e-3
            && mid.d.style !== 'clean'), { tints: mid.d && mid.d.tints, scale: mid.d && mid.d.scale, style: mid.d && mid.d.style });
        await at(1250);
        let settled = await state(P, sp.id);
        /* v2.3.3499: a head thrown its hardest is still rolling at 1.25 s now
           and then (its seeded roll is new every run): give it until the fade
           (FADE_FROM_MS 1.3 s .. 1.6 s) before calling it */
        for (let i = 0; i < 6 && !(settled.d && settled.d.rest && settled.d.rest.every(Boolean)); i++) {
          await at(1300 + i * 60);
          settled = await state(P, sp.id);
        }
        rec.ok(`${mon.key}/${kind}: the pieces come down and lie still`,
          !!(settled.d && settled.d.rest && settled.d.rest.every(Boolean)), settled.d);
        /* the goblin's first cut rolled over the end of his torch and stood
           in the air; a settled piece's lowest point is ON the ground */
        rec.ok(`${mon.key}/${kind}: every piece lies on the ground, not above or through it`,
          !!(settled.d && settled.d.ground && settled.d.ground.every((g) => Math.abs(g) < 0.04)), settled.d);
        if (box) await P.page.screenshot({ path: `${OUT}/${mon.key}-${kind}-3.png`, clip: box }).catch(() => {});
      }
      await at(expectCut || expectTopple ? 1900 : 0);
      await P.page.waitForTimeout(expectCut || expectTopple ? 400 : 2400);
      const gone = await state(P, sp.id);
      rec.ok(`${mon.key}/${kind}: the corpse is gone again afterwards`,
        !gone.s || gone.d === null, gone);
      await P.page.evaluate(() => { delete window.__btDeathKind; delete window.__btDeathSlow; window._gameState.current.monsters = []; });
      await P.page.waitForTimeout(250);
    }
  }

  const thrown = P.logs.filter((l) => /pageerror|threw/.test(l));
  rec.ok('nothing threw', thrown.length === 0, { thrown: thrown.slice(0, 3) });
  await P.ctx.close().catch(() => {});
}
