#!/usr/bin/env python3
"""Shrinks the free CC0 art packs into the small files the game loads (3d/assets/). See 3d/CREDITS.md.

    python3 3d/tools/build-art.py <packs folder> chars|anims|textures|skies|nature

The packs folder has the unzipped downloads: ubc/x, outfits/x, ual/x, nature/x, ph_<name>/...
Nothing from a pack is ever run: its glTF files are read as data. Only the files this makes get committed.

Each fighter skin becomes one .glb with all its parts merged by material and bound to one skeleton:
no images inside (textures are shared .jpg files), float positions, 8-bit normals, joints and weights, 16-bit UVs.
"""
import base64, glob, json, math, os, struct, subprocess, sys, zlib

GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(GAME, 'assets')
PACKS = sys.argv[1] if len(sys.argv) > 1 else '.'

COMP = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2), 5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
NUM = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


class Gltf:
    def __init__(self, path):
        self.dir = os.path.dirname(path)
        if path.endswith('.glb'):
            b = open(path, 'rb').read()
            n = struct.unpack('<I', b[12:16])[0]
            self.j = json.loads(b[20:20 + n])
            self.bin = b[20 + n + 8:]
        else:
            self.j = json.load(open(path))
            self.bin = open(os.path.join(self.dir, self.j['buffers'][0]['uri']), 'rb').read()

    def acc(self, i):
        a = self.j['accessors'][i]
        v = self.j['bufferViews'][a['bufferView']]
        f, s = COMP[a['componentType']]
        n = NUM[a['type']]
        off = v.get('byteOffset', 0) + a.get('byteOffset', 0)
        st = v.get('byteStride', s * n)
        out = []
        if st == s * n:
            vals = struct.unpack_from('<%d%s' % (a['count'] * n, f), self.bin, off)
            for k in range(a['count']):
                out.append(vals[k * n:(k + 1) * n])
        else:
            for k in range(a['count']):
                out.append(struct.unpack_from('<%d%s' % (n, f), self.bin, off + k * st))
        if a.get('normalized'):
            d = {5120: 127.0, 5121: 255.0, 5122: 32767.0, 5123: 65535.0}[a['componentType']]
            out = [tuple(x / d for x in t) for t in out]
        return out

    def skin(self):
        s = self.j['skins'][0]
        names = [self.j['nodes'][i]['name'] for i in s['joints']]
        ib = self.acc(s['inverseBindMatrices'])
        return names, ib


def inv4(m):  # column-major rigid-ish 4x4
    a = [m[0], m[4], m[8], m[12], m[1], m[5], m[9], m[13], m[2], m[6], m[10], m[14], m[3], m[7], m[11], m[15]]
    s = [a[0]*a[5]-a[4]*a[1], a[0]*a[6]-a[4]*a[2], a[0]*a[7]-a[4]*a[3], a[1]*a[6]-a[5]*a[2], a[1]*a[7]-a[5]*a[3], a[2]*a[7]-a[6]*a[3]]
    c = [a[8]*a[13]-a[12]*a[9], a[8]*a[14]-a[12]*a[10], a[8]*a[15]-a[12]*a[11], a[9]*a[14]-a[13]*a[10], a[9]*a[15]-a[13]*a[11], a[10]*a[15]-a[14]*a[11]]
    d = 1.0 / (s[0]*c[5]-s[1]*c[4]+s[2]*c[3]+s[3]*c[2]-s[4]*c[1]+s[5]*c[0])
    r = [(a[5]*c[5]-a[6]*c[4]+a[7]*c[3])*d, (-a[1]*c[5]+a[2]*c[4]-a[3]*c[3])*d, (a[13]*s[5]-a[14]*s[4]+a[15]*s[3])*d, (-a[9]*s[5]+a[10]*s[4]-a[11]*s[3])*d,
         (-a[4]*c[5]+a[6]*c[2]-a[7]*c[1])*d, (a[0]*c[5]-a[2]*c[2]+a[3]*c[1])*d, (-a[12]*s[5]+a[14]*s[2]-a[15]*s[1])*d, (a[8]*s[5]-a[10]*s[2]+a[11]*s[1])*d,
         (a[4]*c[4]-a[5]*c[2]+a[7]*c[0])*d, (-a[0]*c[4]+a[1]*c[2]-a[3]*c[0])*d, (a[12]*s[4]-a[13]*s[2]+a[15]*s[0])*d, (-a[8]*s[4]+a[9]*s[2]-a[11]*s[0])*d,
         (-a[4]*c[3]+a[5]*c[1]-a[6]*c[0])*d, (a[0]*c[3]-a[1]*c[1]+a[2]*c[0])*d, (-a[12]*s[3]+a[13]*s[1]-a[14]*s[0])*d, (a[8]*s[3]-a[9]*s[1]+a[10]*s[0])*d]
    return [r[0], r[4], r[8], r[12], r[1], r[5], r[9], r[13], r[2], r[6], r[10], r[14], r[3], r[7], r[11], r[15]]


