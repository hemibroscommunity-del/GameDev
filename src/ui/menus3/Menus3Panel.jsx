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
 * Step 1 filled no section; v2.3.6861 (card MN step 4) puts the Bag in it
 * (menus3/Menus3Bag.jsx): the Bro button opens it, always on the Bag.  A
 * page opened inside it (an item, a slot, a pet) puts a one-level Back in
 * the header where the tabs were (src/game/menus3Nav.js: its history, the
 * rail and the scroll of the page under it given back).  Power and Skills
 * still open today's screens (menus3Wire.js menus3Bus.section).  Nothing is
 * drawn while it is shut. */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { menus3Bus, menus3Close, menus3ShapeNow } from './menus3Wire.js';
import { panelCss } from '@/game/menus3Panel.js';
import { MENUS3 } from '@/game/menus3Router.js';
import { SAY } from '@/data/say/menus3.js';
import { say } from '@/game/say.js';
import { frameTap } from '@/ui/mobile/dash/DashHeader.jsx';
import { ui2RootClass } from '@/ui/kit/shine.js';
import { navCanBack, navTop } from '@/game/menus3Nav.js';   /* v2.3.6861 */
import { beforeDraw } from '@/game/framePacer.js';
import { gearCell } from '@/ui/mobile/dash/itemCategory.js';
import { Menus3Bag } from './Menus3Bag.jsx';
import { Menus3Power, powerDot } from './Menus3Power.jsx';   /* v2.3.6862: Bro · Power (card MN step 5) */
import { Menus3Quests } from './Menus3Quests.jsx';   /* v2.3.6863 (card MN step 7) */
import { SAY as SAY_Q } from '@/data/say/menus3Quests.js';
import { Menus3Roster, Menus3Player, menus3PlayerTitle } from './Menus3Roster.jsx';   /* v2.3.6864 (card MN step 10) */
import { lazyPanel } from '@/ui/lazyPanel.js';   /* v2.3.6870 (card MN step 11): People · Chat and Ranks, loaded when first opened */
import { chatPeopleDot, chatPageTitle } from './menus3People.js';
import './menus3.css';

const Menus3Chat = lazyPanel(() => import('./Menus3Chat.jsx'), 'Menus3Chat');
const Menus3Ranks = lazyPanel(() => import('./Menus3Ranks.jsx'), 'Menus3Ranks');

const BOX = { position: 'absolute', display: 'flex', flexDirection: 'column', pointerEvents: 'auto', touchAction: 'manipulation',
  background: 'var(--ui2-page, #193145)', borderTop: '2px solid var(--ui2-edge, #b89b63)', boxShadow: '0 -5px 16px rgba(0,0,0,.45)' };
