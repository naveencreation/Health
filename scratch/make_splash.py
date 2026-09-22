from PIL import Image, ImageDraw, ImageFont
import os

ROOT = r'C:\Users\navee\Videos\Calorify\calori'
FLAME = os.path.join(ROOT, 'scratch', 'flame_terracotta.png')
FONT = os.path.join(ROOT, 'node_modules', '@expo-google-fonts', 'kurale', '400Regular', 'Kurale_400Regular.ttf')
OUT = os.path.join(ROOT, 'assets', 'splash-icon.png')

TERRA = (244, 117, 81, 255)  # #F47551

# --- Flame: crop tight to visible pixels, resize to target height ---
flame = Image.open(FLAME).convert('RGBA')
bbox = flame.getchannel('A').getbbox()
flame = flame.crop(bbox)
FLAME_H = 200
flame_w = max(1, round(flame.width * FLAME_H / flame.height))
flame = flame.resize((flame_w, FLAME_H), Image.LANCZOS)

# --- Text: measure "Calorify" in Kurale, scale to target cap-height ---
probe = Image.new('RGBA', (4, 4))
probe_draw = ImageDraw.Draw(probe)
TEXT_H = 118
font_size = 200
font = ImageFont.truetype(FONT, font_size)
tb = probe_draw.textbbox((0, 0), 'Calorify', font=font)
th = tb[3] - tb[1]
font = ImageFont.truetype(FONT, max(1, int(font_size * TEXT_H / th)))
tb = probe_draw.textbbox((0, 0), 'Calorify', font=font)
text_w = tb[2] - tb[0]
text_h = tb[3] - tb[1]

# --- Layout ---
GAP = 40
PAD = 24
content_w = flame_w + GAP + text_w
content_h = max(FLAME_H, text_h)
W = content_w + PAD * 2
H = content_h + PAD * 2

canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))

fx = PAD
fy = (H - FLAME_H) // 2
canvas.alpha_composite(flame, (fx, fy))

draw = ImageDraw.Draw(canvas)
tx = PAD + flame_w + GAP
ty = (H - text_h) // 2 - tb[1]
draw.text((tx, ty), 'Calorify', font=font, fill=TERRA)

canvas.save(OUT)
print('saved', OUT, canvas.size, 'flame', flame.size, 'text', (text_w, text_h))
