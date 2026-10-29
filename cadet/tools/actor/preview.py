# CADET — tools/actor/preview.py : renders pictures of the parts made by build_actor.py (Cycles on the CPU), to look at
# them while making them. Imported by build_actor.py when a preview folder is given.
import bpy, math
from mathutils import Vector, Matrix

def color_of(key, colors):
    if key.startswith('x'): h = int(key[1:], 16)
    else: h = colors.get(key, 0xff00ff)
    s = [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255]
    return [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in s]

def material(name, rgb, rough, metal, use_ao=True):
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if use_ao:
        at = nt.nodes.new('ShaderNodeVertexColor'); mul = nt.nodes.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'
        mul.inputs['Factor'].default_value = 1.0; mul.inputs[6].default_value = (*rgb, 1)
        nt.links.new(at.outputs['Color'], mul.inputs[7]); nt.links.new(mul.outputs[2], b.inputs['Base Color'])
    else: b.inputs['Base Color'].default_value = (*rgb, 1)
    return m

def render(objs, path, colors, classes, cam_pos, target, lens=85, size=(600, 600), hide=()):
    sc = bpy.context.scene
    for ob in objs:
        part, variant, key, cls = (ob.name.split('.') + ['base', 'skin', 'skin'])[:4]
        r, mt = classes.get(cls, (0.6, 0))
        ob.data.materials.clear(); ob.data.materials.append(material(f'{key}-{cls}', color_of(key, colors), r, mt, len(ob.data.color_attributes) > 0))
    for ob in bpy.data.objects:
        if ob.type == 'MESH': ob.hide_render = ob not in objs or ob.name in hide
    cam = bpy.data.objects.get('cam')
    if not cam:
        cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
        sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
        sun.data.energy = 3.2; sun.data.angle = 0.25; sun.rotation_euler = (math.radians(-55), math.radians(30), 0)
        sun.rotation_mode = 'QUATERNION'; sun.rotation_quaternion = (Vector((0.5, 1.4, 1.0))).to_track_quat('Z', 'Y')
        w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.6, 0.68, 1)
        w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.9
        sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 24; sc.cycles.use_denoising = True
        sc.view_settings.view_transform = 'AgX'; sc.render.film_transparent = False
    cam.location = Vector(cam_pos); cam.data.lens = lens; cam.data.clip_start = 0.01
    z = (Vector(cam_pos) - Vector(target)).normalized(); x = Vector((0, 1, 0)).cross(z).normalized(); y = z.cross(x)
    cam.rotation_mode = 'QUATERNION'; cam.rotation_quaternion = Matrix((x, y, z)).transposed().to_quaternion()
    sc.render.resolution_x, sc.render.resolution_y = size; sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
