"""Build index.json, lang files, Babele catalogs and compendium source docs.

Inputs (run normalize_assets.py first):
  assets_map.json                      id/group/src/dest/orig
  D:/arcane-assets/_scripts/draft-metadata.jsonl   vision labels (file -> attrs/names)
  D:/arcane-assets/_scripts/museum_zh.jsonl        museum title translations
  D:/arcane-assets/02-museum-pd/*/catalog.tsv      museum provenance

Outputs (into the module root):
  index.json  lang/en.json  lang/zh-cn.json  babele/<pack>.json  docs/packs/<pack>.json
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
MODULE = os.path.dirname(HERE)
LIB = r"D:\arcane-assets"

TYPES = {"portrait", "token", "icon", "illustration"}
STYLES = {"doodle", "painted", "flat-icon", "classical", "dark"}
SHAPES = {"square", "circle"}
BGS = {"transparent", "solid"}
ATTR_ENUMS = {
    "creature": {"humanoid", "goblinoid", "undead", "beast", "monster", "fey", "dragonoid", "ooze", "aberration"},
    "gender": {"male", "female", "ambiguous", "none"},
    "age": {"child", "adult", "elderly"},
    "role": {"villager", "farmer", "guard", "soldier", "noble", "cleric", "wizard", "rogue",
             "ranger", "merchant", "cultist", "artisan", "royal", "performer", "animal", "none"},
    "pose": {"bust", "full-body", "action", "face-only"},
}
GEAR_ENUM = {"staff", "sword", "shield", "bow", "hood", "hat", "helmet", "armor", "robe",
             "lantern", "instrument", "basket", "misc", "none"}

GROUP_META = {
    "doodles": {"license": "PD", "attribution": None,
                "source": {"pack": "gordy/doodles", "url": "https://gordyh.itch.io/"}},
    "gordy-art": {"license": "PD", "attribution": None,
                  "source": {"pack": "gordy/fantasy-art-pack-3", "url": "https://gordyh.itch.io/public-domain-fantasy-art-pack-3"}},
    "vil-faces": {"license": "custom-vil", "attribution": "Faces by vil — zordvil.itch.io",
                  "source": {"pack": "vil/fdtl-vol1", "url": "https://zordvil.itch.io/faces-for-a-dying-land-vol1"}},
    "classical": {"license": "CC0", "attribution": None,
                  "source": {"pack": "museum/open-access", "url": ""}},
    "game-icons": {"license": "CC-BY-3.0", "attribution": None,
                   "source": {"pack": "game-icons.net", "url": "https://game-icons.net/"}},
}
GROUP_DEFAULTS = {  # fallback per group when the label omits or breaks an enum
    "doodles": {"type": "portrait", "style": "doodle", "shape": "square", "bg": "transparent"},
    "gordy-art": {"type": "portrait", "style": "painted", "shape": "square", "bg": "transparent"},
    "vil-faces": {"type": "token", "style": "dark", "shape": "circle", "bg": "solid"},
    "classical": {"type": "portrait", "style": "classical", "shape": "square", "bg": "solid"},
    "game-icons": {"type": "icon", "style": "flat-icon", "shape": "square", "bg": "transparent"},
}
GORDY_PACK_URLS = {
    "character-doodles": ("gordy/character-doodles", "https://gordyh.itch.io/public-domain-character-doodles"),
    "villager-doodles": ("gordy/villager-doodles", "https://gordyh.itch.io/public-domain-villager-doodles"),
    "zealot-doodles": ("gordy/zealot-doodles", "https://gordyh.itch.io/public-domain-zealot-doodles"),
}
PACKS = {
    "portraits-doodles": {"groups": {"doodles"}, "label_en": "Portraits — Doodles", "label_zh": "头像 · 涂鸦风"},
    "named-characters": {"groups": {"gordy-art"}, "label_en": "Portraits — Named Characters", "label_zh": "头像 · 具名角色"},
    "classical-portraits": {"groups": {"classical"}, "label_en": "Portraits — Classical", "label_zh": "头像 · 古典油画"},
    "vil-faces": {"groups": {"vil-faces"}, "label_en": "Tokens — Dark Fantasy Faces", "label_zh": "Token · 暗黑风头像"},
}


def normpath(p):
    return os.path.normcase(os.path.normpath(p))


def flatten_tags(attrs):
    tags = []
    for k in ("creature", "gender", "age", "role", "pose"):
        v = attrs.get(k)
        if v and v != "none" and v not in tags:
            tags.append(v)
    for g in attrs.get("gear", []) or []:
        if g and g != "none" and g not in tags:
            tags.append(g)
    return tags


def title_case(slug):
    return re.sub(r"-(\w)", lambda m: " " + m.group(1).upper(), slug.replace("_", "-").capitalize())


def load_jsonl(path):
    out = {}
    if not os.path.exists(path):
        return out
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line.startswith("{"):
                continue
            try:
                obj = json.loads(line)
                if "file" in obj:
                    out[normpath(obj["file"])] = obj
            except json.JSONDecodeError:
                continue
    return out


def rec_default(grp, key):
    return GROUP_DEFAULTS.get(grp, GROUP_DEFAULTS["doodles"]).get(key)


def main():
    with open(os.path.join(MODULE, "assets_map.json"), encoding="utf-8") as f:
        amap = json.load(f)
    labels = load_jsonl(os.path.join(LIB, "_scripts", "draft-metadata.jsonl"))

    # pixel truth (Pillow histogram facts from the labeling pipeline): has_alpha
    # overrides any model-labeled bg; zordvil sets are inscribed circles.
    facts = {}
    facts_path = os.path.join(LIB, "_scripts", "facts.tsv")
    if os.path.exists(facts_path):
        with open(facts_path, encoding="utf-8") as f:
            next(f)
            for line in f:
                parts = line.rstrip("\n").split("\t")
                if len(parts) >= 5:
                    facts[normpath(parts[0])] = parts[4]

    # museum zh translations keyed by bare filename
    museum_zh = {}
    if os.path.exists(os.path.join(LIB, "_scripts", "museum_zh.jsonl")):
        with open(os.path.join(LIB, "_scripts", "museum_zh.jsonl"), encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line.startswith("{"):
                    continue
                try:
                    obj = json.loads(line)
                    if obj.get("file"):
                        museum_zh[os.path.normcase(obj["file"])] = obj.get("name_zh")
                except json.JSONDecodeError:
                    continue

    # museum catalogs keyed by orig filename (titles may contain newlines: join them)
    rec_start = re.compile(r"^\d{2}_.*\.(?:jpg|jpeg|png)$", re.I)
    catalogs = {}
    for theme in ("knights", "wizards", "nobles", "clergy", "classic-illustration"):
        cpath = os.path.join(LIB, "02-museum-pd", theme, "catalog.tsv")
        if not os.path.exists(cpath):
            continue
        buf, rows = "", []
        with open(cpath, encoding="utf-8") as f:
            for line in f:
                line = line.rstrip("\n")
                if rec_start.match(line.split("\t", 1)[0]):
                    if buf:
                        rows.append(buf)
                    buf = line
                elif buf:
                    buf += " " + line.strip()
        if buf:
            rows.append(buf)
        for r in rows:
            parts = r.split("\t")
            if len(parts) >= 6:
                catalogs[normpath(os.path.join(LIB, "02-museum-pd", theme, parts[0]))] = {
                    "title": parts[1], "artist": parts[2], "date": parts[3], "url": parts[4], "theme": theme}

    records, unlabeled, invalid = [], [], []
    for e in amap:
        grp = e["group"]
        gm = GROUP_META[grp]
        rec = {
            "id": e["id"],
            "file": e["dest"],
            "orig": e["orig"],
            "source": dict(gm["source"]),
            "license": gm["license"],
            "attribution": gm["attribution"],
            "meta": {"labeled_by": None, "labeled_at": None, "reviewed": False},
        }
        if grp == "game-icons":
            author = e["dest"].split("/")[2]
            stem = os.path.splitext(e["orig"])[0]
            rec.update({
                "type": "icon", "style": "flat-icon", "shape": "square", "bg": "transparent",
                "name": title_case(stem), "name_zh": None,
                "desc": None, "desc_zh": None,
                "tags": [t for t in stem.replace("_", "-").split("-") if t and not t.isdigit()],
            })
            rec["attribution"] = f"Icon by {author} — game-icons.net, CC-BY 3.0"
            rec["source"]["pack"] = f"game-icons/{author}"
        elif grp == "classical":
            cat = catalogs.get(normpath(e["src"]), {})
            zh = museum_zh.get(os.path.normcase(e["orig"]))
            rec.update({
                "type": "illustration" if cat.get("theme") == "classic-illustration" else "portrait",
                "style": "classical", "shape": "square", "bg": "solid",
                "name": cat.get("title") or title_case(os.path.splitext(e["orig"])[0]),
                "name_zh": zh,
                "desc": ", ".join(x for x in [cat.get("artist"), cat.get("date")] if x and x != "unknown") or None,
                "desc_zh": (f"{zh}（{rec_desc_en(cat)}）" if zh else None),
                "tags": [cat.get("theme", "classical").replace("-illustration", ""), "classical"],
            })
            if cat.get("url"):
                rec["source"]["url"] = cat["url"]
            if "Wikimedia" in cat.get("license", ""):
                rec["license"] = "PD"
            rec["source"]["pack"] = f"museum/{cat.get('theme', 'open-access')}"
        else:
            # gordy doodles / gordy-art / vil — refine doodle pack identity from src path
            if grp == "doodles":
                for key, (pack, url) in GORDY_PACK_URLS.items():
                    if key in e["src"].replace("\\", "/"):
                        rec["source"]["pack"] = pack
                        rec["source"]["url"] = url
                        break
            lab = labels.get(normpath(e["src"]))
            if not lab:
                unlabeled.append(e["src"])
                rec.update({
                    "type": "portrait" if grp != "vil-faces" else "token",
                    "style": "doodle" if grp == "doodles" else ("painted" if grp == "gordy-art" else "dark"),
                    "shape": "circle" if grp == "vil-faces" else "square",
                    "bg": "solid" if grp == "vil-faces" else "transparent",
                    "name": title_case(os.path.splitext(e["orig"])[0]),
                    "name_zh": None, "desc": None, "desc_zh": None,
                    "attrs": {}, "tags": [],
                })
            else:
                attrs, bad = {}, []
                for k, allowed in ATTR_ENUMS.items():
                    v = (lab.get("attrs") or {}).get(k)
                    if v is None or v in allowed:
                        if v is not None:
                            attrs[k] = v
                    else:
                        bad.append(f"{k}={v}")
                gear = (lab.get("attrs") or {}).get("gear")
                attrs["gear"] = [g for g in (gear or []) if g in GEAR_ENUM] if isinstance(gear, list) else []
                rec.update({
                    "type": lab.get("type") if lab.get("type") in TYPES else rec_default(grp, "type"),
                    "style": lab.get("style") if lab.get("style") in STYLES else rec_default(grp, "style"),
                    "shape": "circle" if grp == "vil-faces" else (lab.get("shape") if lab.get("shape") in SHAPES else rec_default(grp, "shape")),
                    "bg": ("transparent" if facts.get(normpath(e["src"])) == "1" else
                           "solid" if facts.get(normpath(e["src"])) == "0" else
                           lab.get("bg") if lab.get("bg") in BGS else rec_default(grp, "bg")),
                    "name": (lab.get("name") or "").strip() or title_case(os.path.splitext(e["orig"])[0]),
                    "name_zh": (lab.get("name_zh") or "").strip() or None,
                    "desc": (lab.get("desc") or "").strip() or None,
                    "desc_zh": (lab.get("desc_zh") or "").strip() or None,
                    "attrs": attrs,
                    "tags": flatten_tags(attrs),
                    "meta": {"labeled_by": "bailian/qwen3.8-max@dsh", "reviewed": False},
                })
                if bad:
                    invalid.append((e["id"], bad))
        records.append(rec)

    records.sort(key=lambda r: r["id"])
    with open(os.path.join(MODULE, "index.json"), "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, separators=(",", ":"))

    # lang + babele + pack docs
    pack_key = lambda k: f"PACK_{k.upper().replace('-', '_')}"
    lang_en = {"ARCANE": {pack_key(k): v["label_en"] for k, v in PACKS.items()}}
    lang_en["ARCANE"]["ATTRIBUTION_NOTE"] = (
        "Includes public-domain art by Gordy Higgins; Met Open Access artworks; "
        "icons by game-icons.net authors (CC-BY 3.0); dark fantasy faces by vil (zordvil.itch.io).")
    lang_zh = {"ARCANE": {pack_key(k): v["label_zh"] for k, v in PACKS.items()}}
    lang_zh["ARCANE"]["ATTRIBUTION_NOTE"] = (
        "包含 Gordy Higgins 公有领域画作、大都会博物馆开放藏品、"
        "game-icons.net 作者图标（CC-BY 3.0）、vil 的暗黑风头像（zordvil.itch.io）。")
    os.makedirs(os.path.join(MODULE, "lang"), exist_ok=True)
    for fname, data in (("en.json", lang_en), ("zh-cn.json", lang_zh)):
        with open(os.path.join(MODULE, "lang", fname), "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    os.makedirs(os.path.join(MODULE, "babele"), exist_ok=True)
    docs_dir = os.path.join(MODULE, "docs", "packs")
    os.makedirs(docs_dir, exist_ok=True)
    for pack, cfg in PACKS.items():
        members = [r for r in records if group_of(r) in cfg["groups"]]
        babele = {"entries": {r["name"]: {"name": r["name_zh"]} for r in members if r.get("name_zh")}}
        with open(os.path.join(MODULE, "babele", f"{pack}.json"), "w", encoding="utf-8") as f:
            json.dump(babele, f, ensure_ascii=False, indent=0)
        import hashlib
        actor_docs = [{
            "_id": hashlib.sha1(("arcane-assets:" + r["id"]).encode()).hexdigest()[:16],
            "name": r["name"],
            "type": "npc",
            "img": f"modules/arcane-assets/{r['file']}",
            "flags": {"arcane": {"id": r["id"], "license": r["license"], "attribution": r["attribution"]}},
        } for r in members]
        with open(os.path.join(docs_dir, f"{pack}.json"), "w", encoding="utf-8") as f:
            json.dump(actor_docs, f, ensure_ascii=False)
        print(f"pack {pack}: {len(actor_docs)} actors ({len(babele['entries'])} zh)")

    print(f"TOTAL records: {len(records)}  unlabeled: {len(unlabeled)}  invalid-enum: {len(invalid)}")
    for u in unlabeled[:5]:
        print("  unlabeled:", u)
    for i in invalid[:5]:
        print("  invalid:", i)
    sys.exit(0)


def rec_desc_en(cat):
    return ", ".join(x for x in [cat.get("artist"), cat.get("date")] if x and x != "unknown") or ""


def group_of(rec):
    p = rec["source"]["pack"]
    if p.startswith("gordy/"):
        return "doodles" if "doodle" in p else "gordy-art"
    if p.startswith("vil/"):
        return "vil-faces"
    if p.startswith("museum/"):
        return "classical"
    if p.startswith("game-icons"):
        return "game-icons"
    return "doodles"


if __name__ == "__main__":
    main()
