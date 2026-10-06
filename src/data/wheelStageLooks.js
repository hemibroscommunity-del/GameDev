/* ═══ v2.3.3093: LEVELS 21-40 -- EACH LAND'S SECOND STAGE, RECOLOURED ═══
 *
 * The owner: "build the world past level 20 (levels 21-40 in each land with
 * their own monsters and resources) You can just recolor existing monsters for
 * now for placeholder monsters.  No preference on colors".
 *
 * A land's stage is twenty levels (plan.js wheel: stageTiers 4 x levelsPerTier
 * 5).  Its first, levels 1-20, wears the looks it always has; its second,
 * levels 21-40 (server/src/wheelzone.js, tiers 5-8), wears the SAME look in a
 * colour of its own and a name to go with it -- a placeholder until each
 * land's own monsters are drawn.  A Wheel monster carries `home` (its land)
 * and its `level`; a dungeon's carry them too, so the Great Cave's level 26-30
 * rock monsters are the stage's amethyst golems as well.
 *
 * THE COLOUR IS A SPRITE TINT, so it costs NO memory: the look's own sheets,
 * multiplied (a tint can only darken a channel, so each colour was chosen on
 * the real art: tools/qa/mp/out/wheelpast20-*.png).  It REPLACES the look's own
 * tint (a mire wisp is a slime tinted violet; its stage-2 self is the same
 * slime tinted cyan, where violet x cyan would be black).  A baked recolour
 * would sit in memory beside the first stage's look -- the looks load 2,600 px
 * out and a stage boundary is closer than that -- and at the Flame Fields that
 * is ~50 MB, over iPhone Safari's line (CLAUDE.md, the looks-as-you-walk
 * clause).  A filter per sprite is a render target per monster: no.
 *
 * Keyed by the look (the archetype once its zone variant is applied: a sky
 * stalker is drawn as a `mummy`).  A look not listed wears STAGE_DEFAULT.
 * Stages past the second are not made yet (null: drawn as they are).  No
 * imports, so node can test it. */

export const WHEEL_STAGE_LEVELS = 20;

export const WHEEL_STAGE_LOOKS = Object.freeze({
  2: Object.freeze({
    snowman: Object.freeze({ tint: 0x8fc8ff, name: 'Glacier Snowman' }),       /* Frost Ridge: icy blue */
    fireGoblin: Object.freeze({ tint: 0x8c8c9c, name: 'Cinder Goblin' }),      /* the Flame Fields: charred */
    mummy: Object.freeze({ tint: 0xffd27a, name: 'Gilded Mummy' }),            /* the Wind Dunes: gold */
    skeleton: Object.freeze({ tint: 0xffd27a, name: 'Gilded Skeleton' }),      /* ...a mummy's bones */
    rockmonster: Object.freeze({ tint: 0xc8a0ff, name: 'Amethyst Golem' }),    /* the Stone Hollows: amethyst */
    fodder: Object.freeze({ tint: 0x60c0ff, name: 'Storm Slime' }),            /* the Electric Foundry: teal */
    fishman: Object.freeze({ tint: 0xffb070, name: 'Coral Fishman' }),         /* the Water Caves: coral */
    mireWisp: Object.freeze({ tint: 0x70e8ff, name: 'Spectral Wisp' }),        /* the Poison Forest: cyan */
    bogLurker: Object.freeze({ tint: 0xc090ff, name: 'Shade Lurker' }),        /* ...violet */
    blueSlime: Object.freeze({ tint: 0x9cffb0, name: 'Jade Slime' }),          /* the Verdant Wilds: its blue, jade */
    thornShambler: Object.freeze({ tint: 0xd0ff60, name: 'Bramble Shambler' }),/* ...yellow-green */
    mossSlime: Object.freeze({ tint: 0xffd040, name: 'Pollen Slime' }),        /* ...gold-green */
  }),
});

/* any other look in a made stage: a pale violet, its name with "Dire" */
export const WHEEL_STAGE_DEFAULT = Object.freeze({ tint: 0xd0b0ff, prefix: 'Dire' });

/** The stage a level is in: 1 for 1-20, 2 for 21-40, ... */
export function wheelStageOf(level) {
  const L = Math.floor(Number(level) || 0);
  return L >= 1 ? Math.ceil(L / WHEEL_STAGE_LEVELS) : 1;
}

/** A monster's stage look -- {tint, name} or {tint, prefix} -- or null when it
 *  wears its own (not the Wheel's, the first stage, or a stage not made yet). */
export function wheelStageLook(m) {
  if (!m || typeof m.home !== 'string') return null;
  const stage = wheelStageOf(m.level);
  if (stage < 2) return null;
  const table = Object.prototype.hasOwnProperty.call(WHEEL_STAGE_LOOKS, stage) ? WHEEL_STAGE_LOOKS[stage] : null;
  if (!table) return null;
  const look = m.archetype || m.type;
  return (typeof look === 'string' && Object.prototype.hasOwnProperty.call(table, look)) ? table[look] : WHEEL_STAGE_DEFAULT;
}

/** The body's tint: the stage's in place of the look's own `base`. */
export function wheelStageTint(m, base) {
  const s = wheelStageLook(m);
  return s ? s.tint : base;
}

/** The name on the plate: the stage's, else `base` (the look's own name). */
export function wheelStageName(m, base) {
  const s = wheelStageLook(m);
  if (!s) return base;
  return s.name || (s.prefix + ' ' + base);
}
