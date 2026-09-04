# Academy Template · Chip2（样张真版模板，2026-09-04）

> 四院 + 门户统一 UI 基准。规则：**平移不模仿**——以本套为基底，只换「数据引擎 + 存储键 + 导师卡 + 文案」，壳/动效/组件/转场一律不动。

## 文件角色

| 文件 | 角色 |
| --- | --- |
| `build.py` | 装配器：读「对齐样张-芯片学院-三Tab体验版.html」→ 注入 CSS（开始层/悬停 v2/圆角/双层转场/导师卡/防缓存头）+ DOM（startSheet）→ 替换 script 的 demo 段为 CHAPTERS(取自学院旧文件) + 引擎 + 渲染器 + 事件 → 输出预览 HTML |
| `engine_core.js` | 真实引擎核心：store/load（前缀可配）、进度/结算/打卡（daily_goal 全站）/错题池/称号徽章/统计。**芯片学院专属**：RANKS 称号名、BADGES、导师格言相关无 |
| `renderers.js` | 14 页渲染器 + 导航覆盖（双层转场 animateInto / renderView / go）+ 主页导师卡结构 |
| `events.js` | 事件委托（判题/开始层/跳转/主题/管理页）+ 单例 toast + 启动 |
| 产出 | `design/chip2-真版-预览.html` |

## 平移步骤（新学院）

1. **壳与动效**：build.py 保持原样（读同一个样张文件）。
2. **数据**：从该院旧 html 抽取 `var CHAPTERS = [...];`（用引号感知配对，见 build.py）——注意各院 CHAPTERS **schema 不同**（字段名非 "quiz"），需写适配器或改渲染器取数处。
3. **引擎**（engine_core.js 改动点）：
   - `store/load/wipeAll` 里的键前缀 `chip_` → 该院前缀（chip=pjc? 实测：chip.html=`chip_`、calculus=`pjc_`、python=`pyc_`、c=`cc_`）
   - 题目判定与结算语义按该院规则（calculus 数值填空多、python/c 代码判题）；状态键名对齐旧文件
   - RANKS 称号阶梯 / BADGES 徽章定义 / calcStats 权重 → 各院自己的
4. **渲染器**：chapter/plan/hall/exam 的内容卡结构不变，取数据字段按该院 schema；导师卡换该院导读人（calculus 可直接用 PORTRAITS 古典画像，已有 base64）
5. **文案**：主页 kick/h1/sub、TUTOR_QUOTES、about/manage 页文案按院替换
6. **build + node 语法检查 + 浏览器冒烟 → 预览给鼠哥 → 确认后上线**

## 图片规范（鼠哥 2026-09-04：降内存）

- 一律**低分辨率**：显示 ≤100px 的图取 96w、大场景 ≤512w
- WebP/JPEG 压到 ≤15KB 再 base64 内联；PNG 只用于图标类
- 来源要求可自由使用；作者官网标 "All Rights Reserved" 的照片不复制分发（实例：Chris Miller 官网照 ©Anthony Tulliani，弃用，SVG 剪影兜底）
- calculus 的 PORTRAITS 古典画像（笛卡尔等 base64 内联）是达标样板

## 三院勘察备忘（2026-09-04）

| 学院 | 文件 KB | 存储前缀 | 题字段 | 特有 |
| --- | --- | --- | --- | --- |
| calculus | 1020 | `pjc_` | 非 "quiz/exam"（732 组 options） | 数值/公式填空判题、PORTRAITS 古典像 |
| python | 260 | `pyc_` | 非 quiz（123 组 options） | 代码运行 + 判题引擎 |
| c | 1062 | `cc_` | 非 quiz（337 组 options） | 浏览器编译运行引擎 |

每院平移 = 抽 CHAPTERS + 引擎语义对齐 + 渲染取数适配。按 chip → calculus → python → c 推进，每个院完成预览确认后推。
