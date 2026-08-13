/* The quest dialogue opens when you WALK UP to the giver (v2.3.1701).
 *
 * Owner: "make the quest dialog with mayor bro pop up when you get in close
 * proximity to him instead of needing to tap him it's finicky right now
 * needing to tap him."  Landing a thumb on a 30px NPC while the camera drifts
 * is the finicky part; walking up to him is not.
 *
 * What actually needs proving is not "it opens" — that is one line — but the
 * three ways a naive proximity opener is WORSE than the tap it replaces:
 *   1. it re-opens on the very next frame after you dismiss it, so you can
 *      never walk away from the quest giver;
 *   2. it re-opens forever while you stand still, for the same reason;
 *   3. it steals focus from a panel you deliberately opened.
 * The latch (open once per approach, released only after leaving a LARGER
 * radius) is what closes 1 and 2; S._uiBusy closes 3.  So this scenario
 * dismisses and stands still, then walks away and back, then taps.
 *
 * The tap path must survive as well — proximity is an addition, not a
 * replacement (mp-questui and mp-townlock both drive the tap).  The last
 * section proves the tap still opens the dialogue while the latch is armed,
 * which is also the only state where the two doors can be told apart.
 *
 * Position is set directly rather than driven through the joystick, the same
 * way mp-questui places the player: the loop reads S.player.x/y every frame,
 * so a teleport and a walk are indistinguishable to the code under test, and
 * a joystick drag would be testing the joystick.
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Walker', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);

  /* Place the player at an offset from Mayor Bro; returns the distance so a
     failure says how far away he was rather than just "closed". */
  const place = (dx, dy) => P.page.evaluate(({ ox, oy }) => {
    const S = window._gameState && window._gameState.current;
    const npc = (S && S.npcs || []).find((n) => n && n.id === 'mayor_bro');
    if (!S || !npc || !S.player) return null;
    S.player.x = npc.x + ox; S.player.y = npc.y + oy;
    return { dist: Math.hypot(ox, oy), npcX: npc.x, npcY: npc.y };
  }, { ox: dx, oy: dy });
  const open = () => P.page.evaluate(() => !!document.querySelector('.bt-inspect-card'));
  const close = async () => {
    await P.page.evaluate(() => {
      const b = document.querySelector('.bt-inspect-close');
      if (b) b.click();
    });
    await P.page.waitForTimeout(400);
  };

  /* ── start out of range, with nothing on screen ── */
  const far = await place(420, 0);
  rec.ok('Mayor Bro could be located in the world', !!far, far);
  await close();
  await P.page.waitForTimeout(600);
  rec.ok('standing well away from him, no dialogue is open', !(await open()));

  /* ── 1. walking up opens it, with no tap ── */
  await place(0, 34);
  await P.page.waitForTimeout(900);
  rec.ok('walking into range opens his dialogue with NO tap', await open());

  /* ── 2. dismissing it while still standing there must STICK ── */
  await close();
  await P.page.waitForTimeout(1500);   // many frames of standing in range
  rec.ok('dismissing it and standing still does NOT re-open it', !(await open()));

  /* ── 3. leaving and coming back opens it again ── */
  await place(420, 0);
  await P.page.waitForTimeout(700);    // past the release radius
  await place(0, 34);
  await P.page.waitForTimeout(900);
  rec.ok('walking away and back opens it again', await open());

  /* ── 4. the TAP still works, with the latch armed ── */
  await close();
  await P.page.waitForTimeout(700);
  rec.ok('...and it stayed closed after that dismissal too', !(await open()));
  const tapped = await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const npc = (S && S.npcs || []).find((n) => n && n.id === 'mayor_bro');
    const cv = document.querySelector('canvas');
    if (!S || !npc || !cv || !S.camera) return false;
    const rect = cv.getBoundingClientRect();
    const cx = rect.left + (npc.x - S.camera.x) * (S._worldScaleX || 1);
    const cy = rect.top + (npc.y - S.camera.y) * (S._worldScaleY || 1);
    for (const type of ['pointerdown', 'pointerup', 'click']) {
      cv.dispatchEvent(new PointerEvent(type, {
        clientX: cx, clientY: cy, bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch',
      }));
    }
    return true;
  });
  rec.ok('a tap could be dispatched at his feet', tapped);
  await P.page.waitForTimeout(700);
  rec.ok('the TAP path still opens the dialogue (proximity is an addition)', await open());

  /* ── 5. it does not steal focus from an open panel ── */
  await close();
  await place(420, 0);
  await P.page.waitForTimeout(700);
  await H.openDest(P, 'Quests');       // a sheet the player deliberately opened
  await P.page.waitForTimeout(700);
  await place(0, 34);
  await P.page.waitForTimeout(1200);
  rec.ok('standing next to him with a menu open does not steal focus', !(await open()));

  /* ═══ v2.3.1704: PROXIMITY IS NOW THE ONLY DOOR TO A TURN-IN ═══
     Owner: "Disable turning in quest rewards (completion) through the quest
     pane.  It's getting messed up."
     Until this version there were two ways to hand a quest in, and the quest
     pane's button was the one that did not require finding anybody.  With it
     removed, the walk-up dialogue this scenario exists to test stops being a
     convenience and becomes the sole route to every quest reward in the game
     — so "it opens on approach while a quest is READY, carrying the turn-in"
     is a property this file now owns.  Without it, a regression in the latch
     would strand every reward with nothing else to catch it. */
  await P.page.evaluate(() => {
    const b = document.querySelector('.bt-inspect-close'); if (b) b.click();
  });
  await H.openDest(P, 'Dashboard').catch(() => {});
  await P.page.waitForTimeout(700);
  const myId = await H.readState(P, (S) => S.myId);
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
  });
  await P.page.waitForTimeout(1200);
  await H.grant(wsPort, myId, 'item', { invKey: 'snowman', count: 4 });
  await P.page.waitForTimeout(2200);

  await place(420, 0);                  // clear the latch, then walk back in
  await P.page.waitForTimeout(800);
  await place(0, 34);
  await P.page.waitForTimeout(1200);
  rec.ok('with a READY quest, walking up opens his dialogue', await open());
  const readyDlg = await P.page.evaluate(() => {
    const c = document.querySelector('.bt-inspect-card');
    return c ? (c.innerText || '') : '';
  });
  rec.ok('...and that dialogue carries the turn-in — the only one left',
    /Turn In Quest|Choose a skill to train/.test(readyDlg), readyDlg.slice(0, 400));

  await P.ctx.close().catch(() => {});
}
