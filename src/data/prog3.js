/* ═══ v2.3.1660: PROG3 client mirror — the trained-skill combat rebuild ═══
 *
 * Client half of the owner-approved combat redesign
 * (docs/PROGRESSION-REDESIGN.md; server core v2.3.1659 in
 * server/src/prog3.js — THE source of truth).  Every constant below
 * MIRRORS the server's PROG3 config: the server computes the
 * authoritative rolls, pools and levels; these mirrors exist so
 * displays and local predictions print the same numbers the wire will
 * confirm.  Change server and client TOGETHER or every readout drifts.
 *
 * Deploy-order gate (the setT2SimpleEnabled pattern): wsClient flips
 * _enabled from state_sync caps.prog3.  Against an old worker the flag
 * stays off and every branch keeps the full legacy math, so the client
 * keeps matching THAT worker's rolls and echoes (rule 19).  prog3Live
 * additionally requires rpg.prog3 itself (adopted from player_state —
 * server-owned, never written locally except by the ack handlers). */

export const PROG3 = {
  SKILLS: ['sword', 'bow', 'staff'], // storage keys; displayed Melee / Bow / Magic
  LEVEL_CAP: 100,
  CHAR_LEVEL_CAP: 300,
  /* v2.3.1668: BODY is global, ATK is allocated per combat type — see
     the server's PROG3 block for the reasoning.  Mirror both or the
     readouts drift from the rolls. */
  BODY: {
    def:     { cap: 100, per: 0.004 },  // −0.4% damage taken/pt
    hp:      { cap: 100, per: 8 },      // +8 max HP/pt
    dodge:   { cap: 75,  per: 0.004 },  // +0.4% dodge/pt
    stam:    { cap: 100, per: 3 },      // +3 max stamina/pt
  },
  ATK: {
    crit:    { cap: 75,  per: 0.004 },  // +0.4% crit/pt, PER TYPE
    critDmg: { cap: 100, per: 2 },      // +2 flat on crits/pt, PER TYPE
    aspd:    { cap: 100, per: 0.0035 }, // −0.35% swing period/pt, PER TYPE
  },
  /* v2.3.1727: the retune PROGRESSION-REDESIGN #13 deferred — the §7-A
     placeholders bought +17.7% damage over ten character levels, which the
     owner correctly read as "level 13 doesn't feel stronger than level 3".
     The reasoning, the measured hits-to-kill table and the XP_PER_DMG
     coupling all live on the SERVER copy (server/src/prog3.js), which is
     the source of truth; these three lines are its mirror and must move
     with it or every predicted number drifts from the wire. */
  DMG_PER_LEVEL: { sword: 1.5, bow: 1.5, staff: 1.8 },
  HP_PER_LEVEL: 6,
  /* v2.3.1734: mana finally progresses.  The special's cost was
     floor(maxMana/5) — a fraction of max, so exactly 5 casts at Magic 1
     and exactly 5 at Magic 100, and (because regen is also a % of max)
     a flat 7.4s per sustained cast at every level.  Flat cost + a
     steeper pool makes Magic buy real casts: 4 at Magic 1, 14 at Magic
     100.  The full reasoning, the pacing table and the deliberate
     floor nerf live on the SERVER copy (server/src/prog3.js), which is
     the source of truth; these lines are its mirror and must move with
     it or the charge pie promises casts the worker refuses. */
  MANA_PER_MAGIC_LEVEL: 2.5,
  SPECIAL_MANA_COST: 25,
  /* v2.3.1734: Element Burst (COMBAT-OVERHAUL-PLAN PR 6).  Display
     gates only — the server validates every one of these from its own
     copy of the weapon and pools. */
  BURST_MIN_CHAR_LEVEL: 6,
  BURST_MANA_COST: 25,
  BURST_CD_MS: 3000,
  BURST_RADIUS: 70,
  BURST_DMG_MULT: 1.5,
};

/* The Build screen's row order + copy.  `perText` states the per-point
   value in the player's language (LANTERN-SLATE: say what a point
   buys, no jargon). */
/* v2.3.1668: two menus.  ATK rows belong to the selected combat type;
   BODY rows are shared across all three. */
