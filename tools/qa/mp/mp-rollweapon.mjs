/* v2.3.2925: NO WEAPON IN A ROLL.
 *
 * Owner: "When dodge rolling hide the great sword."  The roll is a tumble with
 * no hand to hold the carried blade, so it hung in the air beside the body.
 *
 * Two real clients.  B carries the greatsword; each screen's roll is held at
 * a point in its window by re-stamping it at the START of every frame (the
 * mp-dodgetime method -- a free-running 250 ms roll is two samples at this
 * harness's frame rate).  Checks, on B's own screen and on A's view of B:
 *   - carried before the roll (guard: the weapon is there to hide);
 *   - hidden while the body plays the roll;
 *   - carried again once the roll is over.
 * Saves pictures (tools/qa/mp/out/rollweapon/) for eyes.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';

const OUT = `${H.REPO}/tools/qa/mp/out/rollweapon`;
const GS = { name: 'Copper Great Sword', type: 'greatsword', gearBase: 'copper' };

const install = (P, pid) => P.page.evaluate((pid) => {
  window.__rwPin = { on: false, x: 0, y: 0 };
  const pin = () => {
    const p = window.__rwPin, S = window._gameState && window._gameState.current;
    if (!p.on || !S) return;
    if (!pid) {
      S._dodgeRoll = { angle: 0, startTime: Date.now() - 100, kind: 'dodge', durMs: 400 };
      S.player.x = p.x; S.player.y = p.y;
    } else if (S.others[pid]) {
      S.others[pid]._dodgeRoll = { angle: 0, kind: 'dodge', startTime: Date.now() - 100, durMs: 400 };
      S.others[pid].wpnType = 'greatsword';
    }
  };
  const _raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => _raf((ts) => { try { pin(); } catch (e) { /* the game's frame first */ } cb(ts); });
  return true;
}, pid || null);

const look = (P, pid) => P.page.evaluate((id) => {
  const R = window._pixiRenderer;
  const d = R && (id ? R.peerDisplayRaw(id) : R.playerDisplayRaw());
  if (!d) return null;
  const w = d._weaponSprite, wc = d._weaponContainer;
  return { pose: d._animPose || null, weapon: !!(w && w.visible && (!wc || wc.visible)) };
}, pid || null);

const arm = (P) => P.page.evaluate((gs) => {
  const S = window._gameState.current;
  S.rpg.activeSlot = 'melee'; S.rpg.weapon = gs;
}, GS);

const boxOf = (P, pid) => P.page.evaluate((id) => {
  const S = window._gameState.current, p = id ? S.others[id] : S.player;
  if (!p || !S.camera) return null;
  const c = document.querySelector('canvas').getBoundingClientRect();
  const x = (p.renderX != null ? p.renderX : p.x), y = (p.renderY != null ? p.renderY : p.y);
  const cx = c.left + (x - S.camera.x) * (S._worldScaleX || 1), cy = c.top + (y - 30 - S.camera.y) * (S._worldScaleY || 1);
  return { x: Math.max(0, Math.round(cx - 70)), y: Math.max(0, Math.round(cy - 75)), width: 140, height: 130 };
}, pid || null);

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const A = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, viewport: { width: 390, height: 844 } });
  const B = await H.newPlayer(browser, { name: 'Roller', wsPort, webPort, viewport: { width: 390, height: 844 } });
  await H.enterWorld(A); await H.enterWorld(B);
  await A.page.waitForTimeout(2500);
  const bId = await B.page.evaluate(() => window._gameState.current.myId);
  await install(B, null);
  await install(A, bId);
  await B.page.evaluate(() => { const S = window._gameState.current; window.__rwPin.x = S.player.x; window.__rwPin.y = S.player.y; });
  /* the peer's weapon is theirs to broadcast; pin it on A's copy so the check
     is about the roll, not about equipment sync */
  await A.page.evaluate((id) => { const o = window._gameState.current.others[id]; if (o) o.wpnType = 'greatsword'; }, bId);

  for (const [who, P, pid] of [['own', B, null], ['peer', A, bId]]) {
    if (!pid) await arm(P);
    await P.page.waitForTimeout(500);
    if (!pid) await arm(P);
    if (pid) await P.page.evaluate((id) => { const o = window._gameState.current.others[id]; if (o) o.wpnType = 'greatsword'; }, pid);
    await P.page.waitForTimeout(300);
    const before = await look(P, pid);
    rec.ok(`${who}: the greatsword is carried before the roll (guard)`, !!(before && before.weapon && before.pose !== 'dodge'), before);
    const box = await boxOf(P, pid);
    if (box) await P.page.screenshot({ path: `${OUT}/${who}-0-before.png`, clip: box }).catch(() => {});

    await P.page.evaluate(() => { window.__rwPin.on = true; });
    if (!pid) await arm(P);
    await P.page.waitForTimeout(400);
    const mid = await look(P, pid);
    rec.ok(`${who}: the body is rolling (guard)`, !!(mid && mid.pose === 'dodge'), mid);
    rec.ok(`${who}: no weapon while rolling`, !!(mid && mid.weapon === false), mid);
    if (box) await P.page.screenshot({ path: `${OUT}/${who}-1-roll.png`, clip: box }).catch(() => {});

    await P.page.evaluate(() => { window.__rwPin.on = false; });
    if (pid) await P.page.evaluate((id) => { const o = window._gameState.current.others[id]; if (o) o._dodgeRoll = null; }, pid);
    else await P.page.evaluate(() => { window._gameState.current._dodgeRoll = null; });
    await P.page.waitForTimeout(600);
    if (!pid) await arm(P);
    if (pid) await P.page.evaluate((id) => { const o = window._gameState.current.others[id]; if (o) o.wpnType = 'greatsword'; }, pid);
    await P.page.waitForTimeout(300);
    const after = await look(P, pid);
    rec.ok(`${who}: the greatsword is back once the roll is over`, !!(after && after.weapon && after.pose !== 'dodge'), after);
    if (box) await P.page.screenshot({ path: `${OUT}/${who}-2-after.png`, clip: box }).catch(() => {});
  }
  const thrown = [...A.logs, ...B.logs].filter((l) => /pageerror|threw/.test(l));
  rec.ok('nothing threw', thrown.length === 0, { thrown: thrown.slice(0, 3) });
  await A.ctx.close().catch(() => {}); await B.ctx.close().catch(() => {});
}
