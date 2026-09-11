# -*- coding: utf-8 -*-
"""chip2（芯片院样张真版）装配器
UI 壳（CSS/DOM）统一来自 学院工厂/academy-shell（唯一源，勿在此重复定义）；
本文件只管 chip 院的真实内容接入：数据抽取 + 引擎 + 渲染器 + 事件。
"""
import io, re, os

_HERE   = os.path.dirname(os.path.abspath(__file__))
DESIGN  = os.path.dirname(_HERE)                      # .../四学院/design
ACAD    = r'E:\Hanako\学习计划\学院工厂\academy-shell'
YANG    = os.path.join(DESIGN, '对齐样张-芯片学院-三Tab体验版.html')
CHIP    = os.path.join(os.path.dirname(DESIGN), 'chip.html')
OUT     = os.path.join(DESIGN, 'chip2-真版-预览.html')
SHELL_CSS = os.path.join(ACAD, '_shell.css')
SHELL_DOM = os.path.join(ACAD, '_shell.dom.html')
HONOR_CSS = os.path.join(_HERE, '_honor.css')
CHAPTER_CSS = os.path.join(_HERE, '_chapter.css')
PRESS_CSS = os.path.join(_HERE, '_press.css')
UI_CSS = os.path.join(_HERE, '_ui.css')

s = io.open(YANG, encoding='utf-8').read()
c = io.open(CHIP, encoding='utf-8').read()

# ---------- 1) 公共壳注入（academy-shell 唯一源） ----------
INJECT_CSS = io.open(SHELL_CSS, encoding='utf-8').read()
INJECT_DOM = io.open(SHELL_DOM, encoding='utf-8').read()
si = s.find('</style>')
assert si > 0
s = s[:si] + INJECT_CSS + s[si:]
# 内容级模块 CSS（整块移用自旧版，作用域化，不影响其它页）
if os.path.exists(HONOR_CSS):
    s = s[:si] + io.open(HONOR_CSS, encoding='utf-8').read() + s[si:]
    print('honor css injected')
if os.path.exists(CHAPTER_CSS):
    s = s[:si] + io.open(CHAPTER_CSS, encoding='utf-8').read() + s[si:]
    print('chapter css injected')
if os.path.exists(PRESS_CSS):
    s = s[:si] + io.open(PRESS_CSS, encoding='utf-8').read() + s[si:]
    print('press css injected')
if os.path.exists(UI_CSS):
    s = s[:si] + io.open(UI_CSS, encoding='utf-8').read() + s[si:]
    print('ui css injected')
if 'no-cache' not in s:
    s = s.replace('<meta charset="UTF-8">',
                  '<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">\n<meta http-equiv="Pragma" content="no-cache">\n<meta http-equiv="Expires" content="0">\n<meta charset="UTF-8">')
assert '</body>' in s
s = s.replace('</body>', INJECT_DOM + '\n</body>')

# ---------- 2) script 段切点（相对 <script> 起，CSS 注入不影响） ----------
i0 = s.find('<script>')
assert i0 > 0
sc = s[i0:]
demo_start = sc.find('/* ---------- 数据 ---------- */')
toast_pos   = sc.find('function toast')
rend_pos    = sc.find('var renderers={}')
sc_end      = sc.find('</script>')
assert 0 < demo_start < toast_pos < rend_pos < sc_end

A = s[:i0 + demo_start]                       # 样张头：图标库 / mountStaticIcons
B = s[i0 + toast_pos : i0 + rend_pos]         # 样张基座：toast/tap/renderView/go/goBack/paintDock

# ---------- 3) chip 真实数据（CHAPTERS，引号感知配对） ----------
ci = c.find('var CHAPTERS = [')
assert ci > 0
depth = 0; k = ci + len('var CHAPTERS = ')
inq = None; escp = False
seg2 = c[k:]
for idx, ch in enumerate(seg2):
    if inq:
        if escp: escp = False
        elif ch == '\\': escp = True
        elif ch == inq: inq = None
        continue
    if ch in ('"', "'"): inq = ch
    elif ch == '[': depth += 1
    elif ch == ']':
        depth -= 1
        if depth == 0:
            k = ci + len('var CHAPTERS = ') + idx + 1
            break
CH_DATA = c[ci:k].rstrip()
print('CHAPTERS chars:', len(CH_DATA))

ENGINE = io.open(os.path.join(_HERE, 'engine_core.js'), encoding='utf-8').read()
REND   = io.open(os.path.join(_HERE, 'renderers.js'), encoding='utf-8').read()
EVT    = io.open(os.path.join(_HERE, 'events.js'), encoding='utf-8').read()

# ---------- 4) 导师头像：低分辨率小图内联；无图则 SVG 剪影兜底 ----------
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
C = '\n' + CH_DATA + '\n' + ENGINE + '\n' + REND + '\n' + EVT + '\n' + CLOUD + '\n'
if CLOUD:
    print('cloud.js injected')
new = A + B + C + sc[sc_end:]
# 产物后处理：手势拦截 + 标题品牌
new = new.replace('</head>', "<script>\n(function(){\n  function block(ev){ if(ev.touches && ev.touches.length > 1){ ev.preventDefault(); } }\n  function blockG(ev){ ev.preventDefault(); }\n  document.addEventListener('touchmove', block, { passive: false });\n  document.addEventListener('gesturestart', blockG);\n  document.addEventListener('gesturechange', blockG);\n  document.addEventListener('gestureend', blockG);\n  var _lastT=0;\n  document.addEventListener('touchend', function(ev){\n    var now=Date.now();\n    if(now-_lastT<350){ ev.preventDefault(); }\n    _lastT=now;\n  }, { passive: false });\n})();\n</script>\n" + '</head>', 1)
new = new.replace('<title>芯片学院 · 对齐样张 v2（iOS 26 玻璃语汇）</title>', '<title>芯片战争学院 · 半导体七十年</title>')
io.open(OUT, 'w', encoding='utf-8', newline='').write(new)
print('OK ->', OUT, len(new))
