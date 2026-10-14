# tools/models/detail.py
# Reads an aircraft model's unchanged source file in Blender and writes its whole surface as plain triangles, for
# tools/models/detail.ts (which lays it over the shipped mesh, shades it and writes model.glb). Blender does only
# what needs Blender: it opens the file. Every mesh object of the scene is written with its transforms applied (its
# own and its parents'), triangulated, without materials, textures, UVs or normals. Modifiers are not applied (the
# shipped meshes were made without them); the header names each object's, so a missing half or a coarse part is seen.
# One thing is kept of the materials: whether a triangle's material is see-through (its alpha is a number under 1).
# That is glass: a windscreen, a cabin window. An object with both kinds is written as two.
#
#   blender -b --disable-autoexec --python tools/models/detail.py -- <source.glb|.gltf|.blend|.obj> <out.fcm>
#
# The file: 'FCM1', the header's byte length (uint32), the header (JSON, padded with spaces to four bytes), the
# positions (float32 xyz per vertex, Blender's frame, the file's units), the triangles (uint32 × 3), each triangle's
# object (uint16: its place in the header's `objects`: name, triangles, glass, hidden, modifiers). Little-endian. No
# vertex is shared between objects: detail.ts welds.
import json
import os
import struct
import sys

import bpy
import numpy as np


def open_source(path):
    ext = os.path.splitext(path)[1].lower()
    if ext == '.blend':
        bpy.ops.wm.open_mainfile(filepath=path)
        if not any(o.type == 'MESH' for o in bpy.context.scene.objects):  # the file was saved on an empty scene
            for s in bpy.data.scenes:
                if any(o.type == 'MESH' for o in s.objects):
                    bpy.context.window.scene = s
                    break
    else:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        if ext in ('.glb', '.gltf'):
            bpy.ops.import_scene.gltf(filepath=path)
        elif ext == '.obj':
            bpy.ops.wm.obj_import(filepath=path)
        else:
            raise SystemExit('detail.py: cannot read %s files; convert it to .glb or .blend first' % ext)


def see_through(mat):
    """Glass: the material's alpha is a number under 1. (An alpha that comes from a texture says nothing: the model's
    whole skin can be one texture with a few clear texels.)"""
    if mat is None:
        return False
    if mat.use_nodes and mat.node_tree:
        for n in mat.node_tree.nodes:
            if n.type == 'BSDF_PRINCIPLED':
                a = n.inputs.get('Alpha')
                return a is not None and not a.is_linked and a.default_value < 0.99
    return mat.diffuse_color[3] < 0.99


def main():
    src, out = sys.argv[sys.argv.index('--') + 1:][:2]
    open_source(src)
    pos, tri, owner, objects = [], [], [], []
    base = 0
    for o in bpy.context.scene.objects:
        if o.type != 'MESH':
            continue
        me = o.data
        me.calc_loop_triangles()
        nv, nt = len(me.vertices), len(me.loop_triangles)
        if nt == 0:
            continue
        co = np.empty(3 * nv, dtype=np.float32)
        me.vertices.foreach_get('co', co)
        m = np.array(o.matrix_world, dtype=np.float64)
        p = co.reshape(nv, 3).astype(np.float64) @ m[:3, :3].T + m[:3, 3]
        t = np.empty(3 * nt, dtype=np.int32)
        me.loop_triangles.foreach_get('vertices', t)
        t = t.reshape(nt, 3)
        if np.linalg.det(m[:3, :3]) < 0:  # a mirrored object: its faces would turn inside out
            t = t[:, ::-1]
        mat = np.empty(nt, dtype=np.int32)
        me.loop_triangles.foreach_get('material_index', mat)
        clear = np.array([see_through(x) for x in me.materials] + [False], dtype=bool)
        glass = clear[np.minimum(mat, len(me.materials))]
        pos.append(p.astype(np.float32))
        for kind in (False, True):
            part = t[glass == kind]
            if len(part) == 0:
                continue
            tri.append((part + base).astype(np.uint32))
            owner.append(np.full(len(part), len(objects), dtype=np.uint16))
            objects.append({'name': o.name, 'triangles': len(part), 'glass': kind,
                            'hidden': bool(o.hide_viewport or o.hide_render or o.hide_get()),
                            'modifiers': [x.type for x in o.modifiers]})
        base += nv
    if not objects:
        raise SystemExit('detail.py: no mesh in %s' % src)
    pos, tri, owner = np.concatenate(pos), np.concatenate(tri), np.concatenate(owner)
    head = json.dumps({'source': os.path.basename(src), 'blender': bpy.app.version_string, 'vertices': len(pos),
                       'triangles': len(tri), 'objects': objects}).encode()
    head += b' ' * (-len(head) % 4)
    with open(out, 'wb') as f:
        f.write(b'FCM1' + struct.pack('<I', len(head)) + head)
        f.write(pos.astype('<f4').tobytes())
        f.write(tri.astype('<u4').tobytes())
        f.write(owner.astype('<u2').tobytes())
    print('detail.py: %s: %d objects, %d vertices, %d triangles, %d of glass' % (
        os.path.basename(src), len(objects), len(pos), len(tri), sum(x['triangles'] for x in objects if x['glass'])))


main()
