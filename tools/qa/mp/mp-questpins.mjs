/* THE QUEST PINS ON THE MAPS, ON A PHONE -- v2.3.3519.
 *
 * The owner: "Maybe mayor bro is the only quest available for the first quest
 * then after completing that other NPCs begin having quest icons appear above
 * their head", and "Make the quest icons appear on the minimap and map too"
 * (src/game/questPins.js, rendering/systems/wheelMinimap.js,
 * ui/WorldMapOverlay.jsx; the open town is the worker's: the tour suite).
 *
 *   1. A new character: the Mayor wears the gold "!" and nobody else does --
 *      over the heads and on the minimap.
 *   2. The Mayor's first quest in (the operator's /dev/tour, nothing paid):
 *      all six townsfolk wear the "!" at once, the Mayor none; the minimap's
 *      pins are those six, in the owner's pictures -- the ones the box holds
 *      where they stand, the rest on its edge toward them.
 *   3. A quest taken is the grey "?" on the minimap too, and once its items
 *      are in the bag the green check -- the head's three states, one for one.
 *   4. The world map: every pin at the whole Wheel's zoom, the key's "has a
 *      quest", and zoomed in on the town, each named under its pin.
 * Pictures: tools/qa/mp/out/questpins-*.png (the minimap, the world map
 * zoomed out and in).
 */
import * as H from './harness.mjs';

const TOWN = ['Farmer Bro', 'Blacksmith Bro', 'Woodworker Bro', 'Diego', 'Lil Bro', 'Beastmaster Bro'];
const shot = (P, name, clip) => P.page.screenshot({ path: `tools/qa/mp/out/questpins-${name}.png`, clip: clip || undefined }).catch(() => {});
const heads = (P) => H.readState(P, (S) => {
  const out = {};
  for (const n of (S.npcs || [])) if (n && n.name) out[n.name] = n._questMarker || null;
  return out;
});
const miniPins = (P) => P.page.evaluate(() => {
  const m = window.__btMinimap;
  return m && Array.isArray(m.questPins) ? m.questPins.map((q) => ({ name: q.name, state: q.state, art: q.art, edge: q.edge })) : null;
});
/* the Blacksmith's pin on the minimap (run in the page) */
const SMITH_PIN = () => {
    const m = window.__btMinimap;
    if (!m || !Array.isArray(m.questPins)) return null;
    const s = m.questPins.find((q) => q.name === 'Blacksmith Bro');
    return { smith: s ? s.state : null, n: m.questPins.length };
  };
