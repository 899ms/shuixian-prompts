# -*- coding: utf-8 -*-
"""生成 data/pinyin.json —— 「汉字 -> 拼音首字母」映射表。

用途：前端做拼音首字母检索（输入 sbpk 命中「赛博朋克」）。
只收录数据集中实际出现的汉字，体积极小；新增条目只要复用已有汉字即可自动命中。

用法：
  python tools/build_pinyin.py            # 重建 <项目>/data/pinyin.json
  python tools/build_pinyin.py --check    # 只报告覆盖率，不写文件
"""
import json, os, sys, re, collections

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "data")
OUT = os.path.join(DATA, "pinyin.json")
CHECK = "--check" in sys.argv

CJK = re.compile(r"[\u4e00-\u9fff]")

def load_records():
    recs = []
    for i in (1, 2, 3):
        p = os.path.join(DATA, f"prompts.part{i}.json")
        if os.path.exists(p):
            recs += json.load(open(p, encoding="utf-8"))
    if not recs:  # 回退：本地编辑副本
        alt = os.path.join(ROOT, "..", "local-demo", "data", "prompts-all.json")
        if os.path.exists(alt):
            recs = json.load(open(alt, encoding="utf-8"))
    return recs

def main():
    recs = load_records()
    if not recs:
        print("找不到数据源"); sys.exit(1)

    chars = collections.Counter()
    for r in recs:
        text = (r.get("title") or "") + " " + (r.get("category") or "")
        for ch in CJK.findall(text):
            chars[ch] += 1

    try:
        from pypinyin import pinyin, Style
    except ImportError:
        print("缺少 pypinyin，请先安装：pip install pypinyin"); sys.exit(2)

    table = {}
    for ch in sorted(chars):
        res = pinyin(ch, style=Style.FIRST_LETTER, errors="ignore")
        ini = (res[0][0] if res and res[0] else "").lower()
        if ini and ini.isalpha():
            table[ch] = ini

    payload = {
        "chars": table,
        "count": len(table),
        "source_total": len(recs),
    }

    print(f"数据条目: {len(recs)}  唯一汉字: {len(chars)}  已映射首字母: {len(table)}")
    missing = [c for c in chars if c not in table]
    if missing:
        print(f"未能映射({len(missing)}): {''.join(missing[:40])}")

    if CHECK:
        print("[check] 未写文件"); return

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    size = os.path.getsize(OUT)
    print(f"已写入 {OUT}  ({size/1024:.1f} KB)")

if __name__ == "__main__":
    main()
