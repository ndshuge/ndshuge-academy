# Microcalc Academy · Calc3（微积分学院真版，2026-09-05）

> 以 **chip2（定稿样板）为基底**的第一次换院平移，已验证全流程。规则：**平移不模仿**——壳/动效/组件/转场/云/守卫一律不动，只换「数据 + 引擎参数 + 画像 + 文案 + 实验室」。

## 与 chip2 的差异（本次实际改动）

| 项 | chip2（芯片） | calc3（微积分） | 改动位置 |
|---|---|---|---|
| 数据源 | chip.html | **calculus.html**（30 章，728 随堂 choice + 30 小卷） | build.py `CHIP` |
| 存储前缀 | `chip_` | `pjc_` | engine `AC={id:'calculus',prefix:'pjc_',app:'calculus'}` |
| 称号 RANKS | 芯片 11 阶 | 微积分 16 阶（初入书院→笛卡尔传人） | engine |
| 徽章 BADGES | 芯片 14 枚 | 微积分 13 枚（按 30 章分档） | engine |
| 公式渲染 | 引擎迷你 parseMath | **_math.js 完整解析器注入**（`\frac\sqrt\sum\int` 等） | build.py `MATH` + `_math.js` |
| 数学家画像 | PORTRAITS 空表（首字母兜底） | **25 位画像灌入**（源：`学习\数学\高数教材\普林斯顿微积分学院.html`） | renderers `var PORTRAITS` |
| 实验室 | 芯片工艺四画布 | **微积分四实验**（ε-δ 极限/切线/黎曼和/单位圆）+ 章节 interact 小实验 | renderers `renderers.lab` + draw* + helper |
| 导读人 | Chris Miller（webp） | **莱布尼茨**（引 PORTRAITS.leibniz） | renderers home |
| 云 | SB_APP='chip' | SB_APP='calculus' | cloud.js |
| 分享 | chip.html 链接 | calculus.html 链接 + 微积分文案 | events shareAcademy |
| 产物 title/brand | 芯片学院 | 微积分学院 · CALCULUS ACADEMY | build.py 后处理 |

## 构建链

```
calc3-build/build.py  →  calc3-真版-预览.html (≈1MB，含 640KB 画像)
```
build.py 干四件事：① 读样张注入公共壳 CSS/DOM ② 从 calculus.html 抽取 CHAPTERS ③ 注入 _math.js + engine + renderers + events + cloud ④ 产物 title/brand 文案后处理。

## 换院检查清单（chip → 下一院：python / c）

1. **build.py**：`CHIP` 指向该院 html；`OUT` 改预览名；若该院无公式需求可去掉 MATH 注入
2. **engine_core.js**：`AC` 前缀换（python=`pyc_`、c=`cc_`）；RANKS/BADGES 按该院内容分档
3. **renderers.js**：META 默认院名、home kick/h1/sub、导读人卡、荣誉墙标题（"数学家名人堂"等）、hall lab 卡文案、about/manage 文案
4. **cloud.js**：SB_APP 换该院 id
5. **events.js**：lab 滑块委托（本目录已按 epsS/aS/nS/thS）；分享链接文件名
6. **画像**：该院有 PORTRAITS 则从源文件抽取 key 全覆盖后灌入；无则留空表走首字母兜底
7. **专属模块**：代码判题（python/c）在渲染器 quizCardsHTML 处接入运行器；公式层看数据是否有 `\frac` 等
8. **构建验证**：`node --check` 四 js → vm 冒烟 17 页 → 浏览器实测

## 教训（calc2 废弃原因）

- `design/calc2-build/` 是**半成品试水**：renderers.js 里 lab 调用了 `labAxes/labPlot/labCheck` 但文件内从未定义，产物一开实验室就崩。**平移前先 grep helper 定义完整性**，别拿引用缺失的中间态做基底。
- calc2 时代勘察备忘说 "calculus 非 quiz/exam、732 组 options" 已过时——实测 calculus.html 与 chip 同构（30 章全 choice quiz + exam），schema 无需适配器，直接平移渲染器取数。
