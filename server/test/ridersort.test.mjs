/* A building's moving pieces sort with the building (v2.3.2816).
 *
 * worldLife draws a building's swinging signs, flags and smoke in a RIDER: a
 * container in the building's own layer that names its host (`_ridesOn`) and
 * carries the host's `_propGround`.  The depth pass (src/rendering/depthSort.js)
 * must then
 *   1. put the rider on the same side of the player as its building, and
 *   2. key it a quarter step after the building -- after the building and
 *      anything on its row, but UNDER a figure the pass raises over that
 *      building (+0.5) and under anything a row further south.
 * At +1 (the old overlay rule, TRAPS §104) a figure standing beside the
 * auction house's left wall -- raised over the building -- had the scales that
 * hang on that wall drawn across it (TRAPS §115).  A screenshot of the
 * building alone cannot show that; this pins the keys the sort uses.
 *
 * The pass is pure data on containers (children, parent, y, zIndex), so plain
 * objects stand in for Pixi's here.
 */
import { applyDepthBuckets, applyGroundSort } from '../../src/rendering/depthSort.js';

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); }
}

function layer(label) {
  const L = { label, children: [] };
  L.addChild = (c) => {
    if (c.parent) { const i = c.parent.children.indexOf(c); if (i >= 0) c.parent.children.splice(i, 1); }
    L.children.push(c); c.parent = L; return c;
  };
  return L;
}

/* An auction-house-like building: base (front step) at y 800, art 500 wide
   and 500 tall centred on x 1000, footprint x 780..1220.  Its left edge
   columns meet the ground 100 px north of the front step -- the isometric
   diamond propGround reads off the art. */
function building(y) {
  const W = 50;
  const bottoms = new Array(W);
  for (let c = 0; c < W; c++) {
    const u = (c + 0.5) / W;
    bottoms[c] = 1 - 0.2 * Math.abs(u - 0.5) * 2;   /* 1.0 in the middle, 0.8 at each edge */
  }
  const g = { id: 'auction-house', base: y, x: 1000, sx: 1, sy: 1, fw: 500, fh: 500,
    fp: { x0: 780, x1: 1220, y0: y - 220, y1: y }, bottoms, tried: true, halfW: 250 };
  const host = { label: 'prop_auction-house', x: 1000, y, visible: true, _propGround: g };
  const rider = { label: 'life_auction-house', x: 1000, y: y + 1, visible: true, _propGround: g, _ridesOn: host };
  return { g, host, rider };
}

function scene(playerY, playerX) {
  const back = layer('entities'), front = layer('gatherNodesFront');
  const { g, host, rider } = building(800);
  back.addChild(host);
  back.addChild(rider);
  /* a peer at the left corner: feet north of the front step, south of the
     wall beside them -- the case the raise exists for */
  const peer = { label: 'other_p', x: 770, y: 750, visible: true };
  back.addChild(peer);
  /* a figure a row south of the front step, beside the building */
  const south = { label: 'npc_s', x: 1000, y: 801.4, visible: true };
  back.addChild(south);
  applyDepthBuckets(back, front, playerY, playerX);
  return { back, front, g, host, rider, peer, south };
}

console.log('ridersort: a building\'s pieces sort with the building');

/* the player well north: the building is in front of him */
{
  const s = scene(400, 1000);
  ok('player north of the building: the building is in the front layer', s.host.parent === s.front);
  ok('...and its rider with it', s.rider.parent === s.host.parent);
  ok('the rider keys a quarter step after its building', s.rider.zIndex === s.host.zIndex + 0.25, { host: s.host.zIndex, rider: s.rider.zIndex });
  ok('the peer beside the left wall is raised over the building', s.peer._raiseTo != null && s.peer.zIndex > s.host.zIndex, { z: s.peer.zIndex });
  ok('...and over the building\'s pieces: the scales on that wall draw BEHIND the peer', s.peer.zIndex > s.rider.zIndex, { peer: s.peer.zIndex, rider: s.rider.zIndex });
  ok('a figure a row south of the front step draws over the pieces too', s.south.parent === s.rider.parent && s.south.zIndex > s.rider.zIndex, { south: s.south.zIndex, rider: s.rider.zIndex });
}

/* the player well south: the building is behind him */
{
  const s = scene(1200, 1000);
  ok('player south of the building: the building is in the back layer', s.host.parent === s.back);
  ok('...and its rider with it', s.rider.parent === s.host.parent);
  ok('the rider keys a quarter step after its building here too', s.rider.zIndex === s.host.zIndex + 0.25);
  ok('the raised peer still draws over the pieces', s.peer.zIndex > s.rider.zIndex, { peer: s.peer.zIndex, rider: s.rider.zIndex });
}

/* the player standing beside the building's left wall, in front of it:
   the bucket is read at HIS x, and the rider must follow the building */
{
  const s = scene(760, 770);
  ok('player at the left corner, in front of the wall: the building is behind him', s.host.parent === s.back);
  ok('...and so are its pieces', s.rider.parent === s.host.parent);
}

/* fallbacks: a rider whose host is gone, or in the other layer this frame,
   keys on its own ground line (+1 -- still just after where the host stood) */
{
  const back = layer('entities');
  const { host, rider } = building(800);
  back.addChild(host); back.addChild(rider);
  host.destroyed = true;
  applyGroundSort(back);
  ok('a rider whose host was destroyed keys on its own ground line', rider.zIndex === 801, { z: rider.zIndex });
  const other = layer('gatherNodesFront');
  const b2 = building(800);
  back.addChild(b2.rider); other.addChild(b2.host);
  applyGroundSort(back);
  ok('a rider whose host is in another layer keys on its own ground line', b2.rider.zIndex === 801, { z: b2.rider.zIndex });
}

/* a fractional host line: the quarter step is on the host's ROUNDED key, so
   rounding cannot put the rider level with or above a raised figure */
{
  const back = layer('entities'), front = layer('gatherNodesFront');
  const { host, rider } = building(800.49);
  back.addChild(host); back.addChild(rider);
  const peer = { label: 'other_q', x: 770, y: 750, visible: true };
  back.addChild(peer);
  applyDepthBuckets(back, front, 400, 1000);
  ok('fractional base: rider = round(base) + 0.25', rider.zIndex === Math.round(800.49) + 0.25, { z: rider.zIndex });
  ok('fractional base: the raised peer still draws over the pieces', peer.zIndex > rider.zIndex, { peer: peer.zIndex, rider: rider.zIndex });
}

console.log(`\nridersort: ${pass + fail} assertions, ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
