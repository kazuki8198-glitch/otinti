#!/usr/bin/env python3
"""
辞書データ生成ツール（開発者向け・通常は実行不要）

  python3 tools/build_data.py <EJDict の src ディレクトリ>
  node tools/build-dict.js

1. EJDict-hand（パブリックドメイン/CC0 の英和辞書）を読み込む
2. tools/supplement.tsv（EJDict にない現代語などの自作訳）を追加
3. wordfreq（頻度データ, CC BY-SA 4.0）の上位語について、変化形→原形の対応を決める
   （lemminflect で候補を出し、下の KEEP_* / MANUAL で人手調整）
4. 原形ごとに変化形の頻度を合算して頻度順位を付ける
5. tools/.build/intermediate.json に書き出す → build-dict.js が dict.js を作る

必要: pip install wordfreq lemminflect
"""
import glob
import json
import os
import re
import sys

from lemminflect import getAllLemmas
from wordfreq import top_n_list, word_frequency

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, '.build')
TOP_N = 100000

# ---------------------------------------------------------------------------
# 人手で決めた例外
# ---------------------------------------------------------------------------
# 見出し語として独立した意味が重要な -ing 形（それ以外の -ing 形は動詞の原形へまとめる）
KEEP_ING = set('''
including following building according training meeting feeling amazing missing beginning interesting
leading meaning evening understanding engineering marketing housing setting existing willing ending
shopping regarding painting warning drawing mining advertising exciting shipping recording surrounding
clothing parking rating boring annoying gaming concerning accounting lighting surprising challenging
stunning disgusting ranking heating boxing dressing underlying embarrassing screening encouraging wrestling
corresponding demanding engaging fascinating entertaining lasting promising cycling shocking gambling
overwhelming charming blessing consulting bowling freezing inspiring confusing disappointing diving
reasoning camping spelling convincing appealing terrifying satisfying excluding misleading relaxing
counseling hiking neighboring booking devastating skiing inning refreshing neighbouring seating amusing
pleasing briefing dwelling preceding rewarding imposing owing schooling awakening surfing undertaking
coating winding daring insulting misunderstanding greeting swelling astonishing enduring frightening
gardening tempting conflicting irritating thrilling outgoing plumbing piercing craving fencing topping
prevailing wording stimulating alarming impending wiring haunting zoning curling adjoining footing longing
staggering icing siding stocking stuffing appalling humiliating counselling knitting soothing barring
lodging lingering seeming spacing bedding startling dazzling jogging parting gripping casing engraving
glaring sickening budding flooring reckoning seasoning dashing railing accommodating towering yearning
roofing discouraging illuminating damning distressing lettering molding menacing padding captivating
bustling loathing enchanting plating baffling endearing etching aggravating exhilarating condescending
ironing scaffolding overriding foregoing scorching whiting forbidding gratifying harrowing suffocating
frosting stinking resounding alluring discerning angling revolting sparing agonizing inquiring riveting
blistering deafening homing overpowering rousing shoplifting supposing stifling exacting searing
overbearing strapping befitting shelving moulding bewildering mooring nourishing middling withering
excepting bumbling maddening patronizing inbreeding webbing engrossing anything everything something
nothing thing during morning ceiling wedding king ring spring string sibling darling pudding herring
shilling awning duckling seedling sapling dumpling earring offspring
'''.split())

# 形容詞として独立した意味が重要な -ed 形
KEEP_ED = set('''
related married interested supposed located concerned excited advanced tired surprised determined
experienced complicated confused qualified pleased disappointed educated satisfied sophisticated
depressed skilled delighted exhausted crowded amazed gifted relieved talented embarrassed scared bored
annoyed frightened worried shocked stressed relaxed beloved naked wicked sacred rugged ragged dogged
jagged crooked wretched learned aged blessed devoted dedicated distinguished renowned unprecedented
assorted beloved deceased detailed limited sophisticated varied biased tangled ashamed alleged
retarded handicapped disabled privileged accustomed inclined spirited contented prejudiced
'''.split())

