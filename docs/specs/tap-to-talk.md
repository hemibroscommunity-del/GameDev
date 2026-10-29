# A townsperson talks when you tap him, never by walking up (v2.3.3583)

> *"I think I want to change the npc dialog behavior to be tap only instead of
> proximity based. I keep opening dialog by accident. Like racing lil bro past
> the mayor the mayor window talking to me opened up."* -- the owner, 2026-10-23

## What was happening

Since v2.3.1701 a quest giver's window opened by itself when you walked within
90 px of him. The owner asked for that then: "make the quest dialog with mayor
bro pop up when you get in close proximity to him instead of needing to tap him
it's finicky right now needing to tap him". Diego's shop opened the same way
(v2.3.2050). Ace was the exception, tap-only since v2.3.2620.

In the world's BroTown the townsfolk stand where everyone walks: Mayor Bro at
the Town Hall's steps on the race's square, Diego by the General Store. Running
past one opened his window in front of you.

## What changed

- **Walking up opens nothing.** Every townsperson's window, Diego's shop
  included, opens on a tap only (BroTown.jsx `NPC_PROX_OPENS`). The old opener
  is kept whole, latch and all, behind `?npcprox` in the address, to compare.
- **What opens one:**
  - **a tap on him**, reaching 90 px as before (v2.3.2305);
  - **the right stick's tap**, whose picture is a speech bubble when someone
    stands beside you (v2.3.3105);
  - **E on a keyboard**, or a click.
- **On a computer, E now asks a townsperson with a quest for you before a door**
  (desktopControls.js `questWaits`). E tried the door first, and the givers
  stand by doors: Mayor Bro is at the Town Hall's steps. With walking up gone,
  E beside him opened the Town Hall, and only the mouse reached his quest. A
  townsperson with nothing for you leaves the door first, as before. The right
  stick already asked for the character first.
- **Diego's shop while his quest runs.** He gives fish_1 and keeps his shop.
  While the quest was under way, walking up opened his shop and a tap gave
  his quest's line. A tap is all there is now, so his "how's it going" line
  carries an **Open the shop** button, as the forge's and the bench's carry
  theirs (game/tour.js `questAction`, kind `shop`, for any giver who keeps a
  shop). While his quest is only on offer, a tap shows the offer, as before.
- **The words:**
  - the quest page's "ready" note said "Walk up to him in town and he'll open
    the conversation himself". It now says "Find him in town and tap him to
    talk";
  - the welcome card ends "then tap him".

Unchanged:

- the tap's reach;
- the stick's picture;
- what each townsperson's window does;
- no server change.

## Tests

- `mp-questprox`, until now the test of the walk-up opener, is rewritten for
  this and moved to the world (it was on the old map's frozen list). It checks:
  1. standing beside Mayor Bro opens nothing;
  2. walking through him opens nothing;
  3. a tap on him opens his window;
  4. closed beside him, it stays closed;
  5. the stick's tap opens it;
  6. E opens it, his quest before the Town Hall's door;
  7. Diego's shop opens only on a tap;
  8. a ready quest's turn-in opens only on a tap;
  9. `?npcprox` brings walking up back;
  10. with Diego's quest under way, his line carries "Open the shop", and it
      opens his shop.
- The harness's `approachNpc` ends with the stick's tap (`talkToNpc`), as a
  player's approach now must. Every scenario that uses it is unchanged
  otherwise, `mp-questline` (CI's "playable") among them.
- `mp-race` taps Lil Bro. It also checks the owner's own case: no townsperson's
  window opens while you run the lap past the Mayor.

Old-map scenarios on the frozen list that waited for a window to open by
itself are not moved here, so they no longer reach the townsperson:
`mp-questclaim`, `mp-freshquest`, `mp-questchain`, `mp-questloop`,
`mp-questui`, `mp-questwin`, `mp-questxp`, `mp-questbanner`, `mp-layer`,
`mp-figureseam`. They run only by hand. Each needs a tap (`H.talkToNpc`) when
it is moved to the world.

## v2.3.3834: E does what the prompt on the screen says

The judge pass (2026-10-29), on a computer: at the Town Hall's door with
Mayor Bro beside it, his quest under way, the prompt read **E  ENTER TOWN
HALL**, and E talked to the Mayor (the v2.3.3583 rule above: a townsperson
with a quest before a door). A key that does something other than what the
screen says reads as broken.

Now, where the door's own prompt is up (`desktopControls.js` `doorPromptUp`:
the same test the prompt makes, a building or a Wheel hall's door), E is the
door. Everywhere else a townsperson with a quest still comes before a door,
and a click (or a tap) on him always talks. A step from the Town Hall's door,
beside the Mayor, E talks to him again. Phones are unchanged: the right
stick's tap asks for the character first, as before.

Not changed: walking into a townsperson. Your bro can still stand where he
stands (their name plates overlap); blocking it would touch the move the
worker checks, so it waits.

Tests: `mp-mayordoor` (the door's prompt and E, a computer; also the board's
button in and out of town, and a click on another player beside you in No
man's land); `mp-questprox` step 6 (both sides, a phone's keyboard).

## v2.3.3868: E talks to the townsperson beside you, before a door

The owner, playtesting on a computer: *"One thing that could be confusing is
that the instructions say 'E' is interact. When you're next to mayor bro
(intending to accept the first quest by 'interacting') you would actually open
the door to the building right next to him (town hall)."*

v2.3.3834 gave E to the door wherever the door's prompt was up, and Mayor Bro
stands on the Town Hall's steps, so beside him E opened the hall.

- **A townsperson in talk range (90 px) comes before a door** (`talkBeforeDoor`
  in `src/game/desktopControls.js`): any townsperson, quest or not. E is the
  computer's tap, and a tap on a person talks (the owner's standing rule).
- **The prompt agrees with the key:** on a computer, while a townsperson is in
  range at a door, the prompt reads "E  Talk to Mayor Bro" in the door
  prompt's place (BroTown `deskTalkPick`, `data-talk-prompt`), and a click on
  it talks, as E does. It never says "Enter Town Hall" while E talks
  (v2.3.3834's judge-pass complaint). A phone's button is unchanged, and a tap
  or click on a person always talks.
- **The owner's words outrank v2.3.3834's choice:** #1298 gave E to the door
  from a judge pass. The owner, playing, asked for the person, so the person
  comes first and the prompt follows E.
- **The door is still reachable:** a door's reach (140 px, `WHEEL_DOOR_REACH`)
  is wider than a townsperson's, so every door has doorstep out of everyone's
  range. A step aside from the Mayor and the Town Hall's button is back, and E
  opens it.
- **Why not "the nearer of the two":** tried first. The Mayor stands in the
  hall's doorway, nearer than the door's foot from anywhere on the doorstep,
  so the nearer rule came to the same answer by a rule a player cannot see.
- **No door's prompt:** as before, a townsperson with a quest for you comes
  first (v2.3.3583), and one without waits behind a bed, a dungeon's mouth or a
  resource.

Test: `mp-mayordoor` step 1:
- next to the Mayor, inside the Town Hall door's reach: the prompt reads "Talk
  to Mayor Bro", and E opens his dialogue, not the door;
- at the hall's door out of anyone's range: the button, and E opens the Town
  Hall;
- every open door: a spot out of everyone's range shows its Enter button, and
  beside each townsperson near it the prompt says Talk, never Enter.

`mp-questprox` step 6: beside the Mayor in the door's reach, the prompt says
"Talk to Mayor Bro" and E talks to him.
