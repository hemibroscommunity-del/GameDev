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
/* v2.3.1728: the payout figures come from the LIVE table, not from literals.
   v2.3.1727 retuned every quest's XP and left three hardcoded "40 XP" checks
   behind in QA — two failed loudly, and the third (mp-tutorial) was a
   NEGATIVE assertion that kept passing for the wrong reason.  Importing the
   server table means a future retune moves these with it; mirror-audit
   already pins server QUEST_REWARDS == client QUEST_CHAINS, so this is the
   same number the panel renders. */
import { QUEST_REWARDS } from '../../../server/src/data.js';
const TUT1 = QUEST_REWARDS.tut_1;

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
  /* v2.3.1704 (owner: "The quest UI is a little confusing what's rewards for
     the next quests vs what's rewarded for the current quest").  An offer row's
     payout used to be a bare money figure floating at the right edge — the same
     shape an ACTIVE row carries — so nothing said whether the payout was
     what this new quest pays or a leftover from the one you are already on. */
  rec.ok('an offered quest\'s reward is labelled as a payout, not a bare figure',
    pane.includes(`pays ${TUT1.gold}g · ${TUT1.xp} XP`),
    { want: `pays ${TUT1.gold}g · ${TUT1.xp} XP`, pane: pane.slice(0, 400) });

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

  const dlgOpen = await H.npcDialogueOpen(P);
  rec.ok('tapping him opens the in-world quest dialogue', dlgOpen);
  /* v2.3.1827: the offer moved to its own panel behind his lines (v2.3.1820)
     — the item art this scenario reads lives there, so talk him through
     first.  See harness.advanceNpcDialogue. */
  /* v2.3.1827: the PORTRAIT and his LINES live on the dialogue window now —
     that is the split the owner asked for ("a larger picture of him on the
     left side of the window and just the text of what he's saying").  Read
     them here, BEFORE talking through to the offer, because advancing past
     the last chunk closes the window that holds them. */
  const spoken = await P.page.evaluate(() => {
    const dlg = document.querySelector('.bt-npcdlg');
    if (!dlg) return null;
    return {
      imgs: [...dlg.querySelectorAll('img')].map((i) => i.getAttribute('src') || ''),
      text: dlg.innerText || '',
    };
  });
  rec.ok("the dialogue shows Mayor Bro's portrait, not an initial in a circle",
    !!spoken && spoken.imgs.some((u) => /mayor-bro/.test(u)), spoken && spoken.imgs);

  /* His whole script, gathered across the chunks — the control instructions
     are chunk 2 of three, so a single read of the open window sees only the
     line it is currently on. */
  let script = (spoken && spoken.text) || '';
  const _landed = await H.advanceNpcDialogue(P, {
    onChunk: (t) => { script += '\n' + t; },
  });
  rec.ok('...and his lines lead to the offer panel', _landed === 'offer', { _landed });

  /* ── the dialogue's art ── */
  const art = await P.page.evaluate(() => {
    const card = document.querySelector('.bt-qoffer');
    if (!card) return null;
    const imgs = [...card.querySelectorAll('img')].map((i) => i.getAttribute('src') || '');
    /* v2.3.1710: the card now draws BOTH payout moments on an offer, so
       "is the bow on screen" is no longer the question — "which caption is
       the bow under" is.  Read the groups, not the flat image list. */
    const groups = {};
    for (const g of card.querySelectorAll('[data-gives]')) {
      groups[g.getAttribute('data-gives')] = {
        caption: (g.firstElementChild && g.firstElementChild.textContent || '').trim(),
        imgs: [...g.querySelectorAll('img')].map((i) => i.getAttribute('src') || ''),
      };
    }
    return { imgs, groups, text: card.innerText || '' };
  });
  /* great-sword.webp specifically: /icons/items/sword.webp is the BAMBOO
     STICK (the art for weaponType 'sword' at wood tier), which is what the
     owner saw here.  Asserting the exact file is what stops it drifting back. */
  /* v2.3.1774: the sword must be the COPPER one (owner: "the thumbnail icon
     for the sword needs to be changed to the copper version"), which is a
     stronger claim than the original — the card promises a "Copper Great
     Sword" and used to draw the steel art next to that label.  The
     bamboo-stick exclusion the original was written for is kept. */
  rec.ok('the dialogue shows a real SWORD, in the COPPER the label promises',
    !!art && art.imgs.some((s) => /items\/great-sword-copper\./.test(s))
         && !art.imgs.some((s) => /items\/sword\./.test(s)), art && art.imgs);
  /* Extension-agnostic for the same reason the bow and staff are below: the
     v2.3.1774 pine repaint can only be written as PNG in this sandbox. */
  rec.ok('...and the SHIELD',
    !!art && art.imgs.some((s) => /items\/shield\./.test(s)), art && art.imgs);

  /* ═══ v2.3.1710: THE OFFER SHOWS WHAT YOU ARE WORKING TOWARD ═══
     Owner: "Quest item thumbnail rewards are not shown in the quest panel
     until after you accept the quest (only xp and gold are shown)."
     This REPLACES the v2.3.1681 assertion that the bow must be ABSENT from
     the offer.  That rule was written to stop the card promising a reward you
     have not earned, and it did — by hiding the reward entirely, so tut_4 and
     life_2 (whose every payout is on turn-in) offered pictures of nothing at
     all.  The owner has ruled on it: you get to see the prize before you take
     the job.
     The promise-vs-hand-over distinction the old rule protected is NOT
     dropped, it moves into the captions — so these assertions are about
     GROUPING, which is strictly more than the old one checked.  Reading
     `data-gives` rather than the flat image list is what makes that provable:
     with both groups on one card, "the bow is on screen" would also pass if
     the bow were drawn under "HE HANDS YOU NOW", which is the exact lie
     v2.3.1704 exists to prevent. */
  const gAcc = (art && art.groups && art.groups.accept) || null;
  const gFin = (art && art.groups && art.groups.complete) || null;
  rec.ok('the offer draws BOTH payout moments as separate captioned groups',
    !!gAcc && !!gFin, art && art.groups);
  rec.ok('the hand-over group holds the sword and shield, and nothing else',
    !!gAcc && gAcc.imgs.length === 2
      && gAcc.imgs.some((s) => /items\/great-sword-copper\./.test(s))
      && gAcc.imgs.some((s) => /items\/shield\./.test(s)), gAcc);
  /* v2.3.1764: matched without the extension.  These pinned `.webp`, and
     v2.3.1763 repainted the bow and staff as pine — which can only be written
     as PNG in this sandbox (no WebP encoder), so a correct change turned these
     red.  The claim is WHICH ITEM is drawn under which caption; the file format
     was never part of it. */
  rec.ok('the turn-in group shows the bow and the staff you have NOT earned yet',
    !!gFin && gFin.imgs.some((s) => /items\/bow\.(webp|png)/.test(s))
      && gFin.imgs.some((s) => /items\/staff\.(webp|png)/.test(s)), gFin);
  rec.ok('...and the bow is under the FINISHING caption, never the hand-over one',
    !!gAcc && !gAcc.imgs.some((s) => /items\/bow\.(webp|png)/.test(s))
      && !!gFin && /finishing/i.test(gFin.caption), { gAcc, gFin });

  /* ═══ v2.3.1704: THE TWO PAYOUT MOMENTS SAY WHEN, NOT WHO ═══
     Owner: "The quest UI is a little confusing what's rewards for the next
     quests vs what's rewarded for the current quest."
     This one card draws both of a quest's payouts in the SAME slot in the same
     chip style — a sword and a shield on the way out, a bow and a staff on the
     way back — and the only thing separating them was a caption reading "He
     gives you" or "You receive": two phrasings of the giver's grammar that say
     nothing about WHEN.  A player who saw a sword promised and later received
     a bow had no way to tell which quest the bow belonged to.
     Pinned as text rather than as a screenshot because the fix IS the wording. */
  rec.ok('the offer card says the kit is handed over NOW',
    !!art && /He hands you now/i.test(art.text), art && art.text.slice(0, 300));
  /* Case-INSENSITIVE deliberately: `art.text` is innerText, which applies the
     CSS `text-transform: uppercase` these captions carry — so the string on
     the wire here is "FOR FINISHING “COLD RECEPTION”".  (mp-tutorial asserts
     the same idea against H.bodyText, which reads textContent and is NOT
     transformed — hence the different casing there.  Same fact, two readers.) */
  rec.ok('...and the gold/XP line names the quest it is the reward for',
    !!art && /for finishing “cold reception”/i.test(art.text), art && art.text.slice(0, 600));

  /* ── the control instructions ── */
  rec.ok('the special-attack instruction says a quick swipe, not a flick-and-let-go',
    /* v2.3.1827: read HIS SCRIPT, not the offer panel — the controls live in
       dialogue.start, which is now his window's chunks (v2.3.1820). */
    /quick swipe/i.test(script) && !/let go for a special/i.test(script),
    script.slice(0, 500));
  rec.ok('the instructions call them joysticks, matching the on-screen control',
    /right joystick/i.test(script), script.slice(0, 500));
  /* The shield is a double-tap-and-HOLD: the handler raises it on the second
     tap and keeps it up only while that touch lasts, and dragging during the
     hold is what aims the arc.  Copy that says "double-tap to raise the
     shield" describes a toggle that does not exist, and a player who lets go
     mid-fight is unshielded with no idea why. */
  rec.ok('the shield instruction says to double-tap AND HOLD, then aim',
    /double-tap the right joystick and hold/i.test(script) && /aim it at the enemy/i.test(script),
    script.slice(0, 700));

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
    granted.wstash.includes("Copper Great Sword"), granted);
  rec.ok('...and the shield with it', granted.sstash.includes("Pine Shield"), granted);

  /* v2.3.1827: close him first.  The dialogue deliberately STAYS OPEN through
     an accept (v2.3.1713 — he goes straight on to his next quest), and the
     offer panel is portaled above the dashboard now, so it sits over the nav
     rail this line is about to tap. */
  await H.closeNpcDialogue(P);
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

  /* v2.3.1827: talk him through to the claim panel — the chooser and the
     reward list live there now, behind his lines (v2.3.1820). */
  const _landedTurn = await H.advanceNpcDialogue(P);
  rec.ok('his lines lead to the claim panel', _landedTurn === 'offer', { _landedTurn });
  let dlg = await H.bodyText(P);
  /* v2.3.1793: the reward card is a look-at-it change, so leave a picture of
     the moment it exists — the chooser is only on screen between "quest ready"
     and "skill picked", which is a hard state to reach by hand. */
  await P.page.screenshot({ path: 'tools/qa/mp/out/questui-chooser.png' }).catch(() => {});
  rec.ok('with the remnants in hand the giver offers the turn-in',
    /Claim Reward|Choose a skill to train/.test(dlg), dlg.slice(0, 300));
  /* v2.3.1704: the SAME slot that showed the sword and shield now shows the
     bow and staff, so the caption has to say which moment these belong to. */
  /* v2.3.1827: the caption NAMES the quest again — see QuestOfferPanel.
     Case-insensitive because the caption is uppercased in CSS. */
  rec.ok('the ready card says these items are what FINISHING pays',
    /for finishing/i.test(dlg) && /cold reception/i.test(dlg), dlg.slice(0, 400));
  /* v2.3.1793: asserts the PROPERTY, not the sentence.  This used to require
     the literal string "Train 30 XP into", so restyling the chooser into a
     reward card broke a passing test that had found no bug — the same trap
     v2.3.1765 records for the turn-in button, whose caption is owner-facing
     copy and got a stable class precisely because it will be reworded again.
     What has to be true is that the amount is stated and the skills are
     offered; how it is phrased is the owner's to change. */
  rec.ok('the dialogue names the XP on offer',
    new RegExp(`\\b${TUT1.xp}\\s*XP\\b`, 'i').test(dlg),
    { want: `${TUT1.xp} XP`, dlg: dlg.slice(0, 300) });
  rec.ok('...and offers the skills to spend it on',
    /Melee/.test(dlg) && /Bow/.test(dlg),
    { dlg: dlg.slice(0, 300) });
  rec.ok('...naming the three trained skills',
    /Melee/.test(dlg) && /Bow/.test(dlg) && /Magic/.test(dlg), dlg.slice(0, 300));
  /* v2.3.1827: assert the STATE, not the caption.  This used to look for the
     literal words "Choose a skill to train" — the copy the held button used
     to carry — so rewording it to "Choose where to train it" broke a passing
     test that had found no bug.  That is the same trap the v2.3.1793 note
     directly above records, arriving one assertion later; being held is a
     fact about aria-disabled, and aria-disabled is what a screen reader and
     the click handler both read. */
  rec.ok('...and the turn-in button is held until one is chosen',
    await H.questOfferBlocked(P), dlg.slice(0, 300));

  /* Pressing the held button must do NOTHING — not even locally.  A local
     'turnedIn' here would strand the quest: the worker never saw it, and the
     client will not offer a turn-in twice. */
  const beforePress = await H.readState(P, (S) => ({ q: S.rpg._quests.tut_1, coins: S.rpg.coins }));
  await P.page.evaluate(() => {
    const b = document.querySelector('[data-tut="qoffer-confirm"]');
    if (b) b.click();       // in-page ON PURPOSE: press the held button anyway
  });
  await P.page.waitForTimeout(900);
  const afterPress = await H.readState(P, (S) => ({ q: S.rpg._quests.tut_1, coins: S.rpg.coins }));
  rec.ok('pressing it with no choice made changes nothing at all',
    afterPress.q === beforePress.q && afterPress.coins === beforePress.coins,
    { beforePress, afterPress });

  /* Choose BOW deliberately — the melee skill would also be raised by the
     starter sword, so bow is the one whose XP can only have come from here. */
  rec.ok('the bow skill could be chosen', await H.chooseQuestSkill(P, 'Bow'));
  await P.page.waitForTimeout(400);
  dlg = await H.bodyText(P);
  rec.ok('choosing a skill arms the turn-in button',
    !(await H.questOfferBlocked(P)) && /Claim Reward/i.test(dlg), dlg.slice(0, 300));

  const bowXpBefore = await H.readState(P, (S) =>
    (S.rpg.prog3 && S.rpg.prog3.sk && S.rpg.prog3.sk.bow && S.rpg.prog3.sk.bow.xp) || 0);
  /* The client's OWN coin figure is not evidence: turnInQuest adds the gold
     locally as prediction, so it goes up even when the worker refuses the
     turn-in outright (verified — with the xpCat removed, every client-side
     number still said "paid" while nothing had been). Take the baseline from
     the persisted blob and compare against that instead. */
  const svrCoinsBefore = await H.adminPlayer(wsPort, pid)
    .then((a) => (a && a.rpg && a.rpg.coins) || 0).catch(() => null);
  /* A REAL click — see harness.confirmQuestOffer for why an in-page one is
     not good enough here. */
  rec.ok('the claim could actually be pressed', await H.confirmQuestOffer(P));
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
  rec.ok('the worker pays the bow into the bag', paid.wstash.includes("Pine Bow"), paid);
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
