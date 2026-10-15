import React from 'react';
import { roomIdFor, isBandRoom, roomUrl, ROOM_W, ROOM_H, keeperFor, keeperBox } from '@/data/buildingRooms.js';

/* ═══ v2.3.3258: THE ROOM BEHIND THE MENU ═══
 *
 * The owner's picture of the inside of a building (data/buildingRooms.js) is
 * the BACKGROUND of that building's window, and the menu is a sheet laid over
 * it -- the owner, choosing the shopkeeper outside over walking in: "Have it
 * open up as backgrounds behind the different buildings menus instead of
 * literally going into a building".  BroTown.jsx draws it once, first inside
 * the window card, for whichever building panel is open -- the panels under
 * this folder are not touched, so nothing here can collide with a panel's own
 * rework.
 *
 * HOW IT SITS (game.css ".bt-room").  A zero-height sticky box at the top of
 * the card, behind everything in it (z-index -1), holding the whole room at
 * the card's width.  The panel after it -- whichever building -- starts a
 * STAGE down the picture (its sign and the middle of the room) and covers the
 * rest like a sheet laid on it; scrolled, the sheet slides up over the room,
 * which stays where it is.  The card's 20 px padding is load-bearing (every
 * panel bleeds into it with `margin: -20`), so the stage is the sheet's own
 * margin-top, set by one rule for every panel.
 *
 * THE SCENE.  The picture and anyone drawn into it (the Auction House's
 * clerk) live in one box that is always the whole room, 3:2, so a keeper's
 * percentages are the room's, whatever the sheet covers.  The forge's window
 * sits low so the smith is seen working above it: its stage is a slim band
 * (`data-shape="band"`), the scene pulled up to its sign, fire and anvil.
 *
 * ITS BOX IS RESERVED before the picture arrives (the dark of the panels' own
 * wells), so the window does not jump when it lands, and the picture fades in.
 * If it cannot be loaded the box goes away -- and with it the stage -- and the
 * window reads exactly as it did before the pictures: a missing room must
 * never leave an empty slab above the goods (the Auction House's v2.3.2627
 * rule, kept).
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
