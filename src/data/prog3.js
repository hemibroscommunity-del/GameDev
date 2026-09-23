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

/* v2.3.2302: the ONE cost primitive, shared with the ability table.
   abilities.js imports nothing, so this direction cannot cycle -- and it
   is the same direction the server uses (server/src/prog3.js imports
   abilities.js, never the reverse). */
import { rpgBlockSize } from './abilities.js';

export const PROG3 = {
  SKILLS: ['sword', 'bow', 'staff'], // storage keys; displayed Melee / Bow / Magic
  LEVEL_CAP: 100,
  CHAR_LEVEL_CAP: 300,
  /* v2.3.2199: 3 points per level-up (was 1) — the level banner reads
     this; the mint itself is the server's (prog3.js _prog3AwardXp). */
  POINTS_PER_LEVEL: 3,
  /* v2.3.2592: ...and the SHARED points minted beside them, one per lane
     point (owner: "you earn one 'shared' point too").  The level banner
     reads this; the mint is the server's (prog3.js _prog3AwardXp). */
  SHARED_POINTS_PER_LEVEL: 3,
  /* v2.3.1668: BODY is global, ATK is allocated per combat type — see
     the server's PROG3 block for the reasoning.  Mirror both or the
     readouts drift from the rolls.
     v2.3.2592: the four-column redesign — SIX per-type stats (Range, Power,
     Speed, Luck, Special, Elemental) and SEVEN shared ones (HP, Def, MP,
     Stamina, Dodge, Move Speed, Elem Resist).  Storage keys stay where a
     stat already existed (dmg / aspd / elem); crit + critDmg fold into
     `luck`; range / special / move are new.  The reasoning lives on the
     SERVER copy (server/src/prog3.js), which is the source of truth;
     mirror-audit §12 pins values AND key sets. */
  /* v2.3.2670: RELATIVE POINT VALUE — the curve stats read max × q/(q+k)
     (q = points × the EDGE for the seven that change a hit) instead of
     pts × per; `cap` on them is the 999 storage bound and `lvlBound` loosens
     the per-level bound on the four damage stats.  The reasoning lives on
     the SERVER copy (server/src/prog3.js); these rows are its mirror, and
     mirror-audit §12 pins values AND key sets.  Against a worker without
     caps.prog3rel the readers below fall back to PROG3_LINEAR. */
  BODY: {
    def:     { cap: 999, max: 0.90, k: 7, rel: true },  // v2.3.2670: damage-taken cut on the curve
    hp:      { cap: 100, per: 8 },      // +8 max HP/pt
    dodge:   { cap: 999, max: 0.90, k: 7, rel: true },  // v2.3.2670: 5 pts 37.5 %
    stam:    { cap: 100, per: 3 },      // +3 max stamina/pt
    /* v2.3.2512: elem LEFT for ATK (per weapon); eres + mana arrive.  The
       reasoning for all three lives on the SERVER copy (server/src/prog3.js),
       which is the source of truth; these are its mirror and mirror-audit §12
       pins both the values AND the key sets. */
    eres:    { cap: 999, max: 0.90, k: 7, rel: true },  // v2.3.2670: elemental-damage cut on the curve
    mana:    { cap: 100, per: 2.5 },    // +2.5 max mana/pt, ON TOP of the Magic-level pool
    move:    { cap: 999, max: 0.35, k: 10 },  // v2.3.2670: move speed on the curve, client-consumed (BroTown.jsx)
  },
  ATK: {
    range:   { cap: 999, max: 0.55, k: 10 },  // v2.3.2670: reach on the curve, PER TYPE, client-consumed
    /* v2.3.2210: the flat 1% base every character starts with -- the
       reasoning (and why anticheat does not move) lives on the SERVER copy,
       server/src/prog3.js, which is the source of truth; mirror-audit pins
       the two together.
       v2.3.2592: crit + critDmg are ONE stat, LUCK: `per` is the crit-chance
       rate (1% + 0.3%/pt → 31% at the 100-pt cap) and `dmgPer` the
       crit-damage rate (+1%/pt → ×2.5).  The retired pair lives on in
       PROG3_LEGACY_ATK below, for old-worker prediction only. */
    luck:    { cap: 999, max: 0.60, dmgMax: 2.0, base: 0.01, k: 7, rel: true, lvlBound: 2 },  // v2.3.2670: crit chance + multiplier on the curve
    aspd:    { cap: 999, max: 0.39, k: 10 },  // v2.3.2670: swing period cut on the curve, PER TYPE
    dmg:     { cap: 999, max: 1.0, k: 7, rel: true, lvlBound: 2 },  // v2.3.2670: Power — a MULTIPLIER on (base + skill), PER TYPE
    elem:    { cap: 999, max: 120, k: 10, rel: true, lvlBound: 2 },  // v2.3.2670: elemental power on the curve, PER TYPE
    special: { cap: 999, max: 1.5, k: 7, rel: true, lvlBound: 2 },  // v2.3.2670: special damage on the curve, PER TYPE
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
     copy of the weapon and pools.
     v2.3.2662: BURST_MIN_CHAR_LEVEL left this table with the milestone
     ladder (the server dropped it in the same version); the old-worker
     copy is LEGACY_BURST_MIN_CHAR_LEVEL below. */
  BURST_MANA_COST: 25,
  BURST_CD_MS: 3000,
  BURST_RADIUS: 70,
  BURST_DMG_MULT: 1.5,
  /* v2.3.2670: the edge's fade per level above you, and the base-damage
     floor under Dodge × Defense — the server's two new scalars. */
  EDGE_FADE: 0.20,
  FLOOR: 0.10,
};

/* ═══ v2.3.2670: THE RETIRED LINEAR ROWS, FOR OLD-WORKER PREDICTION ONLY ═══
   A worker without caps.prog3rel still rolls `pts × per` against these caps,
   so against it every reader below predicts THIS math (rule 19) — the
   PROG3_LEGACY_ATK posture.  Not part of PROG3 (mirror-audit compares
   PROG3's rows with the server's, and these are gone there).  Delete with
   the fallback once every worker advertises caps.prog3rel. */
export const PROG3_LINEAR = {
  def:     { cap: 100, per: 0.004 },
  dodge:   { cap: 75,  per: 0.004 },
  eres:    { cap: 75,  per: 0.004 },
  move:    { cap: 75,  per: 0.004 },
  range:   { cap: 100, per: 0.005 },
  luck:    { cap: 100, per: 0.003, dmgPer: 0.01, base: 0.01 },
  aspd:    { cap: 100, per: 0.0035 },
  dmg:     { cap: 75,  per: 0.5 },
  elem:    { cap: 75,  per: 1 },
  special: { cap: 75,  per: 0.01 },
};

/* ═══ v2.3.2592: THE RETIRED CRIT PAIR, FOR OLD-WORKER PREDICTION ONLY ═══
   A worker that has not folded crit/critDmg into Luck (no
   caps.prog3shared) still rolls off these two per-type stats, still echoes
   them in the blob, and still refuses `luck` at its whitelist — so against
   it the client must draw THESE rows and predict THIS math (rule 19).  Not
   part of PROG3 (mirror-audit pins PROG3's key sets against the server's,
   and these keys are gone there); the same posture as the literal 2 in
   prog3CritFlat.  Delete with the fallback once every worker advertises
   caps.prog3shared. */
export const PROG3_LEGACY_ATK = {
  crit:    { cap: 75,  per: 0.004, base: 0.01 },
  critDmg: { cap: 100, per: 0.01 },
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
/* v2.3.2199: rows carrying `capsProg3x: true` exist only on a prog3x
   worker; critDmg carries BOTH copies of its per-point text because its
   SEMANTICS changed (flat +2 → +1% on the multiplier) and the row must
   describe what the connected worker actually rolls.  Consumers go
   through prog3AtkMeta()/prog3BodyMeta() below, which resolve against
   the live caps flag — mapping the raw arrays would show stats an old
   worker silently refuses to allocate. */
/* ═══ v2.3.2592: THE OWNER'S SIX, IN THE OWNER'S ORDER ═══
   "Range, Power, Speed, Luck, Special, Elemental."  The LABEL carries the
   new name; the storage KEY stays where the stat already existed (dmg /
   aspd / elem) because renaming a persisted field breaks saves (rule 1).
   `dpsNote` is what the ℹ️ window says in place of "does not change
   damage" for a stat whose job is not sustained damage — "reach, not
   damage" is an answer, "does not change damage" beside RANGE is a bug
   report.  `capsProg3Shared` rows exist only on a worker carrying the
   folded grid; `legacyOnly` rows exist only on one that does not. */
export const PROG3_ATK_META = [
  { key: 'range',   label: 'Range',     perText: '+0.5% reach', perTextRel: 'reach farther — the first points count most',                        pct: true, unit: '% farther',        iconSrc: '/icons/ui/t2/bow-longshot.webp?v=2.3.2592',     capsProg3Shared: true, dpsNote: 'reach, not damage' , tint: '#842D95' },
  { key: 'dmg',     label: 'Power',     perText: '+0.5 damage per hit', perTextRel: 'hit harder — the first points count most', unitRel: '% more damage', pctRel: true,                unit: ' dmg',                        iconSrc: '/icons/ui/hero/dps.webp?v=2.3.2199',            capsProg3x: true , tint: '#5C5851' },
  /* Speed's points SHORTEN the swing, so its total is a reduction — the
     label below says "faster" rather than printing a negative. */
  { key: 'aspd',    label: 'Speed',     perText: '−0.35% swing time', perTextRel: 'swing faster — the first points count most',                  pct: true, unit: '% faster',         iconSrc: '/icons/ui/t2/sword-tempo.webp?v=2.3.1694' , tint: '#2C4F59' },
  { key: 'luck',    label: 'Luck',      perText: '+0.3% crit chance, +1% crit damage', perTextRel: 'more crits, and bigger — the first points count most', pct: true, unit: '% crit chance',    iconSrc: '/icons/ui/hero/crit.webp?v=2.3.1694',           capsProg3Shared: true , tint: '#8E3B1F' },
  { key: 'special', label: 'Special',   perText: '+1% special attack damage', perTextRel: 'stronger specials — the first points count most',          pct: true, unit: '% special damage', iconSrc: '/icons/ui/t2/staff-overload.webp?v=2.3.2592',   capsProg3Shared: true, dpsNote: 'special attacks only' , tint: '#326762' },
  /* v2.3.2512: elemental power, per weapon — burns/roots/thorns and element
     collisions from THIS weapon scale off it.  The detonation drawing is
     still the closest the repo has; swap the day a dedicated icon exists. */
  { key: 'elem',    label: 'Element',   infoKey: 'Elemental', perText: '+1 elemental power', perTextRel: 'stronger burns and combos — the first points count most',                 unit: ' power',                      iconSrc: '/icons/ui/t2/staff-detonation.webp?v=2.3.2199', capsProg3Elem: true , tint: '#48239F' },
  /* The RETIRED pair, drawn only against a worker that has not folded them
     into Luck — that worker still rolls off crit and critDmg, so those are
     the rows it must show (rule 19).  Same copy they shipped with. */
  { key: 'crit',    label: 'Crit',      perText: '+0.4% crit chance',  pct: true, unit: '%',       iconSrc: '/icons/ui/hero/crit.webp?v=2.3.1694',   legacyOnly: true },
  { key: 'critDmg', label: 'Crit Dmg',  perText: '+1% crit damage',    pct: true, unit: '% extra', perTextLegacy: '+2 damage on crits', unitLegacy: ' dmg', iconSrc: '/icons/ui/hero/damage.webp?v=2.3.1694', legacyOnly: true },
];
/* The owner's seven shared stats, in the owner's order: HP, Def, MP,
   Stamina, Dodge, Move Speed, Elem Resist.  `mana` and `eres` take the
   hero-sheet art drawn for them (the water drop, the shield-and-arrow)
   instead of borrowing the Magic lane's staff and the Defense row's shield
   — in a column of seven, two rows sharing one picture read as one stat. */
export const PROG3_BODY_META = [
  /* ═══ v2.3.2599: PASTEL WAS THE GUESS, IDENTITY WAS THE ASK ═══
     Owner: "Maybe pastel isn't the right color scheme.  I just want a color to
     be associated with a certain skill."  So the requirement is IDENTITY — one
     colour means one stat — and pastel was their guess at how to get it.  The
     eight hues they named stay; lightness, saturation and rendering are ours.

     THAT LOOSENING FIXES EVERY PROBLEM THE PASTEL FILL CREATED, and all four
     came from the same cause: the fill was LIGHT on a dark panel.
       - the label had to flip DARK, against a UI that is light-on-dark
         everywhere else.  It stays light now.
       - POWER'S WHITE was the brightest object on the screen, 2.47x the
         darkest, so it won the eye by luminance alone.  Every fill is dark now
         and nothing out-glares anything.
       - DEFENSE'S GRAY read as DISABLED, the universal meaning of gray among
         colours.  It is a deliberate cool slate instead.
       - THE GOLD [+] measured 1.10:1 to 1.88:1 against the pastels — under the
         floor on ALL THIRTEEN, i.e. the one control that spends a point was
         invisible on every stat.  It now runs 3.02:1 to 6.00:1.

     Searched rather than picked (tools/qa/mp/palette-deep.mjs), against three
     hard floors at once: light text >= 4.5, gold [+] >= 3.0, and CIEDE2000 >= 12
     between any two fills.  Result: ZERO pairs under the floor, where the
     pastel set had two.  The worst pair sits at exactly 12.0 — thirteen
     colours is close to the packing limit of a hue circle once two of them are
     achromatic, so that is about as much room as this palette can have.

     WHAT "WHITE" AND "GRAY" BECAME.  A fill cannot be white and carry light
     text, so Power is a warm STONE and Defense a cool SLATE — the same
     identities at a depth that works.  If the owner wants Power to read
     literally white, that has to be carried by something other than the fill. */

  /* v2.3.2597 (superseded, kept because the measurement still holds): the tint
     was a light pastel then, and the reason it could not be a low-alpha wash
     over the dark cell is unchanged — compositing keeps only `alpha` of the
     distance between two colours, so at the 0.15 accentFill uses, 70 of 78
     pairs fell under the floor.  Whatever the palette, the colour has to be
     drawn at full strength. */
  /* ═══ v2.3.2597: A COLOUR PER STAT, AND WHY IT IS NOT A CELL FILL ═══
     Owner: "I'm interested to see how each cell being colored by meaning would
     look.  Like power is always white, range is always purple ... pastel-like
     colors", fixing eight of them: Power white, Range purple, HP red, MP blue,
     Stamina green, Defense gray, Dodge yellow, Resist pink.  A stat's colour
     names the STAT, not the weapon, so Power is the same white in all three.

     THE OTHER FIVE WERE SEARCHED, NOT PICKED.  Chosen by eye, Range and Special
     landed 8.5 apart on a floor of 12; chosen by maximin over a pastel grid
     (tools/qa/mp/palette-opt.mjs) only TWO of the 78 pairs fall under the floor
     and both are between colours the owner fixed — Power/Defense at 10.8 (white
     against gray) and Range/Resist at 11.6 (purple against pink).  Neither is
     mine to move; palette-fix.mjs reports what it would take.

     AND IT CANNOT BE A CELL FILL.  This UI is dark (#16262C) under near-white
     text, so a pastel has to be composited, and over()'s own docstring says the
     cost: "two colours drawn at the same alpha over the same background keep
     exactly `alpha` of the distance between them".  Measured with the repo's
     own deltaE00: at alpha 0.50, 14 of 78 pairs fall under the floor; at 0.35,
     31; at 0.25, 41; at 0.15 — the alpha accentFill already uses — 70 of 78,
     i.e. the palette is gone.  Worse, the two requirements pull opposite ways:
     at 0.50 the stat title reads 1.88:1 against its cell and fails contrast,
     while at 0.15 it passes and nothing is distinguishable.  There is no alpha
     that satisfies both.
     So the colour is carried at FULL STRENGTH on a SMALL AREA — a 4px spine
     down the row, drawn as an inset shadow so it costs no width at all — and
     the cell keeps its dark background and its legible text. */

  /* ═══ v2.3.2597: SHORTER LABELS, AND WHY `infoKey` EXISTS ═══
     Owner, approving a set of shortenings so every stat name is one word:
     Elem Resist -> Resist, Move Speed -> Speed, Elemental -> Element.  Half-
     width cells in the new two-column category card are what they buy.

     STORAGE KEYS DO NOT MOVE — `eres`, `move`, `elem` are persisted and
     v2.3.2592 already records that renaming a saved field breaks saves.  Only
     the label changes.

     `infoKey` is the trap this rename walks into.  statInfo() looks an
     explainer up BY LABEL (infoGlossary.js), and a `Speed` key already exists
     there — it is the WEAPON's attack speed, "How quickly you swing, shoot or
     cast".  Calling the shared movement stat "Speed" would therefore have
     served that text for it: not a near-miss, a silent wrong answer, and
     exactly the "a rename that leaves the explainer behind" failure.  So a
     renamed stat carries the glossary key it was written against and the
     lookup uses `infoKey || label`.  The two Speeds still cannot appear on
     screen together — the player is inside one category at a time — but the
     glossary is a global map and does not care what is on screen.
     If the two ever DO read as confusable to a player, "Haste" is the
     pre-agreed fallback for `move`. */
  { key: 'hp',    label: 'Max HP',      perText: '+8 max HP',                    unit: ' HP',             iconSrc: '/icons/ui/hero/hp-heart.webp?v=2.3.1922' , tint: '#592C32' } /* v2.3.1922: plain heart */,
  { key: 'def',   label: 'Defense',     perText: '−0.4% damage taken', perTextRel: 'take less damage — the first points count most',           pct: true, unit: '% less damage', iconSrc: '/icons/ui/hero/defense.webp?v=2.3.1694' , tint: '#485A7A' },
  { key: 'mana',  label: 'Max Mana',    perText: '+2.5 max mana',                unit: ' mana',           iconSrc: '/icons/ui/hero/mana.webp?v=2.3.2592',             capsProg3Elem: true , tint: '#182D6D' },
  { key: 'stam',  label: 'Stamina',     perText: '+3 max stamina',               unit: ' stamina',        iconSrc: '/icons/ui/hero/stamina.webp?v=2.3.1694' , tint: '#1E6642' },
  { key: 'dodge', label: 'Dodge',       perText: '+0.4% dodge', perTextRel: 'dodge more hits — the first points count most',                  pct: true, unit: '%',    iconSrc: '/icons/ui/hero/dodge.webp?v=2.3.1694' , tint: '#6D5C18' },
  { key: 'move',  label: 'Speed',       infoKey: 'Move Speed', perText: '+0.4% move speed', perTextRel: 'move faster — the first points count most',             pct: true, unit: '% faster', iconSrc: '/icons/ui/hero/move-speed.webp?v=2.3.2592',   capsProg3Shared: true, dpsNote: 'movement, not damage' , tint: '#48661E' },
  { key: 'eres',  label: 'Resist',      infoKey: 'Elem Resist', perText: '−0.4% elemental damage taken', perTextRel: 'take less elemental damage — the first points count most', pct: true, unit: '% less elemental', iconSrc: '/icons/ui/hero/damage-reduction.webp?v=2.3.2592', capsProg3Elem: true , tint: '#9F2357' },
];

/* v2.3.2670: the one sentence the ℹ️ window adds under a stat that fades
   (`fades` rows) — what "relative" means, in the Points screen's own terms. */
export const PROG3_FADE_NOTE = 'Full strength against monsters at your level or below. Weaker against stronger ones, and gone 5 levels up.';

/* The rows the CONNECTED worker supports, with critDmg's copy resolved
   to that worker's semantics.  UI maps these, never the raw arrays. */
function _resolveMetaRows(rows) {
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var m = rows[i];
    if (m.capsProg3x && !_prog3x) continue;
    /* v2.3.2512: rows that only exist on a worker carrying the elem/eres/mana
       grid.  Same rule as capsProg3x above and for the same reason: never
       offer a stat the wire will silently refuse (rule 19). */
    if (m.capsProg3Elem && !_prog3elem) continue;
    /* v2.3.2592: the folded grid's rows exist only on a worker carrying it;
       the retired crit pair exists only on one that does not.  Same rule as
       the two flags above, both directions. */
    if (m.capsProg3Shared && !_prog3shared) continue;
    if (m.legacyOnly && _prog3shared) continue;
    if (m.key === 'critDmg' && !_prog3x) {
      out.push({ ...m, perText: m.perTextLegacy, unit: m.unitLegacy, pct: false });
    } else if (_prog3rel && m.perTextRel) {
      /* v2.3.2670: a CURVE row on a relative worker — the copy says the first
         points count most rather than quoting a flat rate that is only true of
         the first point; `curve` tells the screen not to append "per point";
         `fades` marks the seven that weaken against a stronger monster. */
      var _row = PROG3.ATK[m.key] || PROG3.BODY[m.key];
      out.push({ ...m, perText: m.perTextRel, unit: m.unitRel || m.unit,
        pct: m.pctRel != null ? m.pctRel : m.pct, curve: true, fades: !!(_row && _row.rel) });
    } else out.push(m);
  }
  return out;
}
export function prog3AtkMeta() { return _resolveMetaRows(PROG3_ATK_META); }
export function prog3BodyMeta() { return _resolveMetaRows(PROG3_BODY_META); }

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

/* ═══ v2.3.2199: caps.prog3x — the 3-points economy expansion gate ═══
   Display-only (rule 19): gates the two new stat rows (dmg/elem), the
   percent critDmg copy + DPS math, and the "+3 points" level banner.
   Against an OLD worker the rows hide (it would silently refuse the
   allocation), the critDmg readouts keep predicting the flat +2 crits
   that worker actually rolls, and the banner says +1 — nothing new is
   ever SENT on this flag, so there is no message to gate. */
var _prog3x = false;
export function setProg3XEnabled(on) { _prog3x = !!on; }
export function isProg3XEnabled() { return _prog3x; }

/* ═══ v2.3.2512: caps.prog3elem — the attribute restructure gate ═══
   Elemental power moved from ONE global stat to one per combat type, and
   two new global stats arrived (Elem Resist, Max Mana).  Display-only, the
   capsProg3x pattern exactly: against an OLD worker the three rows hide
   (it would silently refuse the allocation), the client keeps reading the
   GLOBAL elem stat that worker actually rolls off, and its max-mana
   prediction keeps the pure Magic-level derivation that worker computes.
   Nothing new is ever SENT on this flag — a prog3_allocate naming `elem`
   with a `cat` is shaped exactly like today's atk spends. */
var _prog3elem = false;
export function setProg3ElemEnabled(on) { _prog3elem = !!on; }
export function isProg3ElemEnabled() { return _prog3elem; }

/* ═══ v2.3.2592: caps.prog3shared — the four-column redesign gate ═══
   Six per-type stats with crit/critDmg folded into LUCK and RANGE/SPECIAL
   new, MOVE SPEED shared, and a SECOND POOL minted beside the lane points.
   Display-only, the capsProg3x pattern: against an OLD worker the new rows
   hide, the retired crit pair shows, the crit readouts and DPS math predict
   what that worker rolls (PROG3_LEGACY_ATK), the reach / special / move
   multipliers read 1, and the shared column spends lane points the way that
   worker still allows.  Nothing new is ever SENT on this flag — a
   prog3_allocate naming `luck` with a `cat` is shaped like today's other
   per-type spends, and an old worker simply refuses it. */
var _prog3shared = false;
export function setProg3SharedEnabled(on) { _prog3shared = !!on; }
export function isProg3SharedEnabled() { return _prog3shared; }

/* ═══ v2.3.2670: caps.prog3rel — RELATIVE POINT VALUE ═══
   A worker advertising this rolls the CURVE (PROG3 rows above) with the
   EDGE; one without it rolls the linear PROG3_LINEAR math.  Every reader
   below asks this flag which to predict, so a readout never promises a
   number the connected worker would not produce (rule 19).  Display only:
   nothing new is ever sent on it. */
var _prog3rel = false;
export function setProg3RelEnabled(on) { _prog3rel = !!on; }
export function isProg3RelEnabled() { return _prog3rel; }

/* The server's prog3Curve / prog3Edge / prog3Yardstick / prog3StatValue,
   mirrored line for line (server/src/prog3.js).  The client has no monster in
   hand for a readout, so its readers pass no level — edge 1, "against a
   monster at or below your level" — which is also what the Points screen
   promises in its legend. */
export function prog3Curve(q, k) {
  return q > 0 ? q / (q + k) : 0;
}
export function prog3Edge(yourLevel, monsterLevel) {
  var m = Number(monsterLevel);
  if (monsterLevel == null || !isFinite(m)) return 1;
  var gap = Math.max(0, m - Math.max(1, Number(yourLevel) || 1));
  return Math.max(0, 1 - gap * PROG3.EDGE_FADE);
}
export function prog3Yardstick(rpg, cat) {
  if (cat) return prog3SkillLevel(rpg, cat);
  var best = 1;
  for (var i = 0; i < PROG3.SKILLS.length; i++) best = Math.max(best, prog3SkillLevel(rpg, PROG3.SKILLS[i]));
  return best;
}
export function prog3StatValue(rpg, stat, cat, monsterLevel) {
  var atk = !!PROG3.ATK[stat];
  var d = PROG3.ATK[stat] || PROG3.BODY[stat];
  if (!d || !(d.k > 0)) return 0;
  var c = atk ? ((cat === 'bow' || cat === 'staff') ? cat : 'sword') : null;
  var pts = atk ? prog3AtkPts(rpg, c, stat) : prog3Pts(rpg, stat);
  if (pts <= 0) return 0;
  var edge = d.rel ? prog3Edge(prog3Yardstick(rpg, c), monsterLevel) : 1;
  return prog3Curve(pts * edge, d.k);
}
/* A stat's points as an OLD (linear) worker counts them — clamped to that
   worker's cap, which the blob it wrote never exceeds anyway. */
function _linPts(rpg, stat, cat) {
  var raw = cat ? prog3AtkPts(rpg, cat, stat) : prog3Pts(rpg, stat);
  var L = PROG3_LINEAR[stat];
  return L ? Math.min(L.cap, raw) : raw;
}
/* What `pts` points of `stat` read as, at edge 1 — the Points screen's
   now → after pair (statPreview.js) totals through this, so a preview and
   the cell above it can never disagree about the curve.  Fractions for the
   percent stats (luck = crit chance, with its base), power for elem, and the
   multiplier's bonus fraction for dmg/special/range/move/aspd. */
export function prog3StatAmount(stat, pts) {
  var d = PROG3.ATK[stat] || PROG3.BODY[stat];
  if (!d) return 0;
  if (_prog3rel && d.k > 0) {
    var v = prog3Curve(pts, d.k);
    return (d.base || 0) + d.max * v;
  }
  var L = PROG3_LINEAR[stat] || d;
  return Math.min(L.cap, pts) * (L.per || 0) + (L.base || 0);
}

/* The player's effective elemental power for a weapon — the client mirror of
   the server's elemAttackStat seam (server/src/elemental.js).  ONE definition,
   because three separate readers (the DoT tick, the collision roll, the stat
   preview) each had their own inline copy of it and that is how a mirror
   drifts.  Against an OLD worker (_prog3elem false) it reads the GLOBAL body
   stat that worker still rolls off, so predictions keep matching the wire in
   either deploy order. */
export function prog3ElemPower(rpg, cat, mlvl) {
  if (!(rpg && rpg.prog3)) return 0;
  if (!_prog3elem) {
    var g = (rpg.prog3.alloc && rpg.prog3.alloc.elem) || 0;
    return Math.max(0, Math.min(75, g)) * 1;   /* the retired BODY.elem cap/per */
  }
  var c = (cat === 'bow' || cat === 'staff') ? cat : 'sword';
  if (_prog3rel) return PROG3.ATK.elem.max * prog3StatValue(rpg, 'elem', c, mlvl); /* v2.3.2670: curve + edge */
  return _linPts(rpg, 'elem', c) * PROG3_LINEAR.elem.per;
}

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

/* ═══ v2.3.2662: THE MILESTONE LADDER IS GONE (caps.milestonesRetired) ═══
   Owner: "Just remove the milestones from the game I did not make those."
   The worker dropped the ladder (server/src/abilities.js tombstone): no
   level-6 gate on Element Burst, no x1.25 max stamina at level 10.  A worker
   older than v2.3.2662 still settles both, so until this flag arrives the
   client keeps PREDICTING them -- display only, nothing is ever sent on it
   (rule 19).  The two numbers below are that old worker's, frozen: they are
   not a mirror of anything live and must never be retuned. */
export const LEGACY_BURST_MIN_CHAR_LEVEL = 6;
var _milestonesRetired = false;
export function setMilestonesRetired(on) { _milestonesRetired = !!on; }
export function isMilestonesRetired() { return _milestonesRetired; }
/* The old worker's level-10 "Second Wind" x1.25 on max stamina; 1 against a
   worker that has retired it. */
export function legacyStaminaMult(charLevel) {
  return (!_milestonesRetired && charLevel >= 10) ? 1.25 : 1;
}

/* The special's mana cost, client-side.  ONE definition — playerActions
   (the spend) and SpecialChargePie (the readout) must never disagree
   about it, which is precisely how the 5-segment contract rotted into a
   comment nobody could act on. */
/* v2.3.2298: ONE BLOCK, against every worker. The cap branch is gone: it
   existed because a new worker charged a flat 25 while an old one charged a
   fifth, so the client had to predict differently depending on which it was
   talking to. Both charge a fifth now (index.js _abilityCost), so there is one
   answer and no flag to get wrong. */
export function specialManaCost(rpg) {
  /* v2.3.2302: one block, and a block is maxMana/N where N grows with Magic
     (5 at base, 10 fully invested).  So levelling Magic buys MORE casts again
     -- what v2.3.1734 wanted and v2.3.2298 accidentally reversed -- while a
     block stays exactly one special at every level. */
  return rpgBlockSize(rpg, 'mana');
}

/* v2.3.2298: and the Element Burst costs the same one block. It was a flat 25
   alongside the special's flat 25; both are a fifth now, so "a special costs a
   block" is true of every special rather than of most of them. */
export function burstManaCost(rpg) {
  /* v2.3.2302: the same one block, through the same primitive. */
  return rpgBlockSize(rpg, 'mana');
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
  /* v2.3.2662: the level gate applies only against an old worker -- see
     setMilestonesRetired above. */
  if (!_milestonesRetired) {
    var lvl = prog3Live(rpg) ? prog3CharLevel(rpg) : (rpg.level || 0);
    if (lvl < LEGACY_BURST_MIN_CHAR_LEVEL) return 'level';
  }
  if (!weapon) return 'no_weapon';
  if (!weapon.element1) return 'no_element';
  if ((rpg.mana || 0) < burstManaCost(rpg)) return 'mana';
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
  var d = PROG3.ATK[stat] || PROG3_LEGACY_ATK[stat]; /* v2.3.2592: crit/critDmg still read against an old worker */
  var cap = d ? d.cap : 0;
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
/* ═══ v2.3.2592: THE SHARED POOL ═══
   Owner: "for every point earned through one of the 3 combat channels, you
   earn one 'shared' point too ... the point for shared can be allocated to
   any in that shared pool."  `prog3.shared` is that pool, server-minted
   beside the lane points; a lane point can no longer buy a shared stat.
   Against an OLD worker (no caps.prog3shared) there is no shared pool and
   the body stats still spend lane points — prog3PoolShared says so by
   returning what THAT worker would accept for a body spend, so the Shared
   column's count is honest in either deploy order. */
export function prog3Shared(rpg) {
  var s = rpg && rpg.prog3 && rpg.prog3.shared;
  return (typeof s === 'number' && s > 0) ? Math.floor(s) : 0;
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
/* What the SHARED column can spend: the shared pool plus the free ones —
   or, against a worker without the shared pool, the whole lane total
   (every lane point bought body stats there).  v2.3.2592. */
export function prog3PoolShared(rpg) {
  if (!_prog3shared) return prog3Pool(rpg);
  return prog3Shared(rpg) + prog3PoolAny(rpg);
}
/* The lane a body spend should NAME against an old worker (which takes the
   point off a lane): the one with the most to spend.  Against a shared-pool
   worker the name is ignored, so any lane will do.  v2.3.2592. */
export function prog3SharedSpendCat(rpg) {
  var best = PROG3.SKILLS[0];
  for (var i = 1; i < PROG3.SKILLS.length; i++) {
    if (prog3PoolBy(rpg, PROG3.SKILLS[i]) > prog3PoolBy(rpg, best)) best = PROG3.SKILLS[i];
  }
  return best;
}

export function prog3StatCap(rpg, stat) {
  var d = PROG3.BODY[stat] || PROG3.ATK[stat] || PROG3_LEGACY_ATK[stat]; /* v2.3.2592: the retired pair still caps against an old worker */
  /* v2.3.2670: on a relative worker the curve stats have no design cap (999
     is storage) and the per-level bound doubles on the four damage stats —
     the server's _handleProg3Allocate, mirrored so [+] greys where it refuses. */
  if (_prog3rel) return Math.min(d ? d.cap : 0, prog3CharLevel(rpg) * ((d && d.lvlBound) || 1));
  var L = PROG3_LINEAR[stat];
  return Math.min(L ? L.cap : (d ? d.cap : 0), prog3CharLevel(rpg));
}
export function prog3IsAtkStat(stat) {
  return !!(PROG3.ATK[stat] || PROG3_LEGACY_ATK[stat]);
}

/* v2.3.2670: the curve + edge on a relative worker; `mlvl` is the attacker's
   level when one is in hand, omitted for readouts (edge 1). */
export function prog3DodgePct(rpg, mlvl) {
  if (_prog3rel) return PROG3.BODY.dodge.max * prog3StatValue(rpg, 'dodge', null, mlvl);
  return _linPts(rpg, 'dodge') * PROG3_LINEAR.dodge.per;
}
/* v2.3.1668: crit/critDmg read the ACTIVE weapon's block unless a
   category is named (loadout previews pass one explicitly). */
/* v2.3.2210: base + allocated, mirroring the server's roll exactly.  Every
   predicted number downstream reads this one function -- the Hero screen's
   Crit row and calcDisplayDps's crit term both -- so the base reaches the
   display and the DPS estimate without either of them knowing about it. */
/* v2.3.2592: the chance is the LUCK stat's `per` half on a worker that
   folded the pair, and the retired crit stat against one that did not —
   whichever the connected worker actually rolls (rule 19). */
export function prog3CritPct(rpg, cat, mlvl) {
  var c = cat || prog3ActiveCat(rpg);
  if (_prog3shared && _prog3rel) return PROG3.ATK.luck.base + PROG3.ATK.luck.max * prog3StatValue(rpg, 'luck', c, mlvl); /* v2.3.2670 */
  if (_prog3shared) return PROG3_LINEAR.luck.base + _linPts(rpg, 'luck', c) * PROG3_LINEAR.luck.per;
  return PROG3_LEGACY_ATK.crit.base + prog3AtkPts(rpg, c, 'crit') * PROG3_LEGACY_ATK.crit.per;
}
/* v2.3.2199: critDmg went flat→percent.  The multiplier is the live
   read; the FLAT survives only as the old-worker prediction (the
   literal 2 below is the retired per-point value, pinned so a new
   client still predicts the flat +2 crits an un-upgraded worker rolls
   — the specialManaCost fallback pattern, rule 19).
   v2.3.2592: and the multiplier is LUCK's `dmgPer` half on a folded worker. */
export function prog3CritMult(rpg, cat, mlvl) {
  var c = cat || prog3ActiveCat(rpg);
  if (_prog3shared && _prog3rel) return 1.5 + PROG3.ATK.luck.dmgMax * prog3StatValue(rpg, 'luck', c, mlvl); /* v2.3.2670 */
  if (_prog3shared) return 1.5 + _linPts(rpg, 'luck', c) * PROG3_LINEAR.luck.dmgPer;
  if (!_prog3x) return 1.5;
  return 1.5 + prog3AtkPts(rpg, c, 'critDmg') * PROG3_LEGACY_ATK.critDmg.per;
}
export function prog3CritFlat(rpg, cat) {
  if (_prog3x || _prog3shared) return 0;
  return prog3AtkPts(rpg, cat || prog3ActiveCat(rpg), 'critDmg') * 2; /* legacy worker's flat */
}
/* ═══ v2.3.2592: the three CLIENT-CONSUMED multipliers ═══
   SPECIAL scales the per-weapon special multiplier (specialAtkMultFor);
   RANGE scales the bow's plant cap, the staff orb's life and the melee
   swing envelope (gameSystems bowRangeMult / staffOrbLife / meleeRangeMult);
   MOVE scales the walk speed (BroTown.jsx).  Each reads 1 against a worker
   that does not carry the stat — a readout or a reach the wire would not
   honour is the rule-19 bug these gates exist to prevent.  The server
   mirrors the first (combat.js) and bounds the third (movement.js). */
export function prog3SpecialMult(rpg, cat, mlvl) {
  if (!_prog3shared || !prog3Live(rpg)) return 1;
  var c = cat || prog3ActiveCat(rpg);
  if (_prog3rel) return 1 + PROG3.ATK.special.max * prog3StatValue(rpg, 'special', c, mlvl); /* v2.3.2670 */
  return 1 + _linPts(rpg, 'special', c) * PROG3_LINEAR.special.per;
}
export function prog3RangeMult(rpg, cat) {
  if (!_prog3shared || !prog3Live(rpg)) return 1;
  var c = cat || prog3ActiveCat(rpg);
  if (_prog3rel) return 1 + PROG3.ATK.range.max * prog3StatValue(rpg, 'range', c, null); /* v2.3.2670: curve, no edge */
  return 1 + _linPts(rpg, 'range', c) * PROG3_LINEAR.range.per;
}
export function prog3MoveMult(rpg) {
  if (!_prog3shared || !prog3Live(rpg)) return 1;
  if (_prog3rel) return 1 + PROG3.BODY.move.max * prog3StatValue(rpg, 'move', null, null); /* v2.3.2670: curve, no edge */
  return 1 + _linPts(rpg, 'move') * PROG3_LINEAR.move.per;
}
export function prog3DefPct(rpg, mlvl) {
  if (_prog3rel) return PROG3.BODY.def.max * prog3StatValue(rpg, 'def', null, mlvl); /* v2.3.2670 */
  return _linPts(rpg, 'def') * PROG3_LINEAR.def.per;
}
/* v2.3.2670: Resist's cut, one reader (the Points cell printed it inline). */
export function prog3EresPct(rpg, mlvl) {
  if (_prog3rel) return PROG3.BODY.eres.max * prog3StatValue(rpg, 'eres', null, mlvl);
  return _linPts(rpg, 'eres') * PROG3_LINEAR.eres.per;
}
/* v2.3.2670: the swing-period cut the Speed stat buys (swingCooldownMultFor
   turns it into the period multiplier), curve on a relative worker. */
export function prog3AspdCut(rpg, cat) {
  var c = cat || prog3ActiveCat(rpg);
  if (_prog3rel) return PROG3.ATK.aspd.max * prog3StatValue(rpg, 'aspd', c, null);
  return _linPts(rpg, 'aspd', c) * PROG3_LINEAR.aspd.per;
}
/* v2.3.2670: POWER — the multiplier on (weapon base + skill term), pre-tier,
   exactly where the server's _computeAttackDamage applies it.  1 against a
   linear worker, whose flat Power prog3DmgTerm still adds. */
export function prog3PowerMult(rpg, cat, mlvl) {
  if (!_prog3rel || !prog3Live(rpg)) return 1;
  return 1 + PROG3.ATK.dmg.max * prog3StatValue(rpg, 'dmg', cat || prog3ActiveCat(rpg), mlvl);
}

/* The trained-level damage term replacing stat × 0.1667 — mirrors the
   server's _computeAttackDamage branch (specials scale on Magic and
   are handled at the call sites that know isSpecial). */
export function prog3DmgTerm(rpg, weaponType) {
  var cat = weaponType === 'bow' ? 'bow' : weaponType === 'staff' ? 'staff' : 'sword';
  /* v2.3.2199: + the allocated flat-damage stat, pre-tier like the
     server's roll.  Gated on prog3x: an old worker doesn't add it, and
     a readout that promises damage the wire won't confirm is a bug. */
  /* v2.3.2670: on a relative worker Power is a multiplier (prog3PowerMult),
     not a term here — the flat add survives only as the linear worker's. */
  return prog3SkillLevel(rpg, cat) * PROG3.DMG_PER_LEVEL[cat]
    + (_prog3x && !_prog3rel ? _linPts(rpg, 'dmg', cat) * PROG3_LINEAR.dmg.per : 0);
}
