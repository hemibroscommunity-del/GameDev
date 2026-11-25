import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AFTER_PAINT } from '../../afterPaint.js';   /* v2.3.6281: the first measure off the commit (card HB2 PR 2) */
import { getState } from '../dash/common.js';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { dashMinBus } from '../dashMinBus.js';            /* Equipment: the Gear tab, unfolded */
import { playIsLandscape } from '../playViewport.js';
import { profileFromSelf, compactCount } from '../../panels/playerProfile.js';
import { portraitSrc } from './portraitStore.js';
import { BRO_WEAPONS, broStartWeapon, broWeaponStats } from './broStats.js';
import { SkillTile, SKILL_XP_HOLD_MS } from '../dash/SkillTiles.jsx';   /* v2.3.4172: the combat skills, moved here from Gear */
import { registerXpCard, displayXp, xpEasing } from '../../xpLanding.js';   /* v2.3.4191 (Lane A): the XP flight lands on these tiles */
import { combatSkillState, WEAPON_SKILLS } from '../dash/combatSkill.js';
import { SKILL_ROSTER, hasUnseenLevelUps } from './skillsModel.js';
import { prog3Live, prog3CharLevel } from '../../../data/prog3.js';
import { achvLive, achvApTotal, achvSummary, askTitlePicker } from '@/game/achievements.js';
import { ACHV_MEDAL_SRC } from '@/data/achievements.js';
import { clanPartyOn } from '@/game/alliance.js';
import { NAV_KEYS } from '@/game/deskKeys.js';   /* L, worn by the Life Skills row on a computer */
import { infoPopupBus } from '../infoPopupBus.js';
import { statInfo } from '../infoGlossary.js';
import { SAY } from '@/data/say/broCard.js';   /* v2.3.6343: its words, in the one table (docs/specs/player-words.md, W1) */
import { say, sayPieces } from '@/game/say.js';
import { sw } from '@/game/switches.js';
import { broPagesStart, broPageTo, broPagesLayout, broOpen } from '@/game/broPages.js';   /* v2.3.6600: the pages' rules */
import { BroPages } from './BroPages.jsx';   /* v2.3.6600 (card BRO): the Bro tab in pages */

/* v2.3.6600 (card BRO, the owner: "I want it so that it shows "pages" where all the information needs
   to be displayed together (instead of scrolling little by little)"): the Bro tab is three pages
   (BroPages.jsx; the rules src/game/broPages.js).  `?bropages=0` gives back the card below. */
export const BRO_PAGES_ON = (function () { try { return !sw('bropages'); } catch (e) { return true; } })();