/* v2.3.1694 (owner: "add little thumbnails that represent each thing …
   all of that has been added to the game before and were stripped
   out"): the allocation cells are back on the owner's hero-stat art,
   the same `iconSrc` contract PROG3_SKILL_META and heroModel's
   COMBAT_SKILLS already use.  The rebuild's cells shipped text-only at
   v2.3.1660 because the seven-stat grid was fighting for every pixel of
   the no-scroll budget — the icons return in the row that already
   exists (icon left, label+points stacked right, the v2.3.1311f tile
   recipe), so cell height is unchanged and mp-prog3's "fits without
   scrolling" assertion still holds.
   EVERY path below is a file that exists on disk — a missing thumbnail
   renders as a broken-image glyph inside the tap target, which is worse
   than no icon at all.  `aspd` borrows the t2 Tempo art (the repo's
   only attack-speed drawing, role 'atkspd'); it is sword-flavoured, so
   swap it the day a type-neutral swing-speed icon exists. */
/* v2.3.1766: `unit` and `pct` describe how the stat's RUNNING TOTAL reads, for
   the allocation tooltip (statPreview.js) — `perText` above is a rate, and a
   rate cannot answer "what will my crit BE".  Declared here, beside the stat's
   own name, so a new stat states how it displays instead of the tooltip
   carrying a table of special cases.
   `pct: true` means the stored value is a fraction to be shown x100. */
export const PROG3_ATK_META = [
  { key: 'crit',    label: 'Crit',      perText: '+0.4% crit chance',  pct: true, unit: '%', iconSrc: '/icons/ui/hero/crit.webp?v=2.3.1694' },
  { key: 'critDmg', label: 'Crit Dmg',  perText: '+2 damage on crits', unit: ' dmg', iconSrc: '/icons/ui/hero/damage.webp?v=2.3.1694' },
  /* Atk Speed's points SHORTEN the swing, so its total is a reduction — the
     label below says "faster" rather than printing a negative. */
  { key: 'aspd',    label: 'Atk Speed', perText: '−0.35% swing time',  pct: true, unit: '% faster', iconSrc: '/icons/ui/t2/sword-tempo.webp?v=2.3.1694' },
];
export const PROG3_BODY_META = [
  { key: 'def',   label: 'Defense', perText: '−0.4% damage taken', pct: true, unit: '% less damage', iconSrc: '/icons/ui/hero/defense.webp?v=2.3.1694' },
  { key: 'hp',    label: 'Max HP',  perText: '+8 max HP',          unit: ' HP', iconSrc: '/icons/ui/hero/hp-heart.webp?v=2.3.1922' } /* v2.3.1922: plain heart */,
  { key: 'dodge', label: 'Dodge',   perText: '+0.4% dodge',        pct: true, unit: '%', iconSrc: '/icons/ui/hero/dodge.webp?v=2.3.1694' },
  { key: 'stam',  label: 'Stamina', perText: '+3 max stamina',     unit: ' stamina', iconSrc: '/icons/ui/hero/stamina.webp?v=2.3.1694' },
];

export const PROG3_SKILL_META = [
  { key: 'sword', label: 'Melee', iconSrc: '/icons/ui/hero/melee.webp?v=2.3.1311' },
  { key: 'bow',   label: 'Bow',   iconSrc: '/icons/ui/hero/bow.webp?v=2.3.1311' },
  { key: 'staff', label: 'Magic', iconSrc: '/icons/ui/hero/magic.webp?v=2.3.1311' },
];

/* XP to go from trained level L to L+1 — the legacy weapon curve
   (280 × 1.16^L) shifted one because prog3 levels are 1-based.
   Mirrors server prog3XpRequired. */
export function prog3XpRequired(level) {
  return Math.ceil(280 * Math.pow(1.16, Math.max(0, (level || 1) - 1)));
}

var _enabled = false;
export function setProg3Enabled(on) { _enabled = !!on; }
export function isProg3Enabled() { return _enabled; }

/* ═══ v2.3.1734: caps.elemBurst — the deploy-order gate for BOTH halves
   of the mana rework (server/src/join.js advertises it) ═══

   It gates the obvious thing (the Element Burst button and its send) and
   one non-obvious thing: the FLAT special-attack mana cost.  The cost is
   charged by the WORKER (_abilityCost), so a new client against an OLD
   worker that still charges floor(maxMana/5) must keep predicting the
   old formula — otherwise the charge pie draws 4 segments while the
   worker funds 5, and the local mana prediction drifts from the wire on
   every cast.  Rule 19, exactly. */
var _burstCaps = false;
export function setElemBurstEnabled(on) { _burstCaps = !!on; }
export function isElemBurstEnabled() { return _burstCaps; }

