"""Generates a synthetic top-down 'pasta bowl' illustration (not a photograph) for Table's import fixtures."""
import math, random, sys
from PIL import Image, ImageDraw, ImageFilter
random.seed(int(sys.argv[2]) if len(sys.argv) > 2 else 7)
W, H = 1200, 800
img = Image.new("RGB", (W, H))
d = ImageDraw.Draw(img)
# warm wooden table: vertical gradient + grain streaks
for y in range(H):
    t = y / H
    d.line([(0, y), (W, y)], fill=(int(176 - 30 * t), int(128 - 26 * t), int(84 - 20 * t)))
for _ in range(140):
    y = random.randint(0, H); c = random.randint(-18, 14)
    d.line([(0, y), (W, y + random.randint(-6, 6))], fill=(150 + c, 106 + c, 68 + c), width=random.randint(1, 3))
img = img.filter(ImageFilter.GaussianBlur(1.2))
d = ImageDraw.Draw(img)
# linen napkin
d.polygon([(40, 520), (330, 470), (420, 780), (90, 800)], fill=(232, 226, 214))
for k in range(0, 300, 18):
    d.line([(60 + k, 515 - k * 0.17), (100 + k * 1.08, 800)], fill=(220, 212, 198), width=2)
cx, cy, R = 640, 400, 300
# plate shadow + plate + rim
shadow = Image.new("L", (W, H), 0)
ImageDraw.Draw(shadow).ellipse([cx - R + 18, cy - R + 26, cx + R + 18, cy + R + 26], fill=120)
shadow = shadow.filter(ImageFilter.GaussianBlur(22))
img.paste((60, 40, 25), (0, 0), shadow)
d = ImageDraw.Draw(img)
d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=(246, 243, 236))
d.ellipse([cx - R + 34, cy - R + 34, cx + R - 34, cy + R - 34], fill=(236, 232, 223))
# pasta: many green-coated curls
for _ in range(260):
    a = random.uniform(0, 2 * math.pi); r = random.uniform(0, 190)
    x, y = cx + r * math.cos(a), cy + r * math.sin(a)
    pts = []
    ang = random.uniform(0, 2 * math.pi)
    for s in range(14):
        ang += random.uniform(-0.5, 0.5)
        x += 9 * math.cos(ang); y += 9 * math.sin(ang)
        if (x - cx) ** 2 + (y - cy) ** 2 < 205 ** 2: pts.append((x, y))
    if len(pts) > 2:
        g = random.randint(0, 40)
        d.line(pts, fill=(196 - g, 186 - g, 92 - g // 2), width=9, joint="curve")
        d.line(pts, fill=(118 + g // 2, 140 + g // 2, 52), width=4, joint="curve")
# tomatoes, basil, parmesan
for _ in range(9):
    a = random.uniform(0, 2 * math.pi); r = random.uniform(40, 180)
    x, y = cx + r * math.cos(a), cy + r * math.sin(a); s = random.randint(18, 26)
    d.ellipse([x - s, y - s, x + s, y + s], fill=(196, 48, 36)); d.ellipse([x - s * 0.5, y - s * 0.6, x - s * 0.1, y - s * 0.2], fill=(236, 120, 100))
for _ in range(7):
    a = random.uniform(0, 2 * math.pi); r = random.uniform(20, 160)
    x, y = cx + r * math.cos(a), cy + r * math.sin(a); s = random.randint(20, 30); t = random.uniform(0, math.pi)
    leaf = [(x + s * math.cos(t + u) * (1 if k == 0 else 0.45), y + s * math.sin(t + u) * (1 if k == 0 else 0.45)) for k, u in ((0, 0), (1, math.pi / 2), (0, math.pi), (1, 3 * math.pi / 2))]
    d.polygon(leaf, fill=(46, 112, 52))
for _ in range(120):
    a = random.uniform(0, 2 * math.pi); r = random.uniform(0, 190)
    x, y = cx + r * math.cos(a), cy + r * math.sin(a)
    d.rectangle([x, y, x + 4, y + 3], fill=(250, 240, 200))
# fork
d.rounded_rectangle([1010, 140, 1034, 700], 10, fill=(196, 196, 200))
for k in range(4): d.rectangle([1004 + k * 10, 90, 1010 + k * 10, 160], fill=(196, 196, 200))
img = img.filter(ImageFilter.GaussianBlur(0.6))
img.save(sys.argv[1], "JPEG", quality=82, optimize=True, progressive=True)