def mul4(a, b):
    r = [0.0] * 16
    for c in range(4):
        for row in range(4):
            r[c*4+row] = sum(a[k*4+row] * b[c*4+k] for k in range(4))
    return r


def xp(m, v):
    return (m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12], m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13], m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14])


def xn(m, v):
    return (m[0]*v[0]+m[4]*v[1]+m[8]*v[2], m[1]*v[0]+m[5]*v[1]+m[9]*v[2], m[2]*v[0]+m[6]*v[1]+m[10]*v[2])


class Part:
    """Triangles from one glTF primitive, with joints remapped by name onto `names`."""
    def __init__(self):
        self.pos, self.nor, self.uv, self.jn, self.wt, self.idx = [], [], [], [], [], []

    def extend(self, o):
        b = len(self.pos)
        for f in ('pos', 'nor', 'uv', 'jn', 'wt'):
            getattr(self, f).extend(getattr(o, f))
        self.idx.extend(i + b for i in o.idx)


def read_prim(g, prim, target_names, target_ib, keep=None):
    src_names, src_ib = g.skin()
    jmap = {i: target_names.index(n) for i, n in enumerate(src_names)}
    a = prim['attributes']
    pos, nor, uv = g.acc(a['POSITION']), g.acc(a['NORMAL']), g.acc(a['TEXCOORD_0'])
    jn, wt = g.acc(a['JOINTS_0']), g.acc(a['WEIGHTS_0'])
    idx = [x[0] for x in g.acc(prim['indices'])]
    # moves a vertex from the source skeleton's rest pose onto the target's, joint by joint
    rebind = {}
    same = all(abs(p - q) < 1e-4 for s, n in enumerate(src_names) for p, q in zip(src_ib[s], target_ib[target_names.index(n)]))
    if not same:
        for s, n in enumerate(src_names):
            rebind[s] = mul4(inv4(target_ib[target_names.index(n)]), src_ib[s])
    tris = [idx[i:i + 3] for i in range(0, len(idx), 3)]
    if keep:
        tris = [t for t in tris if all(keep(jn[v], wt[v], src_names, pos[v]) for v in t)]
    used = {}
    p = Part()
    for t in tris:
        for v in t:
            if v not in used:
                used[v] = len(p.pos)
                P, N = pos[v], nor[v]
                if rebind:
                    px = [0.0, 0.0, 0.0]; nx = [0.0, 0.0, 0.0]; tot = sum(wt[v]) or 1
                    for k in range(4):
                        if wt[v][k] > 0:
                            q = xp(rebind[jn[v][k]], P); m = xn(rebind[jn[v][k]], N)
                            for c in range(3):
                                px[c] += q[c] * wt[v][k] / tot; nx[c] += m[c] * wt[v][k] / tot
                    P, N = tuple(px), tuple(nx)
                p.pos.append(P); p.nor.append(N); p.uv.append(uv[v])
                p.jn.append(tuple(jmap[j] for j in jn[v])); p.wt.append(wt[v])
            p.idx.append(used[v])
    return p


def is_head(jn, wt, names, pos):
    w = sum(wt[k] for k in range(4) if names[jn[k]] in ('Head', 'neck_01'))
    return w > 0.25


