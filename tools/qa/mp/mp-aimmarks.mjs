/* ═══ v2.3.6555: WHAT THE AIM SHOWS, PLAYED ON A PHONE (card CT part 22; `?manual=5`) ═══
 *
 * The owner, 2026-11-25, with the bow in the two buttons: "Put a tiny
 * directional Carat out in front of the character so that way you can see
 * which way your aim is facing", and a frame round the monster, "yellow if
 * that monster is in queue for lock on targeting ... after you hit the
 * monster it turns red and locks on".  Upright and sideways, a touch phone:
 *
 *   1. THE CARET turns through the eight ways: the left thumb at 20% turns
 *      the body to each drawn facing, and the caret (window.__btAimCaret)
 *      points that way, 26 CSS px out from the feet;
 *   2. YELLOW: a bow in hand, turned toward a real monster of the Wheel with
 *      no press, the frame (window.__btAimFrame) stands on it, yellow, at
 *      least 48 CSS px a side; the old chevrons are not drawn
 *      (window.__btAtkMark: no candidate's mark) and the tap reticle is not
 *      up (window.__btLockReticle);
 *   3. RED: ONE press of Attack: the latch's monster wears the frame, red, and
 *      no yellow shows (one frame, its tone 'lock'); the caret points at it;
 *   4. THE SWITCHES, flipped in place (switches.js reads the address at each
 *      ask): `?targetframe=0` hides the frame and the old marks come back;
 *      `?aimcaret=0` hides the caret; both back on, both back.
 * Pictures (deviceScaleFactor 2) of the yellow frame, the red one and the
 * caret go to tools/qa/mp/out/aimmarks-*.png (docs/shots has their webp).
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import * as H from './harness.mjs';

export const lane = 'full';

const UPRIGHT = { width: 390, height: 844 };
const SIDEWAYS = { width: 844, height: 390 };
const FACE = { east: 0, southeast: Math.PI / 4, south: Math.PI / 2, southwest: 3 * Math.PI / 4, west: Math.PI, northwest: -3 * Math.PI / 4, north: -Math.PI / 2, northeast: -Math.PI / 4 };
const bind = (fn, arg) => ({ toString: () => `(S) => (${fn.toString()})(S, ${JSON.stringify(arg)})` });
const angOff = (a, b) => { let d = (a - b) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d); };

/* a live monster at full health and a side to stand on, 200 px out, where
   no OTHER live monster within the bow's reach (675, held to 800 here) is
   anywhere near the facing (the sight takes the monster nearest the line, not
   the nearest: the first run framed a frog 666 px off, off the screen, over
   one 164 px away): the pair with the widest angle clear wins */
const PICK = (S, o) => {
  const FACE8 = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI, -3 * Math.PI / 4, -Math.PI / 2, -Math.PI / 4];
  const off = (a, b) => { let d = (a - b) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d); };
  const P0 = S.player, live = (S.monsters || []).filter((m) => m && m.alive && (m.curHp > 0 || m.curHp == null));
  let best = null;
  for (const m of live) {
    if (Math.hypot(m.x - P0.x, m.y - P0.y) > o.maxD || (Array.isArray(o.skip) && o.skip.indexOf(String(m.id)) >= 0)) continue;
    if (typeof m.curHp === 'number' && typeof m.maxHp === 'number' && m.curHp < m.maxHp) continue;
    for (const a of FACE8) {
      const sx = m.x - 200 * Math.cos(a), sy = m.y - 200 * Math.sin(a);
      let clear = Math.PI;
      for (const q of live) {
        if (q === m || Math.hypot(q.x - sx, q.y - sy) > 800) continue;
        clear = Math.min(clear, off(Math.atan2(q.y - sy, q.x - sx), a));
      }
      if (!best || clear > best.clear) best = { id: String(m.id), x: m.x, y: m.y, a, sx: Math.round(sx), sy: Math.round(sy), clear: +clear.toFixed(2) };
    }
  }
  return best;
};
const MARKS = (P) => P.page.evaluate(() => ({
  frame: window.__btAimFrame ? window.__btAimFrame() : null,
  caret: window.__btAimCaret ? window.__btAimCaret() : null,
  marks: window.__btAtkMark ? window.__btAtkMark() : [],
  ret: window.__btLockReticle ? window.__btLockReticle() : null,
}));
const flip = (P, name, on) => P.page.evaluate(({ name, on }) => {
  const u = new URL(location.href);
  if (on) u.searchParams.set(name, '0'); else u.searchParams.delete(name);
  history.replaceState(history.state, '', u.toString());
}, { name, on });

