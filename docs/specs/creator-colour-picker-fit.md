# The creator's colour picker stops hiding colours it has room for (v2.3.2396)

**Owner report**, with a screenshot of the Hair tab on brotown.net:

> "For some reason the color picker is dimming the colors even when there's
> more room to display."

They are right. The fade cue was telling the truth — there *were* more
colours below the fold. The thing that was wrong was that there was no
reason for them to be below the fold.

## 1. What was actually wrong

`.bt-cc-colors-row` was a **fixed** height:

```css
height:calc(var(--cc-swatch)*2 + 9px)
```

Exactly two rows of swatches. On every tab. Whatever that tab's catalogue
holds, and whatever room the panel has left underneath.

Measured in a real client at 390×844, with a trait actually **picked** on
each tab (see §3 — that qualifier is the whole trap):

| tab   | swatches in the row | hidden behind the fade | empty panel below the Design button |
|-------|--------------------|------------------------|-------------------------------------|
| Hair  | 13                 | **75px** (150px of content in a 75px box) | **261px** |
| Shirt | 12                 | 37px                   | 374px                               |
| Hats  | 11                 | 37px                   | 2px                                 |

So on Hair the picker hid **half its colours** behind a scroll fade while
roughly a third of the panel sat empty underneath it. Hats is the honest
case: it really is out of room, because its option strip wants that space.

## 2. The change

```css
flex:0 1 auto;
height:auto;
min-height:calc(var(--cc-swatch)*2 + 9px);   /* floor:   two rows */
max-height:calc(var(--cc-swatch)*4 + 19px);  /* ceiling: four rows */
```

**The floor is not cosmetic — it is v2.3.1252's constant-size guarantee.**
Every tab reserves the same colour block, so the stage above it (and the
character standing in it) never moves when you switch tabs. That is the
reason this row is rendered at all on the five tabs that have no colours,
and merely ghosted. A row that collapsed to its content would put that
guarantee back in the bin, and the character would jump on every tab tap.

**The ceiling is four rows** because the longest catalogue is hair's, and
hair puts **thirteen** swatches in this row — the fourteenth, `Default`, is
a text button in `.bt-cc-colors-head` above it (v2.3.1310 put it there
deliberately; see the comment at the `.bt-cc-defcolor` render). Thirteen
tiles at the four columns a 390px screen gives is exactly four rows. Past
four the row scrolls again and the fade cue means something again — it was
never the cue that was broken.

`flex:0 1 auto` is what lets the row *give room back* on a tab like Hats,
where the option strip needs it: the row shrinks below its max toward its
min. It works because the wrap already carries `min-height:0`
(`.bt-cc-panel>.bt-cc-scroll`) — without that a flex item refuses to shrink
below its content and the row would win the fight with the strip.

## 3. The trap this cost a wrong diagnosis to

**The colour row is EMPTY until a trait is picked.** It renders as
`_colors || <div/>` — a fresh character is `None` on every tab, so there is
nothing to colour and the row holds one empty `div`.

The first probe written for this report opened each of the eight tabs,
measured `scrollHeight - clientHeight`, and reported **no overflow on any
tab**. It was measuring eight empty boxes. It nearly sent the whole
investigation after a cue-rendering bug that does not exist.

Any probe or test of this row must **pick a real option first**. See
TRAPS §66.

## 4. What was verified

At **390×844** and **390×664** (iPhone Safari with toolbars showing), on
every tab that has colours:

- `scrollHeight - clientHeight` is **0** — nothing hidden
- the `.bt-cc-more` fade cue is **off**
- the Design button's bottom is still **inside** the panel (worst case:
  24px of slack, Hair at 390×664)
- Hats' colour row correctly gave 38px back to its option strip

## Tests

`tools/qa/mp/mp-ccsize.mjs` §5 — **50/50**. Eight assertions across Hair and
Shirt: the swatches render at all (a guard, so an empty row cannot pass the
overflow check by having nothing in it), nothing is hidden, the cue is off,
and the Design button stays inside the panel.

**Mutation-tested:** restoring the two-row `height` turns **4 red**.

Full creator suite at the time of the change — `ccfit ccspin cckb ccjoin
ccshades ccsize ccbuttons ccstand ccfeet ccload questline` — **281/281**.
