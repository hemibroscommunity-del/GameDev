/* ═══ v2.3.6787: THE CHARACTER HUD IN THE OWNER'S PICTURES (card UI3, PR 8) ═══
 *
 * The owner, 2026-11-26: "Use these art assets for a new compact hud in top
 * left and weapon xp bar".  "The tiny pill on the right of weapon xp bar
 * should have weapon level. Inside character badge goes combat lvl".  "Weapon
 * in hand".
 *
 * CharacterHud.jsx draws this in place of its panel while `?hudart` is on (its
 * one branch); what it shows and where is src/game/hudArt.js's (the layout in
 * CSS px, the fill's width, the two numbers); the pictures are the owner's
 * sheet's, cut by tools/art/cut-hud.mjs into public/ui/hud/ and warmed behind
 * the loading screen (rendering/controlsPreload.js).  The face is UI3-hud's
 * (the dashboard's portrait, sheet/portraitStore.js): no bake of its own.
 *
 * TWO BUTTONS, each the group's full height (52, sideways 48: over 44): the
 * face and its badge open Bro (`dashboardPanelBus.open('hero')`, as UI3-hud's
 * box did); the bar opens the weapon in hand's page by Bro's own road
 * (BroCard.jsx onWeapon: Combat, then the weapon's page; the bus's ONE BREATH
 * puts Combat in Bro's place, so Back goes to Combat).  Each acts on `click`
 * only and stops the press (pointer and mouse), so a tap never walks the bro
 * and a computer's click never swings.
 *
 * NOTHING IS MEASURED: every place is the module's number, the fill's width a
 * CSS variable written when the XP changes (never in a frame).  Sideways the
 * whole group is drawn at 92 % by one variable (hudArt.css --ha-k).  The
 * count "45 / 120" is XpTrack's (its fills hidden here: the green picture is
 * the fill), so a kill's "+N XP" still flies to it (XpFlyOverlay.jsx).
 */
import React, { useEffect, useMemo } from 'react';
import { charHudBar } from '@/game/charHud.js';
import { HUD_ART, hudArtModel, hudArtFill, hudArtBarModel, hudArtUrl } from '@/game/hudArt.js';
import { COMBAT_PAGES } from '@/game/combatHub.js';
import { portraitSrc } from '@/ui/mobile/sheet/portraitStore.js';
import { xpGainWords } from '@/game/xpBar.js';
import { XpTrack } from '@/ui/mobile/XpTrack.jsx';
import { XP_BAR_ICONS } from '@/ui/mobile/xpBarArt.js';
import { dashboardPanelBus } from '@/ui/mobile/dashboardPanelBus.js';
import { SAY } from '@/data/say/charHud.js';
import { SAY as CH } from '@/data/say/combatHub.js';
import { say } from '@/game/say.js';
import './hudArt.css';

/* a length of the module's, drawn at the group's scale (sideways .92) */
const k = (n) => 'calc(' + n + 'px * var(--ha-k, 1))';
const box = (x, y, w, h) => Object.freeze({ left: k(x), top: k(y), width: k(w), height: k(h) });
const L = HUD_ART;
const S_GROUP = Object.freeze({ width: k(L.w), height: k(L.h) });
const S_FACE = box(0, 0, L.bar.x, L.h);
const S_DISC = box((L.face.size - L.face.img) / 2, (L.face.size - L.face.img) / 2, L.face.img, L.face.img);
const S_RING = box(0, 0, L.face.size, L.face.size);
const S_BADGE = box(L.badge.x, L.badge.y, L.badge.w, L.badge.h);
const S_BAR = box(L.bar.x, 0, L.bar.w, L.h);
/* the bar's parts, from the bar's left */
const bx = (x) => x - L.bar.x;
const S_NAME = Object.freeze({ ...box(bx(L.name.x), L.name.y, L.name.w, L.name.h), fontSize: k(L.name.size), lineHeight: k(L.name.h) });
const S_TRACK = Object.freeze({ ...box(bx(L.track.x), L.track.y, L.track.w, L.track.h),
  borderImageSource: 'url(' + hudArtUrl('track') + ')', borderImageWidth: k(L.track.cap) });
const S_XP = box(bx(L.fill.x), L.track.y, L.fill.w, L.track.h);
const S_FILL = Object.freeze({ top: k(L.fill.y - L.track.y), height: k(L.fill.h),
  borderImageSource: 'url(' + hudArtUrl('fill') + ')', borderImageWidth: k(L.fill.cap) });
const S_PILL = box(bx(L.pill.x), L.pill.y, L.pill.w, L.pill.h);
const S_WRING = box(0, L.wring.y, L.wring.size, L.wring.size);
const S_WICON = box((L.wring.size - L.wring.icon) / 2, (L.wring.size - L.wring.icon) / 2, L.wring.icon, L.wring.icon);
const S_COUNT = Object.freeze({ fontSize: k(L.count) });
/* a gain on another weapon pops UNDER the bar's right end (over the name it hid it) */
const S_POP = Object.freeze({ top: k(L.track.y + L.track.h + 1) });

const weaponWord = (cat) => say(CH, cat === 'bow' ? 'combatHub.bow' : cat === 'staff' ? 'combatHub.staff' : 'combatHub.sword');

/* QA only: what the owner's HUD shows, for mp-ui3hudart */
function publish(art, fill, bar) {
  try {
    if (typeof window !== 'undefined') {
      window.__btHudArt = () => ({ ...art, fill: { ...fill }, innerW: L.fill.w, barLive: !!(bar && bar.live), pop: bar && bar.pop ? { ...bar.pop } : null });
    }
  } catch (e) { /* QA only */ }
}

