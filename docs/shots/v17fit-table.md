# V17 fit, measured in the game (mp-v17fit, card UI4 PR 3, v2.3.6842)

Written by `node tools/qa/mp/run.mjs v17fit`. Sizes in CSS px. "band" is the band's box (on a computer its full width; the open block is "page"), "head" the nav row, "page" the page's box, "inner" the page less its pads and borders, "drawn" the box its content draws in. FAILS: a control under 44 x 44, a word cut or over another, the main action not whole in view. LISTED (never failed): a number unlike V17's table, two controls over each other.

| size | screen | band | head | page | inner | drawn | controls | under 44 | drawn under 44, touched 44 (a hit-extender) | cut / overlapping words | entries a row (width of one) | main action hidden | controls over each other | words px | unlike V17 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 390x844 | Directory (the Menu) | 390 x 243 | 52 | 390 x 191 | 382 x 183 | 369 x 179 | 10 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 10-13 | inner 382 x 183 (V17 378 x 179) |
| 390x844 | Bro | 390 x 243 | 52 | 390 x 191 | 390 x 191 | 359 x 182 | 12 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 10-15 | inner 390 x 191 (V17 378 x 179) |
| 390x844 | Combat hub | 390 x 243 | 52 | 390 x 191 | 382 x 183 | 364 x 171 | 7 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 11-24 | inner 382 x 183 (V17 378 x 179) |
| 390x844 | Weapon page (Sword) | 390 x 243 | 52 | 390 x 191 | 382 x 183 | 374 x 171 | 10 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 11-24 | inner 382 x 183 (V17 378 x 179) |
| 390x844 | Shared | 390 x 243 | 52 | 390 x 191 | 382 x 183 | 374 x 158 | 11 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 11-24 | inner 382 x 183 (V17 378 x 179) |
| 390x844 | Gear | 390 x 243 | 52 | 390 x 191 | 382 x 183 | 378 x 170 | 12 | 0 | Filter: All drawn 44x24, touched 44x44 | 0 | undefined (undefined) | 0 | 0 | 11-13 | inner 382 x 183 (V17 378 x 179) |
| 390x844 | Item summary (the worn sword) | 390 x 243 | 52 | 390 x 191 | 382 x 183 | 181 x 165 | 5 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 10-13 | inner 382 x 183 (V17 378 x 179) |
| 375x667 | Directory (the Menu) | 375 x 235 | 48 | 375 x 187 | 367 x 179 | 355 x 176 | 10 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 10-13 | inner 367 x 179 (V17 363 x 175) |
| 375x667 | Bro | 375 x 235 | 48 | 375 x 187 | 375 x 187 | 348 x 178 | 12 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 10-15 | inner 375 x 187 (V17 363 x 175) |
| 375x667 | Combat hub | 375 x 235 | 48 | 375 x 187 | 367 x 179 | 349 x 167 | 7 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 11-24 | inner 367 x 179 (V17 363 x 175) |
| 375x667 | Weapon page (Sword) | 375 x 235 | 48 | 375 x 187 | 367 x 179 | 359 x 168 | 10 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 11-24 | inner 367 x 179 (V17 363 x 175) |
| 375x667 | Shared | 375 x 235 | 48 | 375 x 187 | 367 x 179 | 359 x 155 | 11 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 11-24 | inner 367 x 179 (V17 363 x 175) |
| 375x667 | Gear | 375 x 235 | 48 | 375 x 187 | 367 x 179 | 362 x 166 | 12 | 0 | Filter: All drawn 44x24, touched 44x44 | 0 | undefined (undefined) | 0 | 0 | 11-13 | inner 367 x 179 (V17 363 x 175) |
| 375x667 | Item summary (the worn sword) | 375 x 235 | 48 | 375 x 187 | 367 x 179 | 173 x 161 | 5 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 10-13 | inner 367 x 179 (V17 363 x 175) |
| 320x568 | Directory (the Menu) | 320 x 217 | 48 | 320 x 169 | 312 x 161 | 305 x 161 | 10 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 10-13 | (no V17 row) |
| 320x568 | Bro | 320 x 217 | 48 | 320 x 169 | 320 x 169 | 306 x 168 | 12 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 10-15 | (no V17 row) |
| 320x568 | Combat hub | 320 x 217 | 48 | 320 x 169 | 312 x 161 | 294 x 149 | 7 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 11-24 | (no V17 row) |
| 320x568 | Weapon page (Sword) | 320 x 217 | 48 | 320 x 169 | 312 x 161 | 301 x 151 | 10 | 0 | 0 | Attack speed (wider than its box); Attack speed / 1.67 /s | undefined (undefined) | 0 | 0 | 11-24 | (no V17 row) |
| 320x568 | Shared | 320 x 217 | 48 | 320 x 169 | 312 x 161 | 304 x 141 | 11 | 0 | 0 | Max Mana / +; Move speed / + | undefined (undefined) | 0 | 0 | 11-24 | (no V17 row) |
| 320x568 | Gear | 320 x 217 | 48 | 320 x 169 | 312 x 161 | 308 x 155 | 12 | 0 | Filter: All drawn 44x24, touched 44x44 | Inventory (wider than its box) | undefined (undefined) | Staff: Pine Staff (not whole in view); Legs, empty (not whole in view); Gem, empty (not whole in view) | 0 | 11-13 | (no V17 row) |
| 320x568 | Item summary (the worn sword) | 320 x 217 | 48 | 320 x 169 | 312 x 161 | 146 x 143 | 5 | 0 | 0 | Copper Greatsword (taller than its box); Worn · Normal (wider than its box); Copper Greatsw / Worn · Normal | undefined (undefined) | 0 | 0 | 10-13 | (no V17 row) |
| 360x780 | Directory (the Menu) | 360 x 235 | 52 | 360 x 183 | 352 x 175 | 342 x 173 | 10 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 10-13 | (no V17 row) |
| 360x780 | Bro | 360 x 235 | 52 | 360 x 183 | 360 x 183 | 336 x 174 | 12 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 10-15 | (no V17 row) |
| 360x780 | Combat hub | 360 x 235 | 52 | 360 x 183 | 352 x 175 | 334 x 163 | 7 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 11-24 | (no V17 row) |
| 360x780 | Weapon page (Sword) | 360 x 235 | 52 | 360 x 183 | 352 x 175 | 344 x 165 | 10 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 11-24 | (no V17 row) |
| 360x780 | Shared | 360 x 235 | 52 | 360 x 183 | 352 x 175 | 344 x 152 | 11 | 0 | 0 | Move speed / + | undefined (undefined) | 0 | 0 | 11-24 | (no V17 row) |
| 360x780 | Gear | 360 x 235 | 52 | 360 x 183 | 352 x 175 | 348 x 162 | 12 | 0 | Filter: All drawn 44x24, touched 44x44 | 0 | undefined (undefined) | 0 | 0 | 11-13 | (no V17 row) |
| 360x780 | Item summary (the worn sword) | 360 x 235 | 52 | 360 x 183 | 352 x 175 | 166 x 157 | 5 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 10-13 | (no V17 row) |
| 414x896 | Directory (the Menu) | 414 x 251 | 52 | 414 x 199 | 406 x 191 | 390 x 185 | 10 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 10-13 | (no V17 row) |
| 414x896 | Bro | 414 x 251 | 52 | 414 x 199 | 414 x 199 | 377 x 190 | 12 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 10-15 | (no V17 row) |
| 414x896 | Combat hub | 414 x 251 | 52 | 414 x 199 | 406 x 191 | 388 x 177 | 7 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 11-24 | (no V17 row) |
| 414x896 | Weapon page (Sword) | 414 x 251 | 52 | 414 x 199 | 406 x 191 | 398 x 177 | 10 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 11-24 | (no V17 row) |
| 414x896 | Shared | 414 x 251 | 52 | 414 x 199 | 406 x 191 | 398 x 164 | 11 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 11-24 | (no V17 row) |
| 414x896 | Gear | 414 x 251 | 52 | 414 x 199 | 406 x 191 | 402 x 178 | 12 | 0 | Filter: All drawn 44x24, touched 44x44 | 0 | undefined (undefined) | 0 | 0 | 11-13 | (no V17 row) |
| 414x896 | Item summary (the worn sword) | 414 x 251 | 52 | 414 x 199 | 406 x 191 | 193 x 173 | 5 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 10-13 | (no V17 row) |
| 430x932 | Directory (the Menu) | 430 x 257 | 52 | 430 x 205 | 422 x 197 | 404 x 190 | 10 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 10-13 | (no V17 row) |
| 430x932 | Bro | 430 x 257 | 52 | 430 x 205 | 430 x 205 | 389 x 196 | 12 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 10-15 | (no V17 row) |
| 430x932 | Combat hub | 430 x 257 | 52 | 430 x 205 | 422 x 197 | 404 x 180 | 7 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 11-24 | (no V17 row) |
| 430x932 | Weapon page (Sword) | 430 x 257 | 52 | 430 x 205 | 422 x 197 | 414 x 182 | 10 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 11-24 | (no V17 row) |
| 430x932 | Shared | 430 x 257 | 52 | 430 x 205 | 422 x 197 | 414 x 168 | 11 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 11-24 | (no V17 row) |
| 430x932 | Gear | 430 x 257 | 52 | 430 x 205 | 422 x 197 | 418 x 184 | 12 | 0 | Filter: All drawn 44x24, touched 44x44 | 0 | undefined (undefined) | 0 | 0 | 11-13 | (no V17 row) |
| 430x932 | Item summary (the worn sword) | 430 x 257 | 52 | 430 x 205 | 422 x 197 | 201 x 179 | 5 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 10-13 | (no V17 row) |
| 844x390 | Directory (the Menu) | 844 x 130 | 48 | 844 x 82 | 836 x 74 | 807 x 66 | 10 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 10-13 | inner 836 x 74 (V17 832 x 72) |
| 844x390 | Bro | 844 x 130 | 48 | 844 x 82 | 844 x 82 | 814 x 67 | 12 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 10-15 | inner 844 x 82 (V17 832 x 72) |
| 844x390 | Combat hub | 844 x 130 | 48 | 844 x 82 | 836 x 74 | 761 x 48 | 7 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 11-24 | inner 836 x 74 (V17 832 x 72) |
| 844x390 | Weapon page (Sword) | 844 x 130 | 48 | 844 x 82 | 836 x 74 | 823 x 74 | 11 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 11-24 | inner 836 x 74 (V17 832 x 72) |
| 844x390 | Shared | 844 x 130 | 48 | 844 x 82 | 836 x 74 | 823 x 56 | 11 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 11-24 | inner 836 x 74 (V17 832 x 72) |
| 844x390 | Gear | 844 x 130 | 48 | 844 x 82 | 836 x 74 | 821 x 57 | 12 | 0 | Filter: All drawn 52x26, touched 52x44 | 0 | undefined (undefined) | 0 | 0 | 11-13 | inner 836 x 74 (V17 832 x 72) |
| 844x390 | Item summary (the worn sword) | 844 x 130 | 48 | 844 x 82 | 836 x 74 | 265 x 46 | 5 | 0 | 0 | Damage (wider than its box) | undefined (undefined) | 0 | 0 | 10-13 | inner 836 x 74 (V17 832 x 72) |
| 667x375 | Directory (the Menu) | 667 x 125 | 48 | 667 x 77 | 659 x 69 | 641 x 63 | 10 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 10-13 | (no V17 row) |
| 667x375 | Bro | 667 x 125 | 48 | 667 x 77 | 667 x 77 | 646 x 64 | 12 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 10-15 | (no V17 row) |
| 667x375 | Combat hub | 667 x 125 | 48 | 667 x 77 | 659 x 69 | 628 x 48 | 7 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 11-24 | (no V17 row) |
| 667x375 | Weapon page (Sword) | 667 x 125 | 48 | 667 x 77 | 659 x 69 | 646 x 69 | 11 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 11-24 | (no V17 row) |
| 667x375 | Shared | 667 x 125 | 48 | 667 x 77 | 659 x 69 | 646 x 54 | 11 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 11-24 | (no V17 row) |
| 667x375 | Gear | 667 x 125 | 48 | 667 x 77 | 659 x 69 | 656 x 55 | 12 | 0 | Filter: All drawn 52x26, touched 52x44 | 0 | undefined (undefined) | Gem, empty (not whole in view) | 0 | 11-13 | (no V17 row) |
| 667x375 | Item summary (the worn sword) | 667 x 125 | 48 | 667 x 77 | 659 x 69 | 110 x 44 | 5 | 0 | 0 | Unequip (clipped); 11.2 / Details | undefined (undefined) | Unequip (not whole in view) | Back to your gear / Details; Back to your gear / Unequip | 10-13 | (no V17 row) |
| 740x360 | Directory (the Menu) | 740 x 120 | 48 | 740 x 72 | 732 x 64 | 709 x 61 | 10 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 10-13 | (no V17 row) |
| 740x360 | Bro | 740 x 120 | 48 | 740 x 72 | 740 x 72 | 712 x 62 | 12 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 10-15 | (no V17 row) |
| 740x360 | Combat hub | 740 x 120 | 48 | 740 x 72 | 732 x 64 | 683 x 46 | 7 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 11-24 | (no V17 row) |
| 740x360 | Weapon page (Sword) | 740 x 120 | 48 | 740 x 72 | 732 x 64 | 719 x 64 | 11 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 11-24 | (no V17 row) |
| 740x360 | Shared | 740 x 120 | 48 | 740 x 72 | 732 x 64 | 719 x 51 | 11 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 11-24 | (no V17 row) |
| 740x360 | Gear | 740 x 120 | 48 | 740 x 72 | 732 x 64 | 717 x 52 | 12 | 0 | Filter: All drawn 52x26, touched 52x44 | 0 | undefined (undefined) | 0 | 0 | 11-13 | (no V17 row) |
| 740x360 | Item summary (the worn sword) | 740 x 120 | 48 | 740 x 72 | 732 x 64 | 161 x 46 | 5 | 0 | 0 | DPS (clipped); 11.2 (clipped); 5–8 (clipped); ★ / 5–8; ✕ / Details | undefined (undefined) | 0 | Back to your gear / Details | 10-13 | (no V17 row) |
| 932x430 | Directory (the Menu) | 932 x 143 | 48 | 932 x 95 | 924 x 87 | 889 x 72 | 10 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 10-13 | (no V17 row) |
| 932x430 | Bro | 932 x 143 | 48 | 932 x 95 | 932 x 95 | 894 x 73 | 12 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 10-15 | (no V17 row) |
| 932x430 | Combat hub | 932 x 143 | 48 | 932 x 95 | 924 x 87 | 827 x 48 | 7 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 11-24 | (no V17 row) |
| 932x430 | Weapon page (Sword) | 932 x 143 | 48 | 932 x 95 | 924 x 87 | 911 x 63 | 10 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 11-24 | (no V17 row) |
| 932x430 | Shared | 932 x 143 | 48 | 932 x 95 | 924 x 87 | 911 x 63 | 11 | 0 | 0 | 0 | undefined (undefined) | 0 | 0 | 11-24 | (no V17 row) |
| 932x430 | Gear | 932 x 143 | 48 | 932 x 95 | 924 x 87 | 909 x 64 | 12 | 0 | Filter: All drawn 52x26, touched 52x44 | 0 | undefined (undefined) | 0 | 0 | 11-13 | (no V17 row) |
| 932x430 | Item summary (the worn sword) | 932 x 143 | 48 | 932 x 95 | 924 x 87 | 353 x 46 | 5 | 0 | 0 | Copper Greatsword (taller than its box); Worn · Normal (wider than its box); Copper Greatsw / Worn · Normal | undefined (undefined) | 0 | 0 | 10-13 | (no V17 row) |
| 1440x900 | Directory (the Menu) | 1440 x 243 | 52 | 840 x 191 | 832 x 183 | 762 x 179 | 10 | 0 | 0 | 0 | 4 (204) | 0 | 0 | 10-13 | inner 832 x 183 (V17 828 x 179) |
| 1440x900 | Bro | 1440 x 243 | 52 | 840 x 191 | 840 x 191 | 723 x 182 | 12 | 0 | 0 | 0 | 3 (276) | 0 | 0 | 10-15 | inner 840 x 191 (V17 828 x 179) |
| 1440x900 | Combat hub | 1440 x 243 | 52 | 840 x 191 | 832 x 183 | 814 x 171 | 7 | 0 | 0 | 0 | 3 (273) | 0 | 0 | 11-24 | inner 832 x 183 (V17 828 x 179) |
| 1440x900 | Weapon page (Sword) | 1440 x 243 | 52 | 840 x 191 | 832 x 183 | 824 x 171 | 10 | 0 | 0 | 0 | 3 (276) | 0 | 0 | 11-24 | inner 832 x 183 (V17 828 x 179) |
| 1440x900 | Shared | 1440 x 243 | 52 | 840 x 191 | 832 x 183 | 824 x 158 | 11 | 0 | 0 | 0 | 4 (207) | 0 | 0 | 11-24 | inner 832 x 183 (V17 828 x 179) |
| 1440x900 | Gear | 1440 x 243 | 52 | 840 x 191 | 832 x 183 | 828 x 169 | 12 | 0 | Filter: All drawn 44x24, touched 44x44 | 0 | 3 (46) | 0 | 0 | 11-13 | inner 832 x 183 (V17 828 x 179) |
| 1440x900 | Item summary (the worn sword) | 1440 x 243 | 52 | 840 x 191 | 832 x 183 | 406 x 165 | 5 | 0 | 0 | 0 | 2 (203) | 0 | 0 | 10-13 | inner 832 x 183 (V17 828 x 179) |
| 1024x768 | Directory (the Menu) | 1024 x 243 | 52 | 480 x 191 | 472 x 183 | 447 x 179 | 10 | 0 | 0 | 0 | 4 (114) | 0 | 0 | 10-13 | (no V17 row) |
| 1024x768 | Bro | 1024 x 243 | 52 | 480 x 191 | 480 x 191 | 426 x 182 | 12 | 0 | 0 | 0 | 3 (156) | 0 | 0 | 10-15 | (no V17 row) |
| 1024x768 | Combat hub | 1024 x 243 | 52 | 480 x 191 | 472 x 183 | 454 x 171 | 7 | 0 | 0 | 0 | 3 (153) | 0 | 0 | 11-24 | (no V17 row) |
| 1024x768 | Weapon page (Sword) | 1024 x 243 | 52 | 480 x 191 | 472 x 183 | 464 x 171 | 10 | 0 | 0 | 0 | 3 (156) | 0 | 0 | 11-24 | (no V17 row) |
| 1024x768 | Shared | 1024 x 243 | 52 | 480 x 191 | 472 x 183 | 464 x 158 | 11 | 0 | 0 | 0 | 4 (117) | 0 | 0 | 11-24 | (no V17 row) |
| 1024x768 | Gear | 1024 x 243 | 52 | 480 x 191 | 472 x 183 | 468 x 169 | 12 | 0 | Filter: All drawn 44x24, touched 44x44 | 0 | 3 (46) | 0 | 0 | 11-13 | (no V17 row) |
| 1024x768 | Item summary (the worn sword) | 1024 x 243 | 52 | 480 x 191 | 472 x 183 | 226 x 165 | 5 | 0 | 0 | 0 | 2 (113) | 0 | 0 | 10-13 | (no V17 row) |
| 1280x800 | Directory (the Menu) | 1226 x 243 | 52 | 480 x 191 | 472 x 183 | 447 x 179 | 10 | 0 | 0 | 0 | 4 (114) | 0 | 0 | 10-13 | (no V17 row) |
| 1280x800 | Bro | 1226 x 243 | 52 | 480 x 191 | 480 x 191 | 426 x 182 | 12 | 0 | 0 | 0 | 3 (156) | 0 | 0 | 10-15 | (no V17 row) |
| 1280x800 | Combat hub | 1226 x 243 | 52 | 480 x 191 | 472 x 183 | 454 x 171 | 7 | 0 | 0 | 0 | 3 (153) | 0 | 0 | 11-24 | (no V17 row) |
| 1280x800 | Weapon page (Sword) | 1226 x 243 | 52 | 480 x 191 | 472 x 183 | 464 x 171 | 10 | 0 | 0 | 0 | 3 (156) | 0 | 0 | 11-24 | (no V17 row) |
| 1280x800 | Shared | 1226 x 243 | 52 | 480 x 191 | 472 x 183 | 464 x 158 | 11 | 0 | 0 | 0 | 4 (117) | 0 | 0 | 11-24 | (no V17 row) |
| 1280x800 | Gear | 1226 x 243 | 52 | 480 x 191 | 472 x 183 | 468 x 169 | 12 | 0 | Filter: All drawn 44x24, touched 44x44 | 0 | 3 (46) | 0 | 0 | 11-13 | (no V17 row) |
| 1280x800 | Item summary (the worn sword) | 1226 x 243 | 52 | 480 x 191 | 472 x 183 | 226 x 165 | 5 | 0 | 0 | 0 | 2 (113) | 0 | 0 | 10-13 | (no V17 row) |
| 1440x900-480 | Directory (the Menu) | 1440 x 243 | 52 | 480 x 191 | 472 x 183 | 447 x 179 | 10 | 0 | 0 | 0 | 4 (114) | 0 | 0 | 10-13 | (no V17 row) |
| 1440x900-480 | Bro | 1440 x 243 | 52 | 480 x 191 | 480 x 191 | 426 x 182 | 12 | 0 | 0 | 0 | 3 (156) | 0 | 0 | 10-15 | (no V17 row) |
| 1440x900-480 | Combat hub | 1440 x 243 | 52 | 480 x 191 | 472 x 183 | 454 x 171 | 7 | 0 | 0 | 0 | 3 (153) | 0 | 0 | 11-24 | (no V17 row) |
| 1440x900-480 | Weapon page (Sword) | 1440 x 243 | 52 | 480 x 191 | 472 x 183 | 464 x 171 | 10 | 0 | 0 | 0 | 3 (156) | 0 | 0 | 11-24 | (no V17 row) |
| 1440x900-480 | Shared | 1440 x 243 | 52 | 480 x 191 | 472 x 183 | 464 x 158 | 11 | 0 | 0 | 0 | 4 (117) | 0 | 0 | 11-24 | (no V17 row) |
| 1440x900-480 | Gear | 1440 x 243 | 52 | 480 x 191 | 472 x 183 | 468 x 170 | 12 | 0 | Filter: All drawn 44x24, touched 44x44 | 0 | 3 (46) | 0 | 0 | 11-13 | (no V17 row) |
| 1440x900-480 | Item summary (the worn sword) | 1440 x 243 | 52 | 480 x 191 | 472 x 183 | 226 x 165 | 5 | 0 | 0 | 0 | 2 (113) | 0 | 0 | 10-13 | (no V17 row) |