class GlbWriter:
    def __init__(self):
        self.bin = bytearray()
        self.j = {'asset': {'version': '2.0', 'generator': 'Spear-Mace build-art.py'}, 'extensionsUsed': ['KHR_mesh_quantization'], 'extensionsRequired': ['KHR_mesh_quantization'],
                  'bufferViews': [], 'accessors': [], 'nodes': [], 'buffers': [{}]}

    def add(self, data, comp, typ, count, normalized=False, mn=None, mx=None, target=None, stride=None):
        while len(self.bin) % 4:
            self.bin.append(0)
        v = {'buffer': 0, 'byteOffset': len(self.bin), 'byteLength': len(data)}
        if target: v['target'] = target
        if stride: v['byteStride'] = stride
        self.bin.extend(data)
        self.j['bufferViews'].append(v)
        a = {'bufferView': len(self.j['bufferViews']) - 1, 'componentType': comp, 'count': count, 'type': typ}
        if normalized: a['normalized'] = True
        if mn is not None: a['min'] = mn; a['max'] = mx
        self.j['accessors'].append(a)
        return len(self.j['accessors']) - 1

    def write(self, path):
        while len(self.bin) % 4:
            self.bin.append(0)
        self.j['buffers'][0]['byteLength'] = len(self.bin)
        js = json.dumps(self.j, separators=(',', ':')).encode()
        js += b' ' * ((4 - len(js) % 4) % 4)
        with open(path, 'wb') as f:
            f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(self.bin)))
            f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
            f.write(struct.pack('<II', len(self.bin), 0x004E4942)); f.write(self.bin)
        return os.path.getsize(path)


def clampi(x, lo, hi):
    return max(lo, min(hi, int(round(x))))


def add_prim(w, p, mat, skinned=True):
    n = len(p.pos)
    a = {}
    xs = [v[0] for v in p.pos]; ys = [v[1] for v in p.pos]; zs = [v[2] for v in p.pos]
    a['POSITION'] = w.add(struct.pack('<%df' % (n*3), *[c for v in p.pos for c in v]), 5126, 'VEC3', n, mn=[min(xs), min(ys), min(zs)], mx=[max(xs), max(ys), max(zs)], target=34962)
    nb = bytearray()
    for v in p.nor:
        l = math.sqrt(v[0]**2+v[1]**2+v[2]**2) or 1
        nb += struct.pack('<4b', clampi(v[0]/l*127, -127, 127), clampi(v[1]/l*127, -127, 127), clampi(v[2]/l*127, -127, 127), 0)
    a['NORMAL'] = w.add(bytes(nb), 5120, 'VEC3', n, normalized=True, target=34962, stride=4)
    us = [v[0] for v in p.uv]; vs = [v[1] for v in p.uv]
    if min(us) >= -0.0001 and max(us) <= 1.0001 and min(vs) >= -0.0001 and max(vs) <= 1.0001:
        a['TEXCOORD_0'] = w.add(struct.pack('<%dH' % (n*2), *[clampi(c*65535, 0, 65535) for v in p.uv for c in v]), 5123, 'VEC2', n, normalized=True, target=34962)
    else:
        a['TEXCOORD_0'] = w.add(struct.pack('<%df' % (n*2), *[c for v in p.uv for c in v]), 5126, 'VEC2', n, target=34962)
    if skinned:
        a['JOINTS_0'] = w.add(struct.pack('<%dB' % (n*4), *[c for v in p.jn for c in v]), 5121, 'VEC4', n, target=34962)
        wb = bytearray()
        for v in p.wt:
            q = [clampi(c*255, 0, 255) for c in v]
            q[q.index(max(q))] += 255 - sum(q)
            wb += struct.pack('<4B', *q)
        a['WEIGHTS_0'] = w.add(bytes(wb), 5121, 'VEC4', n, normalized=True, target=34962)
    ix = w.add(struct.pack('<%dH' % len(p.idx), *p.idx) if n < 65536 else struct.pack('<%dI' % len(p.idx), *p.idx), 5123 if n < 65536 else 5125, 'SCALAR', len(p.idx), target=34963)
    return {'attributes': a, 'indices': ix, 'material': mat}


