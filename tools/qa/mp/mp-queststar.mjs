/* THE QUEST STAR AFTER THE OBJECTIVE IS DONE (v2.3.1906).
 *
 * Owner: "The star on minimap for cold reception quest when it's complete
 * needs to be updated. It still shows you to go to the frozen shore even when
 * complete. Should lead back to mayor bro."
 *
 * A quest stays `active` right through to the turn-in — `complete` is computed
 * by the client, never stored in _quests — so questTargetZone's "is it active"
 * test was answering "is this quest running" when the star needs to answer
 * "what is my next step".
 *
 * Asserted on __btMinimap.questRoute rather than pixels: a scenario cannot
 * read a WebGL canvas, and "is there a star" was never the claim worth
 * testing — "is it pointing at the right place" is.
 */
import * as H from './harness.mjs';

const route = (P) => P.page.evaluate(() => {
  const m = window.__btMinimap;
  return m ? { route: m.questRoute, routes: m.questRoutes || null, zone: m.zone } : null;
});

/* Put the player on a tile and let the game tick see it -- the same trick
   mp-hubspawn walks the hubs with. */
const stand = (P, tx, ty) => P.page.evaluate(({ x, y }) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player) return false;
  S.player.x = x * 32 + 16;
  S.player.y = y * 32 + 16;
  return true;
}, { x: tx, y: ty });

/* The quest book, set straight on the client. Both things under test read
   this one object -- questTargetZone for "where next" and isZoneUnlocked for
   "which spokes are open" -- so a fixture here exercises the real rules. */
