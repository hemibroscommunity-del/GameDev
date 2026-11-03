/* ═══ v2.3.3922: YOUR FRAME, TOP-LEFT, ALWAYS ON ═══
 *
 * The desktop playtest: "player status not showing (pfp with stat bars
 * usually anchored at the top)".  Asked on 2026-11-02, the owner chose "Yes,
 * always on: compact: your face, level, an HP bar and an energy bar at the
 * top-left; the quest card moves just under it. Tap it to open your Bro page."
 *
 * A similar strip was taken away once as "way too busy" (v2.3.1848-1857,
 * UI-DESIGN-NOTES "the player frame"): it carried the name, XP and gold too.
 * This one is the face, the level and the bars, nothing more -- the gold and
 * XP have their own places on the top bar.  Mana joins as a third, thinner
 * bar only while a staff is in hand (R.activeSlot 'staff'), the one time it
 * is spent.  The over-head HP bar and the spend bars stay as they are.
 *
 * WHERE: just under the top bar, at the play area's left edge (sideways, the
 * world's own edge: --world-x and the Island's inset), clear of the minimap
 * (top-right), the stick and every button (all at the bottom).  Its bottom is
 * published as `--bt-hud-top` on <html>, so the quest card and the status
 * chips start just under it (game.css; Lane F's quest card reads the same
 * variable).  The face is a WHOLE multiple of 32 px, pixelated: 64 on a
 * phone, 96 on a computer (the owner's Hemi Bro bust is 32 x 32), and the
 * frame is sized round it (game.css --bt-pf-face; never the window, TRAPS §214).
 *
 * ITS OWN CLOCK: the game state read every 250 ms, a re-render only when a
 * number it shows changes; the bars are scaled, never re-laid out.  Flat
 * fills only: it is over the WebGL canvas (TRAPS section 42).  A tap opens
 * the Bro page (the dashboard's 'hero', whatever its button is called).
 */
import React, { useEffect, useRef, useState } from 'react';
import { getState } from './mobile/dash/common.js';
import { portraitStore, portraitSrc } from './mobile/sheet/portraitStore.js';
import { dashboardPanelBus } from './mobile/dashboardPanelBus.js';
import { deskWords } from '@/game/deskWords.js';

const frac = (v, m) => (m > 0 ? Math.max(0, Math.min(1, (Number(v) || 0) / m)) : 0);
const whole = (v) => Math.max(0, Math.round(Number(v) || 0));

/** What the frame shows, from the game state (null before a character). */
export function frameView(S) {
  const R = S && S.rpg;
  if (!R) return null;
  const staff = R.activeSlot === 'staff';
  return {
    lv: Math.max(1, Math.floor(Number(R.level) || 1)),
    hp: whole(R.hp), maxHp: whole(R.maxHp),
    en: whole(R.stamina), maxEn: whole(R.maxStamina),
    mp: staff ? whole(R.mana) : null, maxMp: staff ? whole(R.maxMana) : null,
    dead: (Number(R.hp) || 0) <= 0,
  };
}

function Bar({ kind, v, max, label }) {
  return (
    <div className={'bt-pf__bar bt-pf__bar--' + kind} data-pf-bar={kind} data-v={v} data-max={max}
      role="meter" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={max}>
      <div className="bt-pf__fill" style={{ transform: `scaleX(${frac(v, max)})` }} />
      {kind === 'hp' && <span className="bt-pf__num">{v}<span className="bt-pf__of">/{max}</span></span>}
    </div>
  );
}

export function PlayerFrame() {
  const [view, setView] = useState(() => frameView(getState()));
  const [face, setFace] = useState(() => portraitSrc(getState()));
  const ref = useRef(null);
  useEffect(() => {
    let last = '';
    const tick = () => {
      const S = getState();
      const v = frameView(S);
      const sig = v ? [v.lv, v.hp, v.maxHp, v.en, v.maxEn, v.mp, v.maxMp].join('|') : '';
      if (sig !== last) { last = sig; setView(v); }
      const f = portraitSrc(S);
      setFace((cur) => (cur === f ? cur : f));
    };
    tick();
    const id = setInterval(tick, 250);
    const off = portraitStore.subscribe(tick);
    return () => { clearInterval(id); off(); };
  }, []);
  /* QA (mp-playerframe, the UI review): what it shows and where */
  useEffect(() => {
    try {
      window.__btPlayerFrame = () => {
        const el = ref.current;
        const r = el ? el.getBoundingClientRect() : null;
        return { view, rect: r ? { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) } : null };
      };
    } catch (e) { /* no window */ }
  }, [view]);
  if (!view) return null;
  const open = (e) => {
    e.stopPropagation();
    try { if (e.currentTarget && e.currentTarget.blur) e.currentTarget.blur(); } catch (_e) { /* fine */ }
    try { dashboardPanelBus.open('hero'); } catch (_e) { /* no dashboard */ }
  };
  return (
    <button type="button" ref={ref} className={'bt-pf' + (view.mp != null ? ' bt-pf--mp' : '') + (view.dead ? ' is-dead' : '')}
      data-player-frame="1"
      aria-label={`Level ${view.lv}. Health ${view.hp} of ${view.maxHp}. Energy ${view.en} of ${view.maxEn}.${view.mp != null ? ` Mana ${view.mp} of ${view.maxMp}.` : ''} ${deskWords('Tap')} to open your Bro page.`}
      /* the world listens for taps under the HUD: stop the press here, or a
         tap on the frame also walks the bro to the corner (the quest card's
         v2.3.1714 note) */
      onPointerDown={(e) => e.stopPropagation()}
      onClick={open}>
      <span className="bt-pf__face">
        <img src={face} alt="" draggable={false} />
        <span className="bt-pf__lv" data-pf-lv={view.lv}>{view.lv}</span>
      </span>
      <span className="bt-pf__bars">
        <Bar kind="hp" v={view.hp} max={view.maxHp} label="Health" />
        <Bar kind="en" v={view.en} max={view.maxEn} label="Energy" />
        {view.mp != null && <Bar kind="mp" v={view.mp} max={view.maxMp} label="Mana" />}
      </span>
    </button>
  );
}

export default PlayerFrame;
