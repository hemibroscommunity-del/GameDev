# Disable HP Regen — Server-Side

> **SUPERSEDED IN PART — read this before acting on anything below (v2.3.1701).**
> HP regen came back twice, both times by owner directive, and the code is the
> truth (CLAUDE.md doc-trust):
> - **v2.3.1414** — the HUBS (town / worldview / farm_home) restore all three
>   pools fast, ~10% of max per regen tick.
> - **v2.3.1701** — the combat zones get an OUT-OF-COMBAT TRICKLE, ~1% of max
>   HP per tick after `SPOKE_REGEN_OOC_MS` with no damage taken *or dealt*.
>   This is exactly knob 1 of the Rollback section at the bottom of this file
>   ("re-enable OOC regen but slow it way down… a safety net not the primary
>   heal"), taken because a fresh character got about one snowman kill per
>   health bar and had to walk back to the World View between kills.
> Lifesteal is still the only heal available DURING a fight, which is the part
> of the design below that stands. `_tickPlayerRegen` (server/src/index.js) is
> the single implementation of all of it.

**For:** the Cloudflare Worker at `wss://brotown-server.hemibroscommunity.workers.dev`
**Companion client commit:** GameDev `session-1` v2.3.149 — `BroTown.jsx` HP regen blocks gutted

---

## Why

Melee-kill lifesteal (see `lifesteal-server.md` in this folder) is now the only HP recovery source by design. The original 2am note that started the lifesteal feature literally said "no regen" — this completes the design. Players heal by killing, not by waiting.

Stamina and mana regen stay on. Only HP regen goes away.

---

## What to change in the worker

### 1. Disable the OOC HP regen tick

Find the worker's HP regen tick function. From the client side, this is referred to as `_tickPlayerRegen` — your function may have a different name. It's the thing that fires on a periodic timer to push HP up via `player_state` after the player hasn't taken damage for a while.

Disable the HP portion. Two acceptable approaches:

**Option A — gate the HP heal step:**
```js
function _tickPlayerRegen(player, now) {
  // HP regen disabled by design (lifesteal is sole HP source).
  // Stamina + mana regen continue below.
  /*
  if (now - player.lastDamageTaken > OOC_GRACE_MS && player.hp < player.maxHp) {
    player.hp = Math.min(player.maxHp, player.hp + hpRegenAmount(player));
  }
  */

  // ... stamina / mana regen stays untouched ...
}
```

**Option B — set the per-tick HP heal amount to 0:**
If your regen uses a config object:
```js
const REGEN_CONFIG = {
  hpPerTickOOC: 0,        // was e.g. 0.015 (1.5%/s)
  hpPerTickInCombat: 0,   // was e.g. 0.003 (0.3%/s)
  staminaPerTick: 0.167,  // unchanged (10/s)
  manaPerTickOOC: 0.025,  // unchanged
  manaPerTickInCombat: 0.01, // unchanged
};
```

Either works. Option A is more surgical if the regen logic isn't centralized.

### 2. Also kill in-combat HP regen

If the worker has a separate path for in-combat regen (the client's was 0.3%/s while taking damage), disable that too. Same patterns as above.

### 3. Leave these untouched

- **Stamina regen** — players need it for dodge, shield-block drain, ability costs
- **Mana regen** — players need it for staff specials
- **Level-up HP restore** — the full-heal on level-up is a different code path (kill resolution → level up → `player.hp = player.maxHp`). Keep it.
- **Respawn HP restore** — `player.hp = player.maxHp` on respawn. Keep it.
- **Cooking food buff heals** — if cooking heals tick HP, that's an explicit player action, leave on. Only the passive ambient regen is what we want gone.
- **Lifesteal** — the v2.3.130-ish refund from `applyMeleeLifesteal` per `lifesteal-server.md`. Keep it (this is the replacement for regen).

---

## Verification

1. Take damage from a slime. HP drops.
2. Walk away, wait 30 seconds. **HP should not move.** Before this change it'd tick back up.
3. Kill another slime with melee. HP rises (lifesteal) — confirms lifesteal still works.
4. Hit level-up. HP fully restores — confirms level-up restore still works.
5. Die, respawn. HP at max — confirms respawn restore still works.

---

## Rollback

If gameplay testing shows this is too punishing (e.g. solo PvE feels grindy because every hit is permanent until you can find a kill), three knobs to consider before fully restoring regen:

1. **OOC trickle** — re-enable OOC regen but slow it way down (e.g. 0.3%/s instead of 1.5%/s) so it's a "safety net" not the primary heal.
2. **Restoration stat tuning** — make `Restoration` actually buff lifesteal % rather than regen %, giving the player a build axis to invest in HP recovery.
3. **Food buffs** — bump cooking's regen-food potency so it becomes the planned-recovery option.

Or just flip both gates back on if the feel is wrong — change is one-line revert in both files.

---

## Client side already done

`BroTown.jsx` lines around 9681-9738: both regen blocks have been gutted in v2.3.149. The client only runs HP regen in SP / dungeon mode anyway (the `!S._serverMonsters` gate), so this client change matters less than the worker change. But it's done for completeness — confirms intent in code and prevents any future contributor from re-enabling the SP path without realizing the design decision.
