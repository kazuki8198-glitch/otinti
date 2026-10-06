#!/usr/bin/env python3
# Both games as text an AI chat (ChatGPT, Claude, Gemini...) can read: the code without its embedded data (terrain
# elevation in base64, airport / place-name tables), split into parts small enough to upload or paste, with an overview
# per game (what it is, how the code is laid out, what was left out) and one zip of everything.
#   python3 tools/llm_export.py            -> llm/ (and llm/otinti-llm.zip)
import os, re, sys, zipfile, datetime, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'llm')
PART = 180_000          # characters per part (about 50-60k tokens: one part fits any current chat model's window)
LONG = 3000             # a line longer than this is data: kept as its start and end only
B64 = re.compile(r'[A-Za-z0-9+/=]{1000,}')

GAMES = [
    {'key': 'flight-sim', 'src': 'flight-sim.html', 'name': 'フライトシミュレータ（空島フライト）',
     'about': '日本全国（国土地理院の標高）と世界（Terrain Tiles）の地形の上を飛ぶ、ブラウザだけで動くフライトシミュレータ。'
              'WebGL2 を直接使う（ライブラリなし）。機体ごとの物理、空港と滑走路、計器、雲、リングコース、教科書と AI の解説を含む。'
              'ファイル 1 つ（flight-sim.html）で完結し、データもその中に埋め込まれている。',
     'extra': []},
    {'key': 'drive-game', 'src': 'plateau-three.html', 'name': '操縦（ドライブ）ゲーム（横浜・関内〜東神奈川）',
     'about': '国土交通省 PLATEAU の 3D 都市モデル（建物）と、PLATEAU 道路・OSM・国土地理院の標高から作った道路と地面の上を、'
              '車で走るゲーム。three.js r180 と 3d-tiles-renderer を使う。写真のない建物は近くで窓・扉・ベランダ・外構付きの'
              '建物に作り直す。道路データは tools/area_a/ の Python で作り、models/area/ のバイナリとして読み込む。',
     'extra': ['docs/yokohama-drive/PROGRESS.md', 'tools/area_a', 'tools/bld', 'tools/browser']},
]


def slim(text):
    """The code with its data left out; returns (text, notes on what was left out)."""
    notes = []
    def b64(m):
        notes.append(('base64', len(m.group(0))))
        return f'<<省略: base64 のデータ {len(m.group(0)):,} 文字>>'
    text = B64.sub(b64, text)
    out = []
    for i, line in enumerate(text.split('\n'), 1):
        if len(line) > LONG:
            head = line[:1200]; name = re.match(r'\s*(?:const|let|var)?\s*([A-Za-z_$][\w$.]*)', line)
            notes.append(('line', len(line), i, name.group(1) if name else '?'))
            line = f'{head} /* <<省略: 元の {i} 行目はデータで {len(line):,} 文字。最初の 1,200 文字だけ残した>> */'
        out.append(line)
    return '\n'.join(out), notes


def sections(text):
    """The code's own section headings ('// ---- x ----', or the line under a '// =====' rule), with line numbers."""
    L = text.split('\n'); res = []
    for i, l in enumerate(L, 1):
        s = l.strip()
        if re.match(r'//\s*-{3,}\s*\S', s): res.append((i, s.strip('/ -')[:110]))
        elif re.fullmatch(r'//\s*={10,}', s) and i < len(L):
            nxt = L[i].strip()
            if nxt.startswith('//') and not re.fullmatch(r'//\s*={10,}', nxt): res.append((i + 1, nxt.strip('/ ')[:110]))
    return res


def split_parts(text, size):
    lines = text.split('\n'); parts, cur, n, start = [], [], 0, 1
    for i, l in enumerate(lines, 1):
        if n + len(l) + 1 > size and cur:
            parts.append((start, i - 1, '\n'.join(cur))); cur, n, start = [], 0, i
        cur.append(l); n += len(l) + 1
    if cur: parts.append((start, len(lines), '\n'.join(cur)))
    return parts


def tok(n): return f'約 {round(n / 3 / 1000):,}k トークン'   # (a rough guide: code and Japanese, ~3 characters a token)


