/* THE NEW MONSTER DROPS, ON THE GLASS (v2.3.1924).
 *
 * Owner: "monsters now have a 1 in 500 chance to drop an iron chest and 1 in
 * 500 of dropping iron legs.  Add a 1 in 200 chance to drop a rare gem."
 *
 * server/test/drops.test.mjs proves the WORKER half — the rates, that the two
 * pieces roll independently, that the claims do not eat each other, and what
 * the credit carries.  None of that says the player ever sees any of it, and
 * the two halves fail differently:
 *
 *   - the gem is a plain stackable, so its risk is presentation.  A key with
 *     no thumbnail falls back to a generic glyph, which is what "I got
 *     something but I don't know what" looks like.  Granted here through the
 *     REAL operator endpoint so the whole path (worker inventory -> echo ->
 *     bag tile) is the one under test, not a value typed into the page.
 *   - the armour is the opposite: there is no server armour stash (handoff
 *     rule 1), so the ONLY place a dropped piece can land is the client's own
 *     armourStash / legsStash, written by _applyLootCredit.  If that routing
 *     is wrong the piece is simply gone, and no server test can see it.
 *
 * WHY THE CREDIT IS DRIVEN THROUGH A SEAM.  A 1-in-500 drop cannot be waited
 * for; the alternative is a test that kills monsters for an hour and usually
 * proves nothing.  window.__btLootCredit (wsClient.js) hands the real handler
 * the real payload, and the payload's SHAPE is pinned separately by the server
 * suite — so the two together cover the join that neither covers alone.  That
 * seam is the one thing here that is not a player's road, and it is stated
 * rather than hidden.
 */
import * as H from './harness.mjs';
import { MONSTER_ARMOR_DROPS } from '../../../server/src/data.js';

/* The exact blob the worker mints for the iron greatsword (server/src/
   index.js _rollIronWeaponForKill).  Pinned field-for-field against the
   forge's own mint by server/test/drops.test.mjs — so what this scenario
   answers is the half that test cannot: does the CLIENT name it and draw it
   as iron, or as a nameless grey greatsword? */
const IRON_BLADE = {
  type: 'greatsword', tier: 'common', tierMult: 1.25,
  element1: null, element2: null, name: 'iron greatsword', gearBase: 'iron',
  isVolatile: false, reforgeBonus: null, hardenBonus: null,
  quality: 'normal', hardness: 0, temper: 0,
};

/* Exactly what the worker sends for a pickup that claimed both pieces plus
   the gem (server/src/index.js _handleLootPickup). */