def sips(src, dst, size, q=80):
    subprocess.run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', str(q), '-Z', str(size), src, '--out', dst], capture_output=True, check=True)


def g1(pat):
    r = glob.glob(os.path.join(PACKS, pat))
    if not r:
        sys.exit('missing in packs: ' + pat)
    return r[0]


UB = 'ubc/x/*/Base Characters/Godot - UE/'
HR = 'ubc/x/*/Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)/'
OF = 'outfits/x/*/Exports/glTF (Godot-Unreal)/Outfits/'
HEADS = {'m': UB + 'Superhero_Male_FullBody.gltf', 'f': UB + 'Superhero_Female_FullBody.gltf'}
OUTFITS = {'ranger_m': OF + 'Male_Ranger.gltf', 'ranger_f': OF + 'Female_Ranger.gltf', 'peasant_m': OF + 'Male_Peasant.gltf', 'peasant_f': OF + 'Female_Peasant.gltf'}
# what each skin wears (skin ids from character.js). Parts are matched by the end of the glTF mesh name.
BASE_R = ['Arms', 'Body', 'Belt_1', 'Legs', 'Feet', 'Feet_Boots']
SKINS = {
    'steve': ('ranger_m', 'm', BASE_R, ['Hair_SimpleParted']),
    'alex': ('ranger_f', 'f', BASE_R + ['Bracer'], ['Hair_Long']),
    'noob': ('peasant_m', 'm', None, ['Hair_Buzzed']),
    'man_face': ('peasant_m', 'm', None, ['Hair_Buzzed']),
    'creeper': ('ranger_m', 'm', BASE_R + ['Bracer', 'Pauldron'], ['Hair_Beard']),
    'enderman': ('ranger_f', 'f', BASE_R + ['Bracer', 'Hood'], []),
    'skeleton': ('ranger_m', 'm', BASE_R + ['Bracer', 'Pauldron'], []),
    'zombie': ('peasant_m', 'm', None, ['Hair_Beard', 'Hair_Buzzed']),
    'diamond_knight': ('ranger_f', 'f', BASE_R + ['Bracer', 'Pauldrons'], ['Hair_Buns']),
}


