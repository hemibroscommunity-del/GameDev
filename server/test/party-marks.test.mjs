/* ═══ v2.3.3272: YOUR PARTY ON THE MINIMAP AND THE WORLD MAP (src/game/partyMarks.js) ═══
 *
 *   1. partyIdsOf: your party's OTHER members from the worker's party_state,
 *      none when not in one (or the party is not open), never yourself, ids as
 *      strings;
 *   2. clampToBox: inside the box a mark stays put; outside, it rides the
 *      box's inner edge on the line from you to it, on every side and corner,
 *      and never past the edge;
 *   3. the maps use them: the minimap leaves your party out of the green bros
 *      and draws them in the party's blue (on the edge when off the box), its
 *      probe saying so; the world map draws them at every zoom (the bros only
 *      from AT.others), named, and its key says "party" while one shows; the
 *      dungeons' and the farm's small box draws them blue too.
 */
import { readFileSync } from 'node:fs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

const PM = await import('../../src/game/partyMarks.js');

/* ── 1. partyIdsOf ── */
{
  const S = { myId: 'me', _party: { state: 'open', members: [{ id: 'me' }, { id: 'a' }, { id: 'b' }, { id: 7 }] } };
  const ids = PM.partyIdsOf(S);
  check('1a your party\'s other members, yourself left out, ids as strings', ids instanceof Set && [...ids].join() === 'a,b,7', ids && [...ids]);
  check('1b not in a party: null', PM.partyIdsOf({ myId: 'me', _party: null }) === null && PM.partyIdsOf({ myId: 'me' }) === null && PM.partyIdsOf(null) === null);
  check('1c a party that is not open (an invite, ended): null', PM.partyIdsOf({ myId: 'me', _party: { state: 'none', members: [{ id: 'a' }] } }) === null);
  check('1d a party of you alone: null', PM.partyIdsOf({ myId: 'me', _party: { state: 'open', members: [{ id: 'me' }] } }) === null);
  check('1e a member with no id is skipped', [...(PM.partyIdsOf({ myId: 'me', _party: { state: 'open', members: [null, {}, { id: 'a' }] } }) || [])].join() === 'a');
  check('1f the colours: the UI\'s Info blue, a light rim; a member on the edge smaller than one in the box',
    PM.PARTY_MARK.CSS === '#5D93D2' && PM.PARTY_MARK.COLOR === 0x5d93d2 && PM.PARTY_MARK.EDGE_PX < PM.PARTY_MARK.PX);
}

/* ── 2. clampToBox ── */
{
  const lo = 16, hi = 116, hiY = 83, px = 66, py = 50;
  const inside = PM.clampToBox(px, py, 90, 60, lo, hi, hiY);
  check('2a inside the box: where it is, not on the edge', !inside.edge && inside.x === 90 && inside.y === 60, inside);
  const east = PM.clampToBox(px, py, 400, 50, lo, hi, hiY);
  check('2b far east: on the east edge, level with you', east.edge && Math.abs(east.x - hi) < 1e-9 && Math.abs(east.y - 50) < 1e-9, east);
  const west = PM.clampToBox(px, py, -300, 50, lo, hi, hiY);
  const north = PM.clampToBox(px, py, 66, -500, lo, hi, hiY);
  const south = PM.clampToBox(px, py, 66, 900, lo, hi, hiY);
  check('2c west, north and south: each on its own edge', west.edge && Math.abs(west.x - lo) < 1e-9 && north.edge && Math.abs(north.y - lo) < 1e-9 && south.edge && Math.abs(south.y - hiY) < 1e-9, { west, north, south });
  const ne = PM.clampToBox(px, py, 1000, -1000, lo, hi, hiY);
  const onLine = Math.abs((ne.y - py) * (1000 - px) - (ne.x - px) * (-1000 - py)) < 1e-6;
  check('2d a corner: on the line from you to them, inside the box', ne.edge && onLine && ne.x <= hi + 1e-9 && ne.y >= lo - 1e-9, ne);
  let bad = 0;
  for (let i = 0; i < 2000; i++) {
    const a = (i / 2000) * Math.PI * 2, d = 20 + (i % 37) * 40;
    const c = PM.clampToBox(px, py, px + Math.cos(a) * d, py + Math.sin(a) * d, lo, hi, hiY);
    if (c.x < lo - 1e-6 || c.x > hi + 1e-6 || c.y < lo - 1e-6 || c.y > hiY + 1e-6) bad++;
  }
  check('2e 2,000 marks round you: never past the box\'s edge', bad === 0, bad);
}

/* ── 3. the maps use them ── */
{
  const mm = readFileSync(new URL('../../src/rendering/systems/wheelMinimap.js', import.meta.url), 'utf8');
  check('3a the minimap leaves your party out of the green bros', /if \(party && party\.has\(id\)\) continue;[\s\S]{0,200}C_OTHER, 13\)/.test(mm));
  check('3b ...draws them in the party\'s blue, clamped to the box\'s edge, and its probe says where', /clampToBox\(pbx, pby/.test(mm) && /'player', PARTY_MARK\.COLOR, px\)/.test(mm) && /party: partyMarks,/.test(mm));
  check('3c ...over the monsters (drawn after them)', mm.indexOf("'monster', C_MONSTER, 12)") < mm.indexOf("'player', PARTY_MARK.COLOR, px)"));
  const wm = readFileSync(new URL('../../src/ui/WorldMapOverlay.jsx', import.meta.url), 'utf8');
  const partyAt = wm.indexOf('const partyAt = [];');
  const gate = wm.slice(partyAt, wm.indexOf('/* the quest\'s way', partyAt));
  check('3d the world map draws your party at every zoom (no AT gate), in the party\'s blue', partyAt > 0 && !/AT\./.test(gate) && /PARTY_MARK\.CSS/.test(gate), gate.slice(0, 200));
  check('3e ...leaves them out of the bros, names them, and its key says "party" while one shows',
    /if \(party && party\.has\(id\)\) continue;/.test(wm) && /more\.partyNames\+\+/.test(wm) && /partyShown \? <Key shape="dot" color=\{PARTY_MARK\.CSS\}>party<\/Key>/.test(wm));
  check('3f ...a party member\'s name sits clear of its own mark\'s room (a label\'s box starts 2 px above its top)',
    /placed\.push\(\[o\.x - 9, o\.y - 9, o\.x \+ 9, o\.y \+ 9\]\);\s*if \(o\.name && label\(o\.x, o\.y \+ 1[1-9],/.test(wm));
  const old = readFileSync(new URL('../../src/rendering/systems/minimapRenderer.js', import.meta.url), 'utf8');
  check('3g the dungeons\' and the farm\'s box: your party out of the green bros, then drawn in its blue over the monsters',
    /if \(party && party\.has\(id\)\) continue;[\s\S]{0,200}C_OTHER, ICON_PX, 0\)/.test(old)
    && old.indexOf("'monster', C_MONSTER, ICON_PX, 0)") < old.indexOf("'player', PARTY_MARK.COLOR, ICON_PX, 0)"));
  check('3h ...ringed in the light rim, as on the Wheel\'s box (its townsfolk are a blue of their own)',
    /this\.partyRims = new Graphics\(\);\s*this\.pan\.addChild\(this\.partyRims\);/.test(old) && /color: PARTY_MARK\.RIM/.test(old) && /color: PARTY_MARK\.RIM/.test(mm));
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
