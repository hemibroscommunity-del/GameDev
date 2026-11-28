/* ═══ v2.3.6860: THE GEAR -- SETTINGS FROM THE PLAY SCREEN (card MN step 1) ═══
 *
 * The owner's shortcut (docs/design/menus3/SPEC.md rule 1, "HUD ⚙ ->
 * Settings"; the card's "Decided" 3: top-right, as the wireframe draws it):
 * a round 44 x 44 button to the minimap's left, its foot 2 px past the map's
 * (where the land's plate begins, `foot`): level with the minimap's top it
 * sat on the weapon bar's level number (the character HUD's bar runs to the
 * minimap upright), and level with the plate's foot on the first lesson's
 * card, which docks under the minimap (QuestCoach.jsx).  Measured 390 x 844:
 * the bar ends at 110, the map's foot at 153, the gear 111..155, the card
 * from about 157.  A placing the
 * owner may change (card MN decided 3).
 * Step 1 opens TODAY's Settings hub in today's band (the router's road,
 * src/game/menus3Router.js: settingsHub); step 12 rebuilds it as the rail of
 * five.  The icon is drawn (SVG), never a text glyph.  Drawn by the world
 * map's overlay (WorldMapOverlay.jsx), which already keeps the minimap's box,
 * so it measures nothing of its own. */
import { SAY } from '@/data/say/menus3.js';
import { say } from '@/game/say.js';
import { menus3Go } from './menus3Wire.js';
import { swallowTapClick } from '@/ui/swallowTapClick.js';

const SIZE = 44, GAP = 8;

function GearIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" fillRule="evenodd"
        d="M10.3 2h3.4l.5 2.6a7.6 7.6 0 0 1 1.9 1.1l2.5-.9 1.7 2.9-2 1.7a7.7 7.7 0 0 1 0 2.2l2 1.7-1.7 2.9-2.5-.9a7.6 7.6 0 0 1-1.9 1.1l-.5 2.6h-3.4l-.5-2.6a7.6 7.6 0 0 1-1.9-1.1l-2.5.9-1.7-2.9 2-1.7a7.7 7.7 0 0 1 0-2.2l-2-1.7 1.7-2.9 2.5.9a7.6 7.6 0 0 1 1.9-1.1zM12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z" />
    </svg>
  );
}

export function Menus3Gear({ left, top, h, foot }) {
  const go = (e) => {
    e.stopPropagation();
    swallowTapClick(e);
    menus3Go('hud.gear');
  };
  return (
    <button type="button" aria-label={say(SAY, 'menus3.settings')} title={say(SAY, 'menus3.settings')} data-menus3-gear=""
      onPointerDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
      onPointerUp={go} onClick={(e) => { if (e.detail === 0) go(e); }}
      style={{ position: 'fixed', left: Math.round(left - SIZE - GAP), top: Math.round(Number(foot) > top + SIZE ? Number(foot) - SIZE + 2 : top + Math.max(SIZE, Number(h) || 0) - SIZE), width: SIZE, height: SIZE, zIndex: 45,
        borderRadius: '50%', border: '2px solid rgba(232,197,135,.9)', background: 'rgba(37,33,27,.82)', color: '#e7c587',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer', touchAction: 'manipulation' }}>
      <GearIcon />
    </button>
  );
}
