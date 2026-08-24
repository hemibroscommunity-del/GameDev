import React, { useEffect, useRef, useState } from 'react';
import { COL } from '@/ui/mobile/dash/common.js';
import { activeWeaponCategory, weaponXpRequired, WEAPON_LEVEL_CAP } from '@/data/gameSystems.js';
import { prog3Live, prog3XpRequired, PROG3, PROG3_SKILL_META } from '@/data/prog3.js';
import { xpCardPoint, holdXp, landXp } from '@/ui/xpLanding.js'; /* v2.3.1874 */

/* HudPopupOverlay — HUD-anchored "+N XP" / "+N G" feedback, plus the
   transient XP bar the XP popup flies into.  Reads entries pushed to
   S._hudPopups by the combat-XP and gold-drop paths.
   Each entry has { id, target, text, color, ts }.
     target = 'xpBar'    -> the combat-XP message + progress bar (below)
     target = 'goldIcon' -> the gold pickup number, at the coin chip
   Mounted once from GameApp.jsx.  z-index 90 (see src/ui/zLayers.js).

   ═══ v2.3.1638 (owner: "there's also no XP gain message after a
   monster dies.  It should show a message then like jump into an xp
   bar that increases progress") ═══

   WHY THE MESSAGE READ AS MISSING.  It was never missing — the push
   fires on every kill (networking/gameEvents.js `monster_kill`,
   game/monsterCombat.js, game/projectiles.js) and this overlay did
   render it.  It was ORPHANED: the popup anchored to the top-right
   corner because that is where the v2.3.1294 identity card used to
   live.  That card was retired, so for several versions the "+N XP"
   has been 20px of text fading over 1.1s in an empty corner, while the
   player is looking at the monster in the middle of the screen.  It
   pointed at nothing and referred to nothing.  Hence "no message".

   WHY THERE WAS NOTHING TO FLY INTO.  The only XP progress readout in
   the client is the 4px strip in mobile/sheet/IdentityStrip.jsx, whose
   single call site is HeroExpanded.jsx — i.e. it renders only when the
   dashboard is in `expanded` mode.  During normal play it is two taps
   away and off-screen.  The owner's "xp bar that increases progress"
   simply did not exist on screen.

   ═══ WHICH NUMBER THE BAR MEASURES — the load-bearing decision ═══

   Four quantities could plausibly back an "XP bar", and three of them
   would be a lie:

   - rpg.xp (lifetime combat XP) — MONOTONIC BUT HAS NO DENOMINATOR.
     It gates nothing any more; server/src/grids.js `_addCombatXp` says
     so outright ("killXp still accumulates on ps.xp so the XP bar can
     repurpose into a BP bar").  Pairing it with a per-level cost is
     exactly the "1097 / 500 XP at Lv 1" bug fixed in v2.3.1311.
   - combatLevelProgress() (heroModel) — the strip's current source, and
     NOT usable for a live bar.  It returns the argmax-ratio T1 skill's
     _buildProg/xpRequired.  addBuildProg subtracts the threshold on a
     crossing, so the leader's ratio collapses to ~0 and the argmax
     hops to a different, unlabelled skill: the bar visibly runs
     BACKWARD.  Its premise ("+1 point = +1 derived level") also stopped
     being true when recalcDerived became `level = 1 + combatBuildTotal`
     (T2 points PLACED), so it no longer tracks the level beside it.
   - build points toward the next level (_buildPointsThisLvl out of 5) —
     honest and it IS what levels you, but it advances a few times per
     HOUR.  A bar that never moves does not answer the request.
   - the EQUIPPED WEAPON's skill XP — what this uses.  awardWeaponXp()
     adds `dmg * WEAPON_XP_PER_DMG` on every damaging hit, so it moves
     on every swing and lands visibly on a kill; it is monotonic inside
     a level; it has a real denominator (weaponXpRequired(level)); it is
     attached to ONE labelled thing the player recognises ("SWORD Lv 7")
     rather than a silent argmax; and levelling it grants
     WEAPON_PTS_PER_LEVEL into weaponUnspent — the points that, once
     spent, raise combat level.  It is the only candidate that both
     moves per kill and never lies.
     v2.3.1686 CORRECTION: the reasoning above still holds, but the TRACK
     named in it (weaponSkills / awardWeaponXp / weaponXpRequired) was
     retired by the prog3 rebuild.  Read the bullet as "the equipped
     weapon's TRAINED skill" — prog3.sk — and see weaponSkillProgress.

   NOTE the two currencies are deliberately not conflated: the flying
   "+N XP" is COMBAT xp (killXp, split across T1 build stats), while the
   bar is WEAPON xp.  Both come from the same kill and both are real, so
   the bar is labelled with its weapon and level and never claims to be
   a readout of the flying number.

   TRANSIENT BY DESIGN.  The bar is not permanent HUD — it appears on an
   XP gain, holds, then fades.  That honours the standing "temporary
   feedback, no permanent HUD" direction while still giving the owner a
   bar to watch fill. */

