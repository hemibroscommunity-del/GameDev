/* ═══ v2.3.3899: THE TOWN BOARD IS ON THE NOTICEBOARD ═══
 *
 * The owner, 2026-11-02: "Remove the town hall menu for now. It's too
 * confusing when trying to turn in mayor bro quests. It keeps popping up and
 * it'll confuse players. You can move the menu to the sign post to the left of
 * the town hall near the 3 street lamps."
 *
 * That post is the square's `noticeboard` (the "Bragging board" of the object
 * catalog, public/tools/objects/catalog.js: a wooden board on two posts), in
 * the square's north-west corner beside the lamps on its west side
 * (public/tools/world/core/placing.js).  The four signposts stand at the town's
 * gates, not there.  This reverses two of the owner's earlier choices -- the
 * Mayor as the hall's keeper (v2.3.3258) and the board opening as you enter
 * the hall (v2.3.3766) -- his new words win: the Town Hall's door and the
 * Mayor no longer open the board (data/wheelBuildingDoors.js), and the board
 * opens here.
 *
 * Found AT RUNTIME by its kind in the worker's placed objects (as
 * rendering/wheelSignposts.js finds the signposts), the one nearest the Town
 * Hall's door -- never a Wheel coordinate in code (CLAUDE.md §1).  It is a
 * DOOR to BroTown.jsx: noticeboardAt() answers like wheelTownDoorAt(), a
 * pseudo-door whose `hall` is the Town Hall's ('townhall', the panel the board
 * has always been drawn in: WheelHallPanel -> TownBoard), so the Enter
 * prompt, E, the right stick's tap and enterBuilding all just work.  A TAP on
 * its picture opens it too (noticeboardAtCss, BroTown's tapNpcAtCss).
 * Client only: nothing is re-baked and the worker is not touched.
 */
import { WHEEL_DOOR_REACH } from '@/data/wheelBuildingDoors.js';
import { wheelObjectsInfo } from './wheelTrial.js';
import { isWheelTrialZone } from './worldTrial.js';
import { wheelTownDoors } from './wheelTownDoors.js';
import { playerGroundDy } from '@/rendering/systems/entityRenderer.js';

/** The hall the board is drawn in (buildingPanel 'townhall'). */
export const BOARD_HALL = 'townhall';
/* the noticeboard counted is within this of the Town Hall's door, game px (it
   stands ~600 from it on the long Wheel; a far one elsewhere is not the town's) */
const NEAR_HALL = 2000;
/* its picture, for a tap: game px either side of its foot, and above / below
   it (the catalog's 150 px board on two posts, a little to spare) */
const TAP_HALF_W = 72, TAP_TOP = 170, TAP_FOOT = 18;
/* a tap from further than this is answered "Too far away!", as a
   townsperson's (BroTown NPC_TAP_REACH) */
export const BOARD_TAP_REACH = 300;

let _src = null, _doors = null, _board = null;

/** The square's noticeboard as a door: { id: 'noticeboard', name, label,
 *  verb, x, y, index: -1, hall: 'townhall', closed: false, board: true }, or
 *  null before the worker has posted its objects (or with `?noobjects`). */
export function wheelNoticeboard() {
  const objects = wheelObjectsInfo();
  const doors = wheelTownDoors();
  if (objects === _src && doors === _doors) return _board;
  _src = objects; _doors = doors; _board = null;
  if (!objects || !objects.kinds || !objects.n) return null;
  const k = objects.kinds.indexOf('noticeboard');
  const hall = doors.find((d) => d && d.id === BOARD_HALL);
  if (k < 0 || !hall) return null;
  let best = -1, bd = NEAR_HALL * NEAR_HALL;
  for (let i = 0; i < objects.n; i++) {
    if (objects.kind[i] !== k) continue;
    const dx = objects.x[i] - hall.x, dy = objects.y[i] - hall.y, d2 = dx * dx + dy * dy;
    if (d2 < bd) { bd = d2; best = i; }
  }
  if (best < 0) return null;
  _board = { id: 'noticeboard', name: 'Town Board', label: 'THE TOWN BOARD', verb: 'Read',
    x: objects.x[best], y: objects.y[best], index: -1, hall: BOARD_HALL, closed: false, board: true };
  return _board;
}

/** The noticeboard when your boots stand within WHEEL_DOOR_REACH of its foot
 *  in the Wheel, else null (BroTown's proximity scan, after the doors). */
export function noticeboardAt(S) {
  if (!S || !S.player || !isWheelTrialZone(S.currentZone)) return null;
  const b = wheelNoticeboard();
  if (!b) return null;
  const P = S.player;
  const by = P.y + playerGroundDy(S.currentZone, P.x, P.y);
  const dx = b.x - P.x, dy = b.y - by;
  return dx * dx + dy * dy <= WHEEL_DOOR_REACH * WHEEL_DOOR_REACH ? b : null;
}

/** The noticeboard when (cssX, cssY), canvas CSS px, is on its picture, else
 *  null -- the same screen sums as BroTown's npcAtCss.  `far` says your body
 *  is past BOARD_TAP_REACH from its foot. */
export function noticeboardAtCss(S, cssX, cssY) {
  if (!S || !S.camera || !S.player || !isWheelTrialZone(S.currentZone)) return null;
  const b = wheelNoticeboard();
  if (!b) return null;
  const sx = S._worldScaleX || 1, sy = S._worldScaleY || 1;
  const gx = cssX / sx + S.camera.x, gy = cssY / sy + S.camera.y;
  if (Math.abs(gx - b.x) > TAP_HALF_W || gy < b.y - TAP_TOP || gy > b.y + TAP_FOOT) return null;
  const far = Math.hypot(b.x - S.player.x, b.y - S.player.y) > BOARD_TAP_REACH;
  return { board: b, far };
}

/* QA (mp-townboard): where the noticeboard is, whether you stand at it, and
   where on the canvas to tap it -- read-only */
if (typeof window !== 'undefined') {
  window.__btNoticeboard = {
    where: () => { const b = wheelNoticeboard(); return b ? { x: b.x, y: b.y } : null; },
    at: () => { const S = window._gameState && window._gameState.current; return !!noticeboardAt(S); },
    /* canvas CSS px of the middle of its picture, or null */
    tapPoint: () => {
      const S = window._gameState && window._gameState.current;
      const b = wheelNoticeboard();
      if (!S || !S.camera || !b) return null;
      const sx = S._worldScaleX || 1, sy = S._worldScaleY || 1;
      return { x: (b.x - S.camera.x) * sx, y: (b.y - 80 - S.camera.y) * sy };
    },
  };
}
