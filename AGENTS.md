# Contributor rules

This is independently buildable public source. Do not introduce private paths, credentials, restricted rulebook
text, unauthorized translations or bundled third-party art. New assets require an explicit license/source record.

Run `npm ci` and `npm run verify`. Preserve module IDs and compatible behavior. Each module releases independently.
Do not edit online Foundry files as the source of a fix. Do not change player/world data as part of a package update.

The maintainer integrates contributions into one development source and re-exports them. Do not force-push over
unreconciled contributions or import private Git history. A module upgrade does not update copied Actor Items.
