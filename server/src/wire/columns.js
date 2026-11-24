/* THE WIRE TABLE'S COLUMNS -- v2.3.5061 (grand plan step 4.1, step 1; card N).
 *
 * The closed lists every row of the wire table is held to, one place in code.
 * They are docs/SHAPES.md part 5's, by its names; the README beside this file
 * says how each column reads, and where a row may step off a list (a `note`).
 *
 * A leaf: no imports, plain data, so node and the worker can both read it.
 * The worker's lists are made from the table (lists.js beside this file,
 * card K: step 4.1, step 2).  tools/guards/wire-table.test.mjs holds every
 * row to these lists. */

export const WIRE_COLUMNS = Object.freeze({
  /* the order a row writes its columns in; a row may leave out only the OPTIONAL ones */
  ORDER: Object.freeze(['name', 'dir', 'at', 'wayIn', 'envelope', 'phase', 'mayStart', 'doesWhat', 'reqId', 'trust', 'form', 'absent', 'bad', 'answer', 'privileged', 'fight', 'placed', 'muted', 'pace', 'watch', 'flag', 'note']),
  /* v2.3.5181: the machine's columns (SHAPES part 5's second table), each
     written only where it says something, then `note` */
  /* v2.3.6443 (card DG PR 4): `form`, a field of `trust` held to more than
     its trust's default (wire/door.js WIRE_FORM; README.md beside this file);
     wire-form.test §5 holds its values */
  OPTIONAL: Object.freeze(['form', 'privileged', 'fight', 'placed', 'muted', 'pace', 'watch', 'flag', 'note']),

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

  /* v2.3.5181 (card K): `privileged`, a machine's column (lists.js makes
     PRIVILEGED_EVENTS and wire-audit's echo list from it).  Left out on an
     `out` row: the type is privileged (deny by default).  `echo`, on an `out`
     or a `relay` row: the worker sends it AND a phone's copy is not dropped
     as a forgery (the 8 relays a sparring clone or a settlement also sends,
     and clan_war_declare); its why is the row's note that opens `echo: ` */
  privileged: Object.freeze(['echo']),

  /* v2.3.5182 (card K PR 2): the worker's other lists, each a machine's
     column (lists.js makes the list; README.md says how each reads):
       fight   `lock:<its switch>` (fightlock.js FIGHT_LOCK: refused or
               checked in a fight with a player) or `open:<why>` (FIGHT_OPEN:
               allowed, the why one of fightlock.js OPEN_WHY's);
       placed  an `out` row the room sends by place: `{ m, xy, p, who }`
               (eventplace.js ROOM_PLACED); a relay placed where the room has
               its sender: `sender` (RELAY_PLACED);
       muted   `mutable`: a muter does not hear it (chatmod.js);
       pace    the allowance it spends beside the socket's: `social`
               (chatguard.js SOCIAL.TYPES) or a lane its handler takes
               (flood.js `_paceTake('<lane>'`), one or a list;
       watch   the anti-bot hook that counts it (botsig.js `_sigOn...`);
       flag    the live flags its handler asks, by their row's name in the
               switch table (tools/guards/lib/switches.mjs), one or a list */
  fight: /^(lock:[a-z0-9_]{1,32}|open:[a-z' ,]+)$/,
  placedSender: 'sender',
  placedFields: Object.freeze(['m', 'xy', 'p', 'who']),
  muted: Object.freeze(['mutable']),
  pace: /^[a-z0-9]{1,16}$/,
  watch: /^_sigOn[A-Z][A-Za-z]+$/,
  flag: /^[a-z0-9_]{1,40}$/,

  /* the message that tells the sender what happened: a type (any row's
     name: `ping` is answered by `pong`), one of these, or a list of them */
  answer: Object.freeze(['player_state', 'none', 'http']),
});
