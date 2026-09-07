# Arcane Common Display Vision

Foundry VTT 13 client-side visibility adapter for the player selected by
Monk's Common Display.

The common display remains a normal Player and is not bound to an Actor or
Token. On that one client, the module makes the canvas behave as if the viewed
Scene does not require Token Vision. Foundry therefore renders the full Scene
and every non-hidden Token. Core hidden-token handling is not patched, so
Tokens hidden by the GM remain invisible to the common display.

The module:

- activates only for a non-GM user marked `display: true` in
  `monks-common-display.playerdata`;
- does not update Scene, Actor, Token, User, fog exploration, or ownership data;
- re-applies the visibility refresh whenever a Scene canvas becomes ready;
- requires Foundry VTT 13 and Monk's Common Display 13.01 or newer.

## Validation

From this repository root:

```powershell
node modules\arcane-common-display-vision\scripts\validate.mjs
```
