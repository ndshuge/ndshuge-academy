# -*- coding: utf-8 -*-
"""物理学院 · 四件套院化准备脚本

用途：以 chip2-build（已定稿样板）为源，生成物理院版本的
engine_core.js / renderers.js / events.js / cloud.js + 内容级 CSS。

【重要 · 幂等与保护】
- 目标文件若已存在（即 phys-build 里已是院化定稿版），**默认跳过拷贝**，
  只做替换校验，不会把芯片版拷回来覆盖手工修改。
- 需要强制从 chip2-build 重建时，加参数 --force。
- 日常改文案请直接编辑四件套；本脚本是「从样板重建」的兜底路径。

替换覆盖：存储前缀、云 app、称号/徽章、主页/导师/书架/章节页/荣誉墙/
实验室/关于页/作者页/分享链接/云面板等全部院化文案。
"""
import io, os, shutil, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC  = r'E:\Hanako\学习计划\四学院\design\chip2-build'
FORCE = '--force' in sys.argv
COPY = ['engine_core.js', 'renderers.js', 'events.js', 'cloud.js',
        '_honor.css', '_chapter.css', '_press.css', '_ui.css']

for name in COPY:
    sp = os.path.join(SRC, name)
    dp = os.path.join(HERE, name)
    if not os.path.exists(sp):
        print('[MISS]', name); continue
    if os.path.exists(dp) and not FORCE:
        print('[keep]', name, '(已存在，跳过拷贝；需重建加 --force)')
        continue
    shutil.copy2(sp, dp)
    print('[copy]', name)

# ---------------- 院化替换 ----------------
def patch(fname, pairs, required=True):
    p = os.path.join(HERE, fname)
    if not os.path.exists(p):
        print('[skip]', fname); return
    t = io.open(p, encoding='utf-8').read()
    n = 0
    for a, b in pairs:
        if a in t:
            n += t.count(a)
            t = t.replace(a, b)
        elif required:
            print('  [warn] pattern not found in %s: %s' % (fname, a[:60]))
    io.open(p, 'w', encoding='utf-8', newline='').write(t)
    print('[patch] %s (%d replacements)' % (fname, n))

def patch_re(fname, pattern, repl, count=0, required=True):
    p = os.path.join(HERE, fname)
    if not os.path.exists(p):
        print('[skip]', fname); return
    t = io.open(p, encoding='utf-8').read()
    t2, n = re.subn(pattern, repl, t, count=count)
    if required and n == 0:
        print('  [warn] regex not matched in %s: %s' % (fname, pattern[:60]))
    io.open(p, 'w', encoding='utf-8', newline='').write(t2)
    print('[patch-re] %s (%d)' % (fname, n))

# 1) 引擎：存储前缀统一 chip_ -> phy_
patch('engine_core.js', [
    ("'chip_'", "'phy_'"),
    ("d0.chip", "d0.phy"),
    ("g[d].chip", "g[d].phy"),
    ("芯片学院 · 真实引擎核心", "物理学院 · 真实引擎核心"),
])

# 2) 引擎：称号体系（物理院 51 章）
RANKS_NEW = ("var RANKS=[[0,'初入物理讲台'],[5,'标量学徒'],[10,'矢量学徒'],[16,'受力分析手'],"
             "[22,'守恒猎手'],[28,'场论入门'],[34,'电磁工匠'],[40,'热力学徒'],[46,'光波行者'],"
             "[52,'量子启蒙'],[60,'相对论旅人'],[72,'场与波之主'],[86,'物理诠释者'],[100,'物理学传人']];")
patch_re('engine_core.js', r'var RANKS=\[\[.*?\]\];', RANKS_NEW)

