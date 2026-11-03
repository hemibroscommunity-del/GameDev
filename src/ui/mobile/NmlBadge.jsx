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
 *
 * ═══ v2.3.3974: THE PILL BECOMES THE PLACE CHIP ═══
 * The owner, 2026-11-02: "The red skull with the 1 is supposed to mean your
 * character is in the wilderness ... But if you are the one to initiate an
 * attack on another player you get a red skull above your head".  He adopted
 * "replace the top bar with a location and safety HUD ... Safe Zone /
 * Wilderness / Outlaw ... reserve the red skull for the actual aggressor
 * state".  So the pill (PlaceChip below) is always up: green Safe, amber
 * "PvP · Lv 6-8" in No man's land, red skull and Outlaw while you carry the
 * red skull; a tap opens the window with your own numbers in plain words
 * (game/placeSafety.js).  Still nothing said or played on the way in or out.
 *
 * ═══ v2.3.4103: THE CHIP LEAVES THE TOP BAR ═══
 * The owner, 2026-11-03: "Remove name of town and "safe" or other
 * designation from top bar (currently centered). The minimap label area
 * already does this."  The chip is gone; the minimap's name plate says "No
 * man's land 12" or "Outlaw · 18 min" in red (game/plateSafety.js) and a tap
 * on it opens the same window (PlateTap below).  This file's default export
 * keeps the red line along the band, the hit that closes the window, and the
 * QA handle (__btNmlBadge, `at: 'plate'`).
 */
import React, { useEffect, useRef, useState } from 'react';
import { nmlHere, nmlFirst, nmlSteps, NML_RED } from '@/game/noMansLand.js';   /* v2.3.3690: + nmlFirst, where it starts */
import { deskWords } from '@/game/deskWords.js';   /* v2.3.3615: "tap" reads "click" on a computer */
import { infoPopupBus } from './infoPopupBus.js';
import { nmlExplainHit, _nmlForget } from '@/game/nmlExplainOnce.js';
import { placeState, placeLines, bagRiskCount } from '@/game/placeSafety.js';   /* v2.3.3974: Safe / PvP / Outlaw */
import { placeName } from './placeName.js';
import { createPortal } from 'react-dom';                                                 /* v2.3.4103: the plate's tap, over the minimap */
import { nmlSkullLeft, plateRisk } from '@/game/plateSafety.js';                         /* v2.3.4103 */                                              /* v2.3.3974 */

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
/* v2.3.4103: moved to game/plateSafety.js (the minimap's plate reads it too) */
export { nmlSkullLeft };

function Line({ children }) {
  return <li style={{ marginBottom: 6 }}>{children}</li>;
}

/* v2.3.3825: `opts.lead`, a line over the rules (the explainer coming up by
   itself at the line: game/nmlExplainOnce.js); every opening is marked `nml`,
   so a hit while it is open closes it (NmlBadge's clock, below).
   ═══ v2.3.3974: PLAIN WORDS FIRST, WITH YOUR OWN NUMBERS ═══
   The owner adopted the review's "make the status tappable so players can
   view the exact death penalties", what is at risk "such as '2,306 gold and 8
   inventory items'".  The window opens with the place chip's state in two
   plain sentences (game/placeSafety.js placeLines: who can attack you here,
   and what a player kill would take, from your live purse and bag), then the
   rules as before, shorter.  Only here, on a tap: nothing is said on the way
   in or out (v2.3.3853, v2.3.3887). */
function liveLines(S, lvl) {
  const R = (S && S.rpg) || null;
  const sk = nmlSkullLeft(S, Date.now());
  const st = placeState({ nml: lvl, myLv: R && R.level, redMin: sk && sk.type === 'red' ? sk.min : 0 });
  return { st, ...placeLines(st, { gold: R ? R.coins : 0, things: bagRiskCount(R), place: placeName(S) }) };
}