const LIFE_MS = 1100;             /* gold popup float */
/* v2.3.1874: long enough to outlive the two-stage flight below (380+520),
   with room for the landing frame.  It was LIFE_MS+100 = 1200, which is
   shorter than the flight and would have reaped labels in mid-air. */
const ENTRY_LIFETIME_MS = 1600;
const STACK_SPACING_PX = 22;

const BAR_HOLD_MS = 2600;         /* bar stays up this long after the last gain */
const BAR_FADE_MS = 420;
const XP_FLY_MS = 620;            /* legacy bar travel (bar retired v2.3.1874) */
const XP_FLY_RISE_PX = 34;        /* legacy bar rise    (bar retired v2.3.1874) */
/* v2.3.1874: the two stages of the flight to the card.  LIFT is the beat the
   player reads the number in; FLY is the drop into the dashboard.  Their sum
   is under the entry's own lifetime (ENTRY_LIFETIME_MS) so a label always
   lands before it is reaped — otherwise the count-up would be triggered by
   the unmount path instead of the landing. */
/* v2.3.1874b: the lift is the BEAT the owner asked for — "show the combat
   skill xp over the character THEN have the xp jump down" — so it has to be
   long enough and tall enough to read as a pause over the bro rather than a
   twitch on the way past.  At the first cut (26px over 380ms) it was neither:
   sampled in play it was barely 1px of movement per observable frame, and the
   label appeared already on its way down. */
const LIFT_MS = 520;
const LIFT_PX = 46;
const FLY_MS = 520;

/* The equipped weapon's skill progress — see the decision note above.
   ═══ v2.3.1686: UNDER PROG3, READ THE TRAINED SKILL ═══
   Owner: "I see an XP bar appear after killing monsters which would be fine
   if it represented one of the three active combat skills you're actually
   earning xp in."
   It didn't.  The decision note above picked the equipped weapon's skill XP
   as the one honest candidate — correct at the time, but it named the LEGACY
   `weaponSkills` track, and v2.3.1659 moved progression to `prog3.sk`.  On a
   prog3 character the old map is whatever it happened to hold when the
   rebuild landed, so the bar showed a level and a fill that no kill was
   feeding: the one candidate chosen for never lying had quietly become the
   liar.  Same reasoning, current track — prog3 keys are the same three
   ('sword' | 'bow' | 'staff'), so activeWeaponCategory still picks the right
   one, and the label uses prog3's own names (Melee / Bow / Magic) so the bar
   agrees with the hero screen and the quest turn-in picker. */
export function weaponSkillProgress(R) {
  if (!R) return null;
  let cat;
  try { cat = activeWeaponCategory(R); } catch (e) { cat = 'sword'; }
  if (prog3Live(R)) {
    const p3 = (R.prog3.sk && R.prog3.sk[cat]) || { level: 1, xp: 0 };
    const meta = PROG3_SKILL_META.find((s) => s.key === cat);
    const p3Level = Math.max(1, Math.min(PROG3.LEVEL_CAP, Math.floor(p3.level || 1)));
    const label = (meta && meta.label) || cat;
    if (p3Level >= PROG3.LEVEL_CAP) {
      return { cat, label, level: p3Level, prog: 1, thresh: 1, pct: 100, maxed: true };
    }
    const p3Thresh = Math.max(1, Math.floor(prog3XpRequired(p3Level)));
    const p3Raw = Math.floor(p3.xp || 0);
    const p3Prog = Math.max(0, Math.min(p3Thresh, Number.isFinite(p3Raw) ? p3Raw : 0));
    return { cat, label, level: p3Level, prog: p3Prog, thresh: p3Thresh,
      pct: (p3Prog / p3Thresh) * 100, maxed: false };
  }
  const sk = (R.weaponSkills && R.weaponSkills[cat]) || { level: 0, xp: 0 };
  const level = Math.max(0, Math.floor(sk.level || 0));
  if (level >= WEAPON_LEVEL_CAP) {
    return { cat, level, prog: 1, thresh: 1, pct: 100, maxed: true };
  }
  const thresh = Math.max(1, Math.floor(weaponXpRequired(level)));
  const raw = Math.floor(sk.xp || 0);
  const prog = Math.max(0, Math.min(thresh, Number.isFinite(raw) ? raw : 0));
  return { cat, level, prog, thresh, pct: (prog / thresh) * 100, maxed: false };
}