# 3) 引擎：徽章体系（物理院 51 章 · 六篇）
BADGES_NEW = """var BADGES=[
  {n:'方法论入门',d:'完成第一章 · 物理学的起点',c:function(s){ return s.doneC>=1; }},
  {n:'标量学徒',d:'第一篇 力学 · 达第 5 章',c:function(s){ return s.doneC>=5; }},
  {n:'受力分析手',d:'第一篇 力学 · 达第 11 章',c:function(s){ return s.doneC>=11; }},
  {n:'守恒猎手',d:'第一篇 力学 · 达第 15 章（能量/动量/角动量/刚体/流体）',c:function(s){ return s.doneC>=15; }},
  {n:'振动之耳',d:'第二篇 振动与波动 · 达第 19 章',c:function(s){ return s.doneC>=19; }},
  {n:'场论学徒',d:'第三篇 电磁学 · 达第 25 章',c:function(s){ return s.doneC>=25; }},
  {n:'安培的锤',d:'第三篇 电磁学 · 达第 31 章',c:function(s){ return s.doneC>=31; }},
  {n:'麦克斯韦信徒',d:'第三篇 电磁学 · 达第 32 章（电磁场收束）',c:function(s){ return s.doneC>=32; }},
  {n:'熵的守夜人',d:'第四篇 热学 · 达第 37 章',c:function(s){ return s.doneC>=37; }},
  {n:'光栅行者',d:'第五篇 波动光学 · 达第 42 章',c:function(s){ return s.doneC>=42; }},
  {n:'量子破晓',d:'第六篇 近代物理 · 达第 48 章',c:function(s){ return s.doneC>=48; }},
  {n:'物理学传人',d:'全书 51 章通关',c:function(s){ return s.doneC>=51; }},
  {n:'卷子初满',d:'任意一章小卷已做（答完即结算）',c:function(s){ return s.examFull>=1; }},
  {n:'卷子全满',d:'全部小卷已做',c:function(s){ return s.examTotal>0&&s.examFull>=s.examTotal; }},
  {n:'错题清零',d:'错题全部订正',c:function(s){ return s.wrongPool===0&&s.fixedPool>0; }},
  {n:'学习启航',d:'累计学习 5 次',c:function(s){ return s.studyCount>=5; }},
  {n:'今日打卡',d:'今日完成一章练习或一份卷（全站多院共通）',c:function(s){ try{ var g=JSON.parse(localStorage.getItem('daily_goal')||'{}'); var d0=g[todayStr()]; return !!(d0&&d0.phy&&(d0.phy.l||d0.phy.e)); }catch(e){ return false; } }},
  {n:'毕业学士',d:'全册通关（全书章节全通）',c:function(s){ return s.doneC>=s.totalC; }}
];"""
patch_re('engine_core.js', r'var BADGES=\[.*?\n\];', BADGES_NEW, count=1)

# 4) 云客户端：app id
patch('cloud.js', [
    ("SB_APP = 'chip'", "SB_APP = 'phy'"),
    ("'chip_profile'", "'phy_profile'"),
    ("chip2 云客户端", "phys 云客户端"),
    ("app=chip", "app=phy"),
    ("chip 学院 · 云同步已开启", "物理学院 · 云同步已开启"),
    ("将作为 chip 学院反馈提交", "将作为物理学院反馈提交"),
    ("芯片学院 · 按已学章节与总进度排", "物理学院 · 按已学章节与总进度排"),
    ("四院通用", "全站通用"),
    ("四院同域互通", "多院同域互通"),
])

# 5) 渲染器：主页 / 导师 / 书架 / 章节页 / 荣誉墙 / 实验室 / 关于 / 作者
patch('renderers.js', [
    ("var m=META[id]||{n:'芯片战争学院'}", "var m=META[id]||{n:'大学物理学院'}"),
    ('<div class="kick">CHIP WAR ACADEMY</div><div class="h1">芯片战争学院</div>',
     '<div class="kick">PHYSICS ACADEMY</div><div class="h1">大学物理学院</div>'),
    ("米勒《芯片战争》36 章", "吴百诗《大学物理学》51 章"),
    ("导读人克里斯·米勒", "导读人吴百诗"),
    ("CHRIS MILLER", "WU BAISHI"),
    ("《芯片战争》作者 · 塔夫茨大学教授", "《大学物理学》作者 · 西安交通大学"),
    ("米勒读本 36 章", "吴百诗读本 51 章"),
    ("三十六章就是半导体七十年", "六篇五十一章，从质点一路走到量子"),
    ("待米勒开讲", "待吴百诗开讲"),
    ("芯片史话 · 这一章的来处", "物理史话 · 这一章的来处"),
    ("例题 · 米勒式内心独白", "例题 · 推导的内心独白"),
    ("灵魂拷问（米勒的追问）", "灵魂拷问（学完自问）"),
    ("芯片人物名人堂", "物理学家名人堂"),
    ("学完一章点亮一位芯片人物", "学完一章点亮一位物理学家"),
    ("学完本章点亮对应芯片人物", "学完本章点亮对应物理学家"),
    ("芯片战争学院 · framework v2", "大学物理学院 · framework v2"),
    ("米勒《芯片战争》36 章 · 材料、制造与地缘权力的七十年", "吴百诗《大学物理学》51 章 · 从质点运动一路走到量子与相对论"),
    ("导读人：克里斯·米勒", "导读人：吴百诗"),
    ("TOP:THE CHIP LAB", "TOP:THE PHYSICS LAB"),
    ("打卡四院共通", "打卡全站多院共通"),
    ("四院共通，跨学院不断签", "全站多院共通，跨学院不断签"),
    ("作者与幕后（四院同源文案）", "作者与幕后（多院同源文案）"),
    ("function chipHallHTML()", "function physicsHallHTML()"),
    ("function chipProfile(c)", "function physicsProfile(c)"),
    ("chip.html.bak-ios", "物理学院样张"),
])

