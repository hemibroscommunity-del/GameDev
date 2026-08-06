import React, { useEffect, useRef, useState } from 'react';
import { COL } from '@/ui/mobile/dash/common.js';
import { activeWeaponCategory, weaponXpRequired, WEAPON_LEVEL_CAP } from '@/data/gameSystems.js';

/* HudPopupOverlay — HUD-anchored "+N XP" / "+N G" feedback, plus the
   transient XP bar the XP popup flies into.  Reads entries pushed to
   S._hudPopups by the combat-XP and gold-drop paths.
   Each entry has { id, target, text, color, ts }.
     target = 'xpBar'    -> the combat-XP message + progress bar (below)
     target = 'goldIcon' -> the gold pickup number, top-right
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
const ENTRY_LIFETIME_MS = LIFE_MS + 100;
const STACK_SPACING_PX = 22;

const BAR_HOLD_MS = 2600;         /* bar stays up this long after the last gain */
const BAR_FADE_MS = 420;
const XP_FLY_MS = 620;            /* message travel time into the bar */
const XP_FLY_RISE_PX = 34;        /* how far above the bar the message starts */

/* The equipped weapon's skill progress — see the decision note above. */
export function weaponSkillProgress(R) {
  if (!R) return null;
  let cat;
  try { cat = activeWeaponCategory(R); } catch (e) { cat = 'sword'; }
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

  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 80);
    return () => clearInterval(id);
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

  if (!pops.length && !barVisible) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 90 }}>
      {goldPops.map((p, i) => <HudPopup key={p.id} pop={p} stackIdx={i} />)}
      {barVisible && <XpBar S={S} pops={xpPops} age={barAge} />}
    </div>
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
  const label = String(wp.cat || 'sword').toUpperCase();

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

/* Gold pickups keep the in-place top-right float they have always had. */
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
        right: 'calc(env(safe-area-inset-right, 0px) + 12px)',
        top: 'calc(env(safe-area-inset-top, 0px) + 60px + ' + (stackIdx * STACK_SPACING_PX) + 'px)',
        textAlign: 'right',
        transform: 'translateY(' + (phase === 1 ? 8 : 0) + 'px)',
        opacity: phase === 1 ? 0 : 1,
        /* v2.3.1233: Lantern Slate semantic fallback — coin gold #D8A94D. */
        color: pop.color || '#D8A94D',
        fontFamily: 'Source Sans 3, sans-serif',
        fontWeight: 700,
        fontSize: 20,
        textShadow: '0 1px 2px rgba(0,0,0,.85), 0 0 4px rgba(0,0,0,.5)',
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
  S._hudPopups.push({
    id: 'hp_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
    target: opts.target || 'xpBar',
    text: opts.text || '',
    color: opts.color || null,
    ts: Date.now(),
  });
}
