import re
p = '/home/hatch/workspace/cadet-godot/src/physics.gd'
src = open(p).read().split('\n')

def dedent_block(lines, start_idx):
    # lines[start_idx] is a line containing only '{' (with indent). Remove it,
    # dedent following lines by one tab until the matching closing '}' line (same indent), remove that too.
    indent = lines[start_idx][:len(lines[start_idx]) - len(lines[start_idx].lstrip('\t'))]
    assert lines[start_idx].strip() == '{', lines[start_idx]
    del lines[start_idx]
    i = start_idx
    while i < len(lines):
        if lines[i] == indent + '}':
            del lines[i]
            return lines
        if lines[i].startswith('\t'):
            lines[i] = lines[i][1:]
        i += 1
    raise RuntimeError('no closing brace for block at %d' % start_idx)

# find bare-brace lines whose previous non-empty line is NOT part of a literal context:
# heuristics: bare '{' lines we flagged: those following lines ending with '=' or a statement, in function bodies at indent<=2
# We target by searching for exact anchor preceding lines.
anchors = [
    '\tE["dCmF"] = 0.0',
    '\tE["dCY"] = float(P["CYb"])',
    '\tvar wheels: Array = []',
]
changed = True
for anchor in anchors:
    for i, ln in enumerate(src):
        if ln == anchor:
            # next line should be the bare '{'
            j = i + 1
            assert src[j].strip() == '{', (anchor, src[j])
            src = dedent_block(src, j)
            break
    else:
        print('anchor not found:', anchor)

open(p, 'w').write('\n'.join(src))
print('done part 1')