export default function HudArt({ live, rpg, hud, xb }) {
  useEffect(() => () => {
    try { if (typeof window !== 'undefined') delete window.__btHudArt; } catch (e) { /* QA only */ }
  }, []);
  const art = hudArtModel(rpg, hud);
  const got = charHudBar(hudArtBarModel(art), xb, Date.now());
  /* XpTrack re-plans on a new bar object: the still bar is kept while its
     numbers are the same (a live gain is the store's own object) */
  const still = got.bar && !got.live ? got.bar : null;
  const stillBar = useMemo(() => still, [still && still.cat, still && still.level, still && still.xp, still && still.need]);
  const bar = got.live ? got.bar : stillBar;
  const fill = hudArtFill(art.ready ? art.frac : 0, L.fill.w, L.fill.cap);
  publish(art, fill, got);

  const stop = (e) => e.stopPropagation();
  const openBro = (e) => {
    e.stopPropagation();
    try { dashboardPanelBus.open('hero'); } catch (e2) { /* the dashboard not mounted yet */ }
  };
  const cat = art.cat;
  const openWeapon = (e) => {
    e.stopPropagation();
    try {
      /* Bro's own road (BroCard.jsx onWeapon), from the world: Bro, Combat, the weapon */
      dashboardPanelBus.open('hero');
      dashboardPanelBus.push('broCombat');
      if (cat && COMBAT_PAGES[cat]) dashboardPanelBus.push(COMBAT_PAGES[cat]);
    } catch (e2) { /* the dashboard not mounted yet */ }
  };
  const word = cat ? weaponWord(cat) : '';
  const vars = { ...S_GROUP, '--hudart-fill': fill.width + 'px', '--hudart-clip': fill.clip + 'px' };

  return (
    <div
      className={'bt-hudart' + (art.ready ? '' : ' is-waiting')}
      style={vars}
      data-charhud-box="1"
      data-hudart="1"
      data-charhud-level={art.ready ? art.level : ''}
      data-charhud-cat={cat || ''}
      data-hudart-wlevel={art.ready ? art.weaponLevel : ''}
      data-hudart-frac={art.frac.toFixed(3)}
      onPointerDown={stop}
      onMouseDown={stop}
    >
      <span className="bt-hudart__face" style={S_FACE} data-hudart-face="1" role="button"
        title={say(SAY, 'charHud.open')}
        aria-label={say(SAY, 'charHud.aria', { name: hud.name, n: art.ready ? art.level : '' })}
        onPointerDown={stop} onMouseDown={stop} onClick={openBro}>
        <span className="bt-hudart__disc" style={S_DISC}>
          <img src={portraitSrc(live)} alt="" draggable={false} />
        </span>
        <img className="bt-hudart__pic" style={S_RING} src={hudArtUrl('face-ring')} alt="" draggable={false} />
        <span className="bt-hudart__badge" style={S_BADGE} data-hudart-badge="1"
          aria-label={art.ready ? say(SAY, 'charHud.artLevel', { n: art.level }) : undefined}>
          <img className="bt-hudart__pic" src={hudArtUrl('badge')} alt="" draggable={false} />
          <span className={'bt-hudart__num' + (art.ready && art.level >= 100 ? ' is-long' : '')} data-charhud-lv="1">{art.ready ? art.level : ''}</span>
        </span>
      </span>
      <span className="bt-hudart__bar" style={S_BAR} data-hudart-bar={cat || ''} role="button"
        title={cat ? say(SAY, 'charHud.artBar', { weapon: word }) : undefined}
        aria-label={cat ? say(SAY, 'charHud.artBarAria', { weapon: word, n: art.weaponLevel }) : undefined}
        onPointerDown={stop} onMouseDown={stop} onClick={openWeapon}>
        <span className="bt-hudart__name" style={S_NAME} data-charhud-name="1">{hud.name}</span>
        <span className="bt-hudart__track" style={S_TRACK} />
        <span className="bt-hudart__xp" style={S_XP} data-xp-bar={cat || ''} data-xp-shown={art.ready && !art.max ? '1' : '0'}
          data-xp-level={art.ready ? art.weaponLevel : ''} data-xp-frac={art.frac.toFixed(3)}>
          {fill.width > 0 ? <span className="bt-hudart__fill" style={S_FILL} data-hudart-fill="1" /> : null}
          {art.ready && !art.max && bar ? <span className="bt-hudart__count" style={S_COUNT}><XpTrack key={cat} bar={bar} /></span> : null}
        </span>
        <span className="bt-hudart__pill" style={S_PILL}>
          <img className="bt-hudart__pic" src={hudArtUrl('pill')} alt="" draggable={false} />
          <span className="bt-hudart__num" data-hudart-pill="1">{art.ready ? art.weaponLevel : ''}</span>
        </span>
        <span className="bt-hudart__wring" style={S_WRING}>
          <img className="bt-hudart__pic" src={hudArtUrl('wring')} alt="" draggable={false} />
          {art.ready && art.icon ? <img className="bt-hudart__icon" style={S_WICON} src={art.icon} alt="" draggable={false} data-hudart-icon={cat} /> : null}
        </span>
        {got.pop ? (
          <span key={'p' + got.pop.seq} className="bt-hudart__pop" style={S_POP} data-charhud-pop={got.pop.cat}>
            <img src={XP_BAR_ICONS[got.pop.cat]} alt="" draggable={false} />
            <span className="bt-xp-gain" data-xp-gain={got.pop.gain}>{xpGainWords(got.pop.gain)}</span>
          </span>
        ) : null}
      </span>
    </div>
  );
}
