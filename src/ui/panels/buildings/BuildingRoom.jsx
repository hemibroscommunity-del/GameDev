import React from 'react';
import { roomIdFor, isBandRoom, roomUrl, ROOM_W, ROOM_H, keeperFor, keeperBox } from '@/data/buildingRooms.js';

/* ═══ v2.3.3143: THE ROOM YOU WALKED INTO ═══
 *
 * The owner's picture of the inside of a building (data/buildingRooms.js), at
 * the top of that building's window.  BroTown.jsx draws it once, first inside
 * the window card, for whichever building panel is open -- the panels under
 * this folder are not touched, so nothing here can collide with a panel's own
 * rework.
 *
 * HOW IT SITS.  The card has 20 px of padding and every panel bleeds its own
 * surface into it with `margin: -20` (game.css, ".bt-inspect-card ... LOAD-
 * BEARING padding").  The room does the same on its top and sides, with a
 * +20 px margin under it that cancels the panel's own -20 on top, so the
 * panel starts exactly where the picture ends.  game.css ".bt-room" has the
 * numbers and the one rule that squares the panel's top corners under it.
 *
 * THE SCENE.  The picture and anyone drawn into it (the Auction House's
 * clerk) live in one box that is always the whole room, 3:2.  The outer box
 * only CLIPS it: held to 30vh on a short phone (the floor is cut, never the
 * sign), and for the forge, whose window sits low so the smith is seen working
 * above it, a slim band (`data-shape="band"`) scrolled to the sign, the forge
 * and the anvil.  So a keeper's percentages are the room's, whatever is shown.
 *
 * ITS BOX IS RESERVED before the picture arrives (the dark of the panels' own
 * wells), so the window does not jump when it lands, and the picture fades in.
 * If it cannot be loaded the box goes away and the window reads exactly as it
 * did before the pictures: a missing room must never leave a tall empty slab
 * above the goods (the Auction House's v2.3.2627 rule, kept).
 */
export function BuildingRoom({ panel }) {
  const id = roomIdFor(panel);
  const [state, setState] = React.useState('loading');   /* loading | ready | failed */
  if (!id || state === 'failed') return null;
  const keeper = keeperFor(id);
  const box = keeper ? keeperBox(keeper) : null;
  return (
    <div className="bt-room" data-room={id} data-room-state={state} data-shape={isBandRoom(panel) ? 'band' : 'room'}>
      <div className="bt-room-scene">
        <img className="bt-room-img" src={roomUrl(id)} alt="" width={ROOM_W} height={ROOM_H} draggable={false}
          decoding="async"
          onLoad={() => setState('ready')}
          onError={() => setState('failed')} />
        {/* he comes in with the room, never alone over an empty box */}
        {keeper && state === 'ready' ? (
          <div className="bt-room-keeper" data-keeper={id}
            style={{
              left: box.left.toFixed(4) + '%', top: box.top.toFixed(4) + '%',
              width: box.width.toFixed(4) + '%', height: box.height.toFixed(4) + '%',
              backgroundImage: 'url(' + keeper.src + ')',
              backgroundSize: keeper.frames * 100 + '% 100%',   /* the frames side by side */
            }} />
        ) : null}
      </div>
    </div>
  );
}
