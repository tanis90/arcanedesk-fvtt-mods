# Arcane Dice So Nice DND5E Fix

Local compatibility patch for Dice So Nice v5.2.5 and dnd5e 5.3.3.

In local COS, dnd5e character-sheet saving throws emit Dice So Nice dice type `dd`.
Dice So Nice v5.2.5 registers `dd` as `shape: d6`, so d20 saving throws render as cube dice even though Foundry roll data is correct.

This module patches the Dice So Nice `dd` preset after initialization so it uses the standard `d20` shape, labels, values, mass, and inertia.
