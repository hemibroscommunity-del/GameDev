# promo-shots

Marketing captures for the hairDAO x Hemi Bros demo-session post.

Not game assets and not part of any build — these are screenshots of the
real client, captured headless so the post ships what the game actually
looks like today rather than stale key art.

| File | What it shows |
|---|---|
| `phone-00-title.png` | Title screen — logo, Log in with your Key / Create Character |
| `phone-01-hair.png`  | Trait picker, Hair tab: 8 styles, "None" selected by default |
| `phone-02-beard.png` | Trait picker, Beard tab |
| `phone-03-look.png`  | A randomized bro (Randomize Look) + beard colour swatches |
| `phone-04-town.png`  | Spawn in Town |
| `phone-05-town-walk.png` | Town with Mayor Bro in frame |
| `phone-06-mayor.png` | Mayor Bro greeting card (the big pixel portrait) |

Framing is iPhone portrait (430x932 @3x = 1290x2796) because the client is
portrait-locked and letterboxes in a landscape viewport — a desktop-width
capture wastes most of the frame on black bars.

X crops portrait images hard in-feed. Composite these into 16:9 or post as
a 4-up grid rather than uploading one raw.

## Reproducing

    npm install && npm run build && npx vite preview --port 4173

then drive `http://127.0.0.1:4173/` with playwright-core against the
Chromium at `/opt/pw-browsers` — no worker needed, the client renders the
whole pre-game flow with the socket down. `tools/qa/qa-ui-shots.mjs` is the
maintained harness for full menu sweeps; these shots came from a one-off
variant of it that clicked through Create Character into the trait tabs.
