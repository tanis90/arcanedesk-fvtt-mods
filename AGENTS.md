# Contributor rules

This is independently buildable public source. Do not introduce private paths, credentials, restricted rulebook
text, unauthorized translations or bundled third-party art. New assets require an explicit license/source record.

Run `npm ci` and `npm run verify`. Preserve module IDs and compatible behavior. Each public module releases independently.
Do not edit online Foundry files as the source of a fix. Do not change player/world data as part of a package update.

The maintainer integrates contributions into one development source and re-exports them. Do not force-push over
unreconciled contributions or import private Git history. A module upgrade does not update copied Actor Items.

## Auto 2014 boundary

The complete Auto 2014 module (`arcane-dnd5e-2014-automation`) and the content-only package
(`arcane-dnd5e-2014-content`) are developed and released only from the private source repository
`tanis90/arcanedesk-fvtt-mods-private`. This repository receives reviewed automatic exports of approved
bytes; it is not a second Auto 2014 development or release source. Auto 2014 hand patches are not accepted
here: report the problem, and accepted fixes are made in the private source and re-exported. Never recreate
Auto module logic as a parallel implementation in this tree.

The DND5E runtime SDK has one source repository: `tanis90/arcane-dnd5e-runtime`. Consume its formal releases;
do not fork, vendor or rebuild the SDK here as a second implementation.

The public Arcane Spells 2014 suite remains an active independent release. Keep the spell-suite packages it
and its public build consume (`spell-compiler`, `spells-2014`, `spell-runtime`, `auto2014-runtime`,
`auto2014-catalogue`); they are not leftovers of the complete Auto 2014 module and do not authorize a
separate public Auto release.