/* ═══ v2.3.4172: THE BRO PAGE, AS THE OWNER DREW IT ═══
 * The owner, of the first cut (your own Inspect card): "I'll need to change
 * the layout of the bro tab, it reads like an old PC menu."  Then: "I added
 * what I want bro tab layout to look like on GitHub.  One different thing is
 * the xp bar near profile portrait (no general combat xp)".  And on the
 * portrait: "character portrait are fine it's just too much screen space for
 * persistent thing stuck on game screen ... I'm wanting the portrait in the
 * bro section".  The drawing is D474F679-...png in the repo root: THREE
 * PANELS side by side under the button row --
 *   LEFT     you: your portrait framed, your name, "Lv N" (no XP bar: there
 *            is no general combat XP), the title you wear as a gold ribbon
 *            ("No title" plainly), your clan (castle, name [TAG], "No clan";
 *            a tap opens it), your AP with the star (a tap: Achievements),
 *            and two tiles: Achievements n / total, Lifetime Kills;
 *   MIDDLE   the weapon picker (starting on the weapon out), then "Combat
 *            Stats" for that weapon, a row a stat (broStats.js: the game's
 *            own readers, per weapon); the list scrolls when the band is
 *            shorter than it.  v2.3.4172, the owner on #1386: "Move the 3
 *            primary combat skills out of the gear menu and put them into
 *            the bro menu" -- the picker IS the three combat-skill tiles
 *            (Melee, Bow, Magic: dash/SkillTiles.jsx, the Gear tab's own),
 *            "Lv N" above each big picture (so it does not read as a weapon
 *            in the bag); a tap picks that weapon's stats (the gold edge)
 *            AND shows the tile's XP ("68 / 455 XP") for 4 s;
 *   RIGHT    doors, a chevron each: Achievements, Life Skills (the drawing's
 *            "Attributes" row: the game has no STR / AGI / INT, so the slot
 *            went to the page that moved under Bro), Points (glowing while a
 *            point waits: data-section="Build", where the guide arrow and
 *            the points bubbles aim), Equipment (the Gear button's own page,
 *            v2.3.4151's Gear tab), Homestead, Pet, Titles, Clan.
 * No full-body figure.  The band keeps today's height (the owner: "No don't
 * change todays dashboard height"), so the page lays itself out from ITS box,
 * measured, never the window's (TRAPS §214):
 *   3 columns  600 px and wider (a tablet, a computer's one band): as drawn,
 *              each panel its own scroller;
 *   2 columns  340-599 (an upright phone: 378 px of page; a computer's side
 *              column): you | the doors, the stats under them, one scroller.
 *              The doors sit beside you rather than under the stats because
 *              the upright page is ~185 px tall: what you tap (Points among
 *              the first three) must be on screen when it opens, where the
 *              guide arrow can point at it; the stats are a scroll away;
 *   1 column   under 340 (a phone on its side: ~220 px): you, the doors, the
 *              stats, one scroller.
 * A taller box just shows more.  Read only: nothing here spends or sends;
 * HeroExpanded re-renders every 400 ms, so this has no clock of its own. */

const fmt = (v) => Math.max(0, Math.floor(Number(v) || 0)).toLocaleString('en-US');

const ICON = {
  achv: ACHV_MEDAL_SRC,
  life: '/icons/ui/nav-lifeskills.webp?v=2.3.1331',   /* the old Skills button's crest */
  points: '/icons/ui/cur-buildpoint.webp',
  equip: '/icons/ui/panel-loadout.webp',
  farm: '/icons/ui/bldg-farm.webp',
  pet: '/icons/ui/pets-paw.webp?v=2.3.3526',             /* More's Pets tile */
  titles: '/icons/ui/party-crown.webp',
  clan: '/icons/ui/clan.webp',
  kills: '/icons/ui/hero/rec-kills.webp',
};

/* the page's shape from its own width (above) */
export const BRO_COLS_3 = 600;
export const BRO_COLS_2 = 340;
export function broCols(w) {
  if (!(w > 0)) return 2;
  return w >= BRO_COLS_3 ? 3 : w >= BRO_COLS_2 ? 2 : 1;
}

/* the level the game shows everywhere else: the best weapon's (v2.3.3538) */
function levelOf(R) {
  try { if (prog3Live(R)) return prog3CharLevel(R); } catch (e) { /* the old blob */ }
  return Math.max(1, Number(R && R.level) || 1);
}

/* the weapon picked here, kept while the page is visited (the Points window
   over it and back keeps it); a fresh visit starts on the weapon out.
   v2.3.6600: the pages' whole state, { page, weapon } (broPages.js): the page
   too is kept across the Points window and a page pushed under Bro, and a
   fresh visit opens the Overview */
let _pick = null;
dashboardPanelBus.subscribe(() => { if (dashboardPanelBus.state.mode === 'bar') _pick = null; });

/* the explainer a stat's row opens (the Equipment window's own) */
function explain(key, value) {
  try {
    const info = statInfo(key);
    if (info) infoPopupBus.open({ title: info.title, body: info.body, note: info.note, stat: String(value) });
  } catch (e) { /* no explainer: nothing opens */ }
}

const stop = (fn) => (e) => { e.stopPropagation(); fn(); };

