# The Bank's vault (v2.3.3785)

Owner, 2026-10-29: *"Oh yeah make it so you can actually deposit and retrieve
items and gold from the bank"*

Until now the Bank's window showed your gold and what you wear and sent
nothing ("Your gold and what you wear. Nothing can be stored here yet.",
v2.3.3481). It is a vault now: bag items and gold the server holds for you.

## What a player gets

- At the Bank's door, **Enter BANK** opens "Bank · Your vault".
- **Gold:** what is on you and what is in the vault. *Put in* and *Take out*,
  each with 10, 100, All and a typed amount with OK.
- **The vault** (up to 48 kinds of item, any number of each) and **your bag**.
  A tap on an item you have one of moves it. A tap on a stack asks how many,
  with the same 10 / 100 / All / typed amount.
- A line says what the last tap did, or why not: "Put 4 Oak in the vault",
  "Took 10 gold out", "You don't have that many", "The vault is full",
  "Stand at the Bank to use the vault", "Tools stay in your bag",
  "One moment, the bank is busy", "The vault is closed for now".
- **The point:** what is in the vault is out of every death's reach. An
  ordinary death drops the bag as Remains; a loss in No man's land takes the
  whole bag. Neither touches the vault.
- On a computer the words say "Click" (`deskWords`). The window's ✕ is the
  building windows' shared one (Esc presses it).

## Rules

| Rule | Why |
|---|---|
| Moves only at the Bank's door, in the Wheel | the Hotel's rule (rest.js): the door's offset from the Wheel's middle, held to the placed door by test-world-core |
| Any bag stackable can go in, except the three gathering tools | the tools are kept through a death anyway, every harvest reads them in the bag, and a quest grants one when the bag has none (`grantOnAccept` `max: 1`): an axe in the vault could be granted twice |
| Quest objective items can go in | a turn-in counts the bag, so a banked one waits until its owner takes it out: their choice |
| 48 kinds, up to 1,000,000,000 of each and of gold | a data bound (the record stays a few KB), not a play cap |
| 30 moves in a burst, then one every 2 s (`PACE.BANK`) | each move is two rows; 30 empties a full bag in one go |

## The server (`server/src/bank.js`)

### Storage: its own key

`bank:<playerId>`, in ARCHITECTURE-HANDOFF's rule-2 registry:

```
{ _v: 1, gold, items: [{ key, n }], ops: [opId, ...] }   // ops: the last 32
```

**Why its own key, not a field on the rpg record.** `rpg:` is the hot row,
written on nearly every action. A 48-slot vault riding it would make every one
of those writes bigger, for a store most players open now and then. Its own
key is written only by a deposit or a withdrawal. It is read once a session,
on the first bank message (never on the join path, which pays nothing), and
cached in memory until the player leaves (`_bankForget` in webSocketClose and
linger, like `gear_prov`). A character restart deletes it with the character.

### One write

A move changes the bag or the purse (`rpg:`) and the vault (`bank:`). Both
puts are issued in **one synchronous run, no await between them** (handoff
rules 5 and 7), so the Durable Object commits them together: a restart can
never leave an item in both places or in neither. The only await is the vault's
first read, and everything is checked again after it.

### opIds

Every move carries an `opId` (1–64 characters). The id of a move that moved
something is recorded **inside the same `bank:` put**, so "it happened" and
"its id is spent" are one write. A replayed id answers `ok` and moves nothing.
A refusal moves and writes nothing, and spends no id: asked again, it is asked
again.

### The wire

| Direction | Message | Payload |
|---|---|---|
| phone → worker | `bank_open` | `{}` |
| phone → worker | `bank_deposit` / `bank_withdraw` | `{ kind: 'item' \| 'gold', id, n, opId }` |
| worker → phone | `bank_state` (PRIVILEGED, the client's DIRECT switch) | `{ ok, on, gold, items: [{key, n}], slots, noBank: [keys], last: { opId, dir, kind, id, n, ok, err } \| null }` |

The three client messages are handled on purpose and awaited (`_onMessage`);
none is in `RELAY.TYPES`. The bag and the purse come back on the `player_state`
that follows a move. `noBank` lists the bag keys that may not go in (the
tools), so the window can dim them.

**Refusals** (`last.err`): `not_here`, `not_enough`, `vault_full`, `bag_full`
(a stack past the bound), `bad_key` (a key you do not hold, or `__proto__` /
`constructor` / `prototype`), `kept` (a tool), `bad` (no opId, a bad count or
kind), `busy` (the pace), `off` (the switch), `newer` (a record from a newer
worker). The vault in memory is a `Map`; a key is read from the bag only if
the bag has it as its own property.

### Deploy order and the switch

- `caps.bank` (join.js; in `CAP_GATES`). The window is the vault only against
  a worker that says it; against an older one it is the old read-only window.
- **Kill switch `bank: false`** (live flags, lower case): un-advertises
  `caps.bank` (the flags spread over the caps) and refuses every move with
  `off`. What is in a vault stays, and `bank_open` still shows it.
- **Shape number** `BANK.V = 1`. A record from a newer worker is never
  rewritten (docs/specs/migrations.md): moves are refused `newer` and the
  window says the vault is closed. No migration: the key is new.

## Tests

- `server/test/bank.test.mjs`: both directions for items and gold on both
  Wheels; one rpg put and one bank put a move, in the same run; opId replay;
  the ops list bounded; every refusal answered with nothing moved or written;
  `'__proto__'` and its kin; the tools; a full vault (and more of a kind
  already in still fits); the pace; a death drops the bag and never the vault;
  the vault outlives a reconnect; the kill switch (and opening still shows the
  vault); the wire (privileged, never relayed); a restart deletes the vault;
  a newer record is never rewritten.
- `tools/world/test-world-core.mjs`: `BANK.DOOR` is the door the ground worker
  places for the bank, and its reach takes in no other door.
- `tools/qa/mp/mp-bank.mjs` (`run.mjs bank`): a phone upright and a computer
  playing wide: Enter BANK opens the vault; 4 oak in by a typed amount and 2
  out; 100 gold in by its chip and 10 out, each checked against the worker's
  bag and purse; a reload keeps the vault; the computer's words say "Click".
- UI review: `building-bank` (seeded with a few bag items).

## Not in this version

- **Weapons and armour pieces.** The weapon bag is the server's own list, so
  weapons could follow by index the way the trade window takes them. The armour
  and shields a phone holds move through the provenance ledger (gear_prov), the
  way the Auction House escrows them, which is a change of its own.
- A bank keeper standing outside (the UI notes' "Still open").
