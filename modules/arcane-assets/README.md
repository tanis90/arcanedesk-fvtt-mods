# Arcane Assets — Portraits & Tokens

Openly-licensed western-fantasy **portraits, face tokens and 4,200+ semantic icons**
for Foundry Virtual Tabletop (v13). System-agnostic; no ArcaneDesk dependency.

| Compendium | Contents | License |
|---|---|---|
| 头像 · 涂鸦风 Portraits — Doodles | 204 hand-drawn NPCs, villagers, zealots (Gordy Higgins) | Public domain |
| 头像 · 具名角色 Portraits — Named Characters | 31 named fantasy characters (Gordy Higgins) | Public domain |
| 头像 · 古典油画 Portraits — Classical | 41 classical portraits & illustrations (Met Open Access, Wikimedia Commons) | CC0 / public domain |
| Token · 暗黑风头像 Tokens — Dark Fantasy Faces | 50 dark-fantasy face tokens by vil | Custom, credit "vil" |

`assets/game-icons/` additionally ships **4,239 semantic SVG icons** from
[game-icons.net](https://game-icons.net) (CC-BY 3.0) organized per author — not in a
compendium; use them from any image picker, or via the module's `index.json`.

Every asset is described in **`index.json`** (bilingual names, controlled-vocabulary
attributes `attrs`, derived `tags`, per-entry `license`/`attribution`) so agents and
tooling can pick art by text query without vision.

## Attribution

- **Gordy Higgins** — public domain, no attribution required (https://gordyh.itch.io)
- **The Metropolitan Museum of Art, Open Access** — CC0
- **Wikimedia Commons** — public domain
- **game-icons.net authors** (Lorc, Delapouite, … per-folder) — **CC-BY 3.0**
- **vil — Faces for a Dying Land vol.1** — custom license, **credit "vil"**
  (https://zordvil.itch.io) in any publication using these faces

Full details: [ATTRIBUTIONS.md](ATTRIBUTIONS.md).

## Localization

Pack labels localize natively (`lang/en.json`, `lang/zh-cn.json`). Compendium entry
names are English-canonical; with the [Babele](https://foundryvtt.com/packages/babele)
module active and a zh client, names display in Chinese via `babele/*.json`.

## Build

The module directory is a build artifact assembled from a local asset library
(`D:\arcane-assets`, all sources freely downloadable — see ATTRIBUTIONS.md links):

```sh
python modules/arcane-assets/scripts/normalize_assets.py   # webp + ids + assets_map.json
python modules/arcane-assets/scripts/build_index.py        # index.json + lang + babele + docs
node   modules/arcane-assets/scripts/build_packs.mjs       # leveldb compendiums
node   modules/arcane-assets/scripts/validate.mjs
npm run build                                              # repo zip into dist/
```

`assets/`, `packs/`, `assets_map.json` are build outputs (gitignored); `index.json`,
`lang/`, `babele/`, `docs/` are committed data.