export const XpFlyOverlay = () => {
  const [, force] = useState(0);

  /* ═══ v2.3.1874: rAF WHILE SOMETHING IS ON SCREEN ═══
     This was a flat 80ms interval, which is 12fps.  That was fine for what
     the overlay used to be — a number fading in place — but the XP label now
     FLIES, and a 380ms lift sampled every 80ms is five frames: the label
     appears already near the top of its arc, so the beat over the character
     that makes the number readable is mostly not drawn.  (Measured: the rise
     was not observable at all until this changed.)
     Driven by rAF while there are popups, and idle otherwise — the previous
     interval ran forever whether or not anything was on screen. */
  useEffect(() => {
    let raf = 0, alive = true;
    const step = () => {
      if (!alive) return;
      const S0 = (typeof window !== 'undefined') && window._gameState && window._gameState.current;
      if (S0 && S0._hudPopups && S0._hudPopups.length) force((v) => (v + 1) % 1000000);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, []);

  const S = (typeof window !== 'undefined') && window._gameState && window._gameState.current;
  if (!S) return null;
  const pops = S._hudPopups || [];
  const now = Date.now();

  for (let i = pops.length - 1; i >= 0; i--) {
    if (now - pops[i].ts > ENTRY_LIFETIME_MS) pops.splice(i, 1);
  }

  /* Remember the most recent XP gain so the bar can outlive the popup
     that triggered it (the popup dies at ~1.2s, the bar holds ~2.6s). */
  for (const p of pops) {
    if ((p.target || 'xpBar') === 'xpBar' && p.ts > (S._xpBarLastGainTs || 0)) {
      S._xpBarLastGainTs = p.ts;
    }
  }
  const barAge = now - (S._xpBarLastGainTs || 0);
  const barVisible = (S._xpBarLastGainTs || 0) > 0 && barAge < BAR_HOLD_MS + BAR_FADE_MS;

  const goldPops = pops.filter(p => p.target === 'goldIcon');
  const xpPops = pops.filter(p => (p.target || 'xpBar') === 'xpBar');

  if (!pops.length) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 90 }}>
      {goldPops.map((p, i) => <HudPopup key={p.id} pop={p} stackIdx={i} />)}
      {xpPops.map((p) => <XpFlyToCard key={p.id} pop={p} />)}
    </div>
  );
};

/* ═══ v2.3.1874: THE XP LEAVES THE CHARACTER AND LANDS ON ITS SKILL ═══
 *
 * Owner: "show the combat skill xp over the character then have the xp jump
 * down into whatever combat skill earned the xp and increase the number in a
 * quick count up".
 *
 * This replaces v2.3.1638's transient top-centre bar, and replaces rather
 * than joins it deliberately: that bar existed because, as its own note says,
 * "the only XP progress readout in the client ... renders only when the
 * dashboard is expanded" — there was nothing on screen to fly into, so it
 * conjured a bar to fly into.  There IS something now.  The three combat
 * cards (mobile/dash/DashColumns) sit in the resting dashboard with the level
 * and the XP pair on them, so the real readout is on screen during normal
 * play and the number can land on the thing it actually belongs to.  Flying
 * into a second, temporary bar as well would be two answers to one question.
 *
 * THE PATH IS NOT A STRAIGHT LINE.  It starts over the character's head, lifts
 * a little (the beat where the player reads it), then falls to the card — a
 * two-stage move, because a single tween from head to dashboard reads as the
 * label being sucked into the furniture rather than being tossed there.  The
 * lift is what makes it legible before it travels.
 *
 * WHEN THERE IS NOWHERE TO LAND, IT DOES NOT INVENT A DESTINATION.  The card
 * can be off screen — the sheet expanded over it, a menu open — and
 * xpCardPoint returns null.  The label then simply floats and fades where it
 * was born.  The alternative (flying to a fixed screen point) would send it to
 * a place with nothing in it, which is exactly the "pointed at nothing" defect
 * v2.3.1638 was written to fix. */
