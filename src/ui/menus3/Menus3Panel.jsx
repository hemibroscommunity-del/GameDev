/* ═══ v2.3.6860: THE NEW MENUS' PANEL -- THE CONTAINER (card MN step 1) ═══
 *
 * The one box every rebuilt menu and counter will open in (the card's
 * "Decided" 1): upright a sheet above the dock, 48% of the screen held to
 * 318..410 px; sideways and on a computer a drawer on the right, 40% wide,
 * from the top to the dock.  Its shape and its numbers are the rule's
 * (src/game/menus3Panel.js, drawn as CSS: nothing measures the page); its
 * header holds the menu's three sections and the X (44 x 44, `data-esc`: Esc
 * presses it, as every window's); a swipe down on the header, a tap on the
 * world and a hit outside a safe place close it (menus3Wire.js).
 *
 * Step 1 fills no section, so nothing a player presses opens it: the router
 * sends every entry to today's screen (src/game/menus3Router.js `built`).
 * Only the QA probe opens it (`__btMenus3.panel('bro')`), so its shape and
 * its closes are tested before step 4 puts the Bag in it.  Nothing is drawn
 * while it is shut. */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { menus3Bus, menus3Close, menus3ShapeNow } from './menus3Wire.js';
import { panelCss } from '@/game/menus3Panel.js';
import { MENUS3 } from '@/game/menus3Router.js';
import { SAY } from '@/data/say/menus3.js';
import { say } from '@/game/say.js';
import { frameTap } from '@/ui/mobile/dash/DashHeader.jsx';
import { ui2RootClass } from '@/ui/kit/shine.js';

const BOX = { position: 'absolute', display: 'flex', flexDirection: 'column', pointerEvents: 'auto', touchAction: 'manipulation',
  background: 'var(--ui2-page, #193145)', borderTop: '2px solid var(--ui2-edge, #b89b63)', boxShadow: '0 -5px 16px rgba(0,0,0,.45)' };
const HEAD = { display: 'flex', alignItems: 'center', gap: 4, minHeight: 48, padding: '2px 4px', flex: '0 0 auto', touchAction: 'manipulation' };
const TAB = { flex: '1 1 0', minHeight: 44, minWidth: 44 };
const X = { flex: '0 0 44px', width: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' };

/* the words, each key written out (the say guard reads them) */
function menuWord(m) {
  return m === 'world' ? say(SAY, 'menus3.world') : m === 'people' ? say(SAY, 'menus3.people') : say(SAY, 'menus3.bro');
}
const SECTION_WORD = {
  bag: () => say(SAY, 'menus3.bag'), power: () => say(SAY, 'menus3.power'), skills: () => say(SAY, 'menus3.skills'),
  quests: () => say(SAY, 'menus3.quests'), codex: () => say(SAY, 'menus3.codex'), feats: () => say(SAY, 'menus3.feats'),
  roster: () => say(SAY, 'menus3.roster'), chat: () => say(SAY, 'menus3.chat'), ranks: () => say(SAY, 'menus3.ranks'),
};
function sectionWord(s) { return Object.prototype.hasOwnProperty.call(SECTION_WORD, s) ? SECTION_WORD[s]() : ''; }

/* the X, drawn (CLAUDE.md: no text glyph) */
function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M3 3 L15 15 M15 3 L3 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Menus3Panel() {
  const [st, setSt] = useState(menus3Bus.state);
  useEffect(() => menus3Bus.subscribe(setSt), []);
  if (!st.open || typeof document === 'undefined') return null;
  const shape = menus3ShapeNow();
  const box = Object.assign({}, BOX, panelCss(shape));
  if (shape === 'drawer') { box.borderTop = 'none'; box.borderLeft = BOX.borderTop; }
  const sections = MENUS3[st.menu] || [];
  return createPortal(
    <div className="bt-menus3-layer" data-menus3-layer="">
      <section className={ui2RootClass()} style={box} data-menus3-panel={shape} data-menus3-menu={st.menu} role="dialog" aria-label={menuWord(st.menu)}>
        <div style={HEAD} data-menus3-head="">
          {sections.map((s) => (
            <button key={s} type="button" className={'u2-raised u2-ctl' + (s === st.section ? ' is-selected' : '')} style={TAB}
              data-menus3-tab={s} aria-pressed={s === st.section} {...frameTap(() => menus3Bus.section(s))}>
              {sectionWord(s)}
            </button>
          ))}
          <button type="button" className="u2-raised u2-ctl is-round" style={X} data-menus3-x="" data-esc=""
            aria-label={say(SAY, 'menus3.close')} {...frameTap(() => menus3Close('x'))}>
            <XIcon />
          </button>
        </div>
        <div style={{ flex: '1 1 auto', overflow: 'auto' }} data-menus3-body={st.section || ''} />
      </section>
    </div>,
    document.body,
  );
}