export function openNmlInfo(S, lvl, opts) {
  const lead = opts && opts.lead;
  const skull = nmlSkullLeft(S, Date.now());
  const n = lvl;
  const lv = (k) => `${k} level${k === 1 ? '' : 's'}`;
  const plain = liveLines(S, n);
  infoPopupBus.open({
    title: nmlSteps(S) ? `No man's land ${n} · Lv ${n + 5 * (nmlFirst(S) - 1)} monsters` : `No man's land ${n} · ${nmlLevels(n, nmlFirst(S))}`,   /* v2.3.3767: the number IS the monster level (caps.nmlsteps) */
    body: (
      <div data-nml-info={n} data-place-info={plain.st.kind}>
        {lead && <div data-nml-lead="" style={{ marginBottom: 8, fontWeight: 800, color: NML_RED }}>{lead}</div>}
        {/* v2.3.3974: the plain words, your numbers in them */}
        <div data-place-lead="" style={{ marginBottom: 6, fontWeight: 800, color: plain.st.kind === 'outlaw' ? NML_RED : '#F2D58C' }}>{plain.lead}</div>
        {plain.more && <div data-place-risk="" style={{ marginBottom: 10 }}>{plain.more}</div>}
        <div style={{ marginBottom: 6, fontWeight: 700, opacity: 0.85 }}>The rules</div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <Line><b>Who:</b> players within {lv(n)} of yours, while they stand in No man's land too. The lower of your two numbers counts, and it grows the further you go from town. Your party never.</Line>
          {/* v2.3.3253: attacking is a choice (game/nmlAsk.js); v2.3.3316: a
              swing at them asks too, as a shot through them does */}
          <Line><b>How:</b> {deskWords('tap a player, or swing or shoot at them, and choose ')}<b>Attack</b>. Until you do, your blows never hurt them.</Line>
          {/* v2.3.3530: the skulls come with the window's Attack (nomansland.js _handleNmlAttack) */}
          <Line><b>Attack first:</b> you become an <span style={{ color: NML_RED, fontWeight: 800 }}>outlaw</span> (a red skull) for 20 minutes of play, starting over with every hit. Beaten by a player then, you lose <b>everything</b>, worn gear too; killed by a monster, everything but what you wear.</Line>
          {/* v2.3.3528/3530: hitting back goes through the window too, and gives no red skull */}
          <Line><b>Get attacked:</b> a <b>white skull</b>. {deskWords('To hit back, swing, shoot or tap them and choose ')}<b>Attack</b> once: hitting back never makes you an outlaw.</Line>
          <Line><b>Keep things safe:</b> the Bank in BroTown holds gold and things, out of reach of any death. Diego sells a lost tool back.</Line>
        </ul>
        <div style={{ marginTop: 6 }}>Walk back toward BroTown to leave.</div>
      </div>
    ),
    note: skull
      ? (skull.type === 'red'
        ? `You carry a red skull: ${skull.min} min of play left.`
        : `You carry a white skull: ${skull.min} min of play left.`)
      : undefined,
    nml: true,   /* v2.3.3825: a hit closes it (NmlBadge's clock) */
  });
}

/* v2.3.3974: the chip's window off No man's land: safe at home, or an outlaw
   whose skull still runs in town */
export function openPlaceInfo(S, lvl) {
  if (lvl > 0) { openNmlInfo(S, lvl); return; }
  const plain = liveLines(S, 0);
  const name = placeName(S);
  infoPopupBus.open({
    title: plain.st.kind === 'outlaw' ? 'Outlaw' : `${name} · Safe`,
    body: (
      <div data-place-info={plain.st.kind}>
        <div data-place-lead="" style={{ marginBottom: 6, fontWeight: 800, color: plain.st.kind === 'outlaw' ? NML_RED : '#8FD89A' }}>{plain.lead}</div>
        {plain.more && <div data-place-risk="" style={{ marginBottom: 8 }}>{plain.more}</div>}
        <div>Out past the safe ground is No man's land, where other players can attack you. The minimap's name plate says so there, in red; tap it for who can attack you.</div>
      </div>
    ),
  });
}