const HEAD = { display: 'flex', alignItems: 'center', gap: 4, minHeight: 48, padding: '2px 4px', flex: '0 0 auto', touchAction: 'manipulation' };
const TAB = { flex: '1 1 0', minHeight: 44, minWidth: 44 };
const BACK = { flex: '0 0 auto', minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', gap: 4, padding: '0 10px' };
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

/* the Back, drawn */
function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M9 2 L4 7 L9 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
/* a page's title in the header (the item's own name is on its page) */
function pageTitle(top, getS) {
  if (!top) return '';
  if (top.page === 'player') return menus3PlayerTitle(getS, top.arg);   /* v2.3.6864: the player's name, from any section */
  if (top.page === 'dm' || top.page === 'whisper') return chatPageTitle(top, getS);   /* v2.3.6870: a friend's thread, a Message's whisper */
  if (top.page === 'slot') { const c = gearCell(top.arg); return c ? c.label : ''; }
  if (top.section === 'quests' && top.page === 'quest') return say(SAY_Q, 'menus3Quests.quest');   /* v2.3.6863 */
  if (top.section === 'quests' && top.page === 'rewards') return say(SAY_Q, 'menus3Quests.rewards');
  return sectionWord(top.section);
}

/* the page's scroll, read at the top of the next frame (docs/specs/layout-reads.md way 3), once a frame */
let _scrollAsk = false;
let _bodyEl = null;
function keepScroll() {
  if (_scrollAsk) return;
  _scrollAsk = true;
  beforeDraw(() => { _scrollAsk = false; if (_bodyEl) menus3Bus.keep({ scroll: _bodyEl.scrollTop }); });
}

export function Menus3Panel({ rpgState, stateRef }) {
  const [st, setSt] = useState(menus3Bus.state);
  useEffect(() => menus3Bus.subscribe(setSt), []);
  const bodyRef = useRef(null);
  const top = st.nav ? navTop(st.nav) : null;
  const pageKey = top ? top.page + '|' + (top.arg || '') + '|' + st.nav.length : '';
  /* v2.3.6861: a page's scroll given back (Back), at the top of a frame: no measuring */
  useEffect(() => {
    const y = top ? top.scroll : 0;
    beforeDraw(() => { const el = bodyRef.current; if (el) el.scrollTop = y; });
  }, [pageKey]);   /* the page's key alone: a redraw of the same page keeps where it was scrolled */
  if (!st.open || typeof document === 'undefined') return null;
  const getS = () => (stateRef && stateRef.current) || null;
  const deep = !!(st.nav && navCanBack(st.nav));
  const shape = menus3ShapeNow();
  const box = Object.assign({}, BOX, panelCss(shape));
  if (shape === 'drawer') { box.borderTop = 'none'; box.borderLeft = BOX.borderTop; }
  const sections = MENUS3[st.menu] || [];
  return createPortal(
    <div className="bt-menus3-layer" data-menus3-layer="">
      <section className={ui2RootClass()} style={box} data-menus3-panel={shape} data-menus3-menu={st.menu} role="dialog" aria-label={menuWord(st.menu)}>
        <div style={HEAD} data-menus3-head="">
          {deep ? (
            <>
              <button type="button" className="u2-raised u2-ctl" style={BACK} data-menus3-back=""
                aria-label={say(SAY, 'menus3.back')} {...frameTap(() => menus3Bus.back())}>
                <BackIcon /><span>{say(SAY, 'menus3.back')}</span>
              </button>
              <span className="m3-title" data-menus3-title="">{pageTitle(top, getS)}</span>
            </>
          ) : sections.map((s) => (
            <button key={s} type="button" className={'u2-raised u2-ctl' + (s === st.section ? ' is-selected' : '')} style={TAB}
              data-menus3-tab={s} aria-pressed={s === st.section} {...frameTap(() => menus3Bus.section(s))}>
              {sectionWord(s)}
              {s === 'power' && powerDot(rpgState, getS()) ? <i className="m3-dot" data-menus3-dot="power" aria-hidden="true" /> : null}
              {s === 'chat' && st.section !== 'chat' && chatPeopleDot(getS()).dock ? <i className="m3-dot" data-menus3-dot="chat" aria-hidden="true" /> : null}
            </button>
          ))}
          <button type="button" className="u2-raised u2-ctl is-round" style={X} data-menus3-x="" data-esc=""
            aria-label={say(SAY, 'menus3.close')} {...frameTap(() => menus3Close('x'))}>
            <XIcon />
          </button>
        </div>
        <div ref={(el) => { bodyRef.current = el; _bodyEl = el; }} className="m3-body" style={{ flex: '1 1 auto', overflow: 'auto', overscrollBehavior: 'contain', touchAction: 'pan-y' }}
          data-menus3-body={st.section || ''} data-menus3-page={top ? top.page : ''}
          onScroll={keepScroll}>
          {st.section === 'bag' ? <Menus3Bag R={rpgState} getS={getS} top={top} /> : null}
          {st.section === 'power' ? <Menus3Power R={rpgState} getS={getS} top={top} root={st.nav ? st.nav[0] : null} /> : null}
          {st.section === 'quests' ? <Menus3Quests R={rpgState} getS={getS} top={top} /> : null}
          {st.section === 'roster' ? <Menus3Roster getS={getS} top={top} /> : null}
          {st.section === 'chat' || (top && top.page === 'whisper') ? <Menus3Chat top={top} getS={getS} /> : null}
          {st.section === 'ranks' ? <Menus3Ranks top={top} getS={getS} /> : null}
          {st.section !== 'roster' && top && top.page === 'player' ? <Menus3Player key={'p' + top.arg} getS={getS} id={top.arg} /> : null}
        </div>
      </section>
    </div>,
    document.body,
  );
}