const XpFlyToCard = ({ pop }) => {
  const elRef = useRef(null);
  const heldRef = useRef(false);
  const landedRef = useRef(false);
  const [, tick] = useState(0);

  const cat = pop.cat || 'sword';

  /* NOTE the hold is NOT taken here.  It is taken in pushHudPopup, at the
     moment of the gain — see the note there.  This component only lands it. */

  useEffect(() => {
    const t = setTimeout(() => {
      if (!landedRef.current) { landedRef.current = true; landXp(cat); tick((v) => v + 1); }
    }, FLY_MS + LIFT_MS);
    return () => {
      clearTimeout(t);
      /* Unmounted mid-flight (the entry aged out, or the overlay went away):
         release the hold anyway or the card's number is frozen for good. */
      if (!landedRef.current) { landedRef.current = true; landXp(cat); }
    };
  }, [cat]);

  const age = Date.now() - pop.ts;
  const start = pop.from || null;
  const dest = xpCardPoint(cat);

  /* No start point means the popup was pushed with no world anchor (an older
     call site); fall back to the middle of the play area rather than 0,0. */
  const sx = start ? start.x : (typeof window !== 'undefined' ? window.innerWidth / 2 : 0);
  const sy = start ? start.y : (typeof window !== 'undefined' ? window.innerHeight * 0.45 : 0);

  let x = sx, y = sy, opacity = 1, scale = 1;
  if (age < LIFT_MS) {
    /* Stage 1 — over the character, lifting. */
    const k = age / LIFT_MS;
    y = sy - LIFT_PX * (1 - (1 - k) * (1 - k));
    scale = 1 + 0.18 * Math.sin(Math.PI * k);
  } else if (dest) {
    /* Stage 2 — the fall into the card. */
    const k = Math.min(1, (age - LIFT_MS) / FLY_MS);
    const e = k * k;                       /* accelerate: it DROPS in */
    x = sx + (dest.x - sx) * e;
    y = (sy - LIFT_PX) + (dest.y - (sy - LIFT_PX)) * e;
    scale = 1 - 0.45 * k;
    opacity = k > 0.75 ? Math.max(0, 1 - (k - 0.75) / 0.25) : 1;
  } else {
    /* Nowhere to land — hold above the character and fade out. */
    const k = Math.min(1, (age - LIFT_MS) / FLY_MS);
    y = sy - LIFT_PX - 10 * k;
    opacity = 1 - k;
  }

  return (
    <div ref={elRef}
      /* v2.3.1874: identifies the flying label unambiguously.  mp-xpfly first
         found it by matching "+N XP" text across every div on the page, which
         is not a selector — it also matched a container and reported the
         label as barely moving because the two samples picked different
         elements. */
      data-xpfly={cat}
      style={{
      position: 'fixed', left: 0, top: 0,
      transform: `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`,
      opacity,
      fontFamily: 'Source Sans 3, sans-serif',
      fontSize: 15, fontWeight: 800, letterSpacing: 0.2,
      color: pop.color || COL.xp,
      textShadow: '0 2px 4px rgba(4,7,9,.95), 0 0 3px rgba(4,7,9,.9)',
      whiteSpace: 'nowrap', pointerEvents: 'none',
    }}>{pop.text}</div>
  );
};

/* ═══ The transient weapon-XP bar, top-centre under the zone header ═══
   Top-centre rather than the bottom band: src/ui/zLayers.js records the
   bottom band as already carved into slots (.bt-interact-prompt at +24,
   .bt-emote-bar at +64) above an opaque dashboard, whereas the strip
   under the zone header is owned by nothing during combat. */