# 6) 事件层：分享链接 / 章节副标题 / 资料卡调用
patch('events.js', [
    ("ndshuge-academy/chip.html?v=", "ndshuge-academy/phys.html?v="),
    ("title:'芯片战争学院',text:'跟我一起读《芯片战争》：'", "title:'大学物理学院',text:'跟我一起学《大学物理学》：'"),
    ("待米勒开讲", "待吴百诗开讲"),
    ("chipProfile(c)", "physicsProfile(c)"),
    ("if(t.id==='dopeS'){ v=document.getElementById('dopeV'); fn=drawDope; }\n  else if(t.id==='lithoS'){ v=document.getElementById('lithoV'); fn=drawLitho; }\n  else if(t.id==='yieldS'){ v=document.getElementById('yieldV'); fn=drawYield; }\n  else if(t.id==='mooreS'){ v=document.getElementById('mooreV'); fn=drawMoore; }",
     "if(t.id==='vS'){ v=document.getElementById('vV'); fn=drawProj; }\n  else if(t.id==='pendS'){ v=document.getElementById('pendV'); fn=drawPend; }\n  else if(t.id==='coulS'){ v=document.getElementById('coulV'); fn=drawCoul; }\n  else if(t.id==='waveS'){ v=document.getElementById('waveV'); fn=drawWave; }"),
])

# 7) 云客户端：测试期闸门（防止测试数据写入账号 / 公开排行榜）
#    SB_TEST_MODE=true -> 所有云端写操作（progress / leaderboard）直接短路
#    物理院正式上线时，把 cloud.js 里 SB_TEST_MODE 改为 false 即可恢复同步
patch('cloud.js', [
    ("var SB_PORTAL = 'https://ndshuge.github.io/ndshuge-academy/';",
     "var SB_PORTAL = 'https://ndshuge.github.io/ndshuge-academy/';\n"
     "/* !!! 测试期闸门：true 时禁止任何云端写入（不污染账号与排行榜）。\n"
     "   物理院内容验收通过、正式上线前，把下面这行改成 false。 !!! */\n"
     "var SB_TEST_MODE = true;"),
    ("async function sbSyncFromCloud(silent){",
     "async function sbSyncFromCloud(silent){\n  if(SB_TEST_MODE){ if(!silent) toast('测试模式：已跳过云端同步'); return false; }"),
    ("async function sbPush(immediate){\n  var s = sbSession(); if(!s) return;",
     "async function sbPush(immediate){\n  if(SB_TEST_MODE) return;\n  var s = sbSession(); if(!s) return;"),
    ("function sbPushRank(){\n  try{",
     "function sbPushRank(){\n  if(SB_TEST_MODE) return;\n  try{"),
], required=False)

# 8) 引擎：测试期不触发云端推送
patch('engine_core.js', [
    ("function sbNotify(){ try{ if(sbSession()) sbPush(false); }catch(e){} }",
     "function sbNotify(){ try{ if(typeof SB_TEST_MODE!=='undefined' && SB_TEST_MODE) return; if(sbSession()) sbPush(false); }catch(e){} }"),
    ("function cloudInit(){\n  if(!sbSession()) return;",
     "function cloudInit(){\n  if(typeof SB_TEST_MODE!=='undefined' && SB_TEST_MODE) return;\n  if(!sbSession()) return;"),
], required=False)

print('done. next: python build.py')
