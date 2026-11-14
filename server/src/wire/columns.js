/* THE WIRE TABLE'S COLUMNS -- v2.3.5061 (grand plan step 4.1, step 1; card N).
 *
 * The closed lists every row of the wire table is held to, one place in code.
 * They are docs/SHAPES.md part 5's, by its names; the README beside this file
 * says how each column reads, and where a row may step off a list (a `note`).
 *
 * A leaf: no imports, plain data, so node and the worker can both read it.
 * Nothing in the worker imports the table yet (card K makes today's lists
 * FROM it: step 4.1, step 2).  tools/guards/wire-table.test.mjs holds every
 * row to these lists. */

export const WIRE_COLUMNS = Object.freeze({
  /* the order a row writes its columns in; `note` is the only one a row may leave out */
  ORDER: Object.freeze(['name', 'dir', 'at', 'wayIn', 'envelope', 'phase', 'mayStart', 'doesWhat', 'reqId', 'trust', 'absent', 'bad', 'answer', 'note']),

  /* which way it travels: a relay is one row for both ways */
  dir: Object.freeze(['in', 'out', 'relay']),

  /* where it comes in.  `room` is the worker by itself (a tick, a timer, a
     monster, another of its objects) */
  wayIn: Object.freeze(['socket', 'http', 'admin', 'room']),

  /* how it is wrapped, a list for each direction (an `http` route is an `in` row) */
  envelope: Object.freeze({
    in: Object.freeze(['alone', 'frame', 'http']),
    relay: Object.freeze(['relay']),
    out: Object.freeze(['direct', 'group', 'room', 'event', 'tick', 'close']),
  }),

  /* the sender's phase: each demand is `<machine>:<state>`, or
     `<machine>:!<state>` for "not in it".  `none checked` alone when the
     handler acts whatever the sender's state.  The implicit machines are
     not one field yet (SHAPES part 5): they are written by name */
  phase: Object.freeze({
    NONE: 'none checked',
    session: Object.freeze(['open', 'joined']),
    life: Object.freeze(['alive', 'dying']),
    zone: Object.freeze(['wheel', 'safe', 'nml', 'dungeon']),
    IMPLICIT: Object.freeze({
      fight: Object.freeze(['in']),
      duel: Object.freeze(['in']),
      trade: Object.freeze(['in']),
      party: Object.freeze(['in', 'leader']),
      ride: Object.freeze(['in']),
      harvest: Object.freeze(['in']),
      cook: Object.freeze(['in']),
      guard: Object.freeze(['in']),
      pose: Object.freeze(['in']),
      race: Object.freeze(['in']),
      arena: Object.freeze(['in']),
      fishing: Object.freeze(['in']),
    }),
  }),

  mayStart: Object.freeze(['never-helper', 'helper', 'person', 'owner', 'system', 'anyone']),

  /* every word that applies */
  doesWhat: Object.freeze(['reads', 'own', 'value-out', 'final', 'speaks', 'plays', 'others']),

  /* what makes a repeat act once: one of these, or the name of the field
     that does (`opId`, `k`, `hitSeq`) */
  reqId: Object.freeze(['state', 'none', 'harmless']),
  REQ_FIELD: /^[A-Za-z_][\w.]*(?:\+[A-Za-z_][\w.]*)*$/,

  /* one a field; `bounded:<its judge>` */
  trust: Object.freeze(['request', 'look', 'claim', 'words']),
  TRUST_BOUNDED: /^bounded:[A-Za-z_][\w.]*$/,

  /* `absent` is words: clauses joined by `; `, each opening with one of these */
  absent: Object.freeze(['default', 'older phone', 'refused', 'dropped', 'nothing']),

  /* what a wrong value gets: one of these, or `dropped:<code>` with the code
     from the list that exists (server/test/refusal-door-list.mjs CODES: read
     there, never copied here) */
  bad: Object.freeze(['clamped', 'refused', 'taken']),

  /* the message that tells the sender what happened: a type (an `out` row's
     name, or a relay's), one of these, or a list of them */
  answer: Object.freeze(['player_state', 'none', 'http']),
});