const XpBar = ({ S, pops, age }) => {
  const R = (S && S.rpg) || null;
  const wp = weaponSkillProgress(R);
  /* Level-up flash.  This component re-renders every 80ms, so comparing
     against "the previous render" would light the accent for a single
     frame and be invisible — latch a timestamp and hold it instead. */
  const lastLevelRef = useRef(wp ? wp.level : 0);
  const leveledAtRef = useRef(0);
  if (wp && wp.level > lastLevelRef.current) leveledAtRef.current = Date.now();
  if (wp) lastLevelRef.current = wp.level;
  if (!wp) return null;

  const leveled = Date.now() - leveledAtRef.current < 900;
  const fading = age > BAR_HOLD_MS;
  /* v2.3.1686: prefer prog3's display name ("MELEE"), falling back to the
     raw category for the legacy track. 'staff' reading as MAGIC matters —
     that is what every other screen calls it. */
  const label = String(wp.label || wp.cat || 'sword').toUpperCase();

  return (
    <div style={{
      position: 'fixed',
      left: '50%',
      top: 'calc(env(safe-area-inset-top, 0px) + 58px)',
      transform: 'translateX(-50%)',
      width: 'min(62vw, 260px)',
      opacity: fading ? 0 : 1,
      transition: `opacity ${BAR_FADE_MS}ms ease-in`,
      pointerEvents: 'none',
    }}>
      {/* The "+N XP" messages fly down into the bar from just above it. */}
      {pops.map((p, i) => <XpFlyMessage key={p.id} pop={p} stackIdx={i} />)}

      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        gap: 8, marginBottom: 3,
        fontFamily: 'Source Sans 3, sans-serif',
        textShadow: '0 1px 2px rgba(0,0,0,.9)',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: COL.text2 }}>
          {label} <span style={{ color: COL.text }}>Lv {wp.level}</span>
        </span>
        <span style={{
          fontSize: 10, fontWeight: 600, color: COL.text2,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {wp.maxed ? 'MAX' : `${wp.prog} / ${wp.thresh}`}
        </span>
      </div>

      <div style={{
        height: 7, borderRadius: 4,
        background: COL.well,
        border: `1px solid ${COL.border}`,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,.55)',
      }}>
        <div style={{
          width: `${Math.max(0, Math.min(100, wp.pct))}%`,
          height: '100%',
          background: leveled ? COL.focus : COL.xp,
          /* The fill transition IS the "increases progress" the owner
             asked for — the width lands on the new value over 420ms
             rather than snapping. */
          transition: 'width 420ms cubic-bezier(.22,.9,.3,1), background 220ms linear',
        }} />
      </div>
    </div>
  );
};

/* One "+N XP" message: starts BELOW the bar (screen-side, toward the
   fight) and rises INTO it, then fades — the "jump into the bar" the
   owner described.
   It rises rather than falls for a concrete geometric reason: the bar
   sits just under .bt-zone-header, which spans top:-4px to
   safe-area + 46px (src/styles/game.css).  A message starting ABOVE the
   bar would launch inside that rail and, at z90 vs the header's z20,
   paint straight over the zone title.  Rising from below also reads
   better — the number travels from the kill toward the bar it feeds.
   Double rAF before flipping to the end state: a single rAF can be
   batched into the same style recalc as the initial paint, which makes
   the browser skip the transition entirely and the message vanish
   instantly. */
const XpFlyMessage = ({ pop, stackIdx }) => {
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setLanded(true));
    });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, []);

  return (
    <div style={{
      position: 'absolute',
      left: 0, right: 0,
      top: '100%',
      marginTop: 4,
      textAlign: 'center',
      transform: landed
        ? 'translateY(-6px) scale(0.92)'
        : `translateY(${XP_FLY_RISE_PX + stackIdx * 15}px) scale(1.06)`,
      opacity: landed ? 0 : 1,
      transition: `transform ${XP_FLY_MS}ms cubic-bezier(.4,.05,.25,1), opacity ${XP_FLY_MS}ms ease-in`,
      color: pop.color || COL.xp,
      fontFamily: 'Source Sans 3, sans-serif',
      fontWeight: 800,
      fontSize: 19,
      textShadow: '0 1px 2px rgba(0,0,0,.9), 0 0 6px rgba(0,0,0,.55)',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
    }}>
      {pop.text}
    </div>
  );
};

/* Gold pickups, anchored to the coin chip they actually change.
   v2.3.1638: this popup was orphaned the same way the XP one was, just
   later.  It floated in the TOP-RIGHT corner because that is where the
   retired identity card kept the gold readout — but at v2.3.1563 the
   owner moved the live coin count to the BOTTOM-LEFT band edge
   (mobile/BottomDashboard.jsx, "should be bottom left corner of screen").
   So "+N G" was animating in the opposite corner of the screen from the
   number it was announcing.  It now rises out of the chip.
   Bottom-anchored via calc(var(--dash-h) + Npx) per rule 2 in
   src/ui/zLayers.js — a high z alone would float it OVER the dashboard
   instead of clearing the band. */
