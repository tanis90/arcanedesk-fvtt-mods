# ArcaneDesk Foundry Modules

Independent Foundry VTT modules maintained by ArcaneDesk. Each module has its own version and release artifact.

| Module | Purpose | Compatibility baseline |
| --- | --- | --- |
| arcane-common-display-vision | Full-scene overview for Monk's Common Display, preserving GM-hidden tokens | Foundry 13, Monk's Common Display 13.01+ |
| arcane-dice-so-nice-dnd5e-fix | Correct the Dice So Nice dd preset to render a d20 | Foundry 13, Dice So Nice 5.2.5, dnd5e 5.3.3 |
| arcane-spells-2014 | Generate automated spells from existing 2014 content | Foundry 13, dnd5e 5.3.3, Midi-QOL, DAE |

These modules do not require ArcaneDesk Desktop. Their third-party dependencies are installed separately.

See the [spell suite guide](docs/spell-suite/README.md) for the 167-spell scope,
offline examples, installation and source-compendium generation flow.
Version 0.1.0 has passed SRD 5.1 generation and representative live spell tests.
Install using the [Foundry manifest](https://raw.githubusercontent.com/tanis90/arcanedesk-fvtt-mods/main/modules/arcane-spells-2014/module.json).

## Build and verify

Install Node 24, then:

```sh
npm ci
npm run verify
```

`dist/` contains one versioned ZIP per module and an `artifacts.json` digest manifest.
Tests check the adapters with controlled Foundry mocks; they do not claim a new live-world certification.

Auto 2014's shared compiler is available under [packages/auto2014-compiler](packages/auto2014-compiler/README.md).
Its canonical runtime source is available under [packages/auto2014-runtime](packages/auto2014-runtime/README.md).
The [automation catalogue](packages/auto2014-catalogue/README.md) contains 186 recipes that compose
caller-supplied content through the shared compiler. The complete installable Foundry module remains under
separation; these source packages do not distribute the existing full-text compendiums or summon creature data.
The catalogue's `./summons` entry assembles summon Actors from caller-provided content and separately
trusted validation data; it includes an original training fixture for independent verification.
The [Foundry pack builder](packages/foundry-pack-builder/README.md) writes caller-supplied documents into
compendiums and assembles new module directories. It shares the writer used by the complete internal build.
Its CLI assembles prepared JSON content bundles into new module directories; see the pack builder's
README for the `arcane-build-module` input format and source-checkout command.

## Contributions and licensing

Issues and pull requests are welcome. Accepted changes are integrated into the maintainer's development source
and exported here, preserving contributor attribution. Public source must remain independently buildable.

Arcane-owned source in this repository is Apache-2.0 licensed; see LICENSE and NOTICE.
No license is granted here for Foundry VTT, D&D publications, or other third-party modules and artwork.