def main():
    rev = subprocess.run(['git', '-C', ROOT, 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip() or '?'
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        p = os.path.join(OUT, f)
        if os.path.isdir(p):
            for g in os.listdir(p): os.remove(os.path.join(p, g))
        else: os.remove(p)
    index = []
    for g in GAMES:
        src = open(os.path.join(ROOT, g['src']), encoding='utf-8').read()
        text, notes = slim(src)
        d = os.path.join(OUT, g['key']); os.makedirs(d, exist_ok=True)
        parts = split_parts(text, PART)
        files = []
        for k, (a, b, body) in enumerate(parts, 1):
            fn = f"{g['key']}.part{k:02d}.txt" if len(parts) > 1 else f"{g['key']}.code.txt"
            head = f"# {g['src']} の {k}/{len(parts)} 部分（元の {a}〜{b} 行目、データは省略）\n# 全体の説明は 00_overview.md\n\n"
            open(os.path.join(d, fn), 'w', encoding='utf-8').write(head + body + '\n')
            files.append((fn, a, b, len(body)))
        # the same, as one file (for chats that take a long file, or a code interpreter)
        open(os.path.join(d, f"{g['key']}.slim.html"), 'w', encoding='utf-8').write(text)
        extra_files = []
        for e in g['extra']:
            pe = os.path.join(ROOT, e)
            if os.path.isdir(pe):
                chunks = []
                for fn in sorted(os.listdir(pe)):
                    if fn.endswith(('.py', '.js', '.sh', '.md')):
                        chunks.append(f'\n\n===== {e}/{fn} =====\n' + open(os.path.join(pe, fn), encoding='utf-8').read())
                if chunks:
                    name = 'tools_' + e.replace('/', '_').replace('tools_', '') + '.txt'
                    open(os.path.join(d, name), 'w', encoding='utf-8').write(f'# {e}/ のスクリプト（{len(chunks)} 本）\n' + ''.join(chunks))
                    extra_files.append((name, f'{e}/ のスクリプト {len(chunks)} 本', sum(len(c) for c in chunks)))
            elif os.path.exists(pe):
                name = os.path.basename(e); body = open(pe, encoding='utf-8').read()
                open(os.path.join(d, name), 'w', encoding='utf-8').write(body)
                extra_files.append((name, e, len(body)))
        secs = sections(src)
        omitted = sum(n[1] for n in notes)
        ov = [f"# {g['name']}", '', g['about'], '',
              f"- 元のファイル: `{g['src']}`（{len(src):,} 文字、{src.count(chr(10)) + 1:,} 行）。書き出した版: {rev}（{datetime.date.today()}）",
              f"- このフォルダのコード: {len(text):,} 文字（{tok(len(text))}）。省略したデータ: {omitted:,} 文字", '',
              '## AI に読ませるとき', '',
              '- まずこの `00_overview.md` を渡し、続けて部分ファイルを順に渡す（1 つの会話に全部入らないときは、聞きたい所の部分だけでよい。下の表に各部分の行範囲と、行番号つきの見出しがある）。',
              f"- ファイル 1 つで渡したいときは `{g['key']}.slim.html`（データを省いた全体）。ChatGPT のコード実行（Advanced Data Analysis）なら、`llm/otinti-llm.zip` をそのまま渡して中を読ませてもよい。",
              '- 省略した所には `<<省略: …>>` と書いてある。データの中身（地形の標高、空港の一覧など）が要る質問には答えられない。', '',
              '## 部分ファイル', '', '| ファイル | 元の行 | 大きさ |', '|---|---|---|']
        ov += [f'| `{fn}` | {a:,}〜{b:,} | {n:,} 文字（{tok(n)}） |' for fn, a, b, n in files]
        if extra_files:
            ov += ['', '## 関連ファイル（ゲームの外の、データを作るスクリプトと記録）', '', '| ファイル | 内容 | 大きさ |', '|---|---|---|']
            ov += [f'| `{fn}` | {what} | {n:,} 文字 |' for fn, what, n in extra_files]
        ov += ['', '## 省略したデータ', '']
        for n in notes:
            ov.append(f'- base64 のデータ {n[1]:,} 文字' if n[0] == 'base64' else f'- {n[2]:,} 行目 `{n[3]}`: {n[1]:,} 文字（先頭 1,200 文字だけ残した）')
        if not notes: ov.append('- なし')
        ov += ['', '## コードの見出し（元のファイルの行番号）', '']
        ov += [f'- {i:,}: {t}' for i, t in secs] or ['- （見出しなし）']
        open(os.path.join(d, '00_overview.md'), 'w', encoding='utf-8').write('\n'.join(ov) + '\n')
        index.append((g, len(text), len(files)))
    rd = ['# AI チャットに読ませる用の書き出し', '',
          'フライトシミュレータと操縦（ドライブ）ゲームのコードを、ChatGPT・Claude・Gemini などに渡せる形にしたもの。',
          f'`python3 tools/llm_export.py` で作り直せる（コードを変えたら作り直す）。書き出した版: {rev}。', '',
          '| フォルダ | ゲーム | コードの大きさ | 部分ファイル |', '|---|---|---|---|']
    rd += [f"| `{g['key']}/` | {g['name']} | {n:,} 文字（{tok(n)}） | {k} |" for g, n, k in index]
    rd += ['', '## 使い方', '',
           '1. 使う側のフォルダの `00_overview.md` を最初に渡す（何のゲームか、コードの地図、省略した物が書いてある）。',
           '2. 続けて `*.partNN.txt` を番号順に渡す。1 つの会話に入りきらないときは、聞きたい所の部分だけ渡す。',
           '3. まとめて 1 つで渡すなら `otinti-llm.zip`（両方のゲーム、全ファイル入り）。ChatGPT ではファイルの添付から渡せる。', '',
           '## 入っていない物', '',
           '- 3D モデル（`models/` の .glb）、テクスチャ、道路・地面のバイナリ（`models/area/*.bin`）、画像。AI は中を読めないので外した。',
           '- フライトシミュレータの埋め込みデータ（地形の標高 約 1,000 万文字、空港・地名の一覧）。印だけ残した。',
           '- API キーは元のコードにも入っていない（利用者がブラウザに入力し、ブラウザの中だけに保存する作り）。']
    open(os.path.join(OUT, 'README.md'), 'w', encoding='utf-8').write('\n'.join(rd) + '\n')
    zp = os.path.join(OUT, 'otinti-llm.zip')
    with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
        for base, _, fs in os.walk(OUT):
            for fn in sorted(fs):
                p = os.path.join(base, fn)
                if p != zp: z.write(p, os.path.relpath(p, OUT))
    for base, _, fs in os.walk(OUT):
        for fn in sorted(fs): print(f'{os.path.getsize(os.path.join(base, fn)):>10,}  {os.path.relpath(os.path.join(base, fn), ROOT)}')


if __name__ == '__main__':
    main()
