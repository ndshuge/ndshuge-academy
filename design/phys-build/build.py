# -*- coding: utf-8 -*-
"""物理学院装配器（phys-academy）
UI 壳（CSS/DOM）统一来自 学院工厂/academy-shell（唯一源，勿在此重复定义）；
本文件只管物理院的真实内容接入：数据收集 + 引擎 + 渲染器 + 事件。

与 chip2 build.py 的差异：
  数据来源 = 本目录 content/phys-ch*.js（物理院数据自持，不从线上 html 抽）
"""
import io, os, re, glob

_HERE   = os.path.dirname(os.path.abspath(__file__))
DESIGN  = os.path.dirname(_HERE)                      # .../四学院/design
ACAD    = r'E:\Hanako\学习计划\学院工厂\academy-shell'
YANG    = os.path.join(DESIGN, '对齐样张-芯片学院-三Tab体验版.html')
OUT     = os.path.join(DESIGN, 'phys-preview.html')
SHELL_CSS   = os.path.join(ACAD, '_shell.css')
SHELL_DOM   = os.path.join(ACAD, '_shell.dom.html')
HONOR_CSS   = os.path.join(_HERE, '_honor.css')
CHAPTER_CSS = os.path.join(_HERE, '_chapter.css')
PRESS_CSS   = os.path.join(_HERE, '_press.css')
UI_CSS      = os.path.join(_HERE, '_ui.css')
DATA_DIR    = os.path.join(_HERE, 'content')

s = io.open(YANG, encoding='utf-8').read()

# ---------- 1) 公共壳注入（academy-shell 唯一源） ----------
INJECT_CSS = io.open(SHELL_CSS, encoding='utf-8').read()
INJECT_DOM = io.open(SHELL_DOM, encoding='utf-8').read()
si = s.find('</style>')
assert si > 0
s = s[:si] + INJECT_CSS + s[si:]
for _css, _tag in ((HONOR_CSS, 'honor'), (CHAPTER_CSS, 'chapter'), (PRESS_CSS, 'press'), (UI_CSS, 'ui')):
    if os.path.exists(_css):
        s = s[:si] + io.open(_css, encoding='utf-8').read() + s[si:]
        print(_tag + ' css injected')
if 'no-cache' not in s:
    s = s.replace('<meta charset="UTF-8">',
                  '<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">\n'
                  '<meta http-equiv="Pragma" content="no-cache">\n'
                  '<meta http-equiv="Expires" content="0">\n'
                  '<meta charset="UTF-8">')
assert '</body>' in s
s = s.replace('</body>', INJECT_DOM + '\n</body>')

# ---------- 2) script 段切点 ----------
i0 = s.find('<script>')
assert i0 > 0
sc = s[i0:]
demo_start = sc.find('/* ---------- 数据 ---------- */')
toast_pos  = sc.find('function toast')
rend_pos   = sc.find('var renderers={}')
sc_end     = sc.find('</script>')
assert 0 < demo_start < toast_pos < rend_pos < sc_end
A = s[:i0 + demo_start]
B = s[i0 + toast_pos : i0 + rend_pos]

# ---------- 3) 章节数据收集（content/phys-ch*.js，按章号排序） ----------
def ch_no(path):
    m = re.search(r'phys-ch(\d+)\.js$', os.path.basename(path))
    return int(m.group(1)) if m else 9999

files = sorted(glob.glob(os.path.join(DATA_DIR, 'phys-ch*.js')), key=ch_no)
assert files, 'no chapter data found in ' + DATA_DIR
CH_PARTS = []
ids = []
for f in files:
    txt = io.open(f, encoding='utf-8').read()
    CH_PARTS.append(txt.rstrip())
    for m in re.finditer(r'"id"\s*:\s*(\d+)', txt):
        ids.append(int(m.group(1)))
        break
# 构造 CHAPTERS 数组（引擎按 CHAPTERS 索引访问，数组元素为各章对象变量名）
var_names = []
for f in files:
    txt = io.open(f, encoding='utf-8').read()
    m = re.search(r'^var\s+(CH\w+)\s*=', txt, re.M)
    assert m, 'no var CHxx found in ' + f
    var_names.append(m.group(1))
CH_DATA = 'var CHAPTERS = [' + ','.join(var_names) + '];'
print('chapters:', len(var_names), ids)

ENGINE = io.open(os.path.join(_HERE, 'engine_core.js'), encoding='utf-8').read()
REND   = io.open(os.path.join(_HERE, 'renderers.js'), encoding='utf-8').read()
EVT    = io.open(os.path.join(_HERE, 'events.js'), encoding='utf-8').read()

# ---------- 4) 导师头像 ----------
import base64
tutor_img = None
for _ext in ('png', 'jpg', 'jpeg', 'webp'):
    _tp = os.path.join(_HERE, 'tutor.' + _ext)
    if os.path.exists(_tp) and os.path.getsize(_tp) < 500_000:
        tutor_img = _tp
        _mime = 'image/' + ('jpeg' if _ext == 'jpg' else _ext)
        break
fallback_svg = 'data:image/svg+xml;base64,' + base64.b64encode(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="22" fill="#0C84FF"/><circle cx="48" cy="36" r="16" fill="#fff"/><path d="M16 80c0-18 14-28 32-28s32 10 32 28z" fill="#fff"/></svg>'.encode('utf-8')).decode()
if tutor_img:
    b64 = base64.b64encode(io.open(tutor_img, 'rb').read()).decode()
    REND = REND.replace('TUTOR_IMG_PLACEHOLDER', 'data:' + _mime + ';base64,' + b64)
    print('tutor photo inlined (' + os.path.basename(tutor_img) + ')')
else:
    REND = REND.replace('TUTOR_IMG_PLACEHOLDER', fallback_svg)
    print('tutor svg fallback')

CLOUD = io.open(os.path.join(_HERE, 'cloud.js'), encoding='utf-8').read() if os.path.exists(os.path.join(_HERE, 'cloud.js')) else ''
C = '\n' + '\n'.join(CH_PARTS) + '\n' + CH_DATA + '\n' + ENGINE + '\n' + REND + '\n' + EVT + '\n' + CLOUD + '\n'
new = A + B + C + sc[sc_end:]

new = new.replace('</head>', "<script>\n(function(){\n  function block(ev){ if(ev.touches && ev.touches.length > 1){ ev.preventDefault(); } }\n  function blockG(ev){ ev.preventDefault(); }\n  document.addEventListener('touchmove', block, { passive: false });\n  document.addEventListener('gesturestart', blockG);\n  document.addEventListener('gesturechange', blockG);\n  document.addEventListener('gestureend', blockG);\n})();\n</script>\n" + '</head>', 1)
new = new.replace('<title>芯片学院 · 对齐样张 v2（iOS 26 玻璃语汇）</title>', '<title>大学物理学院 · 吴百诗《大学物理学》</title>')
# DOM 静态品牌区（样张写死芯片版，构建时院化）
new = new.replace('<b id="brandName">芯片战争学院</b><span>CHIP WAR ACADEMY</span>',
                  '<b id="brandName">大学物理学院</b><span>PHYSICS ACADEMY</span>')
new = new.replace('<b id="brandName">芯片战争学院</b>', '<b id="brandName">大学物理学院</b>')
new = new.replace('<span>CHIP WAR ACADEMY</span>', '<span>PHYSICS ACADEMY</span>')
io.open(OUT, 'w', encoding='utf-8', newline='').write(new)
print('OK ->', OUT, len(new))
