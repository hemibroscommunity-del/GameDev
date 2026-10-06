# Daily rewards: a free spin, three daily quests, a season (v2.3.3109)

> Owner, 2026-10-06, with a brief on what works in top-grossing games: *"a
> layered system: a small reward just for logging in, daily quests that get
> people playing, and both feeding a longer progression track like a battle
> pass."* The brief also asked for forgiving streaks, a big payoff that grows,
> a bit of luck, and 5–15 minute sessions. It listed four mistakes to avoid:
> rewards too small for the economy, too many overlapping dailies, harsh streak
> resets, and quests that push play styles people don't enjoy.
>
> Then, mid-build: *"Personally I find the login page with the chest
> intrusive. I'd rather have it be something like a free daily spin from the
> gambling building where you can win quite good rewards but it's rare. Like a
> layered reward spin system where the first win has a 50% chance and it
> continues further spins at a 50% win chance and the rewards double each
> time."* And: *"You can remove the daily chest and just do the gambling spin
> like I said."*

Nothing opens on login. Each of the three layers lives in its own place.

## What the player sees

### 1. The free daily spin, at the Gambling Den

- The top of the Gambling Den's window is a wheel and a ladder of ten prizes.
  - The wheel has eight slices: four gold **WIN** and four slate **✕**.
  - The ladder runs 25 → 50 → 100 → … → 12.8k, each prize double the one
    before.
- **Spin · free**: the wheel turns while the server rolls, then lands on a
  slice of the answer's colour.
  - **A win** lights the next rung and pays it at once. The button becomes
    **Spin again · 50%**.
  - **The first miss** ends the run, and you **keep the rung you reached**.
    That rung was paid as you climbed, so a miss takes nothing back.
- One free run each UTC day. The button counts down to the next one: "Next
  free spin in 7h 12m".
- **Bonus spins** start extra runs. You get them by finishing all three daily
  quests and from the season. The button says "Use a bonus spin (2)".
- The **login streak** raises the first prize: 25 coins on day 1, +5 a day, up
  to 55 at a 7-day streak. A run's top prize is 512 × the first, so 12,800 to
  28,160 coins.
- "Daily quests & season ›" opens the Daily Rewards window.

### 2. The Daily Rewards window, Today tab

- **The streak**, and its **freezes** (❄ 0/2):
  - You earn a freeze on every 7th day of a streak, and hold at most 2.
  - A missed day spends one by itself. The streak carries on, but the frozen
    day doesn't count.
  - A gap longer than your freezes starts the streak again at day 1. That
    costs only the spin's streak bonus; season stars never reset.
- **The spin's state**: ready, still going, bonus spins to use, or done.
- **Three daily quests.** They open once Mayor Bro's first quest (tut_1) is
  handed in, which is when you can first leave the commons.
  - Each has an icon, a count ("7/15"), a bar, and its pay ("100 coins · ★ 1").
  - A quest pays the moment it's done, with a toast: "Daily quest done:
    Defeat 15 monsters · +100 coins · +1 ★". There is no claim step to forget.
  - **↻** swaps one quest for another, once a day. The new one can be from any
    group, so a player who only likes fighting can swap a gathering quest for
    a fight.
  - **Finish all three**: +1 ★ and a bonus spin.

### 3. The Daily Rewards window, Season tab

- **28-day seasons** from a fixed Monday (2026-10-12). Everything before that
  date counts as season 1, so season 1 is never short.
- **Stars** come from three places:
  - each daily quest (1);
  - finishing all three (1);
  - the day's free spin (1).
  That is up to 5 a day.
- Every 3 ★ opens a **tier**. There are 25 tiers, so 75 ★ completes the track:
  about 15 full days, or most of the month at a relaxed pace.
- **Claim** each reached tier, or **Claim all**. Milestones come every fifth
  tier, and the last tier is the biggest.
- **Forgiving**:
  - a missed day just pauses (stars never go down);
  - anything reached but **never claimed is mailed when the season ends**;
  - stars past tier 25 keep paying a **bonus spin every 5 ★**.

### Where the window opens

- A **Daily rewards** card at the top of the **Quests** tab. It reads "1/3
  daily quests · ★ 14 · free spin ready", and has a brass edge while something
  is waiting.
- The Gambling Den's "Daily quests & season ›" button.
- The **Quests** button's brass dot lights while a season tier waits to be
  claimed. A ready free spin does not light it, because it would be on every
  day for players who never gamble.

### Removed

- **The daily chest at login.** No chest goes into the bag and no window
  opens by itself.
- A chest already in a bag still opens from the bag. Nothing a player holds
  is taken away.

## Numbers, and why

Sized against the economy as it stands:

- a monster drops ~5 gold at level 1 and ~13 at level 30, so an hour of
  fighting earns roughly 1–2k;
- the forge's weapon tiers cost 8–120 gold up to level 30;
- potions cost 12–35;
- a bar sells for ~120.

Coins are plentiful, so the rewards lean generous. They are still a minority
of what normal play earns.