const setQuests = (P, book) => P.page.evaluate((b) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.rpg) return false;
  const m = Object.create(null);            /* rule 4: quest ids are keys */
  for (const k of Object.keys(b)) m[k] = b[k];
  S.rpg._quests = m;
  return true;
}, book);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Star', wsPort, webPort, touch: true, viewport: { width: 390, height: 844 },
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  /* ── CONTROL: nothing accepted, nothing starred ── */
  const rest = await route(P);
  rec.ok('the minimap probe is live (guard)', !!rest, rest);
  rec.ok('with no quest accepted, nothing is starred (control)',
    !!rest && rest.route === null, rest);
  rec.ok('...and the control really was taken in town', !!rest && rest.zone === 'town', rest);

  /* ── ACCEPT: the star sends you out of town, toward Frost Ridge ── */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
  });
  await P.page.waitForTimeout(2500);
  const going = await route(P);
  rec.ok('accepting the quest stars the way OUT of town',
    !!going && !!going.route && going.route.zoneId === 'worldview', going);

  /* v2.3.1908, owner: "Make the mini map star for quest more yellow and
     slightly larger." Asserted as a RELATION to the NPC pin, not as literal
     hex: the point is that the star is the louder of the two and is no longer
     sharing C_QUEST — a bare `=== 0xf5ce3c` would pass just as well if someone
     repainted the pins to match and undid the distinction. */
  const star = await P.page.evaluate(() => (window.__btMinimap || {}).questStar || null);
  console.log('    star: ' + JSON.stringify(star));
  rec.ok('the star is drawn LARGER than an NPC quest pin',
    !!star && star.px > star.pinPx, star);
  rec.ok('...and in its own gold, not the pin gold',
    !!star && star.color !== star.pinColor, star);
  rec.ok('...which is yellower than the pin (more green, less red)',
    !!star && (() => {
      const g = (c) => ({ r: (c >> 16) & 255, g: (c >> 8) & 255, b: c & 255 });
      const a = g(star.color), b = g(star.pinColor);
      return (a.g - a.r) > (b.g - b.r) && a.g > b.g;
    })(), star);

  /* ── THE BUG: four snowmen in the bag, and it still says "go to Frost" ──
     The objective is satisfied here, so the next step is the Mayor. The star
     must stop selling a trip that is already done. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.inventory = S.rpg.inventory || {};
    S.rpg.inventory.snowman = 4;
  });
  await P.page.waitForTimeout(1200);
  const done = await route(P);
  rec.ok('with the objective COMPLETE the star no longer sends you out of town',
    !!done && (done.route === null || done.route.zoneId !== 'worldview'), done);

  /* ...and the Mayor is marked instead. His pin is the '❓' hand-it-in glyph,
     which the minimap draws from npc._questMarker — one source shared with the
     badge over his head, so map and world cannot disagree. Asserting the pin
     (rather than only the star's absence) is what makes this "leads back to
     Mayor Bro" instead of merely "stopped being wrong". */
  const pins = await P.page.evaluate(() => {
    const m = window.__btMinimap;
    return m && m.icons ? m.icons : null;
  });
  rec.ok('...and Mayor Bro carries the hand-it-in pin instead',
    !!pins && (pins.questDone || 0) >= 1, pins);

  /* ── AND IT IS THE OBJECTIVE, NOT THE ACCEPT, THAT MOVED IT ──
     Take the snowmen away again: the star must go back to pointing out of
     town. Without this, "complete hides the star" would pass on any change
     that simply broke the star. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.inventory.snowman = 0;
  });
  await P.page.waitForTimeout(1200);
  const undone = await route(P);
  rec.ok('emptying the bag sends the star back out of town (not a dead star)',
    !!undone && !!undone.route && undone.route.zoneId === 'worldview', undone);

  await P.ctx.close().catch(() => {});

  /* ═══ v2.3.2128: THE FIELD QUEST THAT STARRED NOTHING ═══
     Owner: "on the quest for 2 cooked fish show stars on all the zones on
     minimap -- one of the people in demo got confused, there was no stars for
     that quest."

     life_1 names no zone, because fishing holes spawn one per zone (server
     gathering.js) and any of them will do. The old rule read that as "nothing
     to point at" and drew a blank map during an active quest -- which is how
     the demo player read it too: as no quest running.

     A FRESH player, because the half above leaves tut_1 active and a NAMED
     zone deliberately outranks the wildcard -- that precedence is a feature,
     not something to test around.

     The fixture is `_quests` set on the client. That is exactly the state a
     real player is in when Mayor Bro first offers life_1 (he walks his table
     in order, so the four tut quests are turned in by then -- which is also
     what has all four spokes unlocked), and it is the state the demo player
     was in. Driving the tutorial for real would be four zone trips and four
     turn-ins to arrive at the same three-line object. The star and the zone
     locks both read this same object, so nothing here is faked past it. */
  const F = await H.newPlayer(browser, {
    name: 'Angler', wsPort, webPort, guest: true, touch: true,
    viewport: { width: 390, height: 844 },
  });
  await H.enterWorld(F);
  await F.page.waitForTimeout(2500);

  /* ── COUNTER-TEST FIRST: a TOWN errand must still star nothing ──
     mayor_1 is "Visit 3 buildings in town". If the wildcard leaked to every
     zone-less quest, the map would send a player out to Frost Ridge to visit
     a building that is twenty paces behind them. Run before the real fixture
     so it cannot be a stale reading of it. */
  await setQuests(F, { mayor_1: 'active' });
  await F.page.waitForTimeout(1500);
  const errand = await route(F);
  rec.ok('a TOWN errand ("Visit 3 buildings") stars nothing -- the wildcard did not leak',
    !!errand && errand.zone === 'town' && (errand.routes || []).length === 0, errand);

  /* ── IN TOWN: the whole field is behind one gate, so mark the gate ── */
  await setQuests(F, { tut_1: 'turnedIn', tut_2: 'turnedIn', tut_3: 'turnedIn',
    tut_4: 'turnedIn', life_1: 'active' });
  await F.page.waitForTimeout(1500);
  const townField = await route(F);
  rec.ok('the fish quest stars the way OUT of town instead of nothing',
    !!townField && (townField.routes || []).length >= 1
    && townField.routes.every((r) => r.zoneId === 'worldview'), townField);

  /* ── ON THE WORLD VIEW: every open spoke, because any of them will do ── */
  const marks = await F.page.evaluate(() => {
    const f = window._gameFns;
    if (!f || !f.WORLDVIEW_EXITS || !f.TOWN_EXITS) return { err: 'no exit tables on the bridge' };
    return {
      townExit: f.TOWN_EXITS.find((e) => e.zoneId === 'worldview') || null,
      spokes: f.WORLDVIEW_EXITS.filter((e) => e.zoneId !== 'town').map((e) => e.zoneId).sort(),
    };
  });
  if (marks.err || !marks.townExit) {
    rec.skip('the World View stars every open spoke for a field quest', marks.err || 'no markers');
  } else {
    await stand(F, marks.townExit.tx, marks.townExit.ty);
    await H.waitFor(F, (S) => S.currentZone, (z) => z === 'worldview',
      { timeout: 30000, label: 'reach the World View' }).catch(() => {});
    /* The travel echo can rewrite _quests from the server's copy, which never
       saw the turn-ins -- reassert the fixture on the far side. */
    await setQuests(F, { tut_1: 'turnedIn', tut_2: 'turnedIn', tut_3: 'turnedIn',
      tut_4: 'turnedIn', life_1: 'active' });
    await F.page.waitForTimeout(2500);
    const hub = await route(F);
    const zones = (hub && hub.routes || []).map((r) => r.zoneId).sort();
    console.log('    starred spokes: ' + JSON.stringify(zones));
    /* EQUALITY, not "more than one": the claim is every open spoke, and a
       ">1" test would pass just as happily on two of the four. */
    rec.ok('on the World View the fish quest stars EVERY open spoke',
      hub && hub.zone === 'worldview'
      && zones.length === marks.spokes.length
      && zones.join() === marks.spokes.join(), { zones, spokes: marks.spokes });
    rec.ok('...and never the arch back to town (no fishing holes in town)',
      zones.length > 0 && !zones.includes('town'), zones);

    /* ── STANDING IN THE FIELD: you are already there, so stop pointing ── */
    const spoke = zones[0];
    const dest = spoke ? await F.page.evaluate((z) => {
      const e = (window._gameFns.WORLDVIEW_EXITS || []).find((x) => x.zoneId === z);
      return e ? { tx: e.tx, ty: e.ty } : null;
    }, spoke) : null;
    if (dest) {
      await stand(F, dest.tx, dest.ty);
      await H.waitFor(F, (S) => S.currentZone, (z) => z === spoke,
        { timeout: 30000, label: 'reach ' + spoke }).catch(() => {});
      await setQuests(F, { tut_1: 'turnedIn', tut_2: 'turnedIn', tut_3: 'turnedIn',
        tut_4: 'turnedIn', life_1: 'active' });
      await F.page.waitForTimeout(2500);
      const inField = await route(F);
      rec.ok('standing IN a zone the fish quest stops starring travel (fish here)',
        !!inField && inField.zone === spoke && (inField.routes || []).length === 0, inField);
    }
  }
  await F.ctx.close().catch(() => {});
}