# 複数形などで独自の意味をもつ語
KEEP_S = set('''
news clothes goods pants physics graphics mechanics shorts scissors optics summons commons cheers
whoops amends shambles bellows harmonics tongs slacks grits statistics teens wales mars politics
economics electronics mathematics athletics ethics species series means glasses arms thanks savings
belongings surroundings premises outskirts headquarters remains congratulations sometimes always
perhaps besides afterwards nowadays upwards downwards backwards its yes this thus plus bus gas us his
hers ours yours theirs whereas unless lens bonus status virus campus focus census chaos
'''.split())

# 比較級に見えるが別の語、または比較級でも独立して覚えたい語
KEEP_OTHER = set('''
number real crew feed data media opera dive chile chili chilli gel cola stove dove algae stamina clove
hiccup whiz fulfill fulfil instill instil forgo forego okay better best worse worst more most less least
later latest further furthest farther farthest elder eldest stranger flatter bit ground born lay rose
stuck bound rent bore abode left wound hidden overlay unbound tanner trimmer flipper slacker
tender corner water paper letter matter order under over after never ever other another rather whether
either neither together finger summer winter
'''.split())

# 短縮形の断片などで、単語として順位を付けない語
NOT_WORDS = {'re', 've', 'll', 'st', 'nd', 'rd', 'th', 'em', 'ya'}

# 変化形 → 原形 を直接指定
MANUAL = {
    'am': 'be', 'are': 'be', 'were': 'be', 'being': 'be', 'having': 'have', 'doing': 'do',
    'saw': 'see', 'found': 'find', 'felt': 'feel', 'lives': 'live', 'leaves': 'leave', 'thought': 'think',
    'skied': 'ski', 'fed': 'feed', 'led': 'lead', 'lit': 'light', 'met': 'meet', 'spent': 'spend',
    'sent': 'send', 'built': 'build', 'meant': 'mean', 'learnt': 'learn', 'halves': 'half',
    'woke': 'wake', 'lower': 'low', 'greater': 'great', 'younger': 'young', 'lowest': 'low',
    'lighter': 'light', 'cleaner': 'clean', 'cooler': 'cool', 'warmer': 'warm', 'fresher': 'fresh',
    'sharper': 'sharp', 'thinner': 'thin', 'fitter': 'fit', 'fuller': 'full', 'damper': 'damp',
    'commoner': 'common', 'dearest': 'dear', 'axes': 'axis', 'analyses': 'analysis', 'bases': 'base',
    'crises': 'crisis', 'theses': 'thesis', 'hypotheses': 'hypothesis', 'diagnoses': 'diagnosis',
    'children': 'child', 'people': 'people', 'women': 'woman', 'men': 'man', 'teeth': 'tooth',
    'thanks': 'thanks', 'uses': 'use', 'needs': 'need', 'means': 'mean', 'times': 'time', 'days': 'day',
    'studied': 'study', 'received': 'receive', 'considered': 'consider', 'decided': 'decide',
    'placed': 'place', 'picked': 'pick', 'ordered': 'order', 'collected': 'collect', 'agreed': 'agree',
    'noted': 'note', 'stated': 'state', 'covered': 'cover', 'forced': 'force', 'charged': 'charge',
    'wearing': 'wear', 'telling': 'tell', 'seeing': 'see', 'knowing': 'know', 'trying': 'try',
    'others': 'other', 'ones': 'one',
}

INFL_RE = re.compile(r'^[(（]?\s*([A-Za-z\-\']+(?:\s*,\s*[A-Za-z\-\']+)*)\s*の(?:一人称|二人称|三人称|3人称|直説法)?.{0,12}?(?:過去分詞|過去|複数|比較級|最上級|現在分詞|三人称|3人称|三単現|動名詞|現在形)')