/* The special's mana cost, client-side.  ONE definition — playerActions
   (the spend) and SpecialChargePie (the readout) must never disagree
   about it, which is precisely how the 5-segment contract rotted into a
   comment nobody could act on. */
export function specialManaCost(rpg) {
  if (_burstCaps) return PROG3.SPECIAL_MANA_COST;
  return Math.floor(((rpg && rpg.maxMana) || 100) / 5); /* legacy worker */
}

/* The weapon the burst will actually fire, client-side.  Deliberately NOT
   getActiveWeapon(): that helper falls back to the MELEE weapon when the
   active ranged/staff slot is empty, and neither the server's burst
   (burst.js _burstActiveWeapon) nor the damage roll (_computeAttackDamage)
   does — so using it here would show the button, tinted with the sword's
   element, for a player holding an empty bow slot, and the cast would be
   refused.  Mirrors the server's resolution exactly. */
export function burstWeapon(rpg) {
  var slot = (rpg && rpg.activeSlot) || 'melee';
  if (slot === 'ranged') return rpg && rpg.rangedWeapon;
  if (slot === 'staff') return rpg && rpg.staffWeapon;
  return rpg && rpg.weapon;
}

/* Element Burst eligibility, client-side — a DISPLAY gate.  The server
   re-checks all four conditions from its own state (burst.js
   _burstRefusal) and this function is allowed to be wrong without
   anything being exploitable; it exists so the button only appears when
   pressing it would work.  Returns null when eligible, else the reason. */
export function burstRefusal(rpg, weapon, lastCastAt) {
  if (!_burstCaps) return 'caps';
  if (!rpg) return 'no_player';
  var lvl = prog3Live(rpg) ? prog3CharLevel(rpg) : (rpg.level || 0);
  if (lvl < PROG3.BURST_MIN_CHAR_LEVEL) return 'level';
  if (!weapon) return 'no_weapon';
  if (!weapon.element1) return 'no_element';
  if ((rpg.mana || 0) < PROG3.BURST_MANA_COST) return 'mana';
  if (lastCastAt && Date.now() - lastCastAt < PROG3.BURST_CD_MS) return 'cooldown';
  return null;
}

/* The one gate every branch reads: worker capability AND an adopted
   server-owned prog3 blob.  Either alone is a half-migrated state that
   must keep the legacy math (a caps-on worker still sends the blob in
   the same state_sync/player_state pair, so the window is one tick). */
export function prog3Live(rpg) {
  return !!(_enabled && rpg && rpg.prog3 && rpg.prog3.sk);
}

/* v2.3.1902: does the BLOB carry trained skills, regardless of whether this
   worker advertises caps.prog3?

   prog3Live answers "may I run prog3 MATH and send prog3 MESSAGES" — it
   rightly requires the cap, because derived pools and allocation have to
   match the worker that will echo them (rule 19).  Reading a level that is
   already sitting in the blob is a different question, and gating it on the
   cap is what made the stat screen report 0 for a character the server had
   at 1: with the cap off, the display fell back to the legacy `weaponSkills`
   map that v2.3.1659 left behind at all zeros.

   A stale corpse is never a better answer than the real record.  If the blob
   has prog3.sk, that IS the trained level; if it has no blob at all, there is
   nothing to read and the legacy path still applies. */
export function prog3HasSkills(rpg) {
  return !!(rpg && rpg.prog3 && rpg.prog3.sk);
}

export function prog3SkillLevel(rpg, cat) {
  var sk = rpg && rpg.prog3 && rpg.prog3.sk && rpg.prog3.sk[cat];
  return sk ? Math.max(1, Math.min(PROG3.LEVEL_CAP, sk.level || 1)) : 1;
}

export function prog3CharLevel(rpg) {
  var sum = 0;
  for (var i = 0; i < PROG3.SKILLS.length; i++) sum += prog3SkillLevel(rpg, PROG3.SKILLS[i]);
  return Math.min(PROG3.CHAR_LEVEL_CAP, sum);
}

