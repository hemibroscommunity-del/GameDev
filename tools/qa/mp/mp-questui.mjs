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
  await P.page.waitForTimeout(2600);

  /* ═══ v2.3.1684: DID THE WORKER HEAR IT? ═══
     Owner: "I am NOT receiving the sword and shield after accepting the
     quest still ... I tried on a fresh character using a private browser."
     Accepting from THIS dialogue used to set the quest active on the client
     and send the worker nothing, because the send was gated on
     `_serverMonsters` — false in town, where every quest giver stands. The
     grant never ran, so the gear was never minted.
     Reading `_quests` alone could not see that: the client writes that map
     itself, so it says 'active' either way. weaponStash is the honest
     witness — the client only ever gets it FROM a player_state, so an item
     in it is proof the worker processed the accept. Any future assertion
     about a server-side effect belongs on a server-owned field like this
     one, not on a field the client can write. */
  const granted = await H.readState(P, (S) => ({
    wstash: (S.rpg.weaponStash || []).map((w) => w && w.name),
    sstash: (S.rpg.shieldStash || []).map((sh) => sh && sh.name),
  }));
  rec.ok('accepting from the world dialogue really reaches the worker (the sword is minted)',
    granted.wstash.includes("Bro's Sword"), granted);
  rec.ok('...and the shield with it', granted.sstash.includes("Bro's Shield"), granted);

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

  /* ═══ v2.3.1685: TURNING IN AT THE GIVER, INCLUDING THE XP CHOICE ═══
     Owner: "Add chooser to dialog".  Under prog3 every point of XP belongs to
     Melee, Bow or Magic, and the worker REFUSES an XP-paying turn-in that
     names none — so before this version the world dialogue could not complete
     a quest at all: v2.3.1684 got the message to the worker, and the worker
     threw it away for the missing category.  Meanwhile the client had already
     applied gold, XP and 'turnedIn' locally, so it LOOKED paid until the next
     player_state took it back.  This walks the whole thing at the giver. */
  const pid = await H.readState(P, (S) => S.myId);
  await H.grant(wsPort, pid, 'item', { invKey: 'snowman', count: 4 });
  await P.page.waitForTimeout(2000);

  const tapMayor = async () => {
    await P.page.evaluate(() => {
      const S = window._gameState && window._gameState.current;
      const npc = (S && S.npcs || []).find((n) => n && n.id === 'mayor_bro');
      const cv = document.querySelector('canvas');
      if (!S || !npc || !cv || !S.camera) return;
      if (S.player) { S.player.x = npc.x; S.player.y = npc.y + 40; }
      const rect = cv.getBoundingClientRect();
      const cx = rect.left + (npc.x - S.camera.x) * (S._worldScaleX || 1);
      const cy = rect.top + (npc.y - S.camera.y) * (S._worldScaleY || 1);
      for (const type of ['pointerdown', 'pointerup', 'click']) {
        cv.dispatchEvent(new PointerEvent(type, {
          clientX: cx, clientY: cy, bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch',
        }));
      }
    });
    await P.page.waitForTimeout(900);
  };
  /* Leave the quest log first — the dialogue opens over the world. */
  await H.openDest(P, 'Dashboard').catch(() => {});
  await P.page.waitForTimeout(800);
  await tapMayor();

  let dlg = await H.bodyText(P);
  rec.ok('with the remnants in hand the giver offers the turn-in',
    /Turn In Quest|Choose a skill to train/.test(dlg), dlg.slice(0, 300));
  rec.ok('the dialogue asks where the XP should go', /Train 40 XP into/.test(dlg), dlg.slice(0, 300));
  rec.ok('...naming the three trained skills',
    /Melee/.test(dlg) && /Bow/.test(dlg) && /Magic/.test(dlg), dlg.slice(0, 300));
  rec.ok('...and the turn-in button is held until one is chosen',
    /Choose a skill to train/.test(dlg), dlg.slice(0, 300));

  /* Pressing the held button must do NOTHING — not even locally.  A local
     'turnedIn' here would strand the quest: the worker never saw it, and the
     client will not offer a turn-in twice. */
  const beforePress = await H.readState(P, (S) => ({ q: S.rpg._quests.tut_1, coins: S.rpg.coins }));
  await H.clickText(P, 'Choose a skill to train').catch(() => {});
  await P.page.waitForTimeout(900);
  const afterPress = await H.readState(P, (S) => ({ q: S.rpg._quests.tut_1, coins: S.rpg.coins }));
  rec.ok('pressing it with no choice made changes nothing at all',
    afterPress.q === beforePress.q && afterPress.coins === beforePress.coins,
    { beforePress, afterPress });

  /* Choose BOW deliberately — the melee skill would also be raised by the
     starter sword, so bow is the one whose XP can only have come from here. */
  await H.clickText(P, 'Bow').catch(() => {});
  await P.page.waitForTimeout(600);
  dlg = await H.bodyText(P);
  rec.ok('choosing a skill arms the turn-in button',
    /Turn In Quest/.test(dlg) && !/Choose a skill to train/.test(dlg), dlg.slice(0, 300));

  const bowXpBefore = await H.readState(P, (S) =>
    (S.rpg.prog3 && S.rpg.prog3.sk && S.rpg.prog3.sk.bow && S.rpg.prog3.sk.bow.xp) || 0);
  /* The client's OWN coin figure is not evidence: turnInQuest adds the gold
     locally as prediction, so it goes up even when the worker refuses the
     turn-in outright (verified — with the xpCat removed, every client-side
     number still said "paid" while nothing had been). Take the baseline from
     the persisted blob and compare against that instead. */
  const svrCoinsBefore = await H.adminPlayer(wsPort, pid)
    .then((a) => (a && a.rpg && a.rpg.coins) || 0).catch(() => null);
  await H.clickText(P, 'Turn In Quest').catch(() => {});
  await P.page.waitForTimeout(3000);

  const paid = await H.readState(P, (S) => ({
    quest: S.rpg._quests.tut_1,
    coins: S.rpg.coins,
    bowXp: (S.rpg.prog3 && S.rpg.prog3.sk && S.rpg.prog3.sk.bow && S.rpg.prog3.sk.bow.xp) || 0,
    wstash: (S.rpg.weaponStash || []).map((w) => w && w.name),
    snowman: (S.rpg.inventory || {}).snowman || 0,
  }));
  rec.ok('the turn-in completes', paid.quest === 'turnedIn', paid);
  /* weaponStash and prog3 are server-owned — the client only ever receives
     them — so these are the assertions that prove the WORKER paid, rather
     than the client congratulating itself as it used to. */
  rec.ok('the worker pays the bow into the bag', paid.wstash.includes("Bro's Bow"), paid);
  rec.ok('the XP lands in the skill that was chosen', paid.bowXp > bowXpBefore,
    { before: bowXpBefore, after: paid.bowXp });
  const svrCoinsAfter = await H.adminPlayer(wsPort, pid)
    .then((a) => (a && a.rpg && a.rpg.coins) || 0).catch(() => null);
  rec.ok('the gold is paid in the STORED blob, not just on screen',
    svrCoinsBefore != null && svrCoinsAfter >= svrCoinsBefore + 25,
    { before: svrCoinsBefore, after: svrCoinsAfter, clientSays: paid.coins });
  rec.ok('and the remnants are consumed', paid.snowman === 0, paid);

  await P.ctx.close().catch(() => {});
}