/* ═══ v2.3.4172: EQUIPMENT IS THE GEAR TAB ═══
   The Gear button's own page (dash/GearTab.jsx, v2.3.4151: your bag, your
   bro and your gear) is on main, so the Equipment door goes there -- the way
   the Gear button itself goes (NavRail): upright (and on the one band) Gear
   IS the band at rest, unfolded; sideways it is the side column's
   'dashboard' page. */
export function openGear() {
  if (playIsLandscape()) { dashboardPanelBus.open('dashboard'); return; }
  dashboardPanelBus.toBar();
  dashMinBus.set(false);
}

function Row({ id, icon, title, sub, n, live, dot, chevron = true, onTap, extra }) {
  return (
    <button type="button" className={'bt-bro2-row' + (live ? ' is-live' : '')} data-bro-row={id}
      data-bro-row-n={n == null ? undefined : n} aria-label={title + (sub ? ': ' + sub : '')}
      onClick={stop(onTap)} {...(extra || null)}>
      {/* the Points tab's glow (v2.3.3004), kept while any point waits */}
      {live ? <span className="bt-pts-glow" data-pts-glow="tab" aria-hidden="true" /> : null}
      <img className="bt-bro2-rowic" src={icon} alt="" draggable={false} />
      <span className="bt-bro2-rowt">
        <b>{title}</b>
        {sub ? <span>{sub}</span> : null}
      </span>
      {dot ? <span className="bt-bro2-dot" data-skills-dot="" aria-hidden="true" /> : null}
      {chevron ? <span className="bt-bro2-chev" aria-hidden="true">{'›'}</span> : null}
    </button>
  );
}