/* A GLOBAL body stat. */
export function prog3Pts(rpg, stat) {
  var a = rpg && rpg.prog3 && rpg.prog3.alloc;
  var v = a && a[stat];
  var cap = PROG3.BODY[stat] ? PROG3.BODY[stat].cap : 0;
  return (typeof v === 'number') ? Math.max(0, Math.min(cap, v)) : 0;
}
/* A PER-TYPE offense stat. cat is 'sword' | 'bow' | 'staff'. */
export function prog3AtkPts(rpg, cat, stat) {
  var a = rpg && rpg.prog3 && rpg.prog3.atk && rpg.prog3.atk[cat];
  var v = a && a[stat];
  var cap = PROG3.ATK[stat] ? PROG3.ATK[stat].cap : 0;
  return (typeof v === 'number') ? Math.max(0, Math.min(cap, v)) : 0;
}
/* greatsword shares the sword/melee category, matching the server. */
export function prog3CatFor(weaponType) {
  return weaponType === 'bow' ? 'bow' : weaponType === 'staff' ? 'staff' : 'sword';
}
/* The category whose offense stats apply to what you are holding. */
export function prog3ActiveCat(rpg) {
  var slot = rpg && rpg.activeSlot;
  return slot === 'ranged' ? 'bow' : slot === 'staff' ? 'staff' : 'sword';
}

export function prog3Pool(rpg) {
  var p = rpg && rpg.prog3 && rpg.prog3.pool;
  return (typeof p === 'number' && p > 0) ? Math.floor(p) : 0;
}

/* §6-C double cap: the stat's own hard cap AND min(100, char level) —
   mirrors the server's allocation gate so the [+] button disables at
   exactly the point the server would refuse. */
/* ═══ v2.3.2176: POINTS REMEMBER THE SKILL THAT EARNED THEM ═══
   Owner: "You earn stat points that one of those primary combat skills
   channels.  You can only apply offensive weapon damage to the combat
   skills you leveled up in.  However you can apply that stat point to any
   defensive attribute ... regardless of what channel you earned the point
   through."

   `poolBy[cat]` is what that skill earned.  Whatever `pool` holds beyond
   the sum of the channels is legacy — points banked before the rule
   existed — and is spendable ANYWHERE, which is the only migration that
   does not stranded somebody's earned points behind a rule that post-dates
   them.  The server enforces all of this (prog3.js _handleProg3Allocate);
   these are the readouts so the screen can say the same thing the worker
   will do. */
export function prog3PoolBy(rpg, cat) {
  var by = rpg && rpg.prog3 && rpg.prog3.poolBy;
  var n = by && Number(by[cat]);
  return (typeof n === 'number' && n > 0) ? Math.floor(n) : 0;
}
/* Points with no channel on record — spendable on anything. */
export function prog3PoolAny(rpg) {
  var total = prog3Pool(rpg);
  var summed = 0;
  for (var i = 0; i < PROG3.SKILLS.length; i++) summed += prog3PoolBy(rpg, PROG3.SKILLS[i]);
  return Math.max(0, total - summed);
}
/* What this lane can actually spend: its own points plus the free ones. */
export function prog3PoolFor(rpg, cat) {
  return prog3PoolBy(rpg, cat) + prog3PoolAny(rpg);
}

export function prog3StatCap(rpg, stat) {
  var d = PROG3.BODY[stat] || PROG3.ATK[stat];
  return Math.min(d ? d.cap : 0, prog3CharLevel(rpg));
}
export function prog3IsAtkStat(stat) {
  return !!PROG3.ATK[stat];
}

export function prog3DodgePct(rpg) { return prog3Pts(rpg, 'dodge') * PROG3.BODY.dodge.per; }
/* v2.3.1668: crit/critDmg read the ACTIVE weapon's block unless a
   category is named (loadout previews pass one explicitly). */
export function prog3CritPct(rpg, cat) { return prog3AtkPts(rpg, cat || prog3ActiveCat(rpg), 'crit') * PROG3.ATK.crit.per; }
export function prog3CritFlat(rpg, cat) { return prog3AtkPts(rpg, cat || prog3ActiveCat(rpg), 'critDmg') * PROG3.ATK.critDmg.per; }
export function prog3DefPct(rpg) { return prog3Pts(rpg, 'def') * PROG3.BODY.def.per; }

/* The trained-level damage term replacing stat × 0.1667 — mirrors the
   server's _computeAttackDamage branch (specials scale on Magic and
   are handled at the call sites that know isSpecial). */
export function prog3DmgTerm(rpg, weaponType) {
  var cat = weaponType === 'bow' ? 'bow' : weaponType === 'staff' ? 'staff' : 'sword';
  return prog3SkillLevel(rpg, cat) * PROG3.DMG_PER_LEVEL[cat];
}
