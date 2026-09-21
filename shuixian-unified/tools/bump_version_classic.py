import io, os, re

ROOT = r'C:\Users\lianxiang\WorkBuddy\2026-07-23-09-09-54\shuixian-unified-0920'
CL = os.path.join(ROOT, 'classic')
OLD, NEW = '37', '38'
changed = []

# classic/js/base.js -> ASSET_VERSION
p = os.path.join(CL, 'js', 'base.js')
s = io.open(p, encoding='utf-8').read()
pat = re.compile(r"(ASSET_VERSION\s*=\s*')(\d+)(')")
s2 = pat.sub(lambda m: m.group(1) + NEW + m.group(3), s, count=1)
if s2 != s:
    io.open(p, 'w', encoding='utf-8', newline='').write(s2)
    changed.append('classic/js/base.js')

# classic/*.html 的 ?v=N
vpat = re.compile(r'\?v=' + OLD + r'(?!\d)')
for f in sorted(os.listdir(CL)):
    if not f.endswith('.html'):
        continue
    p = os.path.join(CL, f)
    s = io.open(p, encoding='utf-8').read()
    s2 = vpat.sub('?v=' + NEW, s)
    if s2 != s:
        io.open(p, 'w', encoding='utf-8', newline='').write(s2)
        changed.append('classic/' + f)

# classic 版有独立 sw.js 吗？
sw = os.path.join(CL, 'sw.js')
if os.path.isfile(sw):
    s = io.open(sw, encoding='utf-8').read()
    s2 = re.sub(r"VERSION\s*=\s*'[^']*'", "VERSION = 'sx-classic-v" + NEW + "'", s, count=1)
    s2 = vpat.sub('?v=' + NEW, s2)
    if s2 != s:
        io.open(sw, 'w', encoding='utf-8', newline='').write(s2)
        changed.append('classic/sw.js')

print('changed:', changed)
print()
s = io.open(os.path.join(CL, 'js', 'base.js'), encoding='utf-8').read()
print('classic ASSET_VERSION =', pat.search(s).group(2))
for f in sorted(os.listdir(CL)):
    if f.endswith('.html'):
        t = io.open(os.path.join(CL, f), encoding='utf-8').read()
        print('  %-16s %s' % (f, sorted(set(re.findall(r'\?v=(\d+)', t)))))
