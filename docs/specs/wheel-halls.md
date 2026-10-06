# The Wheel's halls: the Guild Hall, the Post Office and the Sheriff's Office (v2.3.3066)

> Owner, 2026-10-06: *"keep going with pragmatic enhancements."*

The Wheel's Brotown has four buildings the plan calls "(new: …)". Since
v2.3.3032 they had stood shut ("Shut for now"). Each was checked for a system
the game already has that could sit behind its door. Three had one, and one of
those systems could not be reached at all:

| Building | The plan's words | Now opens |
|---|---|---|
| **Guild Hall** | clans and guilds | **Clans**: the clan panel, to make a clan, run it or take up an invite. **Skill guilds**: the guild panel, with ranks and quests. |
| **Post Office & Telegraph** | mail and offline inbox | **Your mail**: every delivery of this visit. **Messages from friends**: the Social panel. |
| **Sheriff's Office** | duels, arena sign-up, bounties | **Duel a player**: the player list (tap someone, then Duel on their card). **The arena**: the gladiator arena's sign-up. |
| **Hotel** | rest, respawn | still shut |

Standing at a hall's door brings up the same **Enter** button as the other
twelve: the hall's picture, and the name on its sign. A tap or **E** opens the
hall. A hall is a hallway: each row opens the panel that does the work and
closes the hall.

## Why each, and what was wrong

- **The clan and guild panels were out of reach.** They are whole and
  server-backed (`ClanPanel.jsx`, `GuildPanel.jsx`, `caps.clans`,
  `caps.guilds`). But only two places opened them: the old MenuBar, which is
  hidden, and the wheel menu, which was replaced. The dashboard's Clan and
  Guild pages only read, and the guild one always says "You haven't joined a
  guild yet". So **no clan could be made, run or joined**.
- **A clan invite could never be accepted.** The invite reached the player as
  a popup saying "clan invite! (open Clans)", but the only Accept button was in
  that unreachable panel. The worker also keeps an invite for only 120 s
  (`CLANS.INVITE_TTL`), too short to walk to the Guild Hall from a land. So now
  the invite **raises its own card** wherever you are, like a duel challenge
  (`ClanInviteCard.jsx`):
  - **Accept** sends the same `clan_join_accept` the panel's button did, and the
    worker validates it.
  - **Not now** lets the invite lapse.
  - The card goes away once the invite expires or you are in a clan.
  - Tapping the dark backdrop does nothing, as on the duel card, so a stray tap
    cannot answer for you.
- **The mail was only a chat line.** The worker settles every delivery through
  `_creditPlayer`: a sale, a refund, a trade's payout, a wager coming back, the
  daily reward. A player online gets it at once; otherwise it waits in their
  inbox and drains at their next join. The game showed each as a chat line that
  scrolled away, and the daily reward not even that. `game/postOffice.js` now
  keeps every delivery of this visit, newest first, the last 30, in `S._mail`.
  That includes whatever drained at your join, which is "what came while you
  were away".
  - Nothing new is sent between the game and the worker, and nothing is stored.
  - Item keys read as words ("3× Black steel ore").
  - The daily chest is "A daily chest".
- **Messages from friends** already wait for an offline friend (friends.js
  `friend_dm` backlog, delivered at join). The Post Office opens them in the
  Social panel.
- **The Sheriff's Office.** A duel already starts from a player's card. What was
  missing was a way to pick an opponent, and the player list is that. The arena
  stays where it was, behind the Saloon's door; the Sheriff's row opens that same
  panel. Bounties are server-only and funded only by threats, which are switched
  off, so there is no row for them.
- **The Hotel stays shut.** Its rest is the farm bed's, and that runs only on
  your own device: no message, nothing the worker settles. The HP it restores
  is the worker's to give. It opens when the worker can pay for a rest.

## How it works

- `src/data/wheelBuildingDoors.js`:
  - `WHEEL_HALL_DOORS` maps each hall's plot to a `buildingPanel` value of its
    own. These are not TOWN_BUILDINGS entries, because those are today's town's
    buildings.
  - `WHEEL_HALLS` gives each hall's name, line and picture: the clan, guild,
    mail and duel windows' own icons.
  - `WHEEL_SHUT_DOORS` is now only `hotel`.
- `src/game/wheelTownDoors.js`: a door carries `hall`. `wheelTownDoorAt` returns
  it, and BroTown's scan leaves it in `S._nearWheelBuilding`.
- `enterBuilding` (`interactions.js`) and the E key (`desktopControls.js`) open
  the hall when no building of today's town is near.
- **Not counted as building visits.** Those are BUILDINGS indexes, and mayor_1's
  "visit 3 buildings" counts the twelve.
- `src/ui/panels/buildings/WheelHallPanel.jsx` draws the halls, in Lantern
  Slate like every building panel.

## Tests

- `tools/world/test-world-core.mjs`, "the buildings' doors":
  - the twelve, the three halls, the Hotel and the Town Hall make up the
    seventeen plots;
  - the halls are the "(new: …)" plots, each with a name and picture, opening a
    panel no other door opens;
  - the mail rules;
  - every delivery is recorded before the daily reward's quiet branch.
- `mp-wheelhalls` (14 checks), two players on phones against a real worker:
  - the Guild Hall's two panels, and a clan founded there with the worker's echo;
  - a clan invite raising its card, and Accept putting the other player in the
    clan;
  - the Sheriff's player list (the other player in it) and the arena;
  - the Hotel still shut;
  - the Post Office's mail (the gold granted, "+600 gold", and the day's chest)
    and Messages from friends;
  - no page errors.
  - Pictures: `wheelhalls-*.png`.
- `mp-wheeldoors`: now 12 open, 3 halls, 1 shut and the Town Hall. Its 11 checks
  pass.
