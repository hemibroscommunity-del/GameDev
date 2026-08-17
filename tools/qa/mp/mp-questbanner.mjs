/* THE QUEST BANNER — v2.3.1745.
 *
 * Owner: "it would be cool if there was a 'QUEST ACCEPTED!' and 'QUEST
 * COMPLETED!' when you start or turn in quests that appear over the quest
 * modal menu the moment you accept or turn in the quest."
 *
 * Three things have to be true for that sentence to be satisfied, and only
 * the first is what a naive check would look at:
 *   1. the words appear, on the right action;
 *   2. they appear OVER the dialogue — which is still open at that moment,
 *      and sits at z-index 32 (game.css .bt-inspect);
 *   3. they do not EAT the tap underneath.  The dialogue stays open through
 *      both actions (accept flips it to active, turn-in re-opens it on the
 *      giver's next quest, v2.3.1713), so the player's very next tap is a
 *      real button beneath this overlay.
 *
 * WHY A MutationObserver AND NOT A POLL: the banner lives ~2.2s.  Every
 * other quest scenario waits 1.6-2.2s after tapping, so a polled "is it on
 * screen now" check would race the fade and go red on a slow CI box while
 * passing locally — the exact flake shape that failed PR #399 (see the long
 * note in mp-questline.mjs).  The observer records every banner the moment
 * the node is inserted, with the modal's state sampled in the same tick, so
 * the assertions read a log rather than a stopwatch.
 */
import * as H from './harness.mjs';

/* Mirrors src/ui/BroTown.jsx's exported QUEST_MSG_MS.  Read from the page
   below rather than trusted — a copy that drifts is worse than no copy. */