def load_ejdict(src_dir):
    """lowercase headword -> {'h': 表記, 'm': 意味, 'proper': bool}"""
    d = {}
    for f in sorted(glob.glob(os.path.join(src_dir, '*.txt'))):
        with open(f, encoding='utf-8') as fh:
            for line in fh:
                line = line.rstrip('\n')
                if '\t' not in line:
                    continue
                hw, mean = line.split('\t', 1)
                variants = [h.strip() for h in hw.split(',') if h.strip()]
                has_lower = any(h == h.lower() for h in variants)
                for h in variants:
                    if not re.fullmatch(r"[A-Za-z][A-Za-z'\-]*", h):
                        continue  # 句・記号・略語は対象外
                    key = h.lower()
                    proper = not has_lower
                    if key in d:
                        prev = d[key]
                        if prev['proper'] and not proper:
                            d[key] = {'h': key, 'm': mean + ' / ' + prev['m'], 'proper': False}
                        elif mean not in prev['m']:
                            prev['m'] = prev['m'] + ' / ' + mean if not proper or prev['proper'] else prev['m']
                    else:
                        d[key] = {'h': h, 'm': mean, 'proper': proper}
    return d


def load_supplement(path):
    sup = {}
    with open(path, encoding='utf-8') as fh:
        for line in fh:
            line = line.rstrip('\n')
            if not line or line.startswith('#'):
                continue
            w, m = line.split('\t', 1)
            sup[w.strip().lower()] = m.strip()
    return sup


def infl_base(mean):
    first = mean.split(' / ')[0]
    m = INFL_RE.match(first)
    if not m:
        return None
    return [x.strip().lower() for x in m.group(1).split(',')]


def suffix_class(w):
    if w.endswith('ing'):
        return 'ing'
    if w.endswith('ed'):
        return 'ed'
    if w.endswith('s'):
        return 's'
    if w.endswith('er') or w.endswith('est'):
        return 'er'
    return 'other'


POS_PREF = {
    'ing': ['VERB', 'NOUN', 'ADJ'],
    'ed': ['VERB', 'ADJ', 'NOUN'],
    's': ['NOUN', 'VERB', 'ADJ', 'ADV'],
    'er': ['ADJ', 'ADV', 'VERB', 'NOUN'],
    'other': ['VERB', 'NOUN', 'ADJ', 'ADV', 'AUX'],
}

# public/js/core.js の ruleCandidates と同じ規則（lemminflect が知らない語の補完用）
MONO_CVC = re.compile(r'^[^aeiouy]*[aeiou][^aeiouwxy]$')


def _stem_candidates(s, out):
    if len(s) < 2:
        return
    if MONO_CVC.match(s):
        out += [s + 'e', s]
    else:
        out += [s, s + 'e']
    if len(s) >= 3 and s[-1] == s[-2] and s[-1] not in 'aeiou':
        out.append(s[:-1])


