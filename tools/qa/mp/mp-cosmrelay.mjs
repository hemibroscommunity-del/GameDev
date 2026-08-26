/* A PEER'S LOOK AFTER THE JOIN FRAME (v2.3.1961).
 *
 * mp-tattoos proves a drawing survives BOTH server gates and arrives on the
 * join road.  It cannot see the hole this scenario is about, because the join
 * road was never the broken one: cosmetics reach an already-connected client a
 * second way, through the 2 s `track` fan-out (`player_update`), and that path
 * ran `Object.assign(peer, msg.data)` — which writes the SHORT wire keys
 * (`sa`, `hr`, `st`, `bs`) onto a peer object the renderer reads by LONG name
 * (`shirtArtFront`, `hair`, `shirt`, `bodySize`).  So everything the wire
 * renames arrived once, on join, and was never refreshed again.
 *
 * Two claims here, and they are the two reachable consequences:
 *
 *   1. THE SELF-HEAL (v2.3.1112).  iOS Safari suspends a background tab
 *      completely, so a join that happens while it is asleep is missed
 *      forever; the tick delta and the relay both CREATE an unknown peer from
 *      placeholder nulls and the code comment promises the relay fills the
 *      look in "moments later".  It did not — name, avatar and gear did, and
 *      skin/hair/headwear/shirt/pants/shoes/body size/drawings stayed null, so
 *      that peer rendered as a bald default body for the rest of the session.
 *      Simulated honestly: B deletes its own entry for A, which is exactly the
 *      state a missed join leaves behind, and then only the tick + relay code
 *      path can put A back.
 *
 *   2. A COSMETIC CHANGED MID-SESSION.  The only look a player can change
 *      while in the world today is the t-shirt (ItemDetailPopup's chest
 *      picker / Chest — Layers rows call setShirt, which moves `st`), so that
 *      is what this drives, through the real loadout UI.  The DRAWINGS cannot
 *      change mid-session — the designer is mounted only by NameModal at
 *      bootPhase 'create', i.e. on the splash — so their half of the fix is
 *      latent, and claim 1 is what covers them: a self-healed peer has to
 *      receive them over the relay or not at all.
 *
 * The look is seeded into localStorage before the creator runs, the way
 * mp-tattoos does it: the catalogs read their store at module load, so this is
 * the path a returning player takes and it keeps the scenario about the wire.
 */
import * as H from './harness.mjs';

const FACE = '4'.repeat(256);
const ARM = '5'.repeat(256);
const CHEST = '6'.repeat(256);

/* A look nobody gets by default, so "B sees A" cannot pass on a coincidence. */
const LOOK = {
  'bt-hair': 'afro',
  'bt-headwear': 'top-hat',
  'bt-skin': 'porcelain',
  'bt-pants': 'red',
  'bt-shoes': 'tan',
  'bt-shirt': 'tshirt',
  'bt-facetattoo': FACE,
  'bt-armtattoo': ARM,
  'bt-tattooart': CHEST,
};

/* What B believes A looks like, by the LONG names the renderer reads. */
const peerLook = (P, who) => P.page.evaluate((n) => {
  const S = window._gameState && window._gameState.current;
  const o = Object.values((S && S.others) || {}).find((x) => x.name === n);
  if (!o) return null;
  return {
    hair: o.hair || null, headwear: o.headwear || null, skin: o.skin || null,
    pants: o.pants || null, shoes: o.shoes || null, shirt: o.shirt || null,
    bodySize: o.bodySize || null,
    face: (o.faceTattooArt || '').length, arm: (o.armTattooArt || '').length,
    chest: (o.tattooArt || '').length,
  };
}, who);

