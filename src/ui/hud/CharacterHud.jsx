/* ═══ v2.3.6781: THE CHARACTER HUD, TOP LEFT (card UI3, PR 2) ═══
 *
 * The owner, 2026-11-26: "Portrait: Always visible and tappable. Name and
 * combat level: Immediately adjacent to the portrait. XP bar: Persistent
 * gold progression bar."  "Tapping the portrait should immediately open the
 * character dashboard."  And: "the upper HUD tells you who you are and how
 * you're progressing, while the bottom dashboard lets you manage your
 * character."
 *
 * What it shows is src/game/charHud.js's (which weapon, the level, the bar);
 * this file only draws it.  The face is the portrait the dashboard already
 * bakes (sheet/portraitStore.js, filled by BottomDashboard): no bake of its
 * own, no new picture in memory.  The weapon's picture is the top bar's
 * (xpBarArt.js XP_BAR_ICONS, warmed behind the loading screen).
 *
 * THE WHOLE BOX IS ONE BUTTON: a click opens Bro through the dashboard's own
 * bus (`dashboardPanelBus.open('hero')`, the Menu's Bro tile), by its page id
 * and nothing deeper.  It acts on `click`, never on pointerup (so no
 * swallowTapClick), and stops the press as the quest card does, so a tap
 * never walks the bro to the corner and a computer's click never swings.
 *
 * The weapon's XP moves HERE now: the bar wears the top bar's marks
 * (`data-xp-bar`, `data-xp-shown="1"`, XpTrack's `data-xp-num`) so a kill's
 * "+N XP" flies to it (XpFlyOverlay.jsx), and the top bar's slot is quiet
 * while the HUD is on (ZoneHeader.jsx).  `?hud=0` (remembered) gives back
 * today's top left.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { charHudOn, charHudModel, charHudBar } from '@/game/charHud.js';
import { portraitStore, portraitSrc } from '@/ui/mobile/sheet/portraitStore.js';
import { onXpBar, xpGainWords } from '@/game/xpBar.js';
import { XpTrack } from '@/ui/mobile/XpTrack.jsx';
import { XP_BAR_ICONS } from '@/ui/mobile/xpBarArt.js';
import { dashboardPanelBus } from '@/ui/mobile/dashboardPanelBus.js';
import { SAY } from '@/data/say/charHud.js';
import { say } from '@/game/say.js';
import { hudArtOn } from '@/game/hudArt.js';   /* v2.3.6787: the owner's pictures (card UI3 PR 8) */
import HudArt from './HudArt.jsx';
import './charHud.css';

/* QA only: what the HUD shows, for mp-charhud (the probe reads the model) */
function publish(model, bar) {
  try {
    if (typeof window !== 'undefined') {
      window.__btCharHud = () => ({ ...model, barLive: !!(bar && bar.live), pop: bar && bar.pop ? { ...bar.pop } : null });
    }
  } catch (e) { /* QA only */ }
}

export default function CharacterHud({ rpgState, live }) {
  const on = charHudOn();
  /* the face and the last gain are each their own store: re-draw on them */
  const [, setFaceTick] = useState(0);
  const [, setXpTick] = useState(0);
  useEffect(() => {
    if (!on) return undefined;
    /* the stack below (the quest line, the status column, the party chip)
       moves down by the HUD's height (game.css): a write, never a read */
    try { document.documentElement.setAttribute('data-charhud', '1'); } catch (e) { /* no page */ }
    const offFace = portraitStore.subscribe(() => setFaceTick((n) => n + 1));
    const offXp = onXpBar(() => setXpTick((n) => n + 1));
    return () => {
      offFace();
      offXp();
      try { document.documentElement.removeAttribute('data-charhud'); } catch (e) { /* no page */ }
      try { if (typeof window !== 'undefined') delete window.__btCharHud; } catch (e) { /* QA only */ }
    };
  }, [on]);

  const S = live || null;
  const rpg = (S && S.rpg) || rpgState || null;
  const model = charHudModel(rpg, { name: (S && S.myName) || '' });
  const xb = (S && S._xpBar) || null;
  const got = charHudBar(model, xb, Date.now());
  /* XpTrack re-plans on a new bar object: the still bar is kept while its
     numbers are the same (a live gain is the store's own object) */
  const still = got.bar && !got.live ? got.bar : null;
  const stillBar = useMemo(() => still, [still && still.cat, still && still.level, still && still.xp, still && still.need]);
  const bar = got.live ? got.bar : stillBar;
  publish(model, got);

  if (!on || !rpg) return null;
  /* v2.3.6787: the owner's pictures (HudArt.jsx; `?hudart=0` keeps the panel
     below): the face ring, the combat level's badge, the weapon in hand's bar */
  /* v2.3.6787 (the mend of sitting 72): handed the three fields it reads, never
     the model whole, so char-hud 9i still sees every model.level under
     model.ready (the badge's number: hud-art.test 6i) */
  if (hudArtOn()) return <HudArt live={S} rpg={rpg} hud={{ ready: model.ready, level: model.ready ? model.level : null, name: model.name }} xb={xb} />;

  const open = (e) => {
    e.stopPropagation();
    try { dashboardPanelBus.open('hero'); } catch (e2) { /* the dashboard not mounted yet */ }
  };
  const stop = (e) => e.stopPropagation();
  const lv = model.ready ? say(SAY, 'charHud.level', { n: model.level }) : '';

  return (
    <div
      className={'bt-charhud' + (model.ready ? '' : ' is-waiting')}
      data-charhud-box="1"
      data-charhud-level={model.ready ? model.level : ''}
      data-charhud-cat={model.cat || ''}
      data-charhud-max={model.max ? '1' : '0'}
      role="button"
      title={say(SAY, 'charHud.open')}
      aria-label={say(SAY, 'charHud.aria', { name: model.name, n: model.ready ? model.level : '' })}
      onPointerDown={stop}
      onMouseDown={stop}
      onClick={open}
    >
      <span className="bt-charhud__face">
        <img src={portraitSrc(S)} alt="" draggable={false} />
      </span>
      <span className="bt-charhud__main">
        <span className="bt-charhud__top">
          <span className="bt-charhud__name" data-charhud-name="1">{model.name}</span>
          {model.ready ? <span className="bt-charhud__lv" data-charhud-lv="1">{lv}</span> : null}
        </span>
        {model.ready && bar ? (
          <span className="bt-charhud__xp" data-xp-bar={model.cat} data-xp-shown={model.max ? '0' : '1'}
            data-xp-level={model.wLevel} data-xp-frac={Number(bar.frac).toFixed(3)}>
            <img className="bt-charhud__icon" src={XP_BAR_ICONS[model.cat]} alt="" draggable={false} />
            <span className="bt-charhud__word" data-charhud-word="1">{model.word}</span>
            {model.max ? (
              <span className="bt-xp-bar__track bt-charhud__full">
                <span className="bt-xp-bar__fill" style={{ transform: 'scaleX(1)' }} />
              </span>
            ) : <XpTrack bar={bar} />}
            {got.pop ? (
              <span key={'p' + got.pop.seq} className="bt-charhud__pop" data-charhud-pop={got.pop.cat}>
                <img src={XP_BAR_ICONS[got.pop.cat]} alt="" draggable={false} />
                <span className="bt-xp-gain" data-xp-gain={got.pop.gain}>{xpGainWords(got.pop.gain)}</span>
              </span>
            ) : null}
          </span>
        ) : null}
      </span>
    </div>
  );
}
