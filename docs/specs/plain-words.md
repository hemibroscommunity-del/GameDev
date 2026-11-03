# Every townsperson speaks plainly (v2.3.4030)

The owner: "Just make the characters (all of them all dialog) a simple and
easy to understand personality and directions. No cryptic jokes or anything
that could confuse someone."

This reverses three earlier asks: "Keep the dialog witty and funny"
(v2.3.3525), the satire scripts (v2.3.3570, v2.3.3575) and "add back the
clever zingers" (v2.3.3611). The newer words are the owner's own, so they
win. The history stays in `docs/specs/npc-dialogue-v2.md`.

## The rule

- Each townsperson says who he is in ONE plain, friendly sentence ("I'm
  Farmer Bro. I grow the food for the whole town.").
- Then the job, as steps: what to get, how many, where, and who to bring it
  to. A hand-in says what you got and where to go next.
- No riddles, puns, sarcasm, inside jokes, or slang a 10-year-old wouldn't
  get. A light, plain joke a child gets is fine (the Mayor forgetting to say
  that blue slimes explode, the owner's own from v2.3.2237).
- Players read "Remains", never "remnants", and never "Wheel".
- The game's script is ASCII.

## Nicknames

The owner gave eight of the new cast nicknames. They say them, including when
they introduce themselves. Their keys and `name` fields stay as they are;
lane O adds the display-name map.

| On screen | Row name |
| --- | --- |
| Sizzle | Chef Blaze |
| Snail Mail | Postmaster Pete |
| Swampy | Deed Dave |
| Tryhard | Guildmaster Gary |
| Badge | Sheriff Buck |
| Going-Going | Gavel Greg |
| Fish Tales | Old Man Reel |
| Selfie | Tourist Terry |

## What changed, and where

| Lines | File |
| --- | --- |
| The 18 live quests' offers, progress lines and hand-ins | `src/data/gameSystems.js` `QUEST_CHAINS` |
| Lil Bro's line after a lost race | `src/data/gameSystems.js` `lilBroRaceLine` |
| All 21 townsfolk's chatter | `src/data/gameDisplay.js` `NPC_DATA[].phrases` |
| Reactions to emotes and dances | `src/game/townsfolkReact.js` `REACT_LINES` |
| Lil Bro's race shouts | `src/game/race.js` |
| Ace's coin-flip window | `src/ui/panels/AceFlipPanel.jsx` |

- Every quest's order, counts, places, items and rewards are unchanged. The
  kill quests' `need` fields are not touched.
- Blacksmith Bro's hand-in says "one bar for each ore", ready for one ore a
  bar at the smelter.
- Trader Tix's `trader_2` (a dormant giver's quest) gets
  `need: {progress: true, n: 3}`, so its card shows "(1/3)" from what the
  worker counts (every harvest: a tree, a rock or a fish), and a progress
  line that names the 3: "Gather 3 times: chop a tree, mine a rock or catch
  a fish." Lane F's quest card (PR #1359) left this quest's words to this
  PR. Main already reads `need.progress` (`questCountText`).
- Ace no longer calls betting odds at a dance-off ("3 to 1"). He says who he
  thinks will win: "Dance-off! I think Mover will win! Who wants to join?"
- Ace's window says the odds as plain numbers: "I win 55% of flips, and you
  win 45%." The 3 in "3 times your stake" is read from `ACE_FLIP_RISK_MULT`.

### Kept as they were

- The Mayor's welcome caption, which matches his recorded voice.
- The "I have a task for you! Tap me." and "All done? Tap me!" bubbles and
  "<name> has nothing for you right now": already plain.
- Diego's dance line "Hey! This is a business!" (`mp-joinin` waits for it).
- The dormant givers' old quests (Trader Tix and the rest), which no
  townsperson offers.
- `grottoPartyAside`, unused since v2.3.3869, kept for the owner to bring
  back.

## Lines from PR G1 (v2.3.3924)

PR G1 (lane G, `claude/questline-order`) rewrote some lines first. Here they
are G1's words, character for character, so the two PRs merge cleanly in
either order:

- Diego's three `fish_1` lines, with G1's comments;
- Farmer Bro's `farm_1` hand-in.

The Mayor's dungeon quest (`mayor_3`) offer, progress line and description
are left as they are on main. G1 rewrites them with "[Lv 10+ recommended]",
built from `GROTTO_REC_LEVEL`, which G1 moves above `QUEST_CHAINS`. Copying
those lines would mean copying that move too. Only `mayor_3`'s hand-in is
said plainly here. `git merge-tree` of this branch and G1 is clean.

## Before and after, one line each

| Who | Before | After |
| --- | --- | --- |
| Mayor Bro | "I'm Mayor Bro, four elections in a row, and I'd like to thank the voters. Both of them." | "I'm Mayor Bro, and I take care of this town and everyone in it." |
| Blacksmith Bro | "I'd mine it myself, but I hurt my back picking up a protein shake." | "Hey, I'm Blacksmith Bro! I love lifting weights almost as much as I love making armor." |
| Diego | "Ey, amigo, step into the office. I'm launching a cookbook, and I can't turn on a stove." | "Hi, I'm Diego! I run the General Store, and I'm writing a cookbook, but I've never cooked a fish." (G1's) |
| Farmer Bro | "A slime blew up my carrot patch, man. I sang those carrots to sleep every night." | "Hi, I'm Farmer Bro! I grow the food for the whole town, but a slime ruined my carrots." |
| Woodworker Bro | "Welcome to BroTown's most advanced woodworking lab, which is also the only one, which is also my garage." | "Hi, I'm Woodworker Bro! I study wood all day, and pine is my favorite." |
| Lil Bro | "Wait, YOU'RE the new hero?! Bro, you have zero aura." | "Hi, I'm Lil Bro, and I'm the fastest kid in BroTown!" |
| Beastmaster Bro | "Keep your voice down, we're deep in the danger zone. ...Okay, it's behind the bakery." | "Hi, I'm Beastmaster Bro. I catch wild monsters and keep them as pets." |
| Ace | "The coin is rigged 55% me, 45% you. Yes, I'm telling you it's rigged. You're still gonna tap it. Bet?" | "I'm Ace, and I flip coins for gold. ... I win 55% of flips, and you win 45%." |
| Sterling | "Your coins are safe here. Safe is a strong word." | "Items and gold in the Bank stay safe, even if you lose a fight." |
| Slim | "This one's barrel-aged. ... which is why it's called the Tetanus." | "I'm Slim. I run the Saloon. Talk to me to see your party." |
| Sizzle | "Welcome to Flavor Country, population: me! The fish is raw." | "I'm Sizzle, the chef! Talk to me to open the Cookhouse and see the recipes." |
| Glint | "Mercury's in retrograde, so all sales are final." | "I'm Glint. I cut gems at the Gem Works. Talk to me to open it." |
| Snail Mail | "Your letter's in the back. The back has been closed since the telegraph." | "I'm Snail Mail, the postmaster. Talk to me to open the Post Office." |
| Swampy | "Waterfront property! The water's not there yet, but it's coming." | "I'm Swampy, the land agent. Talk to me to open the Land Office." |
| Benny | "Every room has a view. Of the next room." | "A rest fills up your health, stamina and mana, and it's free!" |
| Tryhard | "Pull when I say pull. Don't pull when I say don't. Kevin. KEVIN." | "I'm Tryhard, the guildmaster. Talk to me to open the Guild Hall." |
| Badge | "This badge is real. I got it in the mail." | "I'm Badge, the sheriff. Talk to me to open the Sheriff's Office." |
| Going-Going | "Do I hear ten? Do I hear twelve? I hear a bird. Sold to the bird." | "I'm Going-Going, the auctioneer. Talk to me to open the Auction House." |
| Fish Tales | "Caught one THIS big yesterday. Threw it back. Out of respect." | "I'm Fish Tales. Every fish I catch gets bigger when I tell the story." |
| Bean | "I'm streaming right now, say hi to chat! Chat is my mom. Hi, Mom." | "I'm Bean! I'm streaming right now. Say hi!" |
| Selfie | "Which way to BroTown? ...I'm IN it? Huh. The brochure had more dragons." | "I'm Selfie! I'm visiting BroTown, and I take pictures of everything." |

## Tests

- `quest-lines`: §2c Lil Bro says "I won!" after a lost race; §5b each
  giver's first offer says "I'm <name>"; §5c no old slang ("aura", "skill
  issue", "GG", "lag", "montage", "protein", "tourism board"...). The rules
  before still hold: one tap, at most 300 characters, every count named,
  "Remains", no "Wheel".
- `npc-cast`: §6a no old slang in any chatter; §6b the eight introduce
  themselves by nickname; §6c no line says a name they no longer go by.
- `townsfolk-react` §4b: Ace's new dance-off call.
- `mayor-grotto`, `desk-words`: unchanged, still passing (the Mayor's first
  hand-in still says the slimes explode, gives "a bow and a staff" and ends
  "Blacksmith Bro and Diego have work for you.").
- Phone checks: `mp-race` §6 reads Lil Bro's new lines; `mp-handin1` §3
  knows the Mayor's new hand-in.