const looksRight = (v) => !!v && v.hair === 'afro' && v.headwear === 'top-hat'
  && v.skin === 'porcelain' && v.pants === 'red' && v.shoes === 'tan'
  && v.face === 256 && v.arm === 256 && v.chest === 256;

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Dapper', wsPort, webPort });
  await A.page.evaluate((look) => {
    for (const k of Object.keys(look)) localStorage.setItem(k, look[k]);
  }, LOOK);
  await A.page.reload({ waitUntil: 'domcontentloaded' });
  await A.page.waitForTimeout(1500);
  await H.enterWorld(A);
  await A.page.waitForTimeout(2000);

  const B = await H.newPlayer(browser, { name: 'Onlooker', wsPort, webPort });
  await H.enterWorld(B);
  await H.waitMutualSight(A, B);
  await B.page.waitForTimeout(1500);

  /* ── the control: the join road, which already worked ── */
  const onJoin = await peerLook(B, 'Dapper');
  rec.ok('B sees A’s whole look on the join road (the control)', looksRight(onJoin), onJoin);

  /* ── 1. THE SELF-HEAL: forget A, and let the wire put him back ── */
  const forgot = await B.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.others) return -1;
    for (const id of Object.keys(S.others)) delete S.others[id];
    return Object.keys(S.others).length;
  });
  rec.ok('B has forgotten A, the way a suspended tab does', forgot === 0, { left: forgot });

  /* A must move to become dirty, or the tick never mentions him (see
     waitMutualSight's note); the relay alone would also re-create him. */
  await H.nudge(A, 'd', 500);
  await B.page.waitForTimeout(6000);   /* ≥2 track cycles */

  const healed = await peerLook(B, 'Dapper');
  rec.ok('the re-discovered peer has A’s look back, not a bald default body',
    looksRight(healed), healed);
  rec.ok('...including the drawings, which only the relay could have carried',
    !!healed && healed.face === 256 && healed.arm === 256 && healed.chest === 256, healed);

  /* ── 2. A COSMETIC CHANGED MID-SESSION, through the loadout UI ── */
  const shirtBefore = await A.page.evaluate(() => localStorage.getItem('bt-shirt'));
  await H.openDest(A, 'Character').catch(() => {});
  await A.page.waitForTimeout(1200);
  await A.page.locator('[aria-label="Chest"]').first().click({ timeout: 8000 }).catch(() => {});
  await A.page.waitForTimeout(800);
  await H.clickText(A, 'CHANGE').catch(() => {});
  await A.page.waitForTimeout(1000);
  /* The row is icon + text + button; the icon's parent IS the row, so this
     cannot hit the armour row's Unequip beside it. */
  const tapped = await A.page.locator('img[alt="T-Shirt"]').first()
    .locator('xpath=..').locator('button').first()
    .click({ timeout: 8000 }).then(() => true).catch(() => false);
  rec.ok('the T-Shirt row is reachable in the loadout', tapped, await H.buttonTexts(A));
  await A.page.waitForTimeout(1200);

  const shirtAfter = await A.page.evaluate(() => localStorage.getItem('bt-shirt'));
  /* If the tap changed nothing on A, the peer assertion below would pass by
     comparing two unchanged values — so this one has to hold first. */
  rec.ok('the toggle actually moved A’s own shirt',
    !!shirtAfter && shirtAfter !== shirtBefore, { before: shirtBefore, after: shirtAfter });

  await A.page.keyboard.press('Escape').catch(() => {});
  await H.nudge(A, 'a', 400);
  await B.page.waitForTimeout(6000);   /* ≥2 track cycles */

  const seen = await peerLook(B, 'Dapper');
  rec.ok('B sees the shirt A changed while both were in the world',
    !!seen && seen.shirt === shirtAfter, { peer: seen && seen.shirt, actual: shirtAfter });
  rec.ok('...and nothing else about A was lost on the way',
    looksRight(seen), seen);

  const errs = [...(A.logs || []), ...(B.logs || [])].filter((l) => /error|uncaught/i.test(l));
  rec.ok('no page errors on either client', errs.length === 0, errs.slice(0, 3));

  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