const miniClip = (P) => P.page.evaluate(() => {
  const r = window.__btWheelMini;
  return r ? { x: Math.max(0, r.left - 6), y: Math.max(0, r.top - 6), width: r.w + 12, height: r.h + 12 } : null;
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Pinner', wsPort, webPort, world: 'wheel' });
  await H.enterWorld(P);
  const there = await H.waitFor(P, (S) => ({ z: S.currentZone, loading: !!S._zoneLoading, folk: (S.npcs || []).length }),
    (v) => v.z === 'wheel' && !v.loading && v.folk >= 7, { timeout: 120000, label: 'the Wheel\'s BroTown, its townsfolk standing' }).catch(() => null);
  rec.ok('in the Wheel\'s BroTown, the townsfolk standing', !!there, there);
  await P.page.waitForTimeout(1500);
  const myId = await H.readState(P, (S) => S.myId);

  /* ── 1. a new character: the Mayor alone ── */
  const h0 = await H.waitFor(P, (S) => {
    const m = (S.npcs || []).find((n) => n && n.name === 'Mayor Bro');
    return m ? m._questMarker || null : null;
  }, (v) => v === '❗', { timeout: 12000, label: 'the Mayor\'s pin' }).catch(() => null);
  const h0all = await heads(P);
  rec.ok('a new character: the Mayor wears the gold "!", nobody else does', h0 === '❗' && TOWN.every((n) => !h0all[n]), h0all);
  const m0 = await H.waitFor(P, () => {
    const m = window.__btMinimap;
    return m && Array.isArray(m.questPins) ? m.questPins.map((q) => q.name + ':' + q.state) : null;
  }, (v) => Array.isArray(v) && v.length >= 1, { timeout: 10000, label: 'the minimap\'s first pin' }).catch(() => null);
  rec.ok('...and on the minimap, his pin alone', Array.isArray(m0) && m0.join() === 'Mayor Bro:offer', m0);

  /* ── 2. the Mayor's first quest in: the whole town ── */
  const jumped = await H.devOp(wsPort, 'tour', myId, { at: 'farm_1' });
  rec.ok('the Mayor\'s first quest handed in (the operator\'s /dev/tour, nothing paid)', !!jumped && jumped.ok === true, jumped);
  const h1 = await H.waitFor(P, (S) => {
    const out = {};
    for (const n of (S.npcs || [])) if (n && n.name) out[n.name] = n._questMarker || null;
    return out;
  }, (v) => v && TOWN.every((n) => v[n] === '❗'), { timeout: 15000, label: 'the town\'s pins' }).catch(() => null);
  rec.ok('all six townsfolk wear the gold "!" at once', !!h1, h1 || await heads(P));
  rec.ok('...and the Mayor none (his snowmen wait for the whole town)', !!h1 && !h1['Mayor Bro'], h1);
  const m1 = await H.waitFor(P, () => {
    const m = window.__btMinimap;
    return m && Array.isArray(m.questPins) ? m.questPins.map((q) => ({ name: q.name, state: q.state, art: q.art, edge: q.edge })) : null;
  }, (v) => Array.isArray(v) && v.length === 6 && !v.some((q) => q.name === 'Mayor Bro'), { timeout: 10000, label: 'the minimap\'s pins' }).catch(() => null);
  rec.ok(`...on the minimap: all six "!", in the owner's picture (${m1 ? m1.filter((q) => q.edge).length : 0} of them on the box's edge, toward them)`,
    Array.isArray(m1) && m1.length === 6 && TOWN.every((n) => m1.some((q) => q.name === n && q.state === 'offer' && q.art)), m1);
  await shot(P, 'minimap-town', await miniClip(P));
  await shot(P, 'screen-town');

  /* ── 3. taken, then ready: the grey "?", then the green check ── */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'smith_1' } });
  });
  const waiting = await H.waitFor(P, SMITH_PIN, (v) => !!v && v.smith === 'waiting', { timeout: 12000, label: 'the smith\'s grey ?' })
    .catch(() => null);
  rec.ok('a quest taken: the Blacksmith\'s pin on the minimap is the grey "?"', !!waiting, waiting || await miniPins(P));
  await H.grant(wsPort, myId, 'item', { invKey: 'ore_copper_ore', count: 5 });
  const ready = await H.waitFor(P, SMITH_PIN, (v) => !!v && v.smith === 'ready', { timeout: 12000, label: 'the smith\'s check' })
    .catch(() => null);
  rec.ok('...and with the five ore in the bag, the green check', !!ready, ready || await miniPins(P));
  await shot(P, 'minimap-states', await miniClip(P));

  /* ── 4. the world map ── */
  await P.page.evaluate(() => { if (window.__btWorldMapOpen) window.__btWorldMapOpen(true); });
  const wide = await H.waitFor(P, () => {
    const m = window.__btWorldMap;
    return m && m.open && m.more && Array.isArray(m.more.pins) ? { pins: m.more.pins.map((q) => q.name + ':' + q.state), art: m.more.pins.every((q) => q.art) } : null;
  }, (v) => !!v && v.pins.length >= 6 && v.art, { timeout: 12000, label: 'the world map\'s pins' }).catch(() => null);
  rec.ok('the world map, the whole Wheel: every townsperson\'s pin, the "!"s and the smith\'s check, in the owner\'s pictures',
    !!wide && TOWN.filter((n) => n !== 'Blacksmith Bro').every((n) => wide.pins.includes(n + ':offer')) && wide.pins.includes('Blacksmith Bro:ready'), wide);
  rec.ok('...its key saying "has a quest"', await H.readState(P, () => !!document.querySelector('[data-world-map-key="pin"]')));
  await P.page.waitForTimeout(400);
  await shot(P, 'worldmap-wide');
  /* zoomed in on the town: each named under its pin */
  await P.page.evaluate(() => { const b = document.querySelector('[data-world-map-me]'); if (b) b.click(); });
  for (let i = 0; i < 14; i++) {
    const rel = await P.page.evaluate(() => (window.__btWorldMap && window.__btWorldMap.rel) || 0);
    if (rel >= 7) break;
    await P.page.evaluate(() => { const b = document.querySelector('[data-world-map-zoom-in]'); if (b) b.click(); });
    await P.page.waitForTimeout(250);
  }
  await P.page.evaluate(() => { const b = document.querySelector('[data-world-map-me]'); if (b) b.click(); });
  const close = await H.waitFor(P, () => {
    const m = window.__btWorldMap;
    return m && m.open && m.more ? { rel: m.rel, named: m.more.questPinNames, pins: (m.more.pins || []).length, big: (m.more.pins || []).every((q) => q.h >= 26) } : null;
  }, (v) => !!v && v.rel >= 6 && v.named >= 3, { timeout: 8000, label: 'the town up close' }).catch(() => null);
  rec.ok('zoomed in on the town: the pins grown, and each named under it (3 or more of them clear of the buildings\' names)',
    !!close && close.big && close.named >= 3, close);
  await P.page.waitForTimeout(400);
  await shot(P, 'worldmap-town');
  await P.page.evaluate(() => { if (window.__btWorldMapOpen) window.__btWorldMapOpen(false); });
  await P.page.waitForTimeout(500);
  await P.ctx.close().catch(() => {});
}
