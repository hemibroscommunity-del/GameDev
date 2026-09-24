# Demo-audit polish (v2.3.2820)

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

## QA

- **Browser:** `node tools/qa/mp/run.mjs polish` runs 18 checks against a real worker with two players. It covers:
  - the report on the board;
  - Browse and up-vote;
  - the socket event never reaching the second player;
  - the sliders changing the engine's levels;
  - the live mute;
  - no Debug switch;
  - the About page;
  - the party lane;
  - the daily toast.
- **Server:** `server/test/feedback.test.mjs` runs 7 checks: 500 characters kept and 501 refused, category and topic still validated, the socket event dropped, and an ordinary relay as the control.
