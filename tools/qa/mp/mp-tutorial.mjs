/* The tutorial arc, through the real UI (v2.3.1665).
 *
 * This scenario exists because the bug it guards was a REACHABILITY bug,
 * and reachability is invisible to a unit test: the server's quest handlers
 * were fully implemented and fully tested, and a player still could not
 * accept a single quest, because the only trigger was an NPC entity that no
 * longer spawns.  Everything below therefore goes through the DOM — real
 * taps on the real panel — rather than through the wire.
 *
 * What it pins:
 *   - a fresh character starts BARE (armor is earned now, not issued)
 *   - the first tutorial quest is visible and offered to a new player
 *   - tapping Accept actually reaches the server (checked in the DO, not
 *     in the client's optimistic copy)
 *   - Turn In is refused while the objective is unmet — the reward gate is
 *     the SERVER's, not the button's
 */
import * as H from './harness.mjs';
/* v2.3.1728: live table, not a literal — see the note in mp-questui.mjs.
   This one is a NEGATIVE assertion, so a stale figure kept it passing for
   the wrong reason after the v2.3.1727 retune: it would have gone on
   "passing" even if the chooser had appeared. */
import { QUEST_REWARDS } from '../../../server/src/data.js';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Tourist', wsPort, webPort });
  await H.enterWorld(P);
  const myId = await H.readState(P, (S) => S.myId);

  /* ── a fresh character is bare ── */
  const gear = await P.page.evaluate(() => {
    try {
      return {
        chest: localStorage.getItem('bt-gear-v3-chest'),
        legs: localStorage.getItem('bt-gear-v3-legs'),
        staleV2: localStorage.getItem('bt-gear-v2-chest'),
      };
    } catch (e) { return { err: String(e) }; }
  });
  /* null means "never set", i.e. the default is in force — which is now
     'none'.  A non-null 'steelplate' here would mean the key bump failed. */
  rec.ok('a fresh character is not issued chest armor',
    gear.chest === null || gear.chest === 'none', gear);
  rec.ok('a fresh character is not issued leg armor',
    gear.legs === null || gear.legs === 'none', gear);

  /* ── the quest is offered ── */
  await H.openDest(P, 'Quests');
  await P.page.waitForTimeout(800);
  /* The panel opens on Active, which is empty for a new player ("No active
     quests. Choose one from Available…").  Offered quests live behind the
     Available segment, so a new player's first move is this tap. */
  await H.clickText(P, 'Available').catch(() => {});
  await P.page.waitForTimeout(500);
  const questsBody = await H.bodyText(P);
  rec.ok('the Quests panel offers the first tutorial quest',
    /Cold Reception/.test(questsBody), questsBody.slice(0, 400));

  const opened = await H.clickText(P, 'Cold Reception').then(() => true).catch(() => false);
  rec.ok('the quest row opens its detail page', opened);
  await P.page.waitForTimeout(500);

  const detail = await H.bodyText(P);
  rec.ok('the detail page states the objective and the zone',
    /Frost Ridge/.test(detail), detail.slice(0, 400));
  /* v2.3.1673: the arc asks for REMNANTS now, not a kill count.  Pinned here
     because the client `check` and the server objective are two tables that
     have to agree, and the symptom of disagreement is a Turn In button that
     refuses without saying why. */
  rec.ok('the objective asks for remnants, not a kill count',
    /Snowman Remnants/i.test(detail) && !/Defeat \d/i.test(detail), detail.slice(0, 400));
  rec.ok("the quest giver's portrait is shown in the dialogue block",
    await P.page.evaluate(() => !!document.querySelector('img[src*="mayor-bro-head"]')));
  rec.ok('the detail page shows the quest giver speaking',
    /Mayor Bro/.test(detail), detail.slice(0, 400));

  /* ═══ v2.3.1704: THE REWARD BLOCK NAMES ITS OWN QUEST ═══
     Owner: "The quest UI is a little confusing what's rewards for the next
     quests vs what's rewarded for the current quest."
     This page is reached by tapping a row in a list of quests and its reward
     block was headed with the bare word "Rewards" over two numbers, so nothing
     on screen tied the figures to the quest they belonged to, nor said WHEN
     they are paid — and a quest has two payout moments (the kit handed over on
     accept, and the payout for coming back).  Asserting the quest TITLE
     appears in the heading is what stops it drifting back to a bare label. */
  rec.ok('the reward block says which quest the figures belong to',
    /For finishing “Cold Reception”/.test(detail), detail.slice(0, 600));
  rec.ok('...and who pays them, and when',
    /Paid by Mayor Bro when you hand this quest in/.test(detail), detail.slice(0, 600));

  /* ── accept reaches the SERVER, not just the client ── */
  const acceptTapped = await H.clickText(P, 'Accept from Mayor Bro').then(() => true).catch(() => false);
  rec.ok('the Accept button exists and is tappable', acceptTapped);
  await P.page.waitForTimeout(1200);

  const admin = await H.adminPlayer(wsPort, myId);
  const quests = (admin && admin.rpg && admin.rpg._quests) || {};
  rec.ok('the server marked the quest active (the reachability bug is gone)',
    quests.tut_1 === 'active', quests);

  /* ═══ v2.3.1711: THE TOP-LEFT REMINDER IS READABLE ═══
     Owner: "the quest reminder in the top left corner is a nice touch but the
     text is a bit too small to be legible."  It shipped at 8px title / 7px
     objective — below EVERY step of the documented type scale (11 caption /
     13 body / 15 emphasized / 17 title, UI-BIBLE Part 2), which is the sign
     it was never measured against it rather than deliberately tuned small.
     Pinned by COMPUTED style, not by the literal in the source, so a refactor
     that moves the number somewhere else still has to keep the result. */
  await P.page.waitForTimeout(600);
  const hud = await P.page.evaluate(() => {
    const hit = [...document.querySelectorAll('div')].find(
      (d) => /\u{1F4DC}/u.test(d.textContent || '') && d.getBoundingClientRect().width < 320,
    );
    if (!hit) return null;
    const r = hit.getBoundingClientRect();
    const kid = (i) => {
      const c = hit.children[i];
      if (!c) return null;
      const cs = getComputedStyle(c);
      /* Alpha out of rgba(...) — the objective line is deliberately dimmer
         than the title, but it still has to clear a contrast floor.  Parse
         the COMPONENTS rather than "last number before the paren": that
         shortcut reads the blue channel off an opaque rgb(216, 169, 77) and
         reports alpha 77, which is nonsense that happens to pass. */
      const parts = (/\(([^)]*)\)/.exec(cs.color) || [, ''])[1]
        .split(',').map((v) => parseFloat(v));
      return {
        px: parseFloat(cs.fontSize),
        alpha: parts.length >= 4 && Number.isFinite(parts[3]) ? parts[3] : 1,
      };
    };
    /* v2.3.1728: measured against the PLAY WINDOW, not the viewport.  Since
       v2.3.1715 the desktop shell centres #root (380px at x=310 in this
       harness), so a correctly-sized 248px reminder reported right=566 and
       failed a threshold that assumed the play area starts at x=0.  The
       assertion means "the box stays out of the right half of the play
       area"; subtracting the shell's origin is what makes it mean that on
       both a phone (origin 0) and the desktop shell. */
    const rootR = document.getElementById('root').getBoundingClientRect();
    return {
      w: Math.round(r.width),
      right: Math.round(r.right - rootR.left),
      playW: Math.round(rootR.width),
      title: kid(0), desc: kid(1),
    };
  });
  /* ═══ v2.3.1728: THE PLAY SURFACE FILLS THE PLAY WINDOW ═══
     v2.3.1715 shrank the desktop play window to #root and leaned on
     `contain: paint` to re-anchor the fixed overlays inside it.  That
     re-anchors an ORIGIN but cannot touch a viewport unit, and
     .brotown-wrap was sized `width: 100vw` — so it stayed window-wide
     inside a 380px shell and every centred modal centred ~600px off to the
     right, clipped and unclickable.  The whole Mayor Bro line was
     unfinishable on desktop for six versions.
     mp-questline caught it (it goes from 64/64 to dead), but only as a
     cascade of forty confusing failures; this names the invariant directly
     so the next person sees the cause and not the symptom. */
  const surface = await P.page.evaluate(() => {
    const root = document.getElementById('root');
    const wrap = document.querySelector('.brotown-wrap');
    if (!root || !wrap) return null;
    const r = root.getBoundingClientRect(), w = wrap.getBoundingClientRect();
    return {
      rootW: Math.round(r.width), wrapW: Math.round(w.width),
      dx: Math.round(w.left - r.left), dw: Math.round(w.width - r.width),
    };
  });
  rec.ok('the play surface fills the play window exactly (no viewport-unit escape)',
    !!surface && Math.abs(surface.dx) <= 1 && Math.abs(surface.dw) <= 1, surface);

  rec.ok('the quest reminder HUD is on screen with an active quest', !!hud, hud);
  if (hud) {
    rec.ok('the reminder title is at least the 13px body step',
      hud.title && hud.title.px >= 13, hud.title);
    rec.ok('...and the objective line at least the 11px caption step',
      hud.desc && hud.desc.px >= 11, hud.desc);
    /* .4 white on the .85 slate was ~2.6:1 — size was only half the problem. */
    rec.ok('...and the objective is not dimmed below readability',
      hud.desc && hud.desc.alpha >= 0.6, hud.desc);
    /* Bigger type must not have bought legibility by eating the screen. */
    rec.ok('...and the wider box still clears the right half of a 390px phone',
      hud.right <= 300, hud);
  }

  /* ── the reward gate belongs to the server ── */
  const coinsBefore = (admin && admin.rpg && admin.rpg.coins) || 0;
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'quest_turn_in', payload: { questId: 'tut_1' } });
  });
  await P.page.waitForTimeout(1200);
  const after = await H.adminPlayer(wsPort, myId);
  const q2 = (after && after.rpg && after.rpg._quests) || {};
  rec.ok('turning in with an unmet objective is refused server-side',
    q2.tut_1 === 'active', q2);
  /* A DELTA, not an absolute — a new character already starts with coins,
     so "coins < reward" would pass for the wrong reason. */
  rec.ok('the refused turn-in paid no gold',
    ((after.rpg && after.rpg.coins) || 0) === coinsBefore,
    { before: coinsBefore, after: after.rpg && after.rpg.coins });

  /* ═══ v2.3.1704: THE PANE SHOWS THE HAND-IN, IT DOES NOT PERFORM IT ═══
     Owner: "Disable turning in quest rewards (completion) through the quest
     pane.  It's getting messed up."
     The pane had a `Turn in — claim your reward` button and an XP-skill
     picker beside the "return to Mayor Bro" banner: two contradictory
     instructions, and the button was the one the owner wants gone.  The
     dialogue at the giver is the only door now (mp-questui walks it end to
     end).
     Both halves are pinned, because either alone is a bad test: that the
     CONTROL is gone, and that the pane still says a hand-in is waiting and
     names the person to see.  A pane that just dropped the button would be a
     quest with no visible way to finish. */
  await H.grant(wsPort, myId, 'item', { invKey: 'snowman', count: 4 });
  await P.page.waitForTimeout(2200);
  await H.openDest(P, 'Quests');
  await P.page.waitForTimeout(800);
  await H.clickText(P, 'Active').catch(() => {});
  await P.page.waitForTimeout(500);
  await H.clickText(P, 'Cold Reception').catch(() => {});
  await P.page.waitForTimeout(700);

  const readyPane = await H.bodyText(P);
  const paneButtons = await H.buttonTexts(P);
  rec.ok('the pane still says the quest is ready to hand in',
    /Ready to hand in/i.test(readyPane), readyPane.slice(0, 500));
  rec.ok('...and names the person to go and see',
    /go and see Mayor Bro/i.test(readyPane), readyPane.slice(0, 500));
  rec.ok('...and says he is the one who pays',
    /He pays the reward there/i.test(readyPane), readyPane.slice(0, 600));
  /* The button list is the honest witness: bodyText would still match a
     button rendered but disabled, and "disabled" is not what was asked for. */
  rec.ok('the pane offers NO turn-in button any more',
    !paneButtons.some((t) => /turn in/i.test(t)), paneButtons);
  rec.ok('...and no XP-skill picker either (it belongs to the dialogue now)',
    !readyPane.includes(`Train ${QUEST_REWARDS.tut_1.xp} XP into`)
    && !paneButtons.some((t) => /Choose a skill to train/i.test(t)),
    { paneButtons, pane: readyPane.slice(0, 500) });
  /* The quest must be untouched by all of that — a pane that quietly turned
     it in anyway would pass every assertion above. */
  const stillActive = await H.adminPlayer(wsPort, myId);
  rec.ok('and the quest is still ACTIVE — the pane settled nothing',
    ((stillActive.rpg && stillActive.rpg._quests) || {}).tut_1 === 'active',
    stillActive.rpg && stillActive.rpg._quests);

  /* ═══ v2.3.1714: TAP THE REMINDER TO FOLD IT ═══
     Owner: "make it so you can tap on that top left quest indicator and hide
     the description so just the title shows.  Some users might prefer that
     view to save screen space."
     Last in the scenario on purpose — it reloads the page to prove the
     preference persists, which would strand every assertion above it.
     Reload first, to get out from under the Quests panel opened above: the
     card sits at zIndex 17 and a panel covers it, so elementFromPoint would
     be answering about the panel. */
  await P.page.reload();
  await P.page.waitForTimeout(6000);

  /* Everything below talks to the card through the DOM, the way a thumb
     does — never by poking the React state. */
  const CARD = `[...document.querySelectorAll('div')].find(
    (d) => /\u{1F4DC}/u.test(d.textContent || '') && d.getBoundingClientRect().width < 320)`;

  const readCard = () => P.page.evaluate(`(() => {
    const hit = ${CARD};
    if (!hit) return null;
    const r = hit.getBoundingClientRect();
    const S = window._gameState && window._gameState.current;
    return {
      h: Math.round(r.height),
      text: (hit.textContent || '').replace(/\\s+/g, ' ').trim(),
      /* Does the pill offer a 44pt hit area even though it LOOKS ~26px?
         Probed 38px down from its top — past the visible bottom when folded
         — because UI-BIBLE Part 2 allows a small visual but not a small hit
         area. */
      deepTapLands: (() => {
        const el = document.elementFromPoint(r.x + 20, r.y + 38);
        return !!(el && hit.contains(el));
      })(),
      px: S && S.player ? Math.round(S.player.x) : null,
      py: S && S.player ? Math.round(S.player.y) : null,
    };
  })()`).catch(() => null);

  const tapCard = () => P.page.evaluate(`(() => {
    const hit = ${CARD};
    if (!hit) return false;
    const r = hit.getBoundingClientRect();
    const o = { bubbles: true, cancelable: true, clientX: r.x + 20, clientY: r.y + 10 };
    hit.dispatchEvent(new PointerEvent('pointerdown', o));
    hit.dispatchEvent(new PointerEvent('pointerup', o));
    hit.dispatchEvent(new MouseEvent('click', o));
    return true;
  })()`).catch(() => false);

  const expanded = await readCard();
  rec.ok('the quest reminder is expanded by default', !!expanded
    && /Snowman Remnants/i.test(expanded.text), expanded);

  await tapCard();
  await P.page.waitForTimeout(400);
  const folded = await readCard();
  rec.ok('tapping the reminder hides the objective, leaving the title',
    !!folded && /Cold Reception/.test(folded.text)
    && !/Snowman Remnants/i.test(folded.text), folded);
  rec.ok('...and the card actually got shorter (the point was screen space)',
    !!folded && !!expanded && folded.h < expanded.h - 15, { expanded, folded });
  /* The card floats over the world, and the world takes taps.  Without
     stopPropagation this fold would ALSO order the character to walk to the
     top-left corner — silent, and only visible as drift. */
  rec.ok('...and the tap did NOT leak through to the world as a move order',
    !!folded && !!expanded && folded.px === expanded.px && folded.py === expanded.py,
    { before: expanded && [expanded.px, expanded.py], after: folded && [folded.px, folded.py] });
  rec.ok('...and the folded pill still offers a 44pt hit area (UI-BIBLE)',
    !!folded && folded.deepTapLands === true, folded);

  await P.page.reload();
  await P.page.waitForTimeout(6000);
  const remembered = await readCard();
  rec.ok('the folded choice survives a reload — it is a preference, not a toggle',
    !!remembered && !/Snowman Remnants/i.test(remembered.text), remembered);

  await tapCard();
  await P.page.waitForTimeout(400);
  const reopened = await readCard();
  rec.ok('...and tapping again brings the objective back',
    !!reopened && /Snowman Remnants/i.test(reopened.text), reopened);

  await P.ctx.close().catch(() => {});
}
