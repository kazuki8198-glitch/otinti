# Before / after pairs side by side (each labelled with the commit, the place and the view), for the docs.
# Usage: python3 compare.py shots.json before_dir after_dir out_dir before_label after_label
import sys, json, os
from PIL import Image, ImageDraw, ImageFont
shots = json.load(open(sys.argv[1])); B, A, O, lb, la = sys.argv[2:7]; os.makedirs(O, exist_ok=True)
font = None
for f in ['/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf', '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc', '/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc']:
    if os.path.exists(f): font = ImageFont.truetype(f, 18); break
font = font or ImageFont.load_default()
for s in shots:
    pb, pa = os.path.join(B, s['name'] + '.png'), os.path.join(A, s['name'] + '.png')
    if not (os.path.exists(pb) and os.path.exists(pa)): print('missing', s['name']); continue
    a, b = Image.open(pb).convert('RGB'), Image.open(pa).convert('RGB'); w, h = a.size
    im = Image.new('RGB', (w * 2 + 8, h + 60), (24, 24, 26)); im.paste(a, (0, 60)); im.paste(b, (w + 8, 60))
    d = ImageDraw.Draw(im)
    where = f"{s.get('note', '')}  ({s['e']:.1f}, {s['n']:.1f})"
    d.text((8, 7), f'変更前 {lb}', fill=(230, 230, 230), font=font); d.text((w + 16, 7), f'変更後 {la}', fill=(230, 230, 230), font=font)
    d.text((8, 33), where[:90], fill=(180, 200, 220), font=font)
    im.save(os.path.join(O, s['name'] + '.jpg'), quality=84); print('ok', s['name'])
