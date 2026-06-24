from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
FONT_KO = "/System/Library/Fonts/AppleSDGothicNeo.ttc"
FONT_UI = "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"


CELLS = {
    "love": {"name": "사랑", "glyph": "♥", "base": (255, 143, 180), "hi": (255, 224, 236)},
    "passion": {"name": "열정", "glyph": "▲", "base": (255, 138, 77), "hi": (255, 226, 204)},
    "sense": {"name": "감각", "glyph": "~", "base": (63, 194, 180), "hi": (210, 244, 239)},
    "food": {"name": "식욕", "glyph": "◗", "base": (227, 182, 115), "hi": (251, 238, 218)},
    "logic": {"name": "이성", "glyph": "▢", "base": (92, 156, 230), "hi": (220, 235, 255)},
    "heart-wish": {"name": "응큼", "glyph": "✦", "base": (179, 123, 232), "hi": (245, 224, 255)},
}


def font(size: int, bold: bool = False):
    path = FONT_KO if Path(FONT_KO).exists() else FONT_UI
    try:
        return ImageFont.truetype(path, size, index=8 if bold and path.endswith(".ttc") else 0)
    except Exception:
        return ImageFont.truetype(FONT_UI, size)


def ensure(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)


def save(img: Image.Image, rel: str, transparent: bool = False):
    path = ROOT / rel
    ensure(path)
    if transparent:
        png_path = path.with_suffix(".png")
        ensure(png_path)
        img.save(png_path)
        # Keep the documented/code-facing WebP sibling when requested.
        if path.suffix.lower() == ".webp":
            img.save(path, lossless=True, quality=95, method=6)
    else:
        img.convert("RGB").save(path, quality=88, method=6)


