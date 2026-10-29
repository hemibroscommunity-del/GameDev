/* ═══ v2.3.3107: NO MAN'S LAND, OVER THE MIDDLE OF THE DASHBOARD ═══
 *
 * The owner: "make the skull level (no mans land) appear above the center of
 * the dashboard (should be bottom center of playable screen area) instead of
 * the top bar. If you tap it it gives you info on what it means".
 *
 * v2.3.3058 put "☠ No man's land 1 · Lv 6–10" in the top bar's second line,
 * in red.  It moves here: a skull and the number, centred on the play area's
 * bottom edge, just above the band (the controls' own `--sheet-h`, so it rides
 * a raised sheet as they do), and the top bar names the stage again.  A tap
 * opens the game's explainer (InfoPopup) with the rules -- what the worker
 * does, server/src/nomansland.js -- and your own skull, if you carry one.
 *
 * ITS OWN CLOCK, as ElemStatusChips: it polls the game state every 250 ms and
 * re-renders only when the level or your skull's minute changes.  While it is
 * up it sets `--nml-lift` on the page, so the interact prompts above the band
 * (a dungeon's mouth stands in No man's land) step up over it.
 *
 * ═══ v2.3.3268: JUST LEFT OF THE MIDDLE, CLEAR OF THE SHIELD ═══
 * The owner: "I also want to be able to use shield for when battles happen
 * against real players in no mans land".  Centred on the middle, the badge
 * sat ON the shield button: the shield's left edge is the screen's middle by
 * construction (ShieldButton.jsx ctlColumn: the button fills the room between
 * the movement half and the attack disc, so its left edge is 50% of the width
 * wherever it is squeezed, and right of it where it is not), the badge's 44 px
 * tap row reached 46 px over the band and the shield's bottom is 21 px over
 * it, and the badge is drawn on top (z 34 over 31) -- so a tap on the
 * shield's middle opened the badge's rules, in the one place a fight needs
 * the shield.  The badge now ends left of the middle and of the shield (a
 * narrow phone squeezes the shield over the middle -- ctlColumn's 44 px floor:
 * at 375 its left edge is 6 px past it, at 360 14), 8 px clear where there is
 * room and never less than 2: still at the bottom, by the middle, never over
 * the shield, at any width, either way up.  And it is NARROWER, so it fits
 * between the shield and the notification bell (left of it, 66-110 px) on a
 * 360 px phone: the skull and the number, your own skull a small mark on its
 * corner instead of a third thing in the row (it was 81 px wide with one, and
 * at 360 and 375 the moved badge lay over the bell).  mp-nmlfoe measures it at
 * 320-430 px and sideways.
 *
 * ═══ v2.3.3629: BESIDE THE MINIMAP'S NAME PLATE ═══
 * The owner, 2026-10-27: "I think I'd rather have the no man's land skull and
 * level just beside the minimap where it lists the zone and level range".
 * So the badge left the bottom of the screen: it stands just left of the
 * minimap's box, level with its name plate (the land's name over its level
 * band, wheelMinimap.js, whose box it publishes as window.__btWheelPlate) and
 * as tall as the plate, so the place, its levels and the skull read together.
 * Up there it is clear of every thumb control, so v2.3.3268/v2.3.3608's
 * stepping aside for the shield button is gone (nmlBadgePlace), and so is
 * `--nml-lift`, which lifted the prompts over the band while the badge held
 * its middle.  The blinking red line along the band stays.  Placed in its
 * containing block's numbers (the probe below: on a computer #root's paint
 * box, TRAPS §232); with no plate drawn there is no badge.  SIDEWAYS the
 * sprint button and Special stand left of the plate (sprintAnchor,
 * SPRINT_MAP_CLEAR) and the attack disc reaches up under the box, so there it
 * stands just left of the box level with its TOP edge; on a screen too short
 * for that (under ~340 px tall the sprint button reaches up beside the box's
 * top) in the top bar's row above the box, its right edge in line.
 * mp-nmlfoe's sideways rows found it behind the sprint button, then on the
 * disc.  In the top bar's row it is PORTALLED TO THE BODY, as the "Attack
 * <name>?" window is: the top bar (GameApp's ZoneHeader, z 20) is outside the
 * game's wrapper, so a badge inside the wrapper was drawn UNDER it whatever
 * its own z-index (mp-nmlfoe's 667 x 320 row found it in place but unseen).
 * Its other places keep it in the wrapper, layered as before.
 *
 * ═══ v2.3.3765: IN THE TOP BAR, JUST RIGHT OF "BroTown" ═══
 * The owner: "I think the no man's land pill would work better just to the
 * right of the Brotown name at the top (you can cut it away same as when
 * earning xp in a weapon)".  So the pill (NmlPill below) lives in the top
 * bar, ZoneHeader's middle column, beside the title -- never inside it: the
 * title ([data-zone-title]) is the zone banner's dock target, read exactly.
 * While the XP bar holds the title's place (v2.3.3695) it is cut away with
 * the title, and back when the bar goes (game.css bt-zone-header__mid--xp).
 * Everything that placed it beside the minimap's plate went with that place:
 * nmlBadgeSpot, the sideways places and the portal to the body.  This file's
 * default export keeps the blinking red line along the band.  On a narrow
 * bar the pill is the smaller of its two sizes (game.css bt-nml-pill), so
 * the title and the purse never give way to it.
 */