export const BroCard = ({ points, onPoints }) => {
  const S = getState();
  const R = (S && S.rpg) || {};
  const n = Math.max(0, Math.floor(Number(points) || 0));
  const apOn = achvLive(S);
  const box = useRef(null);
  /* v2.3.6600: the box's size, its width as before (the columns) and its height from the observer
     (the pages' dense cut); 0 until measured (two columns, roomy) */
  const [size, setSize] = useState({ w: 0, h: 0 });
  const cols = broCols(size.w);
  const L = broPagesLayout(size.w, size.h);
  const [bp, setBp] = useState(() => _pick || broPagesStart(broStartWeapon(R)));
  /* v2.3.6600: the ONE transition (broPages.js broPageTo); the card's weapon is the pages' */
  const move = (a) => setBp((prev) => { const next = broPageTo(prev, a); _pick = next; return next; });
  const weapon = bp.weapon;
  const setWeapon = (c) => move({ weapon: c });
  /* v2.3.4172: the skill tile showing its XP (one at a time), back to its
     picture after SKILL_XP_HOLD_MS or a second tap */
  const [xpCat, setXpCat] = useState(null);
  const xpTimer = useRef(0);
  const tapSkill = (cat) => {
    if (xpTimer.current) { clearTimeout(xpTimer.current); xpTimer.current = 0; }
    setWeapon(cat);
    if (xpCat === cat) { setXpCat(null); return; }
    setXpCat(cat);
    xpTimer.current = setTimeout(() => { xpTimer.current = 0; setXpCat(null); }, SKILL_XP_HOLD_MS);
  };
  useEffect(() => () => { if (xpTimer.current) clearTimeout(xpTimer.current); }, []);
  /* ═══ v2.3.4191 (Lane A's hook-up): THE XP LANDS HERE ═══
     The tiles left the Gear tab for this page, and with them the XP flight's
     landing (xpLanding): while this card is on screen each tile publishes its
     place (registerXpCard, every 100 ms -- a place older than 700 ms is not
     a target) and its number is the HELD one (displayXp, data-xpprog), which
     counts up when the label lands; the card redraws only while that count
     runs (xpEasing: not for a hold, when nothing it shows changes).  Off this page the flight goes to the top bar's XP number
     (XpFlyOverlay). */
  const [, xpTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      const root = box.current;
      if (!root) return;
      root.querySelectorAll('[data-bro-skill][data-xpbar]').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 0) registerXpCard(el.getAttribute('data-xpbar'), r);
      });
      if (xpEasing()) xpTick((v) => (v + 1) % 1000000);
    }, 100);
    return () => clearInterval(id);
  }, []);

  /* the shape from the box (ResizeObserver: the band, the side column and the
     one band all resize it without a window resize) */
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    /* v2.3.6600: the height from the observer's own entry (no second read of the page) */
    const measure = (entries) => {
      const w = el.clientWidth;
      const box = entries && entries[0] && entries[0].contentRect;
      const h = box ? Math.round(box.height) : 0;
      if (w > 0) setSize((o) => (o.w === w && o.h === h ? o : { w, h }));
    };
    /* v2.3.6281 (card HB2 PR 2; `?afterpaint`): not measured in the commit of the window that put the card in (the
       first read after React changed the page lays the whole page out there: `measure2`, 67.9 to 80.8 ms on
       budget-android at `windows`).  The ResizeObserver below tells the size on observe, after the browser's own
       layout: the columns fit a frame later.  `?afterpaint=0`, or no ResizeObserver: measured here, as before. */
    if (!AFTER_PAINT || typeof ResizeObserver === 'undefined') measure();
    let ro = null;
    try { ro = new ResizeObserver(measure); ro.observe(el); } catch (e) { ro = null; }
    return () => { try { if (ro) ro.disconnect(); } catch (e) { /* gone */ } };
  }, []);
  /* QA: the shape and the weapon (window.__btBroCard) */
  useEffect(() => {
    /* v2.3.6600: the pages' state, its shape, and `to` (a tap's action, broPageTo) */
    try { window.__btBroCard = { cols, weapon, xp: xpCat, pages: BRO_PAGES_ON, page: bp.page, wide: L.wide, dense: L.dense, w: size.w, h: size.h, to: move }; } catch (e) { /* no window */ }
  }, [cols, weapon, xpCat, bp, size]);
  useEffect(() => () => { try { window.__btBroCard = null; } catch (e) { /* no window */ } }, []);

  let p = null;
  try { p = profileFromSelf(S); } catch (e) { p = null; }
  const name = (p && p.name) || say(SAY, 'broCard.you');
  const level = levelOf(R);
  const ap = achvApTotal(S);
  let sum = null;
  if (apOn) { try { sum = achvSummary(S); } catch (e) { sum = null; } }
  const title = p && p.equippedTitle;
  const clan = p && p.clan;
  const kills = p && p.showcase ? p.showcase.lifetimeKills : 0;
  const pet = p && p.pet;
  const plots = p && p.homestead ? Math.max(0, Number(p.homestead.plotsReady) || 0) : 0;
  const worn = p && Array.isArray(p.equipment) ? p.equipment.filter((s) => !s.ghost).length : 0;
  const slots = p && Array.isArray(p.equipment) ? p.equipment.length : 6;
  const ls = R.lifeSkills || {};
  let lifeTotal = 0;
  for (const s of SKILL_ROSTER) lifeTotal += Math.max(0, Number(ls[s.key] && ls[s.key].level) || 0);
  let lifeNew = false;
  try { lifeNew = hasUnseenLevelUps(R); } catch (e) { lifeNew = false; }
  let party = false;
  try { party = clanPartyOn(S); } catch (e) { party = false; }

  const go = (id) => dashboardPanelBus.push(id);   /* a page under Bro: its back chip returns here */
  const openAchv = () => go('achievements');
  const openTitles = () => { askTitlePicker(); go('achievements'); };
  const openClan = () => go('clan');
  const farmInfo = () => {
    try {
      infoPopupBus.open({
        title: say(SAY, 'broCard.homestead'),
        body: plots > 0 ? say(SAY, 'broCard.farmReady', { n: plots }) : say(SAY, 'broCard.farmNone'),
      });
    } catch (e) { /* no popup: the count says it */ }
  };

  const stats = broWeaponStats(R, weapon);
  const skills = WEAPON_SKILLS.map((sk) => ({ s: sk, k: combatSkillState(R, sk) }));
  const clanWords = clan ? `${clan.name || clan.tag} [${clan.tag}]` : say(SAY, party ? 'broCard.noParty' : 'broCard.noClan');
  const wLabel = (BRO_WEAPONS.find((w) => w.cat === stats.cat) || BRO_WEAPONS[0]).label;

  /* ═══ v2.3.6600 (card BRO): THE PAGES ═══
     The same readings as the card below, laid out as three pages (BroPages.jsx); what a tap opens
     is broPages.js's word, acted on with today's own roads. */
  if (BRO_PAGES_ON) {
    const held = broStartWeapon(R);
    const open = (word) => {
      const o = broOpen(word);
      if (!o) return;
      if (o.kind === 'page') go(o.page);
      else if (o.kind === 'titles') openTitles();
      else if (o.kind === 'points') { if (onPoints) onPoints(); }
      else if (o.kind === 'gear') openGear();
      else if (o.kind === 'farm') farmInfo();
    };
    const d = {
      portrait: portraitSrc(S), name, level, title, apOn, sum, ap, kills, pet, plots, worn, slots,
      lifeTotal, lifeNew, party, clanWords, icon: ICON,
    };
    const tiles = skills.map(({ s: sk, k }) => ({
      s: sk, k, cat: k.cat || 'sword',
      /* the XP flight's landing and its held number (v2.3.4191), as the card's tiles carried them */
      xpAttrs: {
        'data-xpbar': k.p3cat || undefined,
        'data-xpprog': k.p3cat && k.xp ? Math.round(displayXp(k.p3cat, k.xp.prog)) : undefined,
        'data-xpthresh': k.p3cat && k.xp ? Math.round(k.xp.thresh) : undefined,
      },
    }));
    return (
      <div ref={box} className="bt-bro3" data-bro-card="pages" data-bro-cols={cols} data-bro-page-open={bp.page}
        data-bro-wide={L.wide ? 1 : 0} data-bro-dense={L.dense ? 1 : 0}>
        <BroPages d={d} n={n} held={held} bp={bp} move={move} open={open} explain={explain}
          statsHeld={held === stats.cat ? stats : broWeaponStats(R, held)} statsPick={stats} skills={tiles}
          wide={L.wide} dense={L.dense} />
      </div>
    );
  }

  /* ── LEFT: you ── */
  const left = (
    <section className="bt-bro2-panel bt-bro2-id" data-bro-panel="id">
      <div className="bt-bro2-head">
        <span className="bt-bro2-face"><img src={portraitSrc(S)} alt="" draggable={false} />
          <span className="bt-bro2-who">
            <b className="bt-bro2-name" data-bro-name="">{name}</b>
            <span className="bt-bro2-lv" data-bro-level={level}>{say(SAY, 'broCard.level', { level })}</span>
          </span>
        </span>
      </div>
      {title ? (
        <button type="button" className="bt-bro2-ribbon" data-bro-title={title.id}
          aria-label={say(SAY, 'broCard.titleAria', { title: title.text })} onClick={stop(apOn ? openTitles : openAchv)}>
          <span className="bt-bro2-ribbon-in">
            {title.iconSrc ? <img src={title.iconSrc} alt="" draggable={false} /> : null}
            <span>{title.text}</span>
          </span>
        </button>
      ) : (
        <button type="button" className="bt-bro2-notitle" data-bro-title="none"
          aria-label={say(SAY, 'broCard.noTitleAria')} onClick={stop(apOn ? openTitles : openAchv)}>{say(SAY, 'broCard.noTitle')}</button>
      )}
      <button type="button" className="bt-bro2-line" data-bro-clan={clan ? clan.tag : 'none'}
        aria-label={say(SAY, clan ? 'broCard.clanAria' : 'broCard.clanNoneAria', { clan: clanWords })} onClick={stop(openClan)}>
        <img src={ICON.clan} alt="" draggable={false} />
        <span className={clan ? '' : 'is-none'}>
          {clan ? <>{clan.name || clan.tag} <em>[{clan.tag}]</em></> : clanWords}
        </span>
      </button>
      <button type="button" className="bt-bro2-line is-ap" data-bro-ap={ap}
        aria-label={say(SAY, 'broCard.apAria', { ap: fmt(ap) })} onClick={stop(openAchv)}>
        <span className="bt-bro2-star" aria-hidden="true">{'★'}</span>
        <span>{sayPieces(SAY, 'broCard.ap', { ap: <b key="ap">{compactCount(ap)}</b> })}</span>
      </button>
      <div className="bt-bro2-tiles">
        <button type="button" className="bt-bro2-tile" data-bro-tile="achievements"
          data-bro-achv-tile={sum ? `${sum.earned}/${sum.total}` : ''}
          aria-label={sum ? say(SAY, 'broCard.achvTileAria', { earned: sum.earned, total: sum.total }) : say(SAY, 'broCard.achvTileAriaNone')}
          onClick={stop(openAchv)}>
          <img src={ICON.achv} alt="" draggable={false} />
          <span>{say(SAY, 'broCard.achievements')}</span>
          <b>{sum ? `${sum.earned} / ${sum.total}` : '–'}</b>
        </button>
        <div className="bt-bro2-tile" data-bro-tile="kills" data-bro-kills={kills || 0}>
          <img src={ICON.kills} alt="" draggable={false} />
          <span>{say(SAY, 'broCard.lifetimeKills')}</span>
          <b>{compactCount(kills || 0)}</b>
        </div>
      </div>
    </section>
  );

  /* ── MIDDLE: the weapon's combat stats ── */
  const middle = (
    <section className="bt-bro2-panel bt-bro2-stats" data-bro-panel="stats" data-bro-weapon={stats.cat} data-bro-has={stats.has ? 1 : 0}>
      {/* the three combat skills (v2.3.4172, above): a tile picks its
          weapon; the picked one wears the gold edge (aria-pressed) */}
      <div className="bt-bro2-skills" role="group" aria-label={say(SAY, 'broCard.combatSkills')}>
        {skills.map(({ s: sk, k }) => {
          const cat = k.cat || 'sword';
          const on = cat === stats.cat;
          const open = cat === xpCat;
          const xp = open ? (k.xp ? { prog: Math.round(k.xp.prog), thresh: Math.round(k.xp.thresh) } : 'max') : null;
          return (
            <SkillTile key={sk.key} s={sk} k={k} lvAbove selected={on} iconPx={cols === 1 ? 40 : 46} xp={xp}
              attrs={{
                className: 'bt-bro2-skill', 'data-bro-skill': cat, 'data-lvl': k.lvl,
                /* v2.3.4191: the XP flight's landing and its held number */
                'data-xpbar': k.p3cat || undefined,
                'data-xpprog': k.p3cat && k.xp ? Math.round(displayXp(k.p3cat, k.xp.prog)) : undefined,
                'data-xpthresh': k.p3cat && k.xp ? Math.round(k.xp.thresh) : undefined,
                'data-bro-xpopen': open ? '' : undefined,
                'data-bro-xpnum': open && k.xp ? `${Math.round(k.xp.prog)}/${Math.round(k.xp.thresh)}` : undefined,
                'aria-label': k.xp
                  ? say(SAY, 'broCard.skillAriaXp', { skill: sk.label, lvl: k.lvl, prog: Math.round(k.xp.prog), thresh: Math.round(k.xp.thresh), weapon: (BRO_WEAPONS.find((w) => w.cat === cat) || BRO_WEAPONS[0]).label })
                  : say(SAY, 'broCard.skillAriaMax', { skill: sk.label, lvl: k.lvl, weapon: (BRO_WEAPONS.find((w) => w.cat === cat) || BRO_WEAPONS[0]).label }),
              }}
              style={{ minHeight: cols === 1 ? 72 : 80, padding: '5px 3px 4px', gap: 3 }}
              onTap={() => tapSkill(cat)} />
          );
        })}
      </div>
      <div className="bt-bro2-sec" aria-hidden="true"><i /><span>{say(SAY, 'broCard.combatStats')}</span><i /></div>
      {stats.has ? null : (
        <div className="bt-bro2-none" data-bro-noweapon={stats.cat}>{say(SAY, 'broCard.noWeapon', { weapon: wLabel.toLowerCase() })}</div>
      )}
      <div className="bt-bro2-list">
        {stats.rows.map((r) => (
          <button key={r.key} type="button" className="bt-bro2-stat" data-bro-stat={r.key} data-v={r.value}
            onClick={stop(() => explain(r.info, r.value))}>
            <img src={r.icon} alt="" draggable={false} />
            <span className="bt-bro2-statl">{r.label}</span>
            <b>{r.value}</b>
          </button>
        ))}
      </div>
    </section>
  );

  /* ── RIGHT: the doors ── */
  const right = (
    <section className="bt-bro2-panel bt-bro2-rows" data-bro-panel="rows">
      {apOn ? (
        <Row id="achievements" icon={ICON.achv} title={say(SAY, 'broCard.achievements')} n={sum ? sum.earned : 0}
          sub={sum ? say(SAY, 'broCard.achvSub', { earned: sum.earned, total: sum.total }) : null} onTap={openAchv} />
      ) : null}
      <Row id="skills" icon={ICON.life} title={say(SAY, 'broCard.lifeSkills')} n={lifeTotal} dot={lifeNew}
        sub={say(SAY, 'broCard.lifeSub', { total: fmt(lifeTotal) })} onTap={() => go('skills')}
        extra={{ 'data-key': NAV_KEYS.skills, 'data-key-at': 'inline' }} />
      {/* data-section="Build": the guide arrow ("Tap Points") and the points
          bubbles aim here; the Points window opens over the card and its
          close comes back */}
      <Row id="points" icon={ICON.points} title={say(SAY, 'broCard.points')} n={n} live={n > 0}
        sub={n > 0 ? say(SAY, 'broCard.pointsSub', { n: fmt(n) }) : say(SAY, 'broCard.pointsSpent')} onTap={() => { if (onPoints) onPoints(); }}
        extra={{ 'data-section': 'Build', 'data-bro-spend': n }} />
      {/* the Gear tab (openGear above): what you wear, and your bag beside it */}
      <Row id="equipment" icon={ICON.equip} title={say(SAY, 'broCard.equipment')} n={worn}
        sub={say(SAY, 'broCard.equipSub', { worn, slots })} onTap={openGear} extra={{ 'data-bro-gear': '' }} />
      {/* no window for the farm away from it: the count, and a tap says where */}
      <Row id="homestead" icon={ICON.farm} title={say(SAY, 'broCard.homestead')} n={plots} chevron={false}
        sub={plots > 0 ? say(SAY, 'broCard.plotsReady', { n: plots }) : say(SAY, 'broCard.nothingReady')} onTap={farmInfo} />
      <Row id="pet" icon={ICON.pet} title={say(SAY, 'broCard.pet')} sub={pet ? pet.customName : say(SAY, 'broCard.noPet')} onTap={() => go('pets')} />
      {apOn ? (
        <Row id="titles" icon={ICON.titles} title={say(SAY, 'broCard.titles')} n={sum ? sum.earned : 0}
          sub={say(SAY, 'broCard.titlesSub', { n: sum ? sum.earned : 0 })} onTap={openTitles} />
      ) : null}
      <Row id="clan" icon={ICON.clan} title={say(SAY, party ? 'broCard.party' : 'broCard.clan')} sub={clanWords} onTap={openClan} />
    </section>
  );

  return (
    <div ref={box} className="bt-bro2" data-bro-card="v2" data-bro-cols={cols}>
      {left}
      {middle}
      {right}
    </div>
  );
};

export default BroCard;
