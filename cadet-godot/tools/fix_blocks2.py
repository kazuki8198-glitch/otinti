p = '/home/hatch/workspace/cadet-godot/src/physics.gd'
lines = open(p).read().split('\n')

def dedent_block(lines, start_idx):
    indent = lines[start_idx][:len(lines[start_idx]) - len(lines[start_idx].lstrip('\t'))]
    assert lines[start_idx].strip() == '{', repr(lines[start_idx])
    del lines[start_idx]
    i = start_idx
    while i < len(lines):
        if lines[i] == indent + '}':
            del lines[i]
            return lines
        if lines[i].startswith('\t'):
            lines[i] = lines[i][1:]
        i += 1
    raise RuntimeError('no closing brace')

targets = [363, 1417, 1460, 1582, 1610]  # 1-based line numbers of the '{' lines, process bottom-up
for ln in sorted(targets, reverse=True):
    idx = ln - 1
    assert lines[idx].strip() == '{', (ln, lines[idx])
    lines = dedent_block(lines, idx)
    print('fixed block at', ln)
open(p, 'w').write('\n'.join(lines))
print('ok')