export async function run({ browser, wsPort, webPort, rec }) {
  const players = [];
  const errs = [];
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  try {
    const used = [];
    for (const [label, viewport] of [['upright', UPRIGHT], ['sideways', SIDEWAYS]]) {
      const P = await H.newPlayer(browser, { name: label === 'upright' ? 'Aimbro' : 'Sideaim', wsPort, webPort, viewport, touch: true, dpr: 2, world: 'wheel', query: 'manual=5&wheelwhole' });
      players.push(P);
      P.page.on('pageerror', (e) => errs.push(label + ': ' + String((e && e.message) || e).slice(0, 200)));
      await H.enterWorld(P);
      const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
        { timeout: 150000, label: 'in the Wheel' }).catch(() => null);
      rec.ok(`${label}: in the Wheel (guard)`, !!inW, inW);
      if (!inW) continue;
      await P.page.waitForTimeout(2000);
      const clip = label === 'upright' ? { x: 0, y: 222, width: 390, height: 400 } : { x: 222, y: 0, width: 400, height: 390 };
      const shot = (name) => P.page.screenshot({ path: join(OUT, `aimmarks-${name}-${label}.png`), clip }).catch(() => null);
      const cdp = await P.ctx.newCDPSession(P.page);
      const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
      const disc = await P.page.evaluate(() => { const el = document.querySelector('.bt-joystick-base'); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, r: b.width / 2 }; });
      rec.ok(`${label}: the left disc is on screen (guard)`, !!disc && disc.r > 10, disc);
      if (!disc) continue;
      const turn = async (ang) => {
        const c = { x: disc.x, y: disc.y, id: 1 };
        const to = { x: disc.x + 0.2 * disc.r * Math.cos(ang), y: disc.y + 0.2 * disc.r * Math.sin(ang), id: 1 };
        await touch('touchStart', [c]);
        await P.page.waitForTimeout(80);
        await touch('touchMove', [to]);
        return to;
      };

      /* 1. the caret turns through the eight ways */
      const ways = [];
      for (const name of Object.keys(FACE)) {
        const to = await turn(FACE[name]);
        await H.waitFor(P, (S) => S._renderFacing, (v) => v === name, { timeout: 10000, label: 'facing ' + name }).catch(() => null);
        const got = await H.waitFor(P, bind((S, a) => { const c = window.__btAimCaret ? window.__btAimCaret() : null; return { face: S._renderFacing, c }; }, FACE[name]),
          (v) => !!v.c && v.c.shown && v.face === name, { timeout: 8000, label: 'the caret ' + name }).catch(() => null);
        await touch('touchEnd', [to]);
        await P.page.waitForTimeout(150);
        const c = got && got.c;
        const out = c ? Math.hypot(c.x - c.fx, c.y - c.fy) / c.k : NaN;
        ways.push({ name, ok: !!c && angOff(c.ang, FACE[name]) < 0.01 && Math.abs(out - 26) < 1.5, ang: c && c.ang, out: Math.round(out * 10) / 10 });
      }
      const bad = ways.filter((w) => !w.ok);
      rec.ok(`1. ${label}: the caret turns through the eight ways, 26 CSS px out (${ways.length - bad.length} of 8)`, bad.length === 0, bad.length ? bad : ways.slice(0, 2));
      await turn(0);
      await H.waitFor(P, (S) => S._renderFacing, (v) => v === 'east', { timeout: 10000, label: 'facing east' }).catch(() => null);
      await touch('touchEnd', [{ x: disc.x + 0.2 * disc.r, y: disc.y, id: 1 }]);
      await P.page.waitForTimeout(400);
      await shot('caret');

      /* 2. a bow, a real monster, no press: the yellow frame */
      const me = await H.readState(P, (S) => S.myId);
      await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 8 });
      await H.devOp(wsPort, 'quests', me).catch(() => null);
      await P.page.evaluate(() => {   /* past the Mayor's gate (mp-twobuttons' way) */
        const keep = () => { const S = window._gameState && window._gameState.current, R = S && S.rpg; if (!R) return; if (!R._quests || typeof R._quests !== 'object') R._quests = {}; if (!R._quests.tut_1) R._quests.tut_1 = true; };
        keep(); clearInterval(window.__amGateOpen); window.__amGateOpen = setInterval(keep, 100);
      });
      await H.devOp(wsPort, 'kit', me, { what: 'weapons' });
      await H.waitFor(P, (S) => ((S.rpg && S.rpg.weaponStash) || []).some((w) => w && w.type === 'bow') || !!(S.rpg && S.rpg.rangedWeapon), (v) => v, { timeout: 15000, label: 'the kit' }).catch(() => null);
      const eq = await H.equipWeapon(P, 'bow', 'rangedWeapon', 'ranged').catch((e) => ({ ok: false, why: String(e) }));
      rec.ok(`2. ${label}: a bow in hand (guard)`, !!(eq && eq.ok), eq);
      const mon0 = await H.readState(P, bind(PICK, { maxD: 3000, skip: used }));
      if (mon0) used.push(mon0.id);
      rec.ok(`2. ${label}: a real monster of the Wheel, no other within 800 px of the stand nearer the facing than ${mon0 && Math.round(mon0.clear * 57.3)} degrees (guard: past the sight's 55)`, !!mon0 && mon0.clear > 1, mon0);
      if (!mon0 || mon0.clear <= 1) continue;
      await H.hopTo(P, mon0.sx, mon0.sy, { tries: 90 });
      await P.page.waitForTimeout(1200);
      const ang = mon0.a;   /* the side PICK chose: the monster dead ahead, alone in the sight */
      const to = await turn(ang);
      await P.page.waitForTimeout(600);
      await touch('touchEnd', [to]);
      const yel = await H.waitFor(P, () => {
        const f = window.__btAimFrame ? window.__btAimFrame() : null;
        const S = window._gameState.current;
        return { f, sight: S._sightId == null ? null : String(S._sightId), latch: S._latchPhase || 'idle' };
      }, (v) => !!v.f && v.f.shown && v.f.tone === 'pick' && v.latch === 'idle', { timeout: 15000, label: 'the yellow frame' }).catch(() => null);
      const m2 = await MARKS(P);
      const chevrons = (m2.marks || []).filter((k) => !k.chip).length;
      rec.ok(`2. ${label}: no press: the yellow frame on the monster in sight (${yel && yel.f.id}, ${yel && yel.f.side} CSS px a side), no chevrons (${chevrons}), no tap reticle`,
        !!yel && yel.f.id === mon0.id && yel.f.color === 0xF2C94C && yel.f.side >= 48 && yel.f.alpha === 0.6 && (yel.sight == null || yel.sight === yel.f.id) && chevrons === 0 && !(m2.ret && m2.ret.shown), { yel, chevrons, ret: m2.ret });
      if (!yel) continue;
      await shot('yellow');
      const target = yel.f.id;

      /* 3. ONE press of Attack: red on the lock, no yellow; the caret at it */
      const RD = await P.page.evaluate(() => { const el = document.querySelector('.bt-rjoy-base'); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
      if (!RD) { rec.ok(`3. ${label}: Attack is on screen`, false); continue; }
      await touch('touchStart', [{ x: RD.x, y: RD.y, id: 2 }]);
      await P.page.waitForTimeout(120);
      await touch('touchEnd', [{ x: RD.x, y: RD.y, id: 2 }]);
      const red = await H.waitFor(P, () => {
        const S = window._gameState.current;
        const f = window.__btAimFrame ? window.__btAimFrame() : null, c = window.__btAimCaret ? window.__btAimCaret() : null;
        const m = (S.monsters || []).find((x) => x && String(x.id) === String(S._latchId));
        return { f, c, latch: S._latchPhase || 'idle', id: S._latchId == null ? null : String(S._latchId),
          toward: m ? Math.atan2(m.y - S.player.y, m.x - S.player.x) : null };
      }, (v) => v.latch !== 'idle' && !!v.f && v.f.shown && v.f.tone === 'lock', { timeout: 10000, label: 'the red frame' }).catch(() => null);
      rec.ok(`3. ${label}: after the press the locked monster (${red && red.id}) wears the red frame, one frame, no yellow; the caret points at it (${red && red.c && red.toward != null ? angOff(red.c.ang, red.toward).toFixed(3) : '?'} rad off)`,
        !!red && red.id === target && red.f.id === red.id && red.f.color === 0xFF3C3C && !!red.c && red.c.shown && red.toward != null && angOff(red.c.ang, red.toward) < 0.05, red);
      if (red) await shot('red');

      /* 4. the switches, flipped in place */
      await flip(P, 'targetframe', true);
      const off1 = await H.waitFor(P, () => ({ f: window.__btAimFrame ? window.__btAimFrame() : null, n: (window.__btAtkMark ? window.__btAtkMark() : []).length }),
        (v) => !!v.f && !v.f.shown && v.n > 0, { timeout: 10000, label: 'the frame off, the old marks back' }).catch(() => null);
      rec.ok(`4a. ${label}: ?targetframe=0: no frame, the old marks back (${off1 && off1.n})`, !!off1, off1);
      await flip(P, 'targetframe', false);
      await flip(P, 'aimcaret', true);
      const off2 = await H.waitFor(P, () => ({ c: window.__btAimCaret ? window.__btAimCaret() : null, f: window.__btAimFrame ? window.__btAimFrame() : null }),
        (v) => !!v.c && !v.c.shown && !!v.f, { timeout: 10000, label: 'the caret off' }).catch(() => null);
      rec.ok(`4b. ${label}: ?aimcaret=0: no caret`, !!off2, off2);
      await flip(P, 'aimcaret', false);
      const back = await H.waitFor(P, () => ({ c: window.__btAimCaret ? window.__btAimCaret() : null }), (v) => !!v.c && v.c.shown, { timeout: 10000, label: 'the caret back' }).catch(() => null);
      rec.ok(`4c. ${label}: both switches gone: the caret back`, !!back, back);
    }
    rec.ok('no page errors', errs.length === 0, errs.slice(0, 5));
  } finally {
    for (const P of players) await P.ctx.close().catch(() => {});
  }
}