def rounded_rect(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def text_center(draw, box, text, fnt, fill, stroke_width=0, stroke_fill=None):
    bbox = draw.textbbox((0, 0), text, font=fnt, stroke_width=stroke_width)
    x = box[0] + (box[2] - box[0] - (bbox[2] - bbox[0])) / 2
    y = box[1] + (box[3] - box[1] - (bbox[3] - bbox[1])) / 2 - bbox[1]
    draw.text((x, y), text, font=fnt, fill=fill, stroke_width=stroke_width, stroke_fill=stroke_fill)


def gradient(size, top, bottom):
    w, h = size
    img = Image.new("RGB", size)
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        col = tuple(int(top[i] * (1 - t) + bottom[i] * t) for i in range(3))
        for x in range(w):
            px[x, y] = col
    return img


def alpha_shadow(img, blur=18, offset=(0, 12), opacity=90):
    base = Image.new("RGBA", img.size, (0, 0, 0, 0))
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    a = img.getchannel("A").filter(ImageFilter.GaussianBlur(blur))
    shadow.putalpha(a.point(lambda p: min(opacity, p)))
    base.alpha_composite(shadow, offset)
    base.alpha_composite(img)
    return base


def bubble(size, base, hi, glyph="", face=True, mood="idle", label=None):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = int(size * 0.11)
    box = (pad, pad, size - pad, size - pad)
    d.ellipse(box, fill=base + (255,), outline=(255, 247, 224, 255), width=max(5, size // 24))
    d.ellipse((pad + size * .08, pad + size * .06, size * .55, size * .35), fill=hi + (170,))
    d.arc((pad + 8, pad + 8, size - pad - 8, size - pad - 8), 200, 325, fill=(255, 255, 255, 110), width=max(2, size // 50))
    if face:
        eye_y = int(size * .47)
        for ex in (int(size * .41), int(size * .59)):
            d.ellipse((ex - size * .035, eye_y - size * .04, ex + size * .035, eye_y + size * .04), fill=(78, 54, 75, 255))
            d.ellipse((ex - size * .012, eye_y - size * .025, ex + size * .004, eye_y - size * .008), fill=(255, 255, 255, 210))
        if mood == "sad":
            d.arc((size * .43, size * .61, size * .57, size * .73), 200, 340, fill=(78, 54, 75, 255), width=max(3, size // 42))
        elif mood == "wow":
            d.ellipse((size * .47, size * .61, size * .53, size * .70), fill=(78, 54, 75, 255))
        elif mood == "sleepy":
            d.line((size * .45, size * .64, size * .55, size * .64), fill=(78, 54, 75, 255), width=max(3, size // 42))
        else:
            d.arc((size * .43, size * .57, size * .57, size * .70), 10, 170, fill=(78, 54, 75, 255), width=max(3, size // 42))
    if glyph:
        text_center(d, (0, int(size * .58), size, int(size * .90)), glyph, font(int(size * .22), True), (255, 255, 255, 230), 2, (110, 74, 95, 120))
    if label:
        text_center(d, (0, int(size * .72), size, int(size * .96)), label, font(int(size * .095), True), (112, 76, 94, 235))
    return alpha_shadow(img, blur=max(6, size // 24), offset=(0, max(4, size // 22)), opacity=70)


def cloud_tile(size=256):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    color = (154, 167, 180, 255)
    for box in [(42, 96, 116, 170), (88, 65, 176, 165), (144, 96, 220, 172), (50, 128, 212, 195)]:
        d.ellipse(box, fill=color, outline=(245, 248, 250, 255), width=8)
    d.arc((92, 130, 164, 190), 15, 165, fill=(73, 82, 93, 240), width=6)
    return alpha_shadow(img)


def make_tiles():
    for key, c in CELLS.items():
        img = bubble(256, c["base"], c["hi"], c["glyph"], True)
        save(img, f"assets/tiles/cell-{key}.webp", True)
        save(bubble(320, c["base"], c["hi"], c["glyph"], True, label=c["name"]), f"assets/cells/{key}-cell.webp", True)
        for mood in ["idle", "happy", "sad"]:
            save(bubble(320, c["base"], c["hi"], c["glyph"], True, "idle" if mood == "happy" else mood, c["name"]), f"assets/cells/pose-{key}-{mood}.webp", True)
        for mood in ["happy", "sad", "wow", "sleepy"]:
            save(bubble(512, c["base"], c["hi"], c["glyph"], True, mood), f"assets/icons-cell/face-{key}-{mood}.webp", True)
        save(bubble(512, c["base"], c["hi"], c["glyph"], True, "idle"), f"assets/icons-cell/ic-{key}.webp", True)
        save(bubble(1024, c["base"], c["hi"], c["glyph"], True, "idle"), f"assets/icons-cell/ic-{key}@hi.webp", True)
        save(bubble(160, c["base"], c["hi"], c["glyph"], True), f"assets/icons-cell/badge-{key}.webp", True)
    save(cloud_tile(), "assets/tiles/cell-cloud.webp", True)
    save(cloud_tile(320), "assets/cells/pose-anxiety.webp", True)

    group = Image.new("RGBA", (640, 400), (0, 0, 0, 0))
    for i, key in enumerate(CELLS):
        cell = bubble(170, CELLS[key]["base"], CELLS[key]["hi"], CELLS[key]["glyph"], True)
        group.alpha_composite(cell, (40 + (i % 3) * 185, 45 + (i // 3) * 120))
    save(group, "assets/cells/pose-cells-group.webp", True)


def make_bg(rel, top, bottom, accent=(255, 232, 180), night=False):
    img = gradient((1080, 1920), top, bottom).convert("RGBA")
    d = ImageDraw.Draw(img, "RGBA")
    random.seed(rel)
    for i in range(35 if not night else 80):
        x, y = random.randrange(0, 1080), random.randrange(40, 1250)
        r = random.randrange(2, 7 if night else 12)
        d.ellipse((x - r, y - r, x + r, y + r), fill=accent + ((120 if night else 45),))
    for x in range(-120, 1220, 230):
        y = 1380 + int(80 * math.sin(x / 140))
        d.ellipse((x, y, x + 360, y + 220), fill=(124, 204, 146, 150))
    d.rectangle((0, 1680, 1080, 1920), fill=(109, 190, 126, 185))
    save(img, rel, False)


def make_backgrounds():
    specs = {
        "bg-morning.webp": ((255, 218, 190), (164, 222, 243), (255, 255, 245), False),
        "bg-noon.webp": ((145, 215, 255), (237, 249, 255), (255, 255, 255), False),
        "bg-afternoon.webp": ((255, 176, 139), (151, 188, 235), (255, 230, 160), False),
        "bg-night.webp": ((44, 55, 116), (22, 26, 65), (255, 246, 185), True),
        "bg-home.webp": ((255, 213, 225), (185, 236, 220), (255, 248, 207), False),
        "bg-bedroom.webp": ((255, 211, 221), (245, 230, 206), (255, 245, 245), False),
        "bg-cafe.webp": ((232, 194, 150), (255, 235, 196), (255, 250, 220), False),
        "bg-street.webp": ((178, 219, 255), (255, 222, 186), (255, 255, 255), False),
        "bg-office.webp": ((198, 222, 242), (237, 241, 246), (255, 255, 255), False),
        "bg-park.webp": ((181, 232, 206), (255, 238, 187), (255, 255, 255), False),
        "bg-rain.webp": ((137, 169, 199), (205, 219, 229), (220, 245, 255), False),
        "bg-sunset.webp": ((255, 148, 107), (105, 123, 190), (255, 230, 160), False),
        "bg-starry.webp": ((35, 46, 108), (15, 22, 56), (255, 248, 190), True),
        "bg-snow.webp": ((196, 222, 245), (249, 252, 255), (255, 255, 255), False),
        "bg-spring.webp": ((255, 201, 222), (196, 239, 204), (255, 255, 255), False),
        "bg-summer.webp": ((107, 210, 247), (255, 236, 132), (255, 255, 255), False),
        "bg-autumn.webp": ((244, 174, 103), (255, 224, 168), (255, 241, 178), False),
        "bg-winter.webp": ((181, 207, 235), (245, 250, 255), (255, 255, 255), False),
        "bg-event-heart.webp": ((255, 167, 200), (255, 230, 239), (255, 255, 255), False),
        "bg-event-night-festival.webp": ((33, 39, 93), (127, 73, 139), (255, 230, 125), True),
        "bg-morning-2.webp": ((255, 229, 177), (184, 226, 255), (255, 255, 255), False),
        "bg-noon-2.webp": ((135, 227, 235), (246, 255, 225), (255, 255, 255), False),
        "bg-afternoon-2.webp": ((255, 195, 127), (204, 161, 222), (255, 235, 170), False),
        "bg-night-2.webp": ((26, 36, 86), (41, 30, 71), (255, 245, 188), True),
    }
    for name, s in specs.items():
        make_bg(f"assets/bg/{name}", *s)
    for name, colors in {
        "bg-board-frame.webp": ((164, 211, 142), (245, 230, 174)),
        "bg-board-wood.webp": ((190, 128, 74), (246, 198, 132)),
        "bg-board-grass.webp": ((89, 178, 112), (190, 230, 137)),
        "bg-board-candy.webp": ((255, 184, 207), (176, 227, 255)),
    }.items():
        img = gradient((1080, 1500), colors[0], colors[1]).convert("RGBA")
        d = ImageDraw.Draw(img, "RGBA")
        rounded_rect(d, (90, 130, 990, 1370), 80, (255, 250, 229, 150), (255, 255, 255, 170), 10)
        save(img, f"assets/bg/{name}", False)


def make_map():
    img = gradient((1080, 2600), (255, 220, 180), (38, 48, 105)).convert("RGBA")
    d = ImageDraw.Draw(img, "RGBA")
    pts = [(540 + int(260 * math.sin(y / 260)), y) for y in range(260, 2380, 30)]
    d.line(pts, fill=(255, 244, 198, 210), width=46, joint="curve")
    d.line(pts, fill=(185, 134, 87, 160), width=8)
    for i, y in enumerate([360, 880, 1420, 2050]):
        x = 540 + int(260 * math.sin(y / 260))
        d.ellipse((x - 82, y - 82, x + 82, y + 82), fill=(255, 241, 198, 245), outline=(255, 255, 255, 255), width=8)
        text_center(d, (x - 70, y - 55, x + 70, y + 75), str(i + 1), font(80, True), (153, 91, 113))
    save(img, "assets/map/map-full.webp", False)
    save(img, "assets/map/map-chapter1.webp", False)
    for name in ["node-current", "node-open", "node-locked", "node-frame", "node-glow"]:
        size = {"node-current": 200, "node-open": 180, "node-locked": 180, "node-frame": 220, "node-glow": 280}[name]
        base = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        dr = ImageDraw.Draw(base)
        col = (255, 215, 119) if "current" in name or "glow" in name else (255, 235, 206)
        dr.ellipse((18, 18, size - 18, size - 18), fill=col + (210,), outline=(255, 255, 255, 245), width=max(5, size // 24))
        if "locked" in name:
            text_center(dr, (0, 0, size, size), "🔒", font(size // 3), (120, 118, 130))
        save(base, f"assets/map/{name}.webp", True)
    simple_badge("지금", (160, 80), (255, 142, 180), "assets/map/pin-now.webp")
    simple_badge("☀", (120, 120), (255, 205, 87), "assets/map/marker-sun.webp")
    simple_badge("☾", (120, 120), (91, 117, 212), "assets/map/marker-moon.webp")
    simple_badge("", (48, 48), (255, 237, 181), "assets/map/path-dot.webp")
    simple_badge("", (420, 90), (118, 190, 119), "assets/map/path-vine.webp")
    simple_badge("", (420, 90), (255, 237, 181), "assets/map/path-dots.webp")
    simple_badge("START", (200, 200), (255, 175, 104), "assets/map/flag-start.webp")
    simple_badge("GOAL", (200, 200), (255, 127, 170), "assets/map/flag-goal.webp")
    simple_badge("DAY", (240, 320), (202, 145, 82), "assets/map/signpost.webp")
    simple_badge("", (260, 320), (255, 252, 238), "assets/map/polaroid-frame.webp")
    for deco, col in [("tree", (106, 183, 117)), ("flower", (255, 149, 188)), ("cloud", (255, 255, 255)), ("lamp", (255, 213, 105))]:
        simple_badge("✦" if deco == "lamp" else "", (220, 180), col, f"assets/map/map-deco-{deco}.webp")


def simple_badge(text, size, color, rel, radius=None):
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = radius or min(size) // 4
    rounded_rect(d, (8, 8, size[0] - 8, size[1] - 8), r, color + (235,), (255, 252, 232, 255), max(3, min(size) // 28))
    if text:
        text_center(d, (0, 0, size[0], size[1]), text, font(max(18, min(size) // 4), True), (112, 76, 94), 1, (255, 255, 255, 140))
    save(alpha_shadow(img, blur=6, offset=(0, 4), opacity=45), rel, True)


def make_ui():
    panels = [
        ("panel.webp", (600, 600), (255, 246, 224)),
        ("panel-header.webp", (480, 140), (255, 151, 186)),
        ("card-mission.webp", (480, 220), (255, 250, 232)),
        ("hud-banner.webp", (720, 200), (255, 229, 177)),
        ("chip.webp", (240, 96), (255, 236, 198)),
        ("bar-frame.webp", (480, 48), (255, 246, 224)),
        ("bar-fill.webp", (480, 48), (255, 139, 179)),
        ("toast-frame.webp", (600, 140), (255, 248, 229)),
        ("badge-new.webp", (120, 120), (255, 110, 155)),
    ]
    for name, size, col in panels:
        simple_badge("", size, col, f"assets/ui/{name}")
    for name, col in [("btn-primary", (255, 126, 170)), ("btn-green", (104, 204, 134)), ("btn-blue", (101, 160, 235)), ("btn-yellow", (255, 205, 79)), ("btn-gray", (172, 177, 190))]:
        simple_badge("", (480, 160), col, f"assets/ui/buttons/{name}.webp", 64)
    simple_badge("", (160, 160), (255, 236, 198), "assets/ui/buttons/btn-round.webp", 80)
    for name, glyph in {
        "icon-play": "▶", "icon-pause": "Ⅱ", "icon-settings": "⚙", "icon-back": "‹", "icon-close": "×",
        "icon-restart": "↻", "icon-home": "⌂", "icon-sound-on": "♪", "icon-sound-off": "×", "icon-music": "♫",
        "icon-hint": "?", "icon-hammer": "🔨", "icon-shuffle": "↹", "icon-bomb": "✹",
        "icon-heart": "♥", "icon-coin": "●", "icon-star": "★",
    }.items():
        simple_badge(glyph, (96, 96), (255, 240, 203), f"assets/ui/icons/{name}.webp", 48)
    for name, glyph, col in [("star-on", "★", (255, 207, 73)), ("star-off", "☆", (201, 205, 218)), ("progress-star", "★", (255, 216, 89))]:
        simple_badge(glyph, (128 if name != "progress-star" else 96, 128 if name != "progress-star" else 96), col, f"assets/ui/{name}.webp")
    simple_badge("클리어!", (600, 240), (255, 142, 180), "assets/ui/ribbon-clear.webp")
    simple_badge("그런 날", (600, 240), (177, 190, 213), "assets/ui/ribbon-fail.webp")
    for name, size in [("box-popup", (700, 700)), ("box-level-start", (720, 900)), ("box-goal", (480, 220)), ("box-reward", (600, 500)), ("box-result", (720, 900)), ("box-tooltip", (360, 160)), ("box-dialog", (720, 360)), ("box-header-ribbon", (520, 160)), ("box-inner-slot", (240, 240)), ("nameplate", (360, 120)), ("scroll-parchment", (600, 800))]:
        simple_badge("", size, (255, 244, 220), f"assets/ui/box/{name}.webp")
    for name, glyph, col in [("coin", "●", (255, 202, 77)), ("gem", "◆", (106, 208, 234)), ("heart-life", "♥", (255, 119, 158)), ("key", "⚿", (255, 211, 94)), ("spinner", "↻", (255, 154, 190)), ("hand-pointer", "☝", (255, 228, 190))]:
        simple_badge(glyph, (200, 200) if name in ["spinner", "hand-pointer"] else (128, 128), col, f"assets/ui/{name}.webp")
    for b, glyph in [("hint", "?"), ("hammer", "🔨"), ("shuffle", "↹"), ("bomb", "✹"), ("rocket", "↑")]:
        simple_badge(glyph, (160, 160), (255, 236, 198), f"assets/ui/booster-{b}.webp")
    for name, glyph, col in [("chest-closed", "▣", (193, 126, 78)), ("chest-open", "✦", (218, 149, 82)), ("gift-box", "✚", (255, 127, 170))]:
        simple_badge(glyph, (256, 256), col, f"assets/ui/{name}.webp")


def make_brand_and_mascot():
    logo = Image.new("RGBA", (720, 320), (0, 0, 0, 0))
    d = ImageDraw.Draw(logo)
    text_center(d, (0, 30, 720, 260), "세포팡", font(150, True), (255, 126, 170), 10, (255, 250, 229))
    text_center(d, (0, 220, 720, 310), "Cellpang", font(48, True), (102, 89, 132), 2, (255, 255, 255))
    save(alpha_shadow(logo, 12, (0, 8), 70), "assets/brand/logo.webp", True)
    small = logo.resize((360, 160), Image.Resampling.LANCZOS)
    save(small, "assets/brand/logo-small.webp", True)
    simple_badge("Cellpang", (480, 120), (255, 142, 180), "assets/brand/wordmark-en.webp")
    splash = gradient((1080, 1920), (255, 217, 231), (178, 229, 238)).convert("RGBA")
    splash.alpha_composite(logo.resize((820, 365), Image.Resampling.LANCZOS), (130, 260))
    splash.alpha_composite(bubble(520, CELLS["love"]["base"], CELLS["love"]["hi"], "♥", True), (280, 820))
    save(splash, "assets/brand/splash.webp", False)
    for name, key, mood in [("mascot", "love", "idle"), ("mascot-wave", "sense", "happy"), ("mascot-cheer", "passion", "wow"), ("yumi", "food", "idle"), ("gu-woong", "logic", "idle")]:
        save(bubble(512, CELLS[key]["base"], CELLS[key]["hi"], CELLS[key]["glyph"], True, mood, CELLS[key]["name"]), f"assets/mascot/{name}.webp", True)
    for name, key in [("portrait-yumi", "love"), ("portrait-gu-woong", "logic"), ("portrait-babi", "sense")]:
        save(bubble(512, CELLS[key]["base"], CELLS[key]["hi"], CELLS[key]["glyph"], True, "idle"), f"assets/icons-cell/{name}.webp", True)


def make_decor_fx_cuts_gallery():
    for name, size, glyph, col in [
        ("garnish-fruit", (480, 220), "● ● ✿", (255, 130, 157)),
        ("garnish-leaf", (320, 200), "❦", (104, 195, 120)),
        ("sparkle", (128, 128), "✦", (255, 235, 126)),
        ("star-deco", (96, 96), "★", (255, 218, 91)),
        ("heart-deco", (96, 96), "♥", (255, 131, 172)),
        ("bubble", (128, 128), "○", (174, 228, 248)),
        ("grass-strip", (1080, 160), "", (103, 190, 117)),
    ]:
        simple_badge(glyph, size, col, f"assets/decor/{name}.webp")
    for i in range(1, 4):
        simple_badge("", (400, 200), (255, 255, 255), f"assets/decor/cloud-deco-{i}.webp")
    for name, size, glyph, col in [
        ("match-burst", (256, 256), "✹", (255, 219, 98)),
        ("combo-banner", (600, 240), "COMBO", (255, 151, 88)),
        ("combo-num-sheet", (700, 160), "2 3 4 5 6 7 8 9", (255, 220, 92)),
        ("dive-rays", (1080, 1080), "✦", (255, 226, 106)),
        ("confetti", (1080, 1080), "✦", (255, 149, 188)),
        ("glow-soft", (256, 256), "", (255, 244, 150)),
        ("trail-line", (720, 180), "", (124, 213, 255)),
        ("shockwave", (512, 512), "○", (255, 255, 255)),
        ("confetti-sheet", (720, 240), "✦ ✦ ✦", (255, 149, 188)),
        ("sparkle-sheet", (720, 240), "✦ ✦ ✦", (255, 226, 106)),
        ("level-clear", (720, 400), "클리어!", (255, 142, 180)),
    ]:
        simple_badge(glyph, size, col, f"assets/fx/{name}.webp")
    for key, c in CELLS.items():
        simple_badge("✹", (256, 256), c["base"], f"assets/fx/burst-{key}.webp")
    for name, top, bottom in [("dive-village-love", (255, 199, 221), (184, 231, 211)), ("dive-village-calm", (197, 235, 211), (255, 236, 190)), ("dive-village-night", (52, 59, 122), (24, 28, 69))]:
        img = gradient((1080, 1080), top, bottom).convert("RGBA")
        d = ImageDraw.Draw(img, "RGBA")
        for x in range(80, 1000, 170):
            rounded_rect(d, (x, 620 + (x % 3) * 20, x + 120, 820), 24, (255, 239, 202, 200), (255, 255, 255, 220), 6)
        save(img, f"assets/fx/{name}.webp", False)
    cut_specs = [
        ("morning-intro", "오늘도 출근", (255, 220, 188), (172, 222, 245)),
        ("morning-clear", "구름 걷힘", (255, 230, 190), (185, 235, 214)),
        ("lunch-intro", "출출세포", (255, 213, 156), (255, 240, 201)),
        ("lunch-clear", "마음 채움", (255, 223, 167), (210, 239, 190)),
        ("afternoon-intro", "그 사람 메시지", (255, 188, 205), (194, 210, 245)),
        ("afternoon-clear", "두근두근", (255, 204, 224), (255, 232, 190)),
        ("night-intro", "하루 정리", (68, 74, 137), (30, 36, 80)),
        ("night-clear", "잔잔한 위로", (75, 92, 150), (43, 49, 93)),
    ]
    for name, title, top, bottom in cut_specs:
        img = gradient((1080, 1350), top, bottom).convert("RGBA")
        d = ImageDraw.Draw(img, "RGBA")
        text_center(d, (80, 80, 1000, 240), title, font(72, True), (104, 76, 105), 3, (255, 255, 255, 190))
        img.alpha_composite(bubble(360, CELLS["love"]["base"], CELLS["love"]["hi"], "♥", True), (360, 540))
        save(img, f"assets/cuts/{name}.webp", False)
    simple_badge("", (400, 200), (255, 255, 255), "assets/cuts/bubble-frame.webp")
    simple_badge("", (1080, 1080), (255, 246, 224), "assets/cuts/oneCut-frame.webp")
    make_bg("assets/gallery/album-bg.webp", (255, 226, 210), (218, 230, 242), (255, 255, 255), False)
    simple_badge("", (1080, 400), (255, 246, 224), "assets/gallery/film-strip.webp")
    simple_badge("", (240, 300), (236, 232, 224), "assets/gallery/slot-empty.webp")


def make_special_tiles_and_icons():
    for name, glyph, col in [
        ("obstacle-ice", "❄", (151, 219, 245)),
        ("obstacle-box", "▣", (187, 128, 82)),
        ("special-bomb", "✹", (92, 88, 118)),
        ("special-line-h", "↔", (255, 194, 84)),
        ("special-line-v", "↕", (255, 194, 84)),
        ("special-rainbow", "✦", (161, 137, 240)),
        ("tile-prime-crown", "♛", (255, 217, 85)),
    ]:
        simple_badge(glyph, (96, 96) if name == "tile-prime-crown" else (256, 256), col, f"assets/tiles/{name}.webp")


def make_icons():
    icon = bubble(512, CELLS["love"]["base"], CELLS["love"]["hi"], "♥", True)
    bg = Image.new("RGBA", (512, 512), (255, 230, 239, 255))
    bg.alpha_composite(icon)
    for size, rel in [(512, "icons/icon-512.png"), (192, "icons/icon-192.png"), (180, "icons/icon-180.png"), (32, "icons/favicon-32.png")]:
        out = bg.resize((size, size), Image.Resampling.LANCZOS)
        ensure(ROOT / rel)
        out.save(ROOT / rel)


def main():
    make_tiles()
    make_special_tiles_and_icons()
    make_backgrounds()
    make_map()
    make_ui()
    make_brand_and_mascot()
    make_decor_fx_cuts_gallery()
    make_icons()


if __name__ == "__main__":
    main()
