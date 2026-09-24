# Demo-audit polish, the daily chest, and the cooking quest's steps (v2.3.2820)

On 2026-09-24 the owner asked "is there any feature or anything clearly missing?" Three audits of the code found one real bug and a list of small gaps. The owner's reply was "Fix feedback button. Do the quick polish." This spec covers that pass.

## Feedback that arrives

- **The bug:** the only Feedback panel a player could reach (More → Settings → Feedback) sent each report as a `feedback` WebSocket event. The GameRoom had no case for it, so the default branch rebroadcast every report to every connected player, and nothing reached the Feedback Durable Object.
- **The fix, client:** `src/ui/mobile/dash/FeedbackPanel.jsx` posts to `/api/feedback/submit`, the route the hidden legacy panel always used.
  - It sends a category (Bug / Balance / Remove / Add / QoL / Praise) and a topic (`FEEDBACK_TOPICS`).
  - It says whether the report landed, using the states `sending`, `sent` and `error`.
- **Browse tab:** was "coming soon". It now lists the board by Newest or Most liked, with an up-vote that toggles.
- **Server:** `index.js` has a `case 'feedback'` that drops the socket event, so a client still on the old bundle cannot keep broadcasting reports to the room.
- **Server:** `feedback.js` raises the text cap from 100 to 500 characters (`FEEDBACK_TEXT_MAX`) to match the panel's box.

## Sound

- **Music and Effects sliders** sit under the Audio switch in Settings.
  - `BT_AUDIO` has two sub-buses under the master: `_musicBus` carries the zone score, the session track and the zone ambience; `_sfxBus` carries every sample.
  - Each bus is scaled by `musicLevel` / `sfxLevel`, from 0 to 1.
  - `setLevels(music, sfx)` sets them. The levels are saved in `brotown_vol_music` / `brotown_vol_sfx` and re-applied at boot in `GameApp`.
  - `GLOBAL_MUSIC_VOL` and the other constants stay the ceilings. A slider only scales below them.
- **The Audio switch now mutes immediately.**
  - Before, it wrote `window.BT_AUDIO`, which nothing ever sets, so muting only took effect after a reload.
  - `BT_AUDIO.setMuted(m, zoneId)` silences both buses. Un-muting reopens them and restarts the music the mute had kept from starting.

## Small things

- **Debug switch hidden:** the "Debug overlay" switch and the "floating D button" line only appear with `?dev=1`, the same test `GameApp` uses to mount the overlay.
- **Party chat chip:** a **Party** lane in the chat chips (`chatChannel.js`).
  - It appears only while you are in a party and while the worker advertises `caps.partyChat`.
  - It sends the same `/p` line `chat.js` has routed since v2.3.1212.
  - If you send a party line after the party is gone, it is refused rather than sent to the room, and the chips switch back to All.
- **Daily reward:** the reward (`cadence.js`) is shown once as a toast, the same small, self-dismissing `storeToastBus` toast used for store sales.
  - It waits until the intro has lifted and no loading or connect veil is up, because the worker pays it during the join.
  - It stays out of chat. v2.3.2037 removed the chat line at the owner's request.
- **About & privacy page:** opens from Settings (`AboutPanel.jsx`) and covers:
  - what the game keeps and why: character, hashed Login Key, device id, crash reports, feedback, reported chat, and a linked wallet;
  - the rules, including an age line of 13+;
  - the credits.
  - It is a plain-language draft written from the code. The owner should confirm the wording, especially the age line.

## The daily chest (replaces the daily coins)

The owner asked: "I'd rather have a loot box that has a high chance of coins but a small chance of other items like 10 cooked fish or rare gems or pieces of armor that have a chance of rolling for rarity etc. Instead of daily coin reward."

- **The day pays a chest.** The daily login consumer (`cadence.js`) credits one `daily_chest` into the bag through `_creditPlayer`, instead of gold.
  - The opId (`daily:<pid>:<day>`) is unchanged, so a day still pays exactly once.
  - The toast reads "Daily chest — day N · open it from your Bag".
- **Opening it.** Tap the chest in the bag, then **Open Chest**. The client sends `chest_open`; the worker (`server/src/dailychest.js`):
  - takes the chest out of its own copy of the bag;
  - rolls the prize, credits it and saves;
  - answers with `chest_opened` (listed in `PRIVILEGED_EVENTS`) and a `player_state`.
  - The client shows a reveal card (`ChestReveal.jsx`) and routes coins and armor through the loot-credit path (gold popup, stash adoption).
- **Odds** (`CHEST.PRIZES`, out of 100):

  | Prize | Weight | Notes |
  |---|---|---|
  | Coins | 78 | The old daily gold (25 + 10 per streak day, capped at day 7) × a 1.0–1.6 roll, so it is never less than the day used to pay. |
  | 10 cooked fish | 8 | |
  | Rare gem | 8 | |
  | Armor | 6 | Copper torso or greaves 70%, iron 30%. Quality is rolled by the same `_rollWeaponQuality` as monster drops, and the piece is minted into the provenance ledger with src `'chest'`. |

- **Safety:** an opId stops double opens, the key must match exactly, ownership is re-checked after the await, and the client only asks.
- **Caps:** `caps.dailyChest` gates the Open button.
- **Kill switch:** `dailyChest: false` in liveflags removes the cap and pays the day in gold again. A chest already in a bag waits; it is never destroyed.
- **Art:** the chest uses a 🎁 glyph until an icon is made (UI-BIBLE icon prompts).

## The cooking quest, step by step

The owner said: "A lot of people get stuck on the quest for cooking 2 fish. It doesn't specify that you need to cut a tree from a zone, tap on the log to light fire, need to have a fish in your inventory, tap on the fire, cook it, then bring mayor bro 2 of those."

- **Steps:** `life_1` carries a `steps` list (`gameSystems.js`). `questSteps(quest, R, S)` reads each step off live state (bag contents and a lit campfire) and marks the first undone step as the current one:
  1. catch a fish;
  2. chop a tree;
  3. tap the log in your Bag to light a fire;
  4. tap the fire to cook;
  5. cook 2 in total;
  6. bring them to Mayor Bro.
- **Where the next step shows:**
  - The pinned quest card at the top-left of the HUD shows "Next: …" instead of the objective.
  - The Quests list row shows the same "Next: …".
  - The quest page lists every step, ticked or pending.
  - `QuestStepNudge.jsx` says each new next step once as a toast.
- **The start dialogue** now spells out the fire-and-cook taps.

## QA

- **Browser:** `node tools/qa/mp/run.mjs polish` runs 26 checks against a real worker with two players. It covers:
  - the report on the board;
  - Browse and up-vote;
  - the socket event never reaching the second player;
  - the sliders changing the engine's levels;
  - the live mute;
  - no Debug switch;
  - the About page;
  - the party lane;
  - the daily toast;
  - the daily chest in the bag, opened with a reveal and taken by the worker;
  - the cooking quest's first and next-step toasts, the Quests row and the ticked checklist.
- **Server:** `server/test/feedback.test.mjs` runs 7 checks: 500 characters kept and 501 refused, category and topic still validated, the socket event dropped, and an ordinary relay as the control.
- **Server:** `server/test/dailychest.test.mjs` runs 20 checks: one chest per day, each prize kind, the coin floor and ceiling, a gid on the armor, refusals (no chest, junk key, replayed opId), the caps flag and the kill switch.
- **Server, existing suites:** `cadence.test` now pins the gold arithmetic with the switch off. `anticheat.test`'s bootstrap-bag checks leave out the day's chest, which lands after the bootstrap.
