#!/usr/bin/env python3
"""
トロフィー・通知のフォント（2026-10-19・実装手順_トロフィー §6.1）を public/fonts に作る。
LIFF の WebView では Google Fonts が遅い・出ないことがあるので、使う字だけの subset を自前で配る。

  - PressStart2P-subset.woff2 … Latin（ASCII と ▲▼）だけ。見出し（TROPHY GET! など）用
  - DotGothic16-subset.woff2  … 今の subset（アリーナの数字）の字 ＋ トロフィー一覧の名前・条件・出典 ＋ 通知・一覧・詳細の文言
                                 ＋ 分野名 ＋ ASCII・ひらがな・カタカナ・記号。ニックネームの漢字など入っていない字は var(--f-jp) に落ちる
                                 ＋（2026-10-20 レトロ寄りの見た目）画面全体の文言 = src/ 以下のすべての .ts / .tsx の字（新しい画面を足したら
                                   もう一度実行すれば拾う）・カニの名前 729 種（gv-science-proxy/src/crabNames.js）

元フォント（OFL）は google/fonts の ofl/dotgothic16・ofl/pressstart2p から取る。必要: pip install fonttools brotli
使い方:
  python3 scripts/build-trophy-fonts.py --src <ttf の置き場> [--list <vault のトロフィー一覧.md>]
"""
import argparse
import glob
import json
import os
import re

from fontTools import subset
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FONTS = os.path.join(ROOT, 'public', 'fonts')
DEFAULT_LIST = os.path.expanduser('~/Documents/Claude/Projects/大学リサーチ+app/vault/GV Science/進捗チェックツリー/トロフィー一覧.md')
FIELDS = os.path.join(ROOT, '..', 'gv-science-proxy', 'tools', 'tree-content', 'fields')
CRABS = os.path.join(ROOT, '..', 'gv-science-proxy', 'src', 'crabNames.js')
BUILD = os.path.expanduser('~/Documents/GV問題PDF/_build/content')  # build.py の出力（R2 と同じ）。試験名・分野名の字を拾う

RANGES = [
    (0x20, 0x7E),      # ASCII
    (0x3000, 0x303F),  # 和文の記号・句読点
    (0x3040, 0x309F),  # ひらがな
    (0x30A0, 0x30FF),  # カタカナ
    (0xFF01, 0xFF5E),  # 全角英数・記号
]
EXTRA = '・—–…‥→←↑↓▲▼▶◀★☆♪×÷±°％／（）「」『』【】、。〜～·'


def chars_of_files(paths):
    out = set()
    for p in paths:
        with open(p, encoding='utf-8') as f:
            out |= set(f.read())
    return out


def cmap_chars(path):
    if not os.path.exists(path):
        return set()
    return {chr(c) for c in TTFont(path).getBestCmap()}


def make(src, dst, text):
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    font = subset.load_font(src, opts)
    sub = subset.Subsetter(opts)
    sub.populate(text=''.join(sorted(text)))
    sub.subset(font)
    subset.save_font(font, dst, opts)
    print(f'{os.path.basename(dst)}: {len(text)} 字 → {os.path.getsize(dst):,} bytes')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True, help='DotGothic16-Regular.ttf と PressStart2P-Regular.ttf の置き場')
    ap.add_argument('--list', default=DEFAULT_LIST, help='vault のトロフィー一覧.md')
    a = ap.parse_args()

    base = set(EXTRA)
    for lo, hi in RANGES:
        base |= {chr(c) for c in range(lo, hi + 1)}

    # DotGothic16
    dot = set(base)
    dot |= cmap_chars(os.path.join(FONTS, 'DotGothic16-subset.woff2'))  # 今の subset（アリーナ）の字を落とさない
    dot |= chars_of_files([a.list])
    dot |= chars_of_files(glob.glob(os.path.join(ROOT, 'src', 'screens', 'tree', 'trophy', '*.ts*')))
    dot |= chars_of_files(glob.glob(os.path.join(ROOT, 'src', 'screens', 'tree', 'fx', 'FxLabScreen.tsx')))
    dot |= chars_of_files(glob.glob(os.path.join(FIELDS, '*.json')))
    # 画面全体（2026-10-20）: src/ 以下の全 .ts / .tsx（コメントの字も入るが、ふつうに使う字なので問題ない）・カニの名前
    dot |= chars_of_files(glob.glob(os.path.join(ROOT, 'src', '**', '*.ts'), recursive=True))
    dot |= chars_of_files(glob.glob(os.path.join(ROOT, 'src', '**', '*.tsx'), recursive=True))
    dot |= chars_of_files([p for p in [CRABS] if os.path.exists(p)])
    # 試験名・分野名（2026-10-21: 結果画面の間違えた問題の見出しなどに出る「浜」などが無かった）。各科目・ABYSS の最新の版の manifest
    for d in glob.glob(os.path.join(BUILD, '*')) + glob.glob(os.path.join(BUILD, '*', 'back')):
        vs = sorted(glob.glob(os.path.join(d, 'v*', 'manifest.json')))
        if vs:
            with open(vs[-1], encoding='utf-8') as f:
                m = json.load(f)
            dot |= set(m.get('name') or '')
            for e in m.get('exams') or []:
                dot |= set(str(e.get('exam') or ''))
            for fl in m.get('fields') or []:
                dot |= set(str(fl.get('name') or ''))
    # 制御文字・サロゲート・私用領域・BMP の外（絵文字など。フォントに無い）は除く
    # （2026-10-21 修正: 前は ord(c) < 0xE000 で、全角英数・記号 U+FF01〜FF5E の（）！？％ なども落としていた）
    dot = {c for c in dot if c >= ' ' and not (0xD800 <= ord(c) <= 0xDFFF) and not (0xE000 <= ord(c) <= 0xF8FF) and ord(c) <= 0xFFFF}
    make(os.path.join(a.src, 'DotGothic16-Regular.ttf'), os.path.join(FONTS, 'DotGothic16-subset.woff2'), dot)

    # Press Start 2P（Latin だけ）
    # ▶ = LEVEL 30 の「TAP ▶」（2026-10-19）。レトロ寄りの見た目（2026-10-20）で数字・%・/・:・,・+・→ も Press Start 2P（→ は元フォントに無ければ落ちる）
    ps = {chr(c) for c in range(0x20, 0x7F)} | set('▲▼·▶◀→×')
    make(os.path.join(a.src, 'PressStart2P-Regular.ttf'), os.path.join(FONTS, 'PressStart2P-subset.woff2'), ps)


if __name__ == '__main__':
    main()