import React, { useEffect, useRef, useState } from 'react';
import { nmlHere, nmlFirst, nmlSteps, NML_RED } from '@/game/noMansLand.js';   /* v2.3.3690: + nmlFirst, where it starts */
import { deskWords } from '@/game/deskWords.js';   /* v2.3.3615: "tap" reads "click" on a computer */
import { infoPopupBus } from './infoPopupBus.js';

/* a skull, drawn rather than the emoji (every phone draws 💀 its own way) */
export function NmlSkull({ size = 18, color = NML_RED }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      <path fill={color} stroke="#1a0b0a" strokeWidth="1.4" strokeLinejoin="round"
        d="M12 2.2c-5 0-8.6 3.5-8.6 8.2 0 2.7 1.2 4.6 3 5.8v2.6c0 1 .8 1.8 1.8 1.8h7.6c1 0 1.8-.8 1.8-1.8v-2.6c1.8-1.2 3-3.1 3-5.8 0-4.7-3.6-8.2-8.6-8.2z" />
      <circle cx="8.4" cy="11" r="2.3" fill="#1a0b0a" />
      <circle cx="15.6" cy="11" r="2.3" fill="#1a0b0a" />
      <path fill="#1a0b0a" d="M12 13.6l-1.5 2.6h3z" />
      <path stroke="#1a0b0a" strokeWidth="1.2" d="M10 18.2v2.2M12 18.2v2.2M14 18.2v2.2" />
    </svg>
  );
}

/* the monsters' levels of No man's land n: each land's ring of five levels
   n + first - 1 (src/data/noMansLandRings.js).  v2.3.3690: 1 is Lv 1-5
   against a worker that starts it at the first tier (first 1), Lv 6-10 as it
   was against an older one (first 2) */
export function nmlLevels(n, first = 1) {
  const tier = n + (first || 1) - 1;
  return `Lv ${5 * tier - 4}–${5 * tier}`;
}

/* your own skull, minutes of play left (applyNmlSkull keeps {red, white, at}:
   the worker's milliseconds when it said so; the clock runs only online,
   and you are online while you read this) */
export function nmlSkullLeft(S, now) {
  const o = S && S._nmlSelf;
  if (!o) return null;
  const gone = Math.max(0, now - (o.at || now));
  const red = Math.max(0, (Number(o.red) || 0) - gone), white = Math.max(0, (Number(o.white) || 0) - gone);
  if (red > 0) return { type: 'red', min: Math.ceil(red / 60000) };
  if (white > 0) return { type: 'white', min: Math.ceil(white / 60000) };
  return null;
}

function Line({ children }) {
  return <li style={{ marginBottom: 6 }}>{children}</li>;
}

export function openNmlInfo(S, lvl) {
  const skull = nmlSkullLeft(S, Date.now());
  const n = lvl;
  const lv = (k) => `${k} level${k === 1 ? '' : 's'}`;
  infoPopupBus.open({
    title: nmlSteps(S) ? `No man's land ${n} · Lv ${n + 5 * (nmlFirst(S) - 1)} monsters` : `No man's land ${n} · ${nmlLevels(n, nmlFirst(S))}`,   /* v2.3.3767: the number IS the monster level (caps.nmlsteps) */
    body: (
      <div data-nml-info={n}>
        <div style={{ marginBottom: 8 }}>
          Other players can attack you here, and you can attack them.
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <Line><b>Who:</b> players within {lv(n)} of yours, while they stand in No man's land too. The lower of your two numbers counts, and it grows the further you go from town. Your party never.</Line>
          {/* v2.3.3253: attacking is a choice (game/nmlAsk.js) */}
          {/* v2.3.3316: a swing at them asks too, as a shot through them does */}
          <Line><b>How:</b> {deskWords('tap a player, or swing or shoot at them, and choose ')}<b>Attack</b>. Until you do, your blows never hurt them.</Line>
          {/* v2.3.3316: the owner -- everything carried, the gold and the tools
              too; a red skull a monster kills keeps what it wears */}
          <Line><b>Killed by a player:</b> they get <b>everything you carry</b>: your bag, tools and ores too, your gold, and your spare weapons and armour. You keep what you wear. Diego sells a lost tool back.</Line>
          {/* v2.3.3530: the skulls come with the window's Attack (nomansland.js _handleNmlAttack) */}
          <Line><b>Attack a player:</b> a <span style={{ color: NML_RED, fontWeight: 800 }}>red skull</span> for 20 minutes of play from the moment you choose Attack, starting over with every hit. Killed by a player with it, you lose <b>everything</b>, worn gear too; killed by a monster, everything but what you wear.</Line>
          {/* v2.3.3528: hitting back goes through the window too (game/nmlAsk.js);
              v2.3.3530: white the moment they choose, whether you fight back or
              not, and one Attack answers a whole group */}
          <Line><b>Get attacked:</b> a <b>white skull</b> the moment they choose to attack you, whether you fight back or not. {deskWords('To hit back, swing, shoot or tap them and choose ')}<b>Attack</b> once: hitting back anyone who attacked you gives you no red skull, and everyone attacking you is then yours to hit.</Line>
        </ul>
        <div>Walk back toward BroTown to leave.</div>
      </div>
    ),
    note: skull
      ? (skull.type === 'red'
        ? `You carry a red skull: ${skull.min} min of play left.`
        : `You carry a white skull: ${skull.min} min of play left.`)
      : undefined,
  });
}