/* ═══ v2.3.4103: THE CHIP LEAVES THE TOP BAR; THE PLATE TAKES THE TAP ═══
   The owner, 2026-11-03: "Remove name of town and "safe" or other
   designation from top bar (currently centered). The minimap label area
   already does this."  The place chip of v2.3.3974 (Safe / PvP · Lv a-b /
   Outlaw) is gone from the bar; the minimap's name plate says "No man's land
   12" or "Outlaw · 18 min" in red (game/plateSafety.js, wheelMinimap.js
   _plate).  While it does, this invisible button lies over the plate
   (window.__btWheelPlate, the window's numbers: portalled to the body, as the
   world map's button over the rest of the box is) and a tap opens the rules
   window, as a tap on the chip did; elsewhere the box opens the world map as
   before.  `data-nml-badge` carries the No man's land number while you are
   in it: the scenarios find it by that. */
/* v2.3.4103: never over a thumb's control.  On a short sideways screen
   (667 x 320) the attack disc reaches up under the minimap's box (v2.3.3629's
   note; mp-nmlfoe 10): the plate's tap gives way -- its foot trimmed to above
   the control, or its right edge to the control's left, or, with too little
   left to aim at, no tap there (the plate still says it). */
const THUMBS = ['[data-ricon]', '[data-sprint]', '[data-quickeat]', '.bt-special-btn', '.bt-ability-btn', '.bt-burst-btn'];
function clearOfThumbs(p) {
  let l = p.left, t = p.top, r = p.left + p.width, b = p.top + p.height;
  try {
    for (const sel of THUMBS) {
      const n = document.querySelector(sel);
      const q = n && n.getBoundingClientRect();
      if (!q || !(q.width > 0 && q.height > 0)) continue;
      if (q.right <= l || q.left >= r || q.bottom <= t || q.top >= b) continue;
      if (q.top - t >= 14) b = q.top;
      else if (q.left - l >= 40) r = q.left;
      else return null;
    }
  } catch (e) { /* the plate as it is */ }
  return { left: l, top: t, width: r - l, height: b - t };
}

