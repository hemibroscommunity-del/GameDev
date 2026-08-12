/* The quest dialogue box, and what the quest log is allowed to offer
 * (v2.3.1681).
 *
 * Owner, in one message: "Add thumbnail of mayor bro's profile picture in
 * quest dialog box and also thumbnail of the quest items (sword and shield).
 * There's a 'first purchase' 'first spark' and other quests that are cropping
 * up in the quest pane.  Disable those and just keep it to mayor bro's quest
 * in sequential order... Also the instructions on mayor bro's dialog for
 * beginning the quest are wrong."
 *
 * Two different surfaces show quests and they are easy to confuse, which is
 * why this scenario exists at all:
 *   - the SHEET's quest page (QuestDetailPanel) already had the portrait,
 *   - the IN-WORLD dialogue you get by tapping him (QuestPanel) did not — it
 *     drew a coloured disc with the letter "M" in it.
 * The owner was looking at the second one.  So this test taps the NPC in the
 * world through the real canvas handler rather than opening the sheet.
 *
 * The "First Purchase" leak is the interesting one to pin.  v2.3.1669 tried
 * to hold it with a sort-and-slice that only worked while Mayor Bro had an
 * offer outstanding; the moment you ACCEPT his quest he stops being
 * "available" and the next giver in key order takes the slot.  So the
 * regression only appears AFTER an accept — which is exactly the step a test
 * written from the bug report's wording would skip.
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Talker', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);

  /* ── the log offers exactly one job, and it is his ── */
  await H.openDest(P, 'Quests');
  await P.page.waitForTimeout(800);
  await H.clickText(P, 'Available').catch(() => {});
  await P.page.waitForTimeout(500);
  let pane = await H.bodyText(P);
  rec.ok('the quest pane offers Mayor Bro\'s first quest', /Cold Reception/.test(pane), pane.slice(0, 300));
  rec.ok('...and does NOT offer quests from givers who are not in the world',
    !/First Purchase|First Spark/i.test(pane), pane.slice(0, 600));

  /* ── tap him in the world ── */
  /* Screen position computed from the same camera + world scale the tap
     handler itself reads, so this lands where a thumb would rather than
     where a hardcoded coordinate hopes he is. */
  const tap = await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const npc = (S && S.npcs || []).find((n) => n && n.id === 'mayor_bro');
    const cv = document.querySelector('canvas');
    if (!S || !npc || !cv || !S.camera) return null;
    /* Stand on him so the camera cannot clamp him off-screen at the map
       edge — he lives near the top of town. */
    if (S.player) { S.player.x = npc.x; S.player.y = npc.y + 40; }
    return { npcX: npc.x, npcY: npc.y };
  });
  rec.ok('Mayor Bro could be located in the world', !!tap, tap);
  await P.page.waitForTimeout(900);

  const tapped = await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const npc = (S && S.npcs || []).find((n) => n && n.id === 'mayor_bro');
    const cv = document.querySelector('canvas');
    if (!S || !npc || !cv || !S.camera) return false;
    const rect = cv.getBoundingClientRect();
    const sx = (npc.x - S.camera.x) * (S._worldScaleX || 1);
    const sy = (npc.y - S.camera.y) * (S._worldScaleY || 1);
    const cx = rect.left + sx, cy = rect.top + sy;
    for (const type of ['pointerdown', 'pointerup', 'click']) {
      cv.dispatchEvent(new PointerEvent(type, {
        clientX: cx, clientY: cy, bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch',
      }));
    }
    return true;
  });
  rec.ok('a tap could be dispatched at his feet', tapped);
  await P.page.waitForTimeout(700);

  const dlgOpen = await P.page.evaluate(() => !!document.querySelector('.bt-inspect-card'));
  rec.ok('tapping him opens the in-world quest dialogue', dlgOpen);

  /* ── the dialogue's art ── */
  const art = await P.page.evaluate(() => {
    const card = document.querySelector('.bt-inspect-card');
    if (!card) return null;
    const imgs = [...card.querySelectorAll('img')].map((i) => i.getAttribute('src') || '');
    return { imgs, text: card.innerText || '' };
  });
  rec.ok('the dialogue shows Mayor Bro\'s portrait, not an initial in a circle',
    !!art && art.imgs.some((s) => /mayor-bro-head/.test(s)), art && art.imgs);
  /* great-sword.webp specifically: /icons/items/sword.webp is the BAMBOO
     STICK (the art for weaponType 'sword' at wood tier), which is what the
     owner saw here.  Asserting the exact file is what stops it drifting back. */
  rec.ok('the dialogue shows a real SWORD, not the bamboo stick',
    !!art && art.imgs.some((s) => /items\/great-sword\.webp/.test(s))
         && !art.imgs.some((s) => /items\/sword\.webp/.test(s)), art && art.imgs);
  rec.ok('...and the SHIELD',
    !!art && art.imgs.some((s) => /items\/shield\.webp/.test(s)), art && art.imgs);
  /* The bow is paid on TURN-IN, so it must not be pictured on the offer —
     showing every payout at once would promise a reward you have not earned. */
  rec.ok('...but NOT the bow, which is the turn-in reward',
    !!art && !art.imgs.some((s) => /items\/bow\.webp/.test(s)), art && art.imgs);

  /* ── the control instructions ── */
  rec.ok('the special-attack instruction says a quick swipe, not a flick-and-let-go',
    !!art && /quick swipe/i.test(art.text) && !/let go for a special/i.test(art.text),
    art && art.text.slice(0, 400));
  rec.ok('the instructions call them joysticks, matching the on-screen control',
    !!art && /right joystick/i.test(art.text), art && art.text.slice(0, 400));
  /* The shield is a double-tap-and-HOLD: the handler raises it on the second
     tap and keeps it up only while that touch lasts, and dragging during the
     hold is what aims the arc.  Copy that says "double-tap to raise the
     shield" describes a toggle that does not exist, and a player who lets go
     mid-fight is unshielded with no idea why. */
  rec.ok('the shield instruction says to double-tap AND HOLD, then aim',
    !!art && /double-tap the right joystick and hold/i.test(art.text) && /aim it at the enemy/i.test(art.text),
    art && art.text.slice(0, 500));

  /* ── accept, then re-check the leak ── */
  const accepted = await H.clickText(P, 'Accept Quest').then(() => true).catch(() => false);
  rec.ok('the offer can be accepted from the world dialogue', accepted);
  await P.page.waitForTimeout(1400);

  await H.openDest(P, 'Quests');
  await P.page.waitForTimeout(700);
  await H.clickText(P, 'Available').catch(() => {});
  await P.page.waitForTimeout(500);
  pane = await H.bodyText(P);
  rec.ok('AFTER accepting, no other giver\'s quest takes the free slot',
    !/First Purchase|First Spark/i.test(pane), pane.slice(0, 800));

  const log = await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    return S && S.rpg && S.rpg._quests ? { ...S.rpg._quests } : null;
  });
  rec.ok('the accepted quest is his tutorial opener', !!log && log.tut_1 === 'active', log);

  await P.ctx.close().catch(() => {});
}
