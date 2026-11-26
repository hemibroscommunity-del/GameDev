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
export { Ui2Action, Ui2ActionRow, Ui2Disabled } from './Action.jsx';
export { Ui2Slot } from './Slot.jsx';
export { Ui2Progress } from './Progress.jsx';
export { Ui2Badge } from './Badge.jsx';
export { Ui2Loading } from './Loading.jsx';
export { ui2RootClass } from './shine.js';
/* v2.3.6683 (card UI2-bro): a screen's pieces -- its zones, its row of actions, its empty state, its one confirmation */
export { Ui2Zones } from './Zones.jsx';
export { Ui2Actions } from './ActionRow.jsx';
export { Ui2Empty } from './EmptyState.jsx';
export { Ui2Confirm } from './Confirm.jsx';