function PlateTap({ getS, risk }) {
  const [rect, setRect] = useState(null);
  useEffect(() => {
    const id = setInterval(() => {
      let p = null;
      try { p = window.__btWheelPlate || null; } catch (e) { p = null; }
      if (p) p = clearOfThumbs(p);
      setRect((o) => (o && p && o.left === p.left && o.top === p.top && o.width === p.width && o.height === p.height ? o : p));
    }, 300);
    return () => clearInterval(id);
  }, []);
  if (!rect || !(rect.width > 8) || typeof document === 'undefined') return null;
  const open = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try { if (e.currentTarget && e.currentTarget.blur) e.currentTarget.blur(); } catch (_e) { /* fine */ }
    openPlaceInfo(getS ? getS() : null, risk.nml);
  };
  const kind = risk.redMin > 0 ? 'outlaw' : 'pvp';
  return createPortal(
    <button type="button" data-plate-tap={kind}
      {...(risk.nml ? { 'data-nml-badge': risk.nml, 'data-nml-at': 'plate' } : {})}
      aria-label={kind === 'outlaw'
        ? `Outlaw: you attacked a player first, ${risk.redMin} minutes left. ${deskWords('Tap')} for what it means.`
        : `No man's land ${risk.nml}: players can attack you here. ${deskWords('Tap')} for what it means.`}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={open}
      style={{ position: 'fixed', left: rect.left, top: rect.top, width: rect.width, height: rect.height, zIndex: 46,
        background: 'transparent', border: 0, padding: 0, margin: 0, cursor: 'pointer', touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent' }} />,
    document.body,
  );
}

/* v2.3.3765: the badge itself moved to the top bar (NmlPill); this keeps the
   line along the band, on its own clock, while you are in No man's land */
export default function NmlBadge({ stateRef }) {
  const [lvl, setLvl] = useState(0);
  /* v2.3.4103: what the plate says (No man's land, your red skull), for its tap */
  const [risk, setRisk] = useState({ nml: 0, redMin: 0, own: null });
  useEffect(() => {
    let last = 0;
    let lastRisk = '';
    /* v2.3.3825: the HP when the explainer was seen open, to close it on a hit */
    let openHp = null;
    const id = setInterval(() => {
      const S = stateRef && stateRef.current;
      let l = 0;
      try { l = nmlHere(S); } catch (e) { l = 0; }
      if (l !== last) { last = l; setLvl(l); }
      try {
        const r = S && S.currentZone === 'wheel' ? plateRisk(S, Date.now()) : { nml: 0, redMin: 0, own: null };
        const sig = r.nml + '|' + r.redMin + '|' + r.own;
        if (sig !== lastRisk) { lastRisk = sig; setRisk(r); }
      } catch (e) { /* the plate still says it */ }
      /* ═══ v2.3.3825: ONCE, AT THE LINE; AND A HIT CLOSES IT ═══
         (game/nmlExplainOnce.js): a judge died reading the explainer among
         the first quest's slimes.  It comes up by itself once per character
         on the safe ground near the line, where nothing can hurt you; and
         while it is up, your HP dropping closes it. */
      try {
        const cur = infoPopupBus.current();
        const hp = S && S.rpg && typeof S.rpg.hp === 'number' ? S.rpg.hp : null;
        if (cur && cur.nml) {
          if (openHp == null) openHp = hp;
          else if (nmlExplainHit(openHp, hp)) { infoPopupBus.close(); openHp = null; }
        } else openHp = null;
        /* ═══ v2.3.3853: IT NO LONGER COMES UP BY ITSELF ═══
           The owner, before the showing: "just get rid of the no man's land
           gigantic warning message. I'd rather not have anything".  The
           explainer opened by itself near the line (v2.3.3825); now it opens
           only from the skull pill, and a hit still closes it. */
      } catch (e) { /* the badge's rules are a tap away */ }
    }, 250);
    return () => clearInterval(id);
  }, [stateRef]);
  /* QA (mp-nmlonce): forget this character's "told", as a new phone would */
  useEffect(() => {
    try { window.__btNmlOnce = { forget: () => { const S = stateRef && stateRef.current; if (S && S.myId) _nmlForget(S.myId); } }; } catch (e) { /* no window */ }
  }, [stateRef]);
  /* QA handle, the house style (__btInfoPopup, __btCtlTut): No man's land's
     number, your skull, and since v2.3.4103 `at: 'plate'` (the top bar's
     chip, v2.3.3765-v2.3.3974, is gone) */
  useEffect(() => {
    try {
      window.__btNmlBadge = () => ({ lvl: risk.nml, skull: risk.own, at: risk.nml ? 'plate' : null,
        chip: risk.redMin > 0 ? 'outlaw' : risk.nml ? 'pvp' : 'safe' });
    } catch (e) { /* no window */ }
  }, [risk]);
  const getS = () => (stateRef && stateRef.current) || null;
  const tap = (risk.nml > 0 || risk.redMin > 0) ? <PlateTap getS={getS} risk={risk} /> : null;
  if (!lvl) return tap;
  return (<>
    {tap}
    {/* v2.3.3600: A SLOWLY BLINKING RED LINE along the top of the band while
       you are in No man's land -- the owner: "some kind of slightly blinking
       red line" (game.css bt-nml-line; still under calm motion) */}
    <div data-nml-line="" aria-hidden="true" className="bt-nml-line" style={{
      position: 'fixed', left: 0, right: 0, height: 3, pointerEvents: 'none', zIndex: 33,
      bottom: 'calc(var(--sheet-h, var(--dash-h)) - 1px)', background: NML_RED,
      boxShadow: `0 0 8px ${NML_RED}`,
    }} />
  </>);
}