/* ═══ v2.3.3765: THE PILL, IN THE TOP BAR ═══
   Beside the title in ZoneHeader's middle column (see the header).  ITS OWN
   CLOCK, as before: the game state read every 250 ms, a re-render only when
   the level or your skull changes.  A tap opens the explainer.  Flat fills
   only: the bar is over the WebGL canvas (TRAPS section 42). */
export function NmlPill({ getS }) {
  const [lvl, setLvl] = useState(0);
  const [skull, setSkull] = useState(null);
  const getRef = useRef(getS);
  getRef.current = getS;
  useEffect(() => {
    let last = '';
    const id = setInterval(() => {
      const S = getRef.current ? getRef.current() : null;
      let l = 0;
      try { l = nmlHere(S); } catch (e) { l = 0; }
      const sk = l ? nmlSkullLeft(S, Date.now()) : null;
      const sig = l + '|' + (sk ? sk.type : '');
      if (sig !== last) { last = sig; setLvl(l); setSkull(sk); }
    }, 250);
    return () => clearInterval(id);
  }, []);
  /* QA handle, the house style (__btInfoPopup, __btCtlTut); `at` the place it
     stands (v2.3.3765: always the bar) */
  useEffect(() => {
    try {
      window.__btNmlBadge = () => ({ lvl, skull: skull && skull.type, at: lvl ? 'bar' : null });
    } catch (e) { /* no window */ }
  }, [lvl, skull]);
  if (!lvl) return null;
  const open = (e) => {
    e.preventDefault();
    e.stopPropagation();
    openNmlInfo(getRef.current ? getRef.current() : null, lvl);
  };
  return (
    <button type="button" className="bt-nml-pill" data-nml-badge={lvl} data-nml-at="bar"
      aria-label={`No man's land ${lvl}: players can attack you here. ${deskWords('Tap')} for what it means.`}
      onClick={open}>
      <span className="bt-nml-pill__body">
        {/* the skull and the number only (the owner's "skull level"): the
            land's name and its levels are on the minimap's plate, and a tap
            says the rules */}
        <span className="bt-nml-pill__skull"><NmlSkull size={20} /></span>
        <span className="bt-nml-pill__num" data-nml-num="">{lvl}</span>
        {/* v2.3.3268: your own skull on the pill's corner, as a count sits on
            a bell, so the pill is no wider for it */}
        {skull && (
          <span className="bt-nml-pill__own" data-nml-own-skull={skull.type} title={`${skull.type} skull`}
            style={{ borderColor: skull.type === 'red' ? NML_RED : '#F2F2F2' }}>
            <NmlSkull size={10} color={skull.type === 'red' ? NML_RED : '#F2F2F2'} />
          </span>
        )}
      </span>
    </button>
  );
}

/* v2.3.3765: the badge itself moved to the top bar (NmlPill); this keeps the
   line along the band, on its own clock, while you are in No man's land */
export default function NmlBadge({ stateRef }) {
  const [lvl, setLvl] = useState(0);
  useEffect(() => {
    let last = 0;
    const id = setInterval(() => {
      let l = 0;
      try { l = nmlHere(stateRef && stateRef.current); } catch (e) { l = 0; }
      if (l !== last) { last = l; setLvl(l); }
    }, 250);
    return () => clearInterval(id);
  }, [stateRef]);
  if (!lvl) return null;
  return (
    /* v2.3.3600: A SLOWLY BLINKING RED LINE along the top of the band while
       you are in No man's land -- the owner: "some kind of slightly blinking
       red line" (game.css bt-nml-line; still under calm motion) */
    <div data-nml-line="" aria-hidden="true" className="bt-nml-line" style={{
      position: 'fixed', left: 0, right: 0, height: 3, pointerEvents: 'none', zIndex: 33,
      bottom: 'calc(var(--sheet-h, var(--dash-h)) - 1px)', background: NML_RED,
      boxShadow: `0 0 8px ${NML_RED}`,
    }} />
  );
}