| Layer | Pays | On average |
|---|---|---|
| Free spin | 25–55 first rung, ×2 a rung, 10 rungs (top 1 run in 1,024) | base × 11/4 ≈ 69–151 coins a run |
| Daily quest | 100 (fight, gather), 120 (fight in a named land), 150 (cook, smelt) | ~300–400 coins a day for all three |
| All three | +1 ★, +1 bonus spin | — |
| Season (25 tiers) | 8,600 coins, 14 rare gems, 15 bonus spins, 3 freezes, 15 cooked minnows, 5 iron bars (an iron torso's worth) | ~300 coins a day over 28 days |

**The daily quests** (`DAILY.QUESTS.TEMPLATES`, server/src/dailyrewards.js).
Each is a few minutes: a commons vein or tree is back in 20 s, and there are six
of each by town.

| Quest | Group | Counts | Offered when |
|---|---|---|---|
| Defeat 15 monsters | fight | every kill you helped with (party-friendly, like the story quests) | always |
| Defeat 10 in *a land* | fight | kills of that land's monsters (`m.home`) | always |
| Mine 10 ore | gather | ore from each strike (a perfect strike's 2 count 2) | you hold a pickaxe |
| Chop 10 logs | gather | logs | you hold an axe |
| Catch 8 fish | gather | fish | you hold a rod |
| Cook 4 fish | craft | fish cooked, not burnt | rod (or 4 raw fish) and axe (or a log) |
| Smelt 2 bars | craft | bars smelted | pickaxe (or 10 ore) |

**How the day's three are picked:**

- a fight, then a gather if you hold a tool, then anything else you can do;
- never the same quest twice, except a land quest in a different land;
- so a player with no tools yet still gets three, and can still earn the
  all-three bonus;
- the pick depends only on the player and the day.

**The season's tiers** (`DAILY.SEASON.TIERS`):

| Tier | Pays |
|---|---|
| 1 | 150 coins |
| 2 | a bonus spin |
| 3 | 5 cooked minnows |
| 4 | 200 coins |
| 5 | a rare gem + 2 bonus spins |
| 6 | 250 coins |
| 7 | a streak freeze |
| 8 | 10 cooked minnows |
| 9 | 300 coins |
| 10 | 2 rare gems + 400 coins |
| 11 | a bonus spin |
| 12 | 400 coins |
| 13 | 5 iron bars |
| 14 | a streak freeze |
| 15 | 3 bonus spins + 600 coins |
| 16 | 450 coins |
| 17 | a rare gem |
| 18 | 500 coins |
| 19 | 2 bonus spins |
| 20 | 3 rare gems + 1,000 coins |
| 21 | 600 coins |
| 22 | a streak freeze + a bonus spin |
| 23 | 750 coins |
| 24 | 2 rare gems |
| 25 | 3,000 coins + 5 rare gems + 5 bonus spins |

Every number is one constant in `DAILY` (server/src/dailyrewards.js). The
client draws whatever the server sends, so a retune is a server-only change.

## How it works

### Server: `server/src/dailyrewards.js`

`dailyRewardsMethods` is mixed into GameRoom.

- **The record:** one per player, `daily_rewards:<pid>`. It is registered in
  ARCHITECTURE-HANDOFF rule 2.
  ```
  { _v, sp: {day, free, open, k, base, run, extra},
        dq: {day, list: [{t, p, g, n, d, c}], rr, all},
        se: {s, st, cl: [tier...], ov} }
  ```
  It is cached in memory while the player is online, and written at once on
  every value-bearing change: a spin, a finished quest, a claim, a reroll, a
  new day. A count going up ("defeat 7/15") is only marked dirty. The tick
  writes it every 30 s and the disconnect handler writes it on the way out,
  the regen-save posture. A deploy can lose a few seconds of counting, never
  a reward.
- **The spin settles like Ace's coin flip.** One input-gated event rolls,
  adds the coins, saves, and answers. Nothing is escrowed; handoff rules 7–8.
  A run's layers are paid as it climbs (layer 1 = base, layer k = base ×
  2^(k−2)), so a run that reached layer k has paid base × 2^(k−1) in all. The
  client's `opId` stops a resent tap from spinning twice
  (`oplog:spinop:<opId>`).
- **Quests and the season pay through `_creditPlayer`.** The opIds are
  deterministic: `dq:<pid>:<day>:<slot>` and `season:<pid>:<season>:<tier>:<grant>`.
  A claim and the season-end mail share the second opId, so the same tier can
  never pay twice. Spins and freezes are the record's and the streak's own:
  `sp.extra`, and `cadence:login`'s `fz`.
- **The day turning over:**
  - on join;
  - on any ask (`_drRollover`);
  - for a player online across UTC midnight, on the tick (`_drTick` →
    `_drNewDayOnline`). The streak advances there exactly as a login
    tomorrow would.
  - A new season closes the old one at the first sight of the player after
    it ends: unclaimed tiers are mailed, and a `season_end` news item says so.
- **Where the quests are counted.** `_drSignal`, one line at each choke point
  that settles the act:

  | Signal | Where |
  |---|---|
  | kill | `combat.js _resolveMonsterKill`, every XP recipient, next to `_creditQuestObjective` |
  | gather | `gathering.js _handleNodeStrike`, by skill and yield |
  | cook | `cooking.js _handleCookRequest`, a cooked fish |
  | smelt | `smelting.js _handleSmeltBar`, bars made |

- **Unlock:** handing in `tut_1` (`quests.js` → `_drOnQuestTurnIn`) rolls today's
  three at once.

### Streak: `server/src/cadence.js`

`_cadenceLoginReward` **pays nothing now**. It settles the login streak in
`cadence:login:<pid>` = `{period, streak, fz, saved, best}`. It returns what it
settled, or null on a second login the same day.

### Client

- `src/game/dailyRewards.js` holds the server's last state, turns `news` into
  toasts and sounds, and sends the four asks.
- `src/ui/panels/buildings/DailySpin.jsx` is the spin. It is drawn in code: a
  conic-gradient wheel and chip rungs, with no art to load and nothing held
  when shut.
- `src/ui/mobile/DailyRewardsWindow.jsx` is the window. It uses the InfoPopup
  recipe for small screens (the card capped at the screen, only the middle
  scrolling), at z 9250.
- `src/ui/mobile/dash/DailyRewardsCard.jsx` is the Quests card.
- `ChestReveal.jsx` lost its login offer.

## Wire

| Direction | Type | Payload | Notes |
|---|---|---|---|
| c→s | `rewards_get` | `{}` | answers `rewards_state`; throttled 800 ms |
| c→s | `daily_spin` | `{opId}` | one spin: starts today's free run, else a bonus run; continues an open one |
| c→s | `daily_reroll` | `{i}` | slot 0–2, exact integer; once a day; not a finished quest |
| c→s | `season_claim` | `{tier}` or `{all: true}` | exact integer tier, reached and unclaimed |
| s→c | `rewards_state` | `{now, resetAt, spin, streak, dq, season, news}` | PRIVILEGED; after `player_state` on join, and after every change |
| s→c | `daily_progress` | `{i, n, g}` | PRIVILEGED; a quest's count between two states |

`news` kinds:

| Kind | Fields |
|---|---|
| `spin` | `won`, `k`, `paid`, `total`, `base`, `open`, `started`, `top`, or `refused` |
| `daily` | `i`, `t`, `p`, `coins`, `stars`, `all` |
| `reroll` | `i` |
| `claim` | `tiers`, `grants` |
| `season_end` | `s`, `stars`, `mailed` |
| `newday` | — |
| `unlocked` | — |

All four c→s types are passthrough lines in the client's `channelShim`
allowlist (TRAPS #18) and explicit router cases in `index.js`. The new
payouts' `inbox_delivered` sources (`dailyquest`, `season`) stay out of chat.
The news says it instead, the daily login reward's rule since v2.3.2037.

## Deploy order and kill switches (rule 19, TRAPS §117)

- **`caps.dailyspin`** gates the spin's section and `daily_spin`.
- **`caps.dailyquests`** gates the window, the card, the dot and the other
  three asks.
- An old worker advertises neither, and the client shows neither.
- An old client against the new worker never sees a spin. Its payouts arrive
  as ordinary mail lines.
- Both are lower-case **kill switches** the admin flags route can throw:
  - `dailyspin: false` refuses every spin;
  - `dailyquests: false` stops the counting, the rerolls and the claims.
  - Nothing is taken away by either; the record waits.
- The removed login chest needs no switch. `dailyChest` still gates opening a
  chest a bag still holds.

## Tests

- **`server/test/dailyrewards.test.mjs`** (~100 checks):
  - the helpers;
  - join and caps;
  - every spin rule: doubling, keep on a miss, once a day, the top, bonus
    runs, the streak's base, opId replay, cooldown, a new day, the switch;
  - the quests: lock, three for the toolless, counting by land/skill, paid
    once, all-three, reroll, junk input, the switch;
  - the season: claim, twice, not reached, junk, all, spin/freeze grants,
    overflow, the season end mailing what was never claimed, and never twice;
  - saving: tick, close, reload;
  - midnight online;
  - the wire.
- **`cadence.test.mjs` §2:** the streak and its freezes, and that a login pays
  nothing.
- **`dailychest.test.mjs`:** no chest on login; a held chest still opens, every
  prize.
- **`mp-dailyrewards`** (phone, 16 checks):
  - nothing at login;
  - the Gambling Den's spin, paying exactly the rung reached and landing on
    the right colour;
  - a bonus run;
  - the window's quests, reroll and all-three;
  - the season's claims;
  - sideways fit;
  - the Quests card.
- **`mp-polish`:** no chest at login; a held chest still opens from the bag.
- **Admin test hook** `POST /api/admin/dev/daily {playerId, stars?, spins?,
  quest?: [i, n]}`. It is behind the admin key and its audit log, like every
  `/dev/` op.
