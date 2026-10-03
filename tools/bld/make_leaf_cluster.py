# The near trees' leaf card (models/tex/tree/leaf_cluster.png): Poly Haven's jacaranda_tree leaves (CC0,
# https://polyhaven.com/a/jacaranda_tree; jacaranda_tree_leaves_diff_1k.png and _alpha_1k.png in SRC), its three fronds
# cut out and scattered round a crown, darker inside and lower down (self-shadow), the alpha made hard (alpha-tested)
import sys, random, numpy as np
from PIL import Image, ImageEnhance
SRC = sys.argv[1] if len(sys.argv) > 1 else '.'; OUT = sys.argv[2] if len(sys.argv) > 2 else '../../models/tex/tree/leaf_cluster.png'
d = Image.open(f'{SRC}/jacaranda_tree_leaves_diff_1k.png').convert('RGB'); a = Image.open(f'{SRC}/jacaranda_tree_leaves_alpha_1k.png').convert('L')
rgba = d.copy(); rgba.putalpha(a)
fr = [rgba.crop(b) for b in [(140, 50, 1010, 480), (0, 330, 440, 710), (260, 590, 1020, 1000)]]   # (the fronds on the 1k sheet)
N = 512; out = Image.new('RGBA', (N, N), (0, 0, 0, 0)); rnd = random.Random(5)
for i in range(70):
    f = fr[rnd.randrange(3)]; s = rnd.uniform(0.16, 0.30); f = f.resize((max(8, int(f.width * s)), max(8, int(f.height * s))), Image.LANCZOS)
    f = f.rotate(rnd.uniform(0, 360), expand=True, resample=Image.BICUBIC)
    r = (rnd.random() ** 0.6) * 170; t = rnd.uniform(0, 6.283); cx = 256 + np.cos(t) * r; cy = 256 + np.sin(t) * r * 0.85
    shade = 0.55 + 0.45 * (r / 170) * 0.6 + 0.4 * (0.5 - (cy - 256) / 512)
    f = ImageEnhance.Brightness(f).enhance(min(1.15, max(0.45, shade)) * rnd.uniform(0.85, 1.1))
    out.alpha_composite(f, (int(cx - f.width / 2), int(cy - f.height / 2)))
A = np.asarray(out).copy(); A[..., 3] = np.where(A[..., 3] > 110, 255, 0)
Image.fromarray(A).save(OUT, optimize=True)
