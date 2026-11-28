/* ═══ v2.3.6680: THE NEW DASHBOARD'S KIT (card UI2, the build's step 1) ═══
 * Every later screen of the new dashboard is built from these pieces, which
 * read only src/game/ui2Tokens.js (through ui2.css's generated block), so a
 * change of the look is a change in one place.  Each piece is drawn by code:
 * no picture for a surface, a button, a rim or a texture.  The page to SEE
 * them at the phone's real size: `?uikit=1` (UiKitPage.jsx). */
import './ui2.css';

export { Ui2Frame } from './Frame.jsx';
export { Ui2Header } from './Header.jsx';
export { Ui2Tile } from './Tile.jsx';
export { Ui2Group, Ui2Value, Ui2Stat } from './Group.jsx';
/* v2.3.6780 (card UI3-kit): the THREE WEIGHTS -- raised (Ui2Tile, the header's controls: a destination or an
   action only), the stat (Ui2Stat: sunk, a large number; `size="pill"` one line), facts (Ui2Facts, Ui2Fact: flat
   rows in one sunk container) -- and `?ui2look=0`, yesterday's look (ui2LookWas) */
export { Ui2Facts, Ui2Fact } from './Facts.jsx';
export { Ui2Action, Ui2ActionRow, Ui2Disabled } from './Action.jsx';
export { Ui2Slot } from './Slot.jsx';
export { Ui2Progress } from './Progress.jsx';
export { Ui2Badge } from './Badge.jsx';
export { Ui2Loading } from './Loading.jsx';
export { ui2RootClass, ui2LookWas, v17LookOn } from './shine.js';   /* v2.3.6841: v17LookOn, the V17 look (card UI4 PR 2) */
/* v2.3.6683 (card UI2-bro): a screen's pieces -- its zones, its row of actions, its empty state, its one confirmation */
export { Ui2Zones } from './Zones.jsx';
export { Ui2Actions } from './ActionRow.jsx';
export { Ui2Empty } from './EmptyState.jsx';
export { Ui2Confirm } from './Confirm.jsx';
export { Ui2TwoPanel } from './TwoPanel.jsx';   /* v2.3.6688: two panels side by side (card UI2-gear PR 2) */
export { Ui2ItemGrid, Ui2ItemCell } from './ItemGrid.jsx';   /* v2.3.6688: the one grid of item cells */
/* v2.3.6693 (card UI2-codex): the collection (its kinds, its illustrated cards) and the showcase (an entry large, its doors) */
export { Ui2Collection, Ui2CollectionCard } from './Collection.jsx';
export { Ui2Showcase } from './Showcase.jsx';
/* v2.3.6840 (card UI4 PR 1, the owner's V17:49): every piece is made with a ROLE (`intent`; the one table and
   the one mapping of yesterday's props: src/game/uiRoles.js), and the five pieces V17 names that the kit
   lacked, in today's look: the tab, the stepper, the stat you inspect, the comparison, the overlay */
export { Ui2Tabs, Ui2Tab } from './Tab.jsx';
export { Ui2Stepper } from './Stepper.jsx';
export { Ui2InspectStat } from './InspectStat.jsx';
export { Ui2Comparison } from './Comparison.jsx';
export { Ui2Overlay } from './Overlay.jsx';
export { Ui2LevelTile } from './LevelTile.jsx';   /* v2.3.6843: a weapon's door, its level, bar and points (card UI4 PR 4) */
export { Ui2Strip } from './Strip.jsx';   /* v2.3.6843: a quiet strip that pages by whole entries (card UI4 PR 4) */
