# Ícono de Frescura: una hoja verde simétrica con nervadura central, sobre fondo crema.
# Uso: python3 scripts/make-icon.py  (escribe los íconos en assets/images)
from PIL import Image, ImageDraw
import math, sys

GREEN = (47, 107, 69, 255)
CREAM = (251, 247, 240, 255)
out = sys.argv[1] if len(sys.argv) > 1 else 'assets/images'
ANGLE = math.radians(45)  # la hoja apunta hacia arriba a la derecha
UX, UY = math.cos(ANGLE), -math.sin(ANGLE)  # dirección del eje (y crece hacia abajo)
NX, NY = -UY, UX  # perpendicular

def leaf(size, scale, bg, leaf_color, vein_color, rounded):
    W = size * 4
    img = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if bg:
        if rounded:
            d.rounded_rectangle([0, 0, W - 1, W - 1], radius=int(W * 0.22), fill=bg)
        else:
            d.rectangle([0, 0, W, W], fill=bg)
    L = W * 0.78 * scale          # largo de la hoja
    half_w = L * 0.30             # medio ancho máximo
    stem = L * 0.14               # tallo
    # Centro del conjunto (tallo + hoja) en el centro del lienzo.
    total = L + stem
    cx, cy = W / 2, W / 2
    sx, sy = cx - UX * total / 2, cy - UY * total / 2  # inicio del tallo
    bx, by = sx + UX * stem, sy + UY * stem            # base de la hoja
    pts_left, pts_right = [], []
    steps = 120
    for i in range(steps + 1):
        t = i / steps
        w = half_w * math.sin(math.pi * t) ** 0.75
        px, py = bx + UX * L * t, by + UY * L * t
        pts_left.append((px + NX * w, py + NY * w))
        pts_right.append((px - NX * w, py - NY * w))
    d.polygon(pts_left + pts_right[::-1], fill=leaf_color)
    lw = max(2, int(W * 0.035 * scale))
    d.line([(sx, sy), (bx + UX * L * 0.12, by + UY * L * 0.12)], fill=leaf_color, width=int(lw * 1.4))
    if vein_color:
        d.line([(bx + UX * L * 0.10, by + UY * L * 0.10), (bx + UX * L * 0.80, by + UY * L * 0.80)],
               fill=vein_color, width=lw)
    return img.resize((size, size), Image.LANCZOS)

leaf(1024, 0.80, CREAM, GREEN, CREAM, False).save(f'{out}/icon.png')
# Android adaptativo: el primer plano debe caber en el 66 % central.
leaf(512, 0.52, None, GREEN, CREAM, False).save(f'{out}/android-icon-foreground.png')
Image.new('RGBA', (512, 512), CREAM).save(f'{out}/android-icon-background.png')
leaf(432, 0.52, None, (255, 255, 255, 255), None, False).save(f'{out}/android-icon-monochrome.png')
leaf(256, 1.0, None, GREEN, CREAM, False).save(f'{out}/splash-icon.png')
leaf(48, 0.85, CREAM, GREEN, None, True).save(f'{out}/favicon.png')