const FALLBACK_MS = 2200;

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Herald', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);
  const myId = await H.readState(P, (S) => S.myId);
  const srv = () => H.adminPlayer(wsPort, myId).then((a) => (a && a.rpg) || null).catch(() => null);

  /* ── the recorder ── */
  await P.page.evaluate(() => {
    window.__qb = [];
    const seen = new WeakSet();
    const snap = (el) => {
      const cs = getComputedStyle(el);
      const modal = document.querySelector('.bt-inspect');
      const r = el.getBoundingClientRect();
      /* Sampled at INSERTION, in the same tick, so "was the dialogue open
         when the banner appeared" is a fact about that instant rather than
         about whenever the test got around to looking. */
      window.__qb.push({
        kind: el.getAttribute('data-quest-banner'),
        text: (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim(),
        z: Number(cs.zIndex),
        pointerEvents: cs.pointerEvents,
        modalOpen: !!document.querySelector('.bt-inspect-card'),
        modalZ: modal ? Number(getComputedStyle(modal).zIndex) : null,
        w: Math.round(r.width),
        t: Date.now(),
      });
    };
    const scan = () => {
      document.querySelectorAll('.bt-quest-banner').forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        snap(el);
      });
    };
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
    scan();
  });
  /* v2.3.1746: and record which SFX keys get asked for.  Hooked at
     BT_AUDIO.play rather than listened for, because a sample that fails to
     decode is SILENCE with no error anywhere (the v2.3.1610 incident);
     audio-formats.mjs proves the file decodes, this proves the turn-in
     actually asks for it. */
  await P.page.evaluate(() => {
    window.__sfx = [];
    const A = window.BT_AUDIO;
    if (!A || typeof A.play !== 'function' || A.__hooked) return;
    const orig = A.play.bind(A);
    A.play = function (key, opts) { window.__sfx.push(String(key)); return orig(key, opts); };
    A.__hooked = true;
  });
  const banners = () => P.page.evaluate(() => window.__qb.slice());
  const onScreen = () => P.page.evaluate(() => !!document.querySelector('.bt-quest-banner'));

  /* ── walk up to the giver, the way mp-questline does ── */
  const place = (dx, dy) => P.page.evaluate(({ ox, oy }) => {
    const S = window._gameState && window._gameState.current;
    const npc = (S && S.npcs || []).find((n) => n && n.id === 'mayor_bro');
    if (!S || !npc || !S.player) return null;
    S.player.x = npc.x + ox; S.player.y = npc.y + oy;
    return true;
  }, { ox: dx, oy: dy });
  const open = () => P.page.evaluate(() => !!document.querySelector('.bt-inspect-card'));
  const close = async () => {
    await P.page.evaluate(() => {
      const b = document.querySelector('.bt-inspect-close');
      if (b) b.click();
    });
    await P.page.waitForTimeout(400);
  };
  /* The proximity latch only re-arms after leaving the larger radius, and the
     scan will not re-fire while a card is open — so step away, clear, step
     back (mp-questline v2.3.1706b learned this the hard way). */
  const approach = async () => {
    await place(420, 0);
    await P.page.waitForTimeout(500);
    await close();
    await place(0, 34);
    await P.page.waitForTimeout(1100);
    return open();
  };

  rec.ok('walking up to Mayor Bro opens his dialogue', await approach());

  /* ── ACCEPT ── */
  const accepted = await H.clickText(P, 'Accept').then(() => true).catch(() => false);
  rec.ok('the dialogue offers Accept', accepted);
  await P.page.waitForTimeout(700);

  const afterAccept = await banners();
  const acc = afterAccept.find((b) => b.kind === 'accepted');
  rec.ok('accepting a quest raises a QUEST ACCEPTED! banner',
    !!acc && /QUEST ACCEPTED!/.test(acc.text), afterAccept);
  rec.ok('...naming the quest you just took',
    !!acc && /Cold Reception/.test(acc.text), acc && acc.text);
  /* The owner's actual words were "over the quest modal menu". */
  rec.ok('...while the dialogue is still open, and stacked above it',
    !!acc && acc.modalOpen === true && typeof acc.modalZ === 'number' && acc.z > acc.modalZ,
    acc && { z: acc.z, modalZ: acc.modalZ, modalOpen: acc.modalOpen });
  /* A full-bleed overlay that swallowed taps would make the dialogue feel
     broken for two seconds — and the next tap after accepting is a real
     button underneath it. */
  rec.ok('...and it does not swallow taps meant for the dialogue',
    !!acc && acc.pointerEvents === 'none', acc && acc.pointerEvents);
  const clickThrough = await P.page.evaluate(() => {
    const el = document.querySelector('.bt-quest-banner');
    if (!el) return 'gone';
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
    return hit && el.contains(hit) ? 'blocked' : 'through';
  });
  rec.ok('...proven by a hit-test through the banner itself',
    clickThrough === 'through' || clickThrough === 'gone', clickThrough);

  /* the worker agrees the quest really started — a banner over a no-op
     would be the worst possible outcome here */
  const srvAccept = await srv();
  rec.ok('the WORKER recorded the accept the banner announced',
    !!srvAccept && (srvAccept._quests || {}).tut_1 === 'active',
    srvAccept && srvAccept._quests);

  /* ── it clears itself ── */
  const holdMs = await P.page.evaluate(() => (window.__QUEST_MSG_MS || 0)) || FALLBACK_MS;
  await P.page.waitForTimeout(holdMs + 900);
  rec.ok('the banner clears itself instead of sitting on the screen',
    !(await onScreen()), { holdMs });

  /* ── TURN IN ── */
  await H.grant(wsPort, myId, 'item', { invKey: 'snowman', count: 4 });
  await P.page.waitForTimeout(1600);
  rec.ok('walking back up re-opens the dialogue for the hand-in', await approach());
  await H.clickText(P, 'Melee').catch(() => {});
  await P.page.waitForTimeout(400);
  const turned = await H.clickText(P, 'Turn In').then(() => true).catch(() => false);
  rec.ok('the dialogue offers Turn In', turned);
  await P.page.waitForTimeout(900);

  const afterTurnIn = await banners();
  const done = afterTurnIn.find((b) => b.kind === 'completed');
  rec.ok('turning a quest in raises a QUEST COMPLETED! banner',
    !!done && /QUEST COMPLETED!/.test(done.text), afterTurnIn.map((b) => b.kind));
  rec.ok('...carrying the reward it just paid',
    !!done && /\+\d+g/i.test(done.text), done && done.text);
  rec.ok('...over the dialogue, which re-opens on the next quest',
    !!done && done.modalOpen === true && done.z > done.modalZ,
    done && { z: done.z, modalZ: done.modalZ, modalOpen: done.modalOpen });

  /* v2.3.1746 — owner: "play this sound upon quest completion." */
  const sfx = await P.page.evaluate(() => (window.__sfx || []).slice());
  rec.ok("the owner's quest fanfare is played on the hand-in",
    sfx.includes('quest-complete'), sfx);

  const srvDone = await srv();
  rec.ok('the WORKER marked it turned in (the banner is not lying)',
    !!srvDone && (srvDone._quests || {}).tut_1 === 'turnedIn',
    srvDone && srvDone._quests);

  /* The two banners are distinct events, not one node relabelled — a single
     reused node would mean the second celebration inherits the first's
     timer and could vanish early. */
  rec.ok('accept and completion are two separate banners',
    afterTurnIn.filter((b) => b.kind === 'accepted').length >= 1
    && afterTurnIn.filter((b) => b.kind === 'completed').length >= 1,
    afterTurnIn.map((b) => b.kind));

  await P.ctx.close().catch(() => {});
}