def rule_candidates(w):
    out = []
    n = len(w)
    if n < 4:
        return out
    if w.endswith('ies'):
        out += [w[:-1], w[:-3] + 'y']
    elif w.endswith('ied'):
        out += [w[:-1], w[:-2], w[:-3] + 'y']
    elif w.endswith('es'):
        out += [w[:-1], w[:-2]]
        if w.endswith('ves'):
            out += [w[:-3] + 'f', w[:-3] + 'fe']
    elif w.endswith('s') and not re.search(r'(ss|us|is)$', w):
        out.append(w[:-1])
    elif w.endswith('ing') and n >= 5:
        if w.endswith('ying'):
            out.append(w[:-4] + 'ie')
        _stem_candidates(w[:-3], out)
    elif w.endswith('ed'):
        _stem_candidates(w[:-2], out)
    elif re.search(r'(ier|iest)$', w):
        out.append(re.sub(r'(ier|iest)$', 'y', w))
    elif w.endswith('est') and n >= 6:
        _stem_candidates(w[:-3], out)
    elif w.endswith('er') and n >= 5:
        _stem_candidates(w[:-2], out)
    elif w.endswith('ily'):
        out.append(w[:-3] + 'y')
    elif w.endswith('ally'):
        out += [w[:-4], w[:-2]]
    elif w.endswith('ly') and n >= 5:
        out += [w[:-2], w[:-1] + 'e', w[:-2] + 'e']
    return [c for c in out if len(c) >= 2 and c != w]


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    D = load_ejdict(sys.argv[1])
    sup = load_supplement(os.path.join(HERE, 'supplement.tsv'))
    for w, m in sup.items():
        if m.startswith('+') and w in D:
            D[w] = {'h': w, 'm': m[1:] + ' / ' + D[w]['m'], 'proper': False, 'sup': True}
        else:
            D[w] = {'h': w, 'm': m.lstrip('+'), 'proper': False, 'sup': True}
    print('headwords:', len(D), '(supplement', len(sup), ')')

    forms = [w for w in top_n_list('en', TOP_N) if re.fullmatch(r"[a-z]+(?:-[a-z]+)*", w)]
    print('wordfreq forms:', len(forms))

    def is_substantive(w):
        e = D.get(w)
        return bool(e) and not infl_base(e['m'])

    def desired(w):
        if w in MANUAL:
            return MANUAL[w] if MANUAL[w] in D else (w if w in D else None)
        if (w in KEEP_ING or w in KEEP_ED or w in KEEP_S or w in KEEP_OTHER) and w in D:
            return w
        e = D.get(w)
        if e and not e.get('sup'):
            base = infl_base(e['m'])
            if base:
                for b in base:
                    if b in D and b != w:
                        return b
        if e and e.get('sup'):
            return w
        lem = getAllLemmas(w)
        cls = suffix_class(w)
        cands = []
        for pos in POS_PREF[cls]:
            ls = [l for l in lem.get(pos, ()) if l != w and l in D and not D[l]['proper']]
            ls.sort(key=lambda l: -word_frequency(l, 'en'))
            for l in ls:
                if l not in cands:
                    cands.append(l)
        if not cands and w not in D:
            # lemminflect が知らない語（counties, eventually など）は規則で補う
            for c in rule_candidates(w):
                if c in D and not D[c]['proper']:
                    return c
            return None
        if not cands:
            return w
        if is_substantive(w):
            # 見出し語が自前の意味をもつ場合は、規則変化(-s/-ed/-ing)のみ原形へまとめる
            if cls in ('ing', 'ed', 's'):
                return cands[0]
            return w
        return cands[0]

    lemma_of = {}
    for w in forms:
        l = desired(w)
        if l is not None:
            lemma_of[w] = l
    # 連鎖の解決（findings → finding → find など）
    for w in list(lemma_of):
        l = lemma_of[w]
        for _ in range(3):
            nxt = lemma_of.get(l)
            if nxt is None or nxt == l:
                break
            l = nxt
        lemma_of[w] = l

    freq = {}
    for w, l in lemma_of.items():
        freq[l] = freq.get(l, 0.0) + word_frequency(w, 'en')
    ranked = [l for l in sorted(freq, key=lambda x: -freq[x])
              if l in D and not D[l]['proper'] and len(l) >= 2 and l not in NOT_WORDS]
    print('ranked lemmas:', len(ranked))

    os.makedirs(OUT_DIR, exist_ok=True)
    out = {
        'entries': {k: {'h': v['h'], 'm': v['m'], 'p': v['proper'], 'sup': v.get('sup', False)} for k, v in D.items()},
        'ranked': ranked,
        'lemmaOf': lemma_of,
    }
    with open(os.path.join(OUT_DIR, 'intermediate.json'), 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False)
    print('wrote', os.path.join(OUT_DIR, 'intermediate.json'))


if __name__ == '__main__':
    main()