const HudPopup = ({ pop, stackIdx }) => {
  const [phase, setPhase] = useState(0); /* 0 = mounted, 1 = drifted */
  useEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setPhase(1));
    });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        left: 8,
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + var(--dash-h, 135px) + 20px + '
          + (stackIdx * STACK_SPACING_PX) + 'px)',
        textAlign: 'left',
        /* Rises out of the chip and fades — a gain moving up off the
           counter it just incremented. */
        transform: 'translateY(' + (phase === 1 ? -14 : 0) + 'px)',
        opacity: phase === 1 ? 0 : 1,
        /* v2.3.1233: Lantern Slate semantic fallback — coin gold #D8A94D. */
        color: pop.color || '#D8A94D',
        fontFamily: 'Source Sans 3, sans-serif',
        fontWeight: 800,
        fontSize: 17,
        textShadow: '0 1px 2px rgba(0,0,0,.9), 0 0 4px rgba(0,0,0,.55)',
        transition: 'transform ' + LIFE_MS + 'ms ease-out, opacity ' + LIFE_MS + 'ms ease-in',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {pop.text}
    </div>
  );
};

/* Helper used by the combat/loot paths to enqueue a HUD-anchored popup. */
export function pushHudPopup(S, opts) {
  if (!S) return;
  if (!S._hudPopups) S._hudPopups = [];
  const _cat = opts.cat || _activeCat(S);
  /* ═══ v2.3.1874: THE HOLD IS TAKEN HERE, AT THE GAIN ═══
     Not when the flying label first renders, which is where it started and
     which was wrong by about one overlay frame.  The overlay repaints on an
     80ms interval, so the label mounts up to 80ms after the gain — and prog3
     XP is server-authoritative, so a player_state delta can land inside that
     window.  When it did, the card had already snapped to the new number
     before anything was holding it, and the count-up then had nothing left to
     count: measured 0 -> 168 in a single step, which is the exact jump this
     whole mechanism exists to prevent.  Taking the hold synchronously with
     the gain closes the window entirely. */
  if ((opts.target || 'xpBar') === 'xpBar') {
    try { holdXp(_cat); } catch (e) { /* feedback only */ }
  }
  S._hudPopups.push({
    id: 'hp_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
    target: opts.target || 'xpBar',
    text: opts.text || '',
    color: opts.color || null,
    /* v2.3.1874: WHICH SKILL, resolved HERE rather than at render time.  The
       player can switch weapons during the ~0.9s the label is in the air, and
       the XP that is already earned belongs to the weapon that earned it. */
    cat: _cat,
    /* ...and WHERE THE CHARACTER IS, in screen pixels, for the same reason:
       the camera moves, so a point captured at render time is a point on a
       different frame.  Null when the world is not on screen yet. */
    from: opts.from || playerScreenPoint(S),
    ts: Date.now(),
  });
}

/* The skill a kill's XP belongs to — the equipped weapon's category, which is
   what the server credits (server/src/prog3.js `_prog3AwardXp` is called with
   the damage source's category).  Falls back to sword, matching
   activeWeaponCategory's own default. */
function _activeCat(S) {
  try { return activeWeaponCategory(S && S.rpg); } catch (e) { return 'sword'; }
}

/** The player's head, in screen (CSS) pixels — where an XP label is born.
 *  Uses the same camera arithmetic every other world-anchored HUD element in
 *  BroTown uses (`(world - camera) * _worldScale`), offset up by roughly a
 *  body height so the label sits OVER the character rather than inside them.
 *  Returns null when there is no camera yet (pre-game), and the overlay then
 *  falls back to mid-screen. */
/* v2.3.1874 test seam: mp-xpfly drives gains through the REAL entry point so
   the flight it measures is the shipped one — cat resolution, world anchor and
   all — rather than a fixture that could agree with a broken renderer.  One
   assignment, no behaviour attached to it. */
try {
  if (typeof window !== 'undefined') window.__btPushXp = (S, opts) => pushHudPopup(S, opts);
} catch (e) { /* non-browser import */ }

export function playerScreenPoint(S) {
  try {
    if (!S || !S.player || !S.camera) return null;
    const cv = document.querySelector('canvas');
    if (!cv) return null;
    const r = cv.getBoundingClientRect();
    const sx = S._worldScaleX || 1, sy = S._worldScaleY || 1;
    return {
      x: r.left + (S.player.x - S.camera.x) * sx,
      y: r.top + (S.player.y - S.camera.y) * sy - 46,
    };
  } catch (e) { return null; }
}
