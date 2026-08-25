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
  return m ? { route: m.questRoute, zone: m.zone } : null;
});

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
}