def build_chars():
    d = os.path.join(OUT, 'chars'); os.makedirs(d, exist_ok=True)
    for sid, (of, hd, parts, hairs) in SKINS.items():
        g = Gltf(g1(OF_PATH(of)))
        names, ib = g.skin()
        mats = {'cloth': Part(), 'skin': Part(), 'head': Part(), 'eye': Part(), 'brow': Part(), 'hair': Part()}
        for m in g.j['meshes']:
            nm = m['name']
            if parts is not None and not any(nm.endswith(q) or (q == 'Belt_1' and 'Belt_1' in nm and not nm.endswith('.001')) for q in parts):
                continue
            for pr in m['primitives']:
                mt = g.j['materials'][pr['material']]['name']
                mats['skin' if 'Regular' in mt else 'cloth'].extend(read_prim(g, pr, names, ib))
        h = Gltf(g1(HEADS[hd]))
        for m in h.j['meshes']:
            pr = m['primitives'][0]
            mt = h.j['materials'][pr['material']]['name']
            if 'Hair' in mt: mats['brow'].extend(read_prim(h, pr, names, ib))
            elif 'Eye' in mt: mats['eye'].extend(read_prim(h, pr, names, ib))
            else: mats['head'].extend(read_prim(h, pr, names, ib, keep=is_head))
        for hair in hairs:
            hg = Gltf(g1(HR + hair + '.gltf'))
            for m in hg.j['meshes']:
                mats['hair'].extend(read_prim(hg, m['primitives'][0], names, ib))
        w = GlbWriter()
        jnodes = {}
        for jn, nd in zip(g.j['skins'][0]['joints'], names):
            jnodes[jn] = nd
        # copy the joint hierarchy
        remap = {}
        for jn in g.j['skins'][0]['joints']:
            src = g.j['nodes'][jn]
            n = {'name': src['name']}
            for k in ('translation', 'rotation', 'scale'):
                if k in src: n[k] = src[k]
            remap[jn] = len(w.j['nodes']); w.j['nodes'].append(n)
        for jn, r in remap.items():
            ch = [remap[c] for c in g.j['nodes'][jn].get('children', []) if c in remap]
            if ch: w.j['nodes'][r]['children'] = ch
        ibb = struct.pack('<%df' % (16*len(ib)), *[c for m in ib for c in m])
        ibi = w.add(ibb, 5126, 'MAT4', len(ib))
        w.j['skins'] = [{'joints': [remap[x] for x in g.j['skins'][0]['joints']], 'inverseBindMatrices': ibi}]
        w.j['materials'] = []; prims = []
        for name, p in mats.items():
            if not p.pos:
                continue
            w.j['materials'].append({'name': name})
            prims.append(add_prim(w, p, len(w.j['materials']) - 1))
        w.j['meshes'] = [{'name': sid, 'primitives': prims}]
        mesh_node = len(w.j['nodes'])
        w.j['nodes'].append({'name': sid, 'mesh': 0, 'skin': 0})
        root = next(r for jn, r in remap.items() if g.j['nodes'][jn]['name'] == 'root')
        # keep the Armature's parent transform if it has one
        w.j['scenes'] = [{'nodes': [root, mesh_node]}]; w.j['scene'] = 0
        size = w.write(os.path.join(d, sid + '.glb'))
        print('%-16s %6.0f KB  tris %d  (%s)' % (sid, size / 1024, sum(len(p.idx) for p in mats.values()) // 3, ','.join('%s:%d' % (k, len(v.idx)//3) for k, v in mats.items() if v.idx)))
    # shared textures
    T = 'outfits/x/*/Textures/'
    B = 'ubc/x/*/Base Characters/Textures/'
    H = 'ubc/x/*/Hairstyles/Textures/'
    for src, dst, s, q in [
        (T+'Ranger/T_Ranger_BaseColor.png', 'ranger_d.jpg', 1024, 82), (T+'Ranger/T_Ranger_Normal.png', 'ranger_n.jpg', 512, 80), (T+'Ranger/T_Ranger_ORM.png', 'ranger_orm.jpg', 512, 75),
        (T+'Peasant/T_Peasant_BaseColor.png', 'peasant_d.jpg', 1024, 82), (T+'Peasant/T_Peasant_Normal.png', 'peasant_n.jpg', 512, 80), (T+'Peasant/T_Peasant_ORM.png', 'peasant_orm.jpg', 512, 75),
        (T+'Base/T_Regular_Male_Dark_BaseColor.png', 'arm_m_d.jpg', 256, 80), (T+'Base/T_Regular_Female_Dark_BaseColor.png', 'arm_f_d.jpg', 256, 80),
        (T+'Base/T_Regular_Male_Normal.png', 'arm_m_n.jpg', 256, 75), (T+'Base/T_Regular_Female_Normal.png', 'arm_f_n.jpg', 256, 75),
        (B+'T_Superhero_Male_Ligh.png', 'head_m_d.jpg', 1024, 85), (B+'T_Superhero_Male_Normal.png', 'head_m_n.jpg', 512, 80),
        (B+'T_Superhero_Female_Light_BaseColor.png', 'head_f_d.jpg', 1024, 85), (B+'T_Superhero_Female_Normal.png', 'head_f_n.jpg', 512, 80),
        (B+'T_Eye_Brown.png', 'eye_d.jpg', 128, 85), (H+'T_Hair_1_BaseColor.png', 'hair1_d.jpg', 512, 80), (H+'T_Hair_1_Normal.png', 'hair1_n.jpg', 256, 75),
        (H+'T_Hair_2_BaseColor.png', 'hair2_d.jpg', 512, 80), (H+'T_Hair_2_Normal.png', 'hair2_n.jpg', 256, 75),
    ]:
        sips(g1(src), os.path.join(d, dst), s, q)


def OF_PATH(of):
    return OUTFITS[of]


ANIMS = {'Idle_Loop': 'idle', 'Walk_Loop': 'walk', 'Jog_Fwd_Loop': 'jog', 'Sprint_Loop': 'sprint', 'Jump_Start': 'jumpStart', 'Jump_Loop': 'jumpLoop', 'Jump_Land': 'land',
         'Hit_Chest': 'hit', 'Hit_Head': 'hitHead', 'Death01': 'death', 'Sword_Attack': 'sword', 'Sword_Idle': 'swordIdle', 'Punch_Cross': 'punch', 'Roll': 'roll', 'Spell_Simple_Shoot': 'spell', 'Dance_Loop': 'dance'}


def build_anims():
    g = Gltf(g1('ual/x/*/Unreal-Godot/UAL1_Standard.glb'))
    w = GlbWriter(); nodes = g.j['nodes']
    joints = g.j['skins'][0]['joints']
    remap = {}
    for jn in joints:
        src = nodes[jn]; n = {'name': src['name']}
        for k in ('translation', 'rotation'):
            if k in src: n[k] = src[k]
        remap[jn] = len(w.j['nodes']); w.j['nodes'].append(n)
    for jn, r in remap.items():
        ch = [remap[c] for c in nodes[jn].get('children', []) if c in remap]
        if ch: w.j['nodes'][r]['children'] = ch
    w.j['scenes'] = [{'nodes': [remap[joints[0]]]}]; w.j['scene'] = 0
    w.j['animations'] = []
    finger = ('index', 'middle', 'pinky', 'ring', 'thumb', 'leaf', 'ball')
    timecache = {}
    def simplify(ts, vs, eps):
        keep = [0]; i = 0; n = len(ts)
        while i < n - 1:
            j = i + 2
            while j < n:
                bad = False
                for k in range(i + 1, j):
                    t = (ts[k] - ts[i]) / (ts[j] - ts[i])
                    if max(abs(vs[i][c] + (vs[j][c] - vs[i][c]) * t - vs[k][c]) for c in range(len(vs[0]))) > eps:
                        bad = True; break
                if bad: break
                j += 1
            keep.append(j - 1); i = j - 1
        return keep
    for an in g.j['animations']:
        if an['name'] not in ANIMS: continue
        ch, sm = [], []
        for c in an['channels']:
            nd = nodes[c['target']['node']]; nm = nd['name']; path = c['target']['path']
            if path == 'scale' or any(f in nm for f in finger) or nm == 'root': continue
            if path == 'translation' and nm != 'pelvis': continue
            s = an['samplers'][c['sampler']]
            ts = [x[0] for x in g.acc(s['input'])]; vs = g.acc(s['output'])
            if path == 'rotation':
                for i in range(1, len(vs)):
                    if sum(a*b for a, b in zip(vs[i-1], vs[i])) < 0: vs[i] = tuple(-x for x in vs[i])
            keep = simplify(ts, vs, 0.004 if path == 'rotation' else 0.002)
            if len(keep) > 1 or True:
                ts2 = [ts[i] for i in keep]; vs2 = [vs[i] for i in keep]
                key = tuple(round(t, 4) for t in ts2)
                if key not in timecache:
                    timecache[key] = w.add(struct.pack('<%df' % len(ts2), *ts2), 5126, 'SCALAR', len(ts2), mn=[min(ts2)], mx=[max(ts2)])
                if path == 'rotation':
                    out = w.add(struct.pack('<%dh' % (len(vs2)*4), *[clampi(x*32767, -32767, 32767) for v in vs2 for x in v]), 5122, 'VEC4', len(vs2), normalized=True)
                else:
                    out = w.add(struct.pack('<%df' % (len(vs2)*3), *[x for v in vs2 for x in v]), 5126, 'VEC3', len(vs2))
                sm.append({'input': timecache[key], 'output': out, 'interpolation': 'LINEAR'})
                ch.append({'sampler': len(sm)-1, 'target': {'node': remap[c['target']['node']], 'path': path}})
        w.j['animations'].append({'name': ANIMS[an['name']], 'channels': ch, 'samplers': sm})
    print('anims.glb %.0f KB, %d clips' % (w.write(os.path.join(OUT, 'chars', 'anims.glb')) / 1024, len(w.j['animations'])))


TEXTURES = {'tile': 'marble_mosaic_tiles', 'pave': 'patterned_paving', 'block': 'large_sandstone_blocks_01', 'wall': 'sandstone_blocks_08', 'rock': 'rock_face_03', 'grass': 'aerial_grass_rock', 'slate': 'slate_floor_02', 'flag': 'stone_tiles_02'}


def build_textures():
    d = os.path.join(OUT, 'world'); os.makedirs(d, exist_ok=True)
    for name, ph in TEXTURES.items():
        p = os.path.join(PACKS, 'ph_' + ph)
        big = name in ('tile', 'pave', 'flag')
        sips(os.path.join(p, 'diff.jpg'), os.path.join(d, name + '_d.jpg'), 1024 if big else 512, 78)
        sips(os.path.join(p, 'nor.jpg'), os.path.join(d, name + '_n.jpg'), 512, 72)
        sips(os.path.join(p, 'rough.jpg'), os.path.join(d, name + '_r.jpg'), 256, 65)
        print(name, sum(os.path.getsize(os.path.join(d, name + s)) for s in ('_d.jpg', '_n.jpg', '_r.jpg')) // 1024, 'KB')


def read_hdr(path):
    b = open(path, 'rb').read()
    i = b.index(b'\n\n') + 2
    j = b.index(b'\n', i)
    parts = b[i:j].decode().split()
    h, w = int(parts[1]), int(parts[3])
    i = j + 1
    rows = []
    for y in range(h):
        row = [bytearray(w) for _ in range(4)]
        i += 4
        for c in range(4):
            x = 0; r = row[c]
            while x < w:
                n = b[i]; i += 1
                if n > 128:
                    n -= 128; v = b[i]; i += 1
                    r[x:x+n] = bytes([v]) * n
                else:
                    r[x:x+n] = b[i:i+n]; i += n
                x += n
        rows.append(row)
    return w, h, rows


def write_png(path, w, h, rgb_rows):
    raw = bytearray()
    for r in rgb_rows:
        raw.append(0); raw += r
    def ch(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + ch(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + ch(b'IDAT', zlib.compress(bytes(raw), 1)) + ch(b'IEND', b''))


SKIES = {'sunset': 'belfast_sunset_puresky', 'night': 'qwantani_night_puresky', 'storm': 'overcast_soil_puresky'}


def build_skies():
    # Upper half of the HDR panorama only, with a Reinhard-style curve the sky shader undoes: c = v / (1 - v) * k
    # (k = 1): keeps the bright clouds and the sun above 1.0 for the bloom, in a plain .jpg
    d = os.path.join(OUT, 'world'); os.makedirs(d, exist_ok=True)
    info = {}
    # 2.2 curve on top of v, so the dark parts keep their detail in 8 bits
    lut = [0] * 256
    for name, ph in SKIES.items():
        w, h, rows = read_hdr(os.path.join(PACKS, 'ph_' + ph, 'sky.hdr'))
        top = h // 2
        out = []; best = (-1, 0, 0); tot = [0.0, 0.0, 0.0]
        scale = [2.0 ** (e - 136) if e else 0 for e in range(256)]
        for y in range(top):
            r, g, b, e = rows[y]
            line = bytearray(w * 3)
            for x in range(w):
                s = scale[e[x]]
                R, G, B = r[x]*s, g[x]*s, b[x]*s
                for k, c in enumerate((R, G, B)):
                    v = (c / (1 + c)) ** (1 / 2.2)
                    line[x*3+k] = min(255, int(v * 255 + 0.5))
                lum = R + G + B
                if lum > best[0]: best = (lum, x, y)
            out.append(line)
        png = os.path.join(d, 'sky_' + name + '.png')
        write_png(png, w, top, out)
        jpg = os.path.join(d, 'sky_' + name + '.jpg')
        subprocess.run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '82', png, '--out', jpg], capture_output=True, check=True)
        os.remove(png)
        info[name] = {'sunU': best[1] / w, 'sunV': best[2] / h, 'peak': best[0] / 3}
        print(name, w, top, os.path.getsize(jpg) // 1024, 'KB', info[name])
    json.dump(info, open(os.path.join(d, 'skies.json'), 'w'))


if __name__ == '__main__':
    for step in sys.argv[2:]:
        {'chars': build_chars, 'anims': build_anims, 'textures': build_textures, 'skies': build_skies}[step]()
