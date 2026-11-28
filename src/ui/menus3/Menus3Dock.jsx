/* ═══ v2.3.6860: THE DOCK -- BRO, WORLD, PEOPLE (card MN step 1) ═══
 *
 * The owner's three menus on the band's resting row, where yesterday's Gear
 * and Menu buttons sat (dash/DashHeader.jsx draws this instead of them under
 * `?menus3`).  Each always opens its first section (the router,
 * src/game/menus3Router.js): Bro the Bag, World the Quests, People the Roster
 * -- today's screens in today's band until their steps rebuild them.  The
 * Menu's eight doors stay one press away inside the band (Gear's root, "Menu
 * ›"), so nothing a player could reach yesterday is lost.
 *
 * SIDEWAYS (the card's "Decided" 2: never under the stick or the Attack
 * cluster).  The row is the band's folded row under the world; the stick's
 * disc stands over its left end and the Attack cluster over its right, so the
 * three buttons sit COMPACT IN THE MIDDLE of the row, 96 px each, with the
 * two corners left empty for the thumbs.  The owner's to change (the preview
 * shows it).  Upright and on a computer they share the row's width, as the
 * wireframe's dock does.
 *
 * Keys: Bro wears I and World J (the band's own keys today, deskKeys.js
 * NAV_KEYS); People none: the owner's R is Whirlwind's (a flag, not a change). */
import { Ui2Tile } from '@/ui/kit/Tile.jsx';
import { NAV_KEYS } from '@/game/deskKeys.js';
import { SAY } from '@/data/say/menus3.js';
import { say } from '@/game/say.js';
import { menus3Go } from './menus3Wire.js';
import { bandSideways } from '@/ui/mobile/bandSideways.js';

const DOCK = [
  { id: 'bro', entry: 'dock.bro', key: NAV_KEYS.dashboard, word: () => say(SAY, 'menus3.bro'), aria: () => say(SAY, 'menus3.broAria') },
  { id: 'world', entry: 'dock.world', key: NAV_KEYS.quests, word: () => say(SAY, 'menus3.world'), aria: () => say(SAY, 'menus3.worldAria') },
  { id: 'people', entry: 'dock.people', key: undefined, word: () => say(SAY, 'menus3.people'), aria: () => say(SAY, 'menus3.peopleAria') },
];

/* `tap` is the band header's own press (DashHeader.jsx frameTap), handed in so
   the two files do not import each other */
/* v2.3.6870 (card MN step 11): `people` People's dot (menus3People.js chatPeopleDot: a friend's message, the news) */
export function Menus3Dock({ mark, tap, people }) {
  const side = bandSideways();
  const m = mark || {};
  const peopleLit = !!people;
  return (
    <div data-menus3-dockrow={side ? 'side' : 'row'}
      style={{ display: 'flex', gap: 8, width: '100%', alignItems: 'center', justifyContent: side ? 'center' : 'stretch' }}>
      {DOCK.map((d) => (
        <Ui2Tile key={d.id} intent="go" size="primary" label={d.word()} aria-label={d.aria()}
          data-menus3-dock={d.id} data-key={d.key}
          /* the Menu's marks (points, a ready quest, requests) ride Bro until
             each section's own dot arrives (decided 7) */
          badge={d.id === 'bro' ? m.count : undefined} dot={d.id === 'bro' ? m.dot : d.id === 'people' ? peopleLit || undefined : undefined}
          data-menus3-dock-dot={d.id === 'people' && peopleLit ? 'chat' : undefined} glow={d.id === 'bro' ? m.glow : undefined}
          style={side ? { flex: '0 0 96px', height: 44 } : { flex: '1 1 0', height: 44 }}
          {...tap(() => menus3Go(d.entry))} />
      ))}
    </div>
  );
}
