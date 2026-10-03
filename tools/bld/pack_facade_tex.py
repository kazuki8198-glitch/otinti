# The facade materials as two stacked images for a texture array (one layer per material, read in the page as a
# DataArrayTexture): albedo.jpg (1024 x 1024 per layer) and nr.jpg (512 x 512 per layer: R, G = the normal's x, y
# (OpenGL convention), B = roughness). Sources: Poly Haven (CC0, https://polyhaven.com/license), 1k JPG sets, in SRC.
# Materials a building's colour tints are made grey with their mean brightness at 0.78 (the pattern kept); the others
# keep their colour. Sources fetched with `--fetch` (1k JPG from dl.polyhaven.org into SRC). Each layer's real size (metres per image) is in LAYERS: the page tiles them at that size.
import sys, os, json, numpy as np
from PIL import Image
args = [a for a in sys.argv[1:] if not a.startswith('--')]
SRC = args[0] if len(args) > 0 else '.'; OUT = args[1] if len(args) > 1 else '../../models/tex/facade'
LAYERS = [  # (name, Poly Haven id, metres per image, tinted)
    ('render', 'white_stucco', 2.0, True), ('tile', 'rectangular_facade_tiles', 2.0, True), ('mosaic', 'rounded_square_tiled_wall', 2.0, True),
    ('concrete', 'concrete_wall_004', 2.0, True), ('siding', 'exterior_wall_cladding_03', 1.96, True), ('brick', 'exterior_wall_cladding_02', 1.99, False),
    ('metal', 'box_profile_metal_sheet', 2.0, True), ('shutter', 'painted_metal_shutter', 2.0, True), ('slate', 'roof_slates_03', 3.0, False), ('kawara', 'grey_roof_tiles', 3.0, False),
    # (added: fair-faced concrete panels, tiled facades, a beige render, corrugated slate (factories, warehouses), concrete blocks)
    ('rcpanel', 'concrete_panels', 8.0, True), ('ctile', 'concrete_tile_facade', 2.09, True), ('beige', 'beige_wall_001', 3.0, False),
    ('slatewave', 'asbestos_sheet', 2.0, True), ('block', 'concrete_block_wall', 2.0, True)]
if '--fetch' in sys.argv:
    import urllib.request
    os.makedirs(SRC, exist_ok=True)
    for _, pid, _, _ in LAYERS:
        for k in ('diff', 'nor_gl', 'rough'):
            f = f'{SRC}/{pid}_{k}_1k.jpg'
            if not os.path.exists(f): urllib.request.urlretrieve(f'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/{pid}/{pid}_{k}_1k.jpg', f)
A = []; N = []
for name, pid, size, tint in LAYERS:
    a = np.asarray(Image.open(f'{SRC}/{pid}_diff_1k.jpg').convert('RGB').resize((1024, 1024), Image.LANCZOS)).astype(np.float32) / 255
    if tint:
        g = a @ np.array([0.2126, 0.7152, 0.0722]); g = g / max(g.mean(), 1e-3) * 0.78
        a = np.repeat(np.clip(g, 0, 1)[..., None], 3, 2)
    elif name == 'kawara':                                              # (Japanese kawara: dark silver grey, the moss taken out)
        g = a @ np.array([0.2126, 0.7152, 0.0722]); g = g / max(g.mean(), 1e-3) * 0.30; a = np.repeat(np.clip(g, 0, 1)[..., None], 3, 2) * np.array([0.95, 0.98, 1.05])
    A.append((np.clip(a, 0, 1) * 255).astype(np.uint8))
    n = np.asarray(Image.open(f'{SRC}/{pid}_nor_gl_1k.jpg').convert('RGB').resize((512, 512), Image.LANCZOS))
    r = np.asarray(Image.open(f'{SRC}/{pid}_rough_1k.jpg').convert('L').resize((512, 512), Image.LANCZOS))
    N.append(np.dstack([n[..., 0], n[..., 1], r]))
os.makedirs(OUT, exist_ok=True)
Image.fromarray(np.concatenate(A, 0)).save(f'{OUT}/albedo.jpg', quality=88)
Image.fromarray(np.concatenate(N, 0)).save(f'{OUT}/nr.jpg', quality=90)
json.dump({'layers': [{'name': n, 'source': f'https://polyhaven.com/a/{p}', 'size': s, 'tinted': t} for n, p, s, t in LAYERS], 'license': 'CC0 (Poly Haven)'}, open(f'{OUT}/layers.json', 'w'), ensure_ascii=False, indent=1)
print('layers', len(LAYERS), os.path.getsize(f'{OUT}/albedo.jpg') // 1024, 'KB', os.path.getsize(f'{OUT}/nr.jpg') // 1024, 'KB')
