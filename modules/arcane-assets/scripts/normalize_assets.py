"""Normalize source art from the local arcane-assets library into the module.

Reads raster sources from D:\\arcane-assets (downloaded/verified library, see the
module README for provenance), converts to WebP (<=1600px longest side), renames
to stable ids, copies game-icons SVGs verbatim, and writes assets_map.json
(id -> source/dest/group/orig) for the index build.

Run:  python modules/arcane-assets/scripts/normalize_assets.py [--src D:/arcane-assets]
"""
import argparse
import json
import os
import re
import shutil
import sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
MODULE = os.path.dirname(HERE)

RASTER_SETS = [
    # (src_rel, dest_rel, id_prefix, num_width or None=slug from filename)
    (r"01-gordy-higgins/character-doodles/Character_Doodles_Pack_20241028", "doodles/character", "gordy-character", 3),
    (r"01-gordy-higgins/villager-doodles/Villagers_Pack_20241028", "doodles/villager", "gordy-villager", 3),
    (r"01-gordy-higgins/zealot-doodles/Zealots_Pack_20241028", "doodles/zealot", "gordy-zealot", 3),
    (r"01-gordy-higgins/fantasy-art-pack-3/Fantasy Characters", "gordy-art/characters", "gordy-char", None),
    (r"06-zordvil-fdtl/tokens_1_creep", "vil-faces/creep", "vil-fdtl1-creep", 2),
    (r"06-zordvil-fdtl/tokens_1_scvm", "vil-faces/scvm", "vil-fdtl1-scvm", 3),
]
MUSEUM_THEMES = [
    ("knights", "met-knights"),
    ("wizards", "met-wizards"),
    ("nobles", "met-nobles"),
    ("clergy", "met-clergy"),
    ("classic-illustration", "wm-classic"),
]
ICONS_SRC = "05-game-icons"
ICONS_SKIP_DIRS = {".git", ".github", "node_modules", "__pycache__"}
ICONS_SKIP_FILES = {"module.json", "package.json", "README.md", "README-FoundryVTT.md",
                    "CONTRIBUTING.md", "LICENSE", ".gitignore", ".npmrc"}
MAX_SIDE = 1600
QUALITY = 85


def slugify(name, maxlen=48):
    stem = os.path.splitext(name)[0]
    s = re.sub(r"[^A-Za-z0-9]+", "-", stem).strip("-").lower()
    return (s[:maxlen].strip("-")) or "untitled"


def convert_webp(src, dest):
    im = Image.open(src)
    if im.mode == "P":
        im = im.convert("RGBA")
    has_alpha = im.mode == "RGBA" or (im.mode == "LA") or "transparency" in im.info
    if not has_alpha and im.mode != "RGB":
        im = im.convert("RGB")
    w, h = im.size
    if max(w, h) > MAX_SIDE:
        scale = MAX_SIDE / max(w, h)
        im = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    im.save(dest, "WEBP", quality=QUALITY, method=4)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=r"D:\arcane-assets")
    args = ap.parse_args()
    src_root = args.src
    assets = os.path.join(MODULE, "assets")
    entries = []

    def emit(group, src, dest_rel, id_, orig):
        entries.append({"id": id_, "group": group, "src": src,
                        "dest": ("assets/" + dest_rel).replace("\\", "/"), "orig": orig})

    # raster sets
    for src_rel, dest_rel, prefix, width in RASTER_SETS:
        src_dir = os.path.join(src_root, src_rel)
        names = sorted(n for n in os.listdir(src_dir)
                       if n.lower().endswith((".png", ".jpg", ".jpeg")) and "_White" not in n)
        for i, name in enumerate(names, 1):
            sid = f"{prefix}-{i:0{width}d}" if width else f"{prefix}-{slugify(name)}"
            dest_rel_full = f"{dest_rel}/{sid}.webp"
            dest = os.path.join(MODULE, "assets", *dest_rel_full.split("/"))
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            convert_webp(os.path.join(src_dir, name), dest)
            emit(dest_rel.split("/")[0], os.path.join(src_dir, name), dest_rel_full, sid, name)
        print(f"{dest_rel}: {len(names)} converted", flush=True)

    # museum
    for theme, prefix in MUSEUM_THEMES:
        src_dir = os.path.join(src_root, "02-museum-pd", theme)
        names = sorted(n for n in os.listdir(src_dir)
                       if n.lower().endswith((".png", ".jpg", ".jpeg")))
        for i, name in enumerate(names, 1):
            sid = f"{prefix}-{i:03d}"
            dest_rel_full = f"classical/{theme}/{sid}.webp"
            dest = os.path.join(MODULE, "assets", "classical", theme, f"{sid}.webp")
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            convert_webp(os.path.join(src_dir, name), dest)
            emit("classical", os.path.join(src_dir, name), dest_rel_full, sid, name)
        print(f"classical/{theme}: {len(names)} converted", flush=True)

    # game-icons svg copy
    icons_root = os.path.join(src_root, ICONS_SRC)
    n_icons = 0
    for author in sorted(os.listdir(icons_root)):
        adir = os.path.join(icons_root, author)
        if not os.path.isdir(adir) or author in ICONS_SKIP_DIRS:
            continue
        out_dir = os.path.join(MODULE, "assets", "game-icons", author)
        os.makedirs(out_dir, exist_ok=True)
        for f in sorted(os.listdir(adir)):
            if not f.lower().endswith(".svg"):
                continue
            shutil.copy2(os.path.join(adir, f), os.path.join(out_dir, f))
            emit("game-icons", os.path.join(adir, f), f"game-icons/{author}/{f}",
                 f"gi-{slugify(author)}-{slugify(f)}", f)
            n_icons += 1
    print(f"game-icons: {n_icons} svg copied", flush=True)

    with open(os.path.join(MODULE, "assets_map.json"), "w", encoding="utf-8") as fh:
        json.dump(entries, fh, ensure_ascii=False, indent=0)
    print(f"TOTAL {len(entries)} entries -> assets_map.json", flush=True)


if __name__ == "__main__":
    sys.exit(main())
