# ArcaneDesk Foundry Modules

Independent Foundry VTT modules maintained by ArcaneDesk. Each module has its own version and release artifact.

| Module | Purpose | Compatibility baseline |
| --- | --- | --- |
| arcane-common-display-vision | Full-scene overview for Monk's Common Display, preserving GM-hidden tokens | Foundry 13, Monk's Common Display 13.01+ |
| arcane-dice-so-nice-dnd5e-fix | Correct the Dice So Nice dd preset to render a d20 | Foundry 13, Dice So Nice 5.2.5, dnd5e 5.3.3 |

These modules do not require ArcaneDesk Desktop. Their third-party dependencies are installed separately.

## Build and verify

Install Node 24, then:

```sh
npm ci
npm run verify
```

`dist/` contains one versioned ZIP per module and an `artifacts.json` digest manifest.
Tests check the adapters with controlled Foundry mocks; they do not claim a new live-world certification.

Auto 2014 is not included in this initial public export. Its source/content separation and provenance review
are in progress. This repository does not distribute its existing full-text compendiums.

## Contributions and licensing

Issues and pull requests are welcome. Accepted changes are integrated into the maintainer's development source
and exported here, preserving contributor attribution. Public source must remain independently buildable.

Arcane-owned source in this repository is Apache-2.0 licensed; see LICENSE and NOTICE.
No license is granted here for Foundry VTT, D&D publications, or other third-party modules and artwork.
