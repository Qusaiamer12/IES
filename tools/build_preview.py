#!/usr/bin/env python3
"""Build the single-file HTML preview of the site.

Reads preview/template.html, inlines data/*.json and the images in assets/
(resized, as data: URIs), and writes:
  preview/index.html          standalone page, open it directly in a browser
  <out_dir>/ies-preview.html  body-only copy for publishing as an Artifact (optional)

Usage: python3 tools/build_preview.py [artifact_out_dir]
"""
import base64
import io
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"

# name -> (file, max width, format)
IMAGES = {
    "IES_LOGO": ("ies-chapter-logo.png", 516, "PNG"),
    "HU_LOGO": ("hashemite-university-logo.png", 240, "PNG"),
    "BRANCH_LOGO": ("ieee-hu-branch-logo.png", 240, "PNG"),
}


def data_uri(path: Path, max_w: int, fmt: str) -> str:
    im = Image.open(path)
    if im.width > max_w:
        im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    if fmt == "JPEG":
        im.convert("RGB").save(buf, "JPEG", quality=82, optimize=True)
        mime = "image/jpeg"
    else:
        im.save(buf, "PNG", optimize=True)
        mime = "image/png"
    return f"data:{mime};base64,{base64.b64encode(buf.getvalue()).decode()}"


def main() -> None:
    html = (ROOT / "preview" / "template.html").read_text(encoding="utf-8")

    members = json.loads((ROOT / "data" / "members.json").read_text(encoding="utf-8"))
    events = json.loads((ROOT / "data" / "events.json").read_text(encoding="utf-8"))

    # Member photos: "/assets/x.jpg" -> inlined data URI
    for m in members:
        photo = m.get("photo")
        if photo:
            m["photo"] = data_uri(ROOT / photo.lstrip("/"), 520, "JPEG")

    for key, (name, max_w, fmt) in IMAGES.items():
        html = html.replace(f"__{key}__", data_uri(ASSETS / name, max_w, fmt))

    html = html.replace("/*__MEMBERS__*/[]", json.dumps(members, ensure_ascii=False))
    html = html.replace("/*__EVENTS__*/[]", json.dumps(events, ensure_ascii=False))

    standalone = (
        '<!doctype html>\n<html lang="ar" dir="rtl">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        "</head>\n<body>\n" + html + "\n</body>\n</html>\n"
    )
    out = ROOT / "preview" / "index.html"
    out.write_text(standalone, encoding="utf-8")
    print(f"wrote {out} ({out.stat().st_size // 1024} KB)")

    if len(sys.argv) > 1:
        art = Path(sys.argv[1]) / "ies-preview.html"
        art.write_text(html, encoding="utf-8")
        print(f"wrote {art}")


if __name__ == "__main__":
    main()
