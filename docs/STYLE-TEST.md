# The art style test (v2.3.2934)

> Owner, 2026-09-29: *"Yeah I don't know what aesthetic style is best. Maybe it
> should all be pixel art. Maybe only map should be painterly for a unique
> look. Don't know. The one advantage for making everything pixel art is that
> you're really good at adding effects that are code driven and don't exist as
> part of the original art asset. Maybe I'll test which aesthetic style looks
> best … Help me out with a test plan too."*

**What this decides:** the look of everything except the bro — ground,
objects, buildings, NPCs and, later, monsters. Every picture made afterwards
depends on it, so it is worth two evenings of testing before hundreds of
pictures are made. (Why it has to be decided at all: the bro is pixel art and
every map is painted, [WORLD-BIBLE.md §6](WORLD-BIBLE.md).)

**The tool is the Style Lab**, at `/tools/style/` on the site (on the pull
request's preview until it is merged). Everything below happens there, on
your phone.

- Each look's prompts are ready to copy.
- You bring ChatGPT's pictures back.
- Each look is shown on a stand-in for the game screen. It uses the game's
  camera and your real bro, with the real goblin, slime and blacksmith beside
  him, and code-drawn water, night, rain, snow, shadows and swaying trees.
- A scorecard keeps your notes. The pictures never leave your phone.

---

## The looks

| Look | What it is | Why try it | The risk | Pictures of its own |
|---|---|---|---|---|
| **Simple pixel art** | chunky pixels, dark outlines, flat colours: the bro's own style | the natural match; the pipeline can snap every picture to one grid and one palette | big areas of simple ground can look plain or tiled | 4 |
| **HD pixel art** | finer pixels, soft shading, coloured outlines, like today's monsters | the bro reads chunkier than the world, and the contrast can make him stand out | two pixel sizes on one screen; fine pixels shimmer more | 4 |
| **Painterly** | soft hand-painted illustration, like today's maps | the most unique look | the hardest to match to a pixel bro, and to keep consistent | 4 |
| **Painterly, snapped to pixels** | the painterly pictures reduced to the bro's pixel size and one palette | painted light and colour with pixel coherence; costs nothing extra | can turn muddy where the painting had fine detail | none: borrows Painterly's |
| **Flat cartoon** | bold outlines, flat fills, no texture | shares the bro's outline and flat shading; crisp at any size | a smooth world round a pixel bro may read as two games | 4 |
| **Your mix** | painted ground, pixel-art objects, building and NPC | your idea: a unique map with everything standing on it matching the bro | the edge between painted ground and pixel objects is where the eye goes | none: borrows Painterly's ground and Simple pixel's objects |

**Considered and left out:**

- **Pre-rendered 3D** (the Diablo II look). Its soft 3D lighting fights the
  bro's flat shading and hard outline.
- **Isometric.** It is a different camera from the one the game and the bro
  use, so the bro would have to be redrawn.
- **Watercolour or storybook.** Lovely on the ground, but its soft edges hide
  what blocks you: the painterly trade with less contrast.
- **Low-poly 3D.** It needs a 3D engine.

### Why pixel art is kind to code-drawn effects (the owner's point)

The effects the game adds in code — night and its lights, weather, water,
shadows, sway, hit flashes — look like part of the art when they are drawn in
the art's own terms. With pixel art that is easy to do exactly, and the lab
shows it:

- night light falls off in dithered pixel bands;
- the pond is drawn in the look's own colours;
- rain falls on the pixel grid;
- trees sway by whole pixels.

A palette also makes recolours cheap: a winter tree, a night version, a
rarity tint.

Painterly art takes soft effects well (glows, fog, gradients). Crisp
code-drawn shapes on top of it look pasted on.

**The rule that matters in any look:** pictures drawn with soft, even
daylight and no strong baked shadows. Then the code can add the time of day,
the shadows and the lights consistently. The prompts already ask for it.

---

## Round 1: every look, quickly (one evening)

1. **Save your bro's picture.** It is at the top of the lab. Press and hold
   it, then Save to Photos. Attach it to every chat below; ChatGPT matches
   what it can see.
2. **Make version A of each look that ChatGPT draws** (Simple pixel, HD
   pixel, Painterly, Flat):
   - a new chat: the **Ground** prompt and the bro picture;
   - a new chat: the **Objects** prompt and the bro picture.

   That is 8 chats. Add each picture to its slot as version A. The lab says
   whether it found the four objects on the sheet.
3. **The two borrowing looks fill themselves in.**
4. **Preview each look**, on the phone:
   - walk around by dragging;
   - try night, rain and the open dashboard;
   - get the slime and the goblin near you;
   - hold the phone at arm's length, as you play.
5. **Score it straight away**, while it is fresh (the seven questions below).
6. **Keep the best two or three.**

**If ChatGPT ignores the style**, ask once more in the same chat ("more like
the attached character"). Count the tries: that is question 7. A look that
needs a fight every time will fight you for 300 pictures.

## Round 2: the finalists (another evening)

1. **Version B** of the ground and the objects: fresh chats, the same
   prompts. Toggle **A/B** in the preview. That toggle is the consistency test.
2. **The Building and the NPC** (Mayor Bro) for each finalist.
3. **Fine-tune** in the lab: the pixel size, the number of colours, the
   ground tile size and the object size. Note the settings you like.
4. **Score again.**
5. **The friend test.** Screenshot each finalist in the lab at the same spot
   in daylight. Show three people and ask *"Which game would you download?"*
   Don't say which is which.
6. **Sleep on it**, and look again the next day.

Then press **Copy my results** in the lab and send it to Claude.

## Scoring

Each look gets 1–5 on seven questions:

1. The bro belongs here.
2. I can tell what I can walk on and what blocks me.
3. Monsters and people stand out from the ground.
4. Night, light, weather and water look good on it.
5. The A and B versions look like the same game.
6. I'd put this screenshot on the store page.
7. ChatGPT gave me a good one without a fight.

**Deciding:**

- Take the highest average.
- **But not a look scoring 2 or less on question 1 or 6.** A look the bro
  doesn't belong in, or that nobody would screenshot, loses whatever else it
  does well.
- If two looks are within 0.3 of each other, take the better one on question
  5. Consistency is what 300 pictures will test.

## Traps

- **Judging on a computer.** Judge on the phone at game size, where the bro
  is about 80 px tall.
- **Judging one lucky picture.** Version B is the real test.
- **Judging without the bro.** Every picture is judged next to him; the lab
  always shows him.
- **Novelty.** The newest look always looks best for an hour. Sleep on it.
- **ChatGPT's "pixel art" is only pixel-ish.** The lab snaps it to the real
  grid. Judge the snapped version: it is what the game would show.
- **Judging a building on its own.** Look at the whole screen, with the
  monsters.
- **Taking the stand-in for the game.** The lab's screen has no UI beyond the
  dashboard band, no other players and no real map. It tests the look, not
  the game.

## After the decision

1. **The style key prompt is rewritten for the winner** (World Bible §6),
   and the owner makes the style key from it.
2. **The lab's settings become the pipeline's.** The pixel size, palette size
   and ground tile that won become the settings every picture is processed
   with ([WORLD-ARCHITECTURE.md, "The art pipeline"](WORLD-ARCHITECTURE.md#6-the-art-pipeline-consistency-by-machine)).
   `public/tools/style/process.js` is the first version of that pipeline.
3. **The art order starts** (World Bible §7): buildings and props, then NPCs,
   then monsters where they clash.
4. **The ground approach is re-checked** against the winner (World Bible
   §13). Pixel looks favour ground baked from swatches.

**Proven in a real browser** by `node tools/qa/style-lab.mjs` (32 checks, at
a phone's size and density, with ChatGPT-shaped pictures). It is not on the CI
path.