const CREDIT = {
  lootId: 'mk-test', zone: 'town', coins: 0, skull: null, shard: null,
  gem: 'rare_gem',
  /* Built FROM the server's own table rather than typed out, and that is the
     point of this fixture: it claims to be "exactly what the worker sends",
     and a hand-copied tierMult stopped being that the moment the armour ladder
     was retuned (v2.3.1925b, 1.25 -> 2.0 — caught by this very assertion
     failing against its own stale copy).  The credit's SHAPE is still pinned
     independently by server/test/drops.test.mjs. */
  armor: MONSTER_ARMOR_DROPS.map((d) => ({
    name: d.name, mat: d.mat, slot: d.slot, tierMult: d.tierMult, quality: 'normal',
  })),
  weapon: null, weaponStashed: false, weaponSoldFor: null, viaPet: false,
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Looter', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  const seam = await P.page.evaluate(() => typeof window.__btLootCredit === 'function');
  rec.ok('the loot-credit seam is wired (guard)', seam === true, {});
  if (!seam) { await P.ctx.close().catch(() => {}); return; }

  /* ── the armour lands in the bag ──────────────────────────────────────── */
  const after = await P.page.evaluate((credit) => {
    window.__btLootCredit(credit);
    const R = window._gameState.current.rpg;
    return {
      armorStash: (R.armorStash || []).map((a) => ({ n: a.name, m: a.mat, s: a.slot, t: a.tierMult })),
      legsStash: (R.legsStash || []).map((a) => ({ n: a.name, m: a.mat, s: a.slot, t: a.tierMult })),
    };
  }, CREDIT);
  console.log('    stashes after the credit', JSON.stringify(after));

  const torso = after.armorStash.find((a) => a.n === 'Iron Torso');
  const greaves = after.legsStash.find((a) => a.n === 'Iron Greaves');
  rec.ok('the chest piece lands in the CHEST stash', !!torso, after);
  /* v2.3.1701's bug, in this new lane: a legs piece filed under armorStash
     equips to the torso and mitigates nothing. */
  rec.ok('the legs piece lands in the LEGS stash, not the chest one',
    !!greaves && !after.armorStash.some((a) => a.n === 'Iron Greaves'), after);
  /* v2.3.1758's bug, in this new lane: without `mat` the piece renders as
     steel on the character and in the bag, whatever its name says. */
  rec.ok('...both carrying the metal that picks their art and icon',
    !!torso && torso.m === 'iron' && !!greaves && greaves.m === 'iron', { torso, greaves });
  /* tierMult is what getArmorPieceDr turns into damage reduction — a piece
     that arrives at 1 is cosmetic iron over copper stats. */
  /* v2.3.1925b: 2.0 — a whole step on the ARMOUR ladder, not the blacksmith
     table's 1.25.  This is the field getArmorPieceDr turns into mitigation,
     so a piece that arrived at the old number would be cosmetic iron wearing
     nearly-copper stats. */
  rec.ok('...and a whole armour tier step, so they actually mitigate more',
    !!torso && torso.t === 2.0 && !!greaves && greaves.t === 2.0, { torso, greaves });

  /* A resend must not mint a second copy — a reconnect replays credits. */
  const twice = await P.page.evaluate((credit) => {
    window.__btLootCredit(credit);
    const R = window._gameState.current.rpg;
    return { chest: (R.armorStash || []).filter((a) => a.name === 'Iron Torso').length,
      legs: (R.legsStash || []).filter((a) => a.name === 'Iron Greaves').length };
  }, CREDIT);
  rec.ok('the same credit arriving twice does not duplicate the pieces',
    twice.chest === 1 && twice.legs === 1, twice);

  /* ── the gem, granted for real and read off the bag ───────────────────── */
  const myId = await P.page.evaluate(() => window._gameState.current.myId);
  /* invKey/count is the operator surface's own shape (inbox.js) — not the
     loot pile's {key, qty}, which is a different lane. */
  const granted = await H.grant(wsPort, myId, 'item', { invKey: 'rare_gem', count: 1 });
  rec.ok('the operator grant was accepted (guard)', !!(granted && granted.ok), granted);
  await P.page.waitForTimeout(1500);

  const bag = await P.page.evaluate(() => {
    try { window.__broDashPanelBus.open('bag'); } catch (e) {}
    return null;
  });
  await P.page.waitForTimeout(1400);
  const tile = await P.page.evaluate(() => {
    const R = window._gameState.current.rpg || {};
    const held = (R.inventory || {}).rare_gem || 0;
    /* The rendered tile, not the data: a key with no thumbnail still counts
       in the inventory and still draws — as a fallback glyph. */
    const img = [...document.querySelectorAll('img[alt="rare_gem"]')]
      .find((el) => el.getBoundingClientRect().width > 0);
    return { held, drawn: !!img, src: img ? img.getAttribute('src') : null };
  });
  console.log('    gem in the bag', JSON.stringify(tile), String(bag));

  rec.ok('the granted gem is in the authoritative inventory', tile.held >= 1, tile);
  rec.ok('...and the bag draws it as a picture, not a fallback glyph', tile.drawn === true, tile);
  rec.ok('...using the gem art', !!tile.src && /cur-gem\.webp/.test(tile.src), tile.src);
  await P.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/drops-bag.png' });

  /* ── the iron greatsword, as the player sees it ───────────────────────── */
  /* Seeded into the worn slot the way mp-itemcard seeds its weapons: the
     credit path deliberately does NOT write weaponStash (that is the
     worker's, echoed by player_state), so the only way to look at a dropped
     blade is to put the minted blob where a real one lands.  The blob is the
     server's; what is under test here is naming and art.

     THIS IS THE FAILURE MODE WORTH CATCHING.  The worker stores `gearBase`
     and a lowercase working name — "iron greatsword" — because the client
     rebuilds the display name from the metal.  If that rebuild does not
     happen, the player is handed a weapon literally captioned "iron
     greatsword" in the middle of a UI that says PINE BOW and COPPER GREAT
     SWORD; if the icon rule does not fire, it is drawn as plain steel. */
  await P.page.evaluate((blade) => {
    const S = window._gameState.current;
    S.rpg.weapon = blade;
    S.rpg.activeSlot = 'melee';
  }, IRON_BLADE);
  await P.page.evaluate(() => { window.__broDashPanelBus.open('hero'); });
  await P.page.waitForTimeout(1100);

  const seen = await P.page.evaluate(() => {
    const cell = document.querySelector('[role="button"][aria-label="Weapon"]');
    const img = cell && cell.querySelector('img');
    return {
      src: img ? img.getAttribute('src') : null,
      /* Anything on screen still showing the raw stored string is the bug. */
      rawName: /iron greatsword/.test(document.body.innerText || ''),
      text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 240),
    };
  });
  console.log('    iron blade on screen', JSON.stringify({ src: seen.src, rawName: seen.rawName }));
  rec.ok('the worn weapon cell draws the IRON greatsword art',
    !!seen.src && /great-sword-iron/.test(seen.src), seen.src);
  rec.ok('...and no screen shows the raw stored name', seen.rawName === false, seen.text);
  await P.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/drops-blade.png' });

  /* ── v2.3.1925: THE MYSTERY REVEAL ─────────────────────────────────────
     Owner: "If it's on rare tier or above, the item becomes a silhouette with
     a question mark.  You get to roll again to see if it reaches the next
     tier.  Once the roll is complete it's a short celebration message.  The
     item is identified in font color of its rarity tier."

     Driven through the REAL socket handler with the payload the worker emits
     (drops.test.mjs pins that shape), so what runs here is the whole chain —
     credit -> revealBus -> overlay — not the component in isolation.  A godly
     is 1 in 400,000; there is no other way to ever see this animation. */
  const reveal = async (entry) => {
    await P.page.evaluate((e) => {
      window.__btLootCredit({ lootId: 'mk-rev', zone: 'town', coins: 0, skull: null,
        shard: null, gem: null, armor: null, weapon: null, reveals: [e] });
    }, entry);
  };
  const readOverlay = () => P.page.evaluate(() => {
    const el = document.querySelector('[data-tut="reveal-overlay"]');
    if (!el) return { shown: false };
    const img = el.querySelector('img');
    const cs = img ? getComputedStyle(img) : null;
    return {
      shown: true,
      grade: el.getAttribute('data-reveal-grade') || '',
      text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
      /* The silhouette: brightness(0) is what makes the shape legible and the
         item not.  Read off the COMPUTED style, because a filter that never
         applied would still be in the markup. */
      silhouetted: !!cs && /brightness\(0\)/.test(cs.filter || ''),
      hue: getComputedStyle(el.firstElementChild).borderTopColor,
    };
  });

  await reveal({ kind: 'armor', name: 'Iron Torso', itemType: null, mat: 'iron',
    quality: 'rare', ladder: ['rare'] });
  await P.page.waitForTimeout(500);
  const spinning = await readOverlay();
  console.log('    mid-spin', JSON.stringify(spinning));
  rec.ok('a rare drop opens the reveal', spinning.shown === true, spinning);
  rec.ok('...as a question mark, not the item', /\?/.test(spinning.text || ''), spinning.text);
  rec.ok('...over a silhouette of what dropped', spinning.silhouetted === true, spinning);
  /* THE ONE THAT MATTERS FOR FAIRNESS: mid-spin the overlay must not already
     be announcing the answer.  data-reveal-grade is only stamped once the
     ladder lands, so a client that had resolved early would show it here. */
  rec.ok('...and does NOT show the grade while it is still rolling',
    spinning.grade === '', spinning.grade);
  await P.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/reveal-spin.png' });

  await P.page.waitForTimeout(2000);
  const landedRare = await readOverlay();
  console.log('    rare landed', JSON.stringify(landedRare));
  rec.ok('the rare lands on its grade', landedRare.grade === 'rare', landedRare);
  rec.ok('...naming the item in its tier', /Rare Iron Torso/.test(landedRare.text || ''), landedRare.text);
  rec.ok('...with a short celebration', /rare find/i.test(landedRare.text || ''), landedRare.text);
  /* The owner's "font color of its rarity tier": blue for rare, and it has to
     be the SAME blue the bag draws (QUALITY_COLOR), or the reveal and the
     inventory disagree about the item thirty seconds apart. */
  rec.ok('...in the rare hue the bag uses', /91, 153, 222/.test(landedRare.hue || ''), landedRare.hue);
  await P.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/reveal-rare.png' });

  await P.page.waitForTimeout(2200);
  rec.ok('the reveal clears itself when it is done',
    (await readOverlay()).shown === false, {});

  /* A godly plays TWO stages, so at the moment a rare would already have
     landed it is still rolling.  That is the escalation the owner described,
     and the only observable difference between the two ladders. */
  await reveal({ kind: 'weapon', name: 'iron greatsword', itemType: 'greatsword',
    mat: 'iron', quality: 'godly', ladder: ['elite', 'godly'] });
  await P.page.waitForTimeout(2400);
  const midGodly = await readOverlay();
  console.log('    godly at the point a rare would have landed', JSON.stringify(midGodly));
  rec.ok('a godly is STILL rolling when a one-stage reveal would have finished',
    midGodly.shown === true && midGodly.grade === '', midGodly);
  await P.page.waitForTimeout(2000);
  const landedGodly = await readOverlay();
  console.log('    godly landed', JSON.stringify(landedGodly));
  rec.ok('...and lands on godly after the second stage', landedGodly.grade === 'godly', landedGodly);
  rec.ok('...with its own celebration', /GODLY/.test(landedGodly.text || ''), landedGodly.text);
  /* Read AGAIN a beat later for the two things that cross-fade on landing.
     The first read catches them mid-transition — the border was still the
     elite purple it is escalating FROM, and the art still silhouetted — which
     is correct but is not what the player is left looking at. */
  await P.page.waitForTimeout(400);
  const settledGodly = await readOverlay();
  console.log('    godly settled', JSON.stringify(settledGodly));
  rec.ok('...in the godly hue, once the escalation finishes crossing over',
    /240, 196, 95/.test(settledGodly.hue || ''), settledGodly.hue);
  /* And the silhouette lifts: the piece arrives in its real colours with its
     grade, which is the whole point of hiding it until now. */
  rec.ok('...and the item is no longer a silhouette', settledGodly.silhouetted === false, settledGodly);
  await P.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/reveal-godly.png' });
  await P.page.waitForTimeout(2200);

  /* And the negative that keeps the ceremony meaning something: ~90% of drops
     are Normal, and a question mark over every kill is just a slower pickup.
     The server sends no ladder for one, so nothing should open. */
  await P.page.evaluate(() => {
    window.__btLootCredit({ lootId: 'mk-plain', zone: 'town', coins: 3, skull: null,
      shard: null, gem: null, armor: null, weapon: null, reveals: null });
  });
  await P.page.waitForTimeout(700);
  rec.ok('a normal drop opens no ceremony at all',
    (await readOverlay()).shown === false, {});

  await P.ctx.close().catch(() => {});
}
