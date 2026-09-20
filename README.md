# 水仙的AI提示词

**简体中文** · [English](README.en.md)

> 合并版站点（现代 / 经典两套皮肤一键切换）+ 完整提示词数据集：按分类或关键词即搜即得，点开看大图，一键复制提示词。

**在线站点：** <https://prompt.qqsrc.com/> · 纯静态站点，无需登录 · 收藏数据保存在本地浏览器

**兼容模型：** ChatGPT· Grok · Gemini· Midjourney · Stable Diffusion · Flux · 即梦 · 可灵 · 豆包 · 海螺 · 文心一格等等

## 界面预览

### unified —— 现役版：两套皮肤一键切换

`shuixian-unified/` 把原先的两套皮肤合进了一个站点：**现代版**是页面级拆分（详情 / 搜索 / 分类 / 关于 / 投稿各自独立），**经典版**是「12 大类慢慢逛」的卡片墙。右上角一个按钮来回切，共用同一份数据。

| 现代版首页 | 点右上角切到经典版 |
| --- | --- |
| ![unified 现代版首页](docs/screenshots/unified/home-modern.png) | ![切换到经典版](docs/screenshots/unified/switch-to-classic.png) |

| 经典版首页 | 点右上角切回现代版 |
| --- | --- |
| ![unified 经典版首页](docs/screenshots/unified/home-classic.png) | ![切回现代版](docs/screenshots/unified/switch-to-modern.png) |

> **切换规则**：会尽量停在同一类页面上 —— 首页↔首页、画廊↔画廊、收藏↔收藏；目标版本没有对应页面时回到该版首页。
> 两套皮肤的主题色都取自站点 `#2B8AAB`，深浅色主题也跟着各自记住。

### classic —— 12 大类 / 79 细类皮肤（已归档至 `old/`）

| 首页 | 画廊 |
| --- | --- |
| ![classic 首页](docs/screenshots/classic/home.png) | ![classic 画廊](docs/screenshots/classic/gallery.png) |

| 分类筛选（点分类标签直接进画廊） |
| --- |
| ![classic 分类筛选](docs/screenshots/classic/category.png) |

### modern —— 页面级拆分皮肤（已归档至 `old/`）

| 首页 | 画廊（左侧分类树） |
| --- | --- |
| ![modern 首页](docs/screenshots/modern/home.png) | ![modern 画廊](docs/screenshots/modern/gallery.png) |

| 提示词详情（独立页面） |
| --- |
| ![modern 详情](docs/screenshots/modern/detail.png) |

### old/shuixian-deploy —— 更早一版线上站点（含 Twitter 收录）

| 首页 | 画廊 |
| --- | --- |
| ![旧版首页](docs/screenshots/old/home.png) | ![旧版画廊](docs/screenshots/old/gallery.png) |
| **提示词详情** | **分类筛选** |
| ![旧版详情](docs/screenshots/old/lightbox.png) | ![旧版分类](docs/screenshots/old/classify.png) |

## 版本对照

| 目录 | 提示词 | 图片 | 页面 | 定位 |
| --- | ---: | ---: | ---: | --- |
| `shuixian-unified/` | 5,452 | 5,452 | 13 | **现役合并版**：现代版 9 页 + 经典版 4 页（`classic/` 子目录），右上角一键切换，共用一份数据 |
| `old/shuixian-deploy-modern/` | 5,452 | 5,452 | 10 | 合并前的现代版（页面级拆分），已归档 |
| `old/shuixian-deploy-classic/` | 5,452 | 7,386 | 4 | 合并前的经典版（12 大类 / 79 细类），已归档 |
| `old/shuixian-deploy/` | 17,427 | 19,827 | 4 | 更早一版线上站点，多一层 Twitter 收录（3,948 条），编辑式画廊皮肤 |
| `old/shuixian-prompts/` | 17,427 | — | 4 | 同一套数据的本地开发版，图片不入库（见「图片托管」） |

> `shuixian-unified/`、`old/shuixian-deploy-modern/`、`old/shuixian-deploy-classic/` 用的是同一套 5,452 条提示词，
> 差别在信息架构与皮肤 —— 前两个版本已经合进 `shuixian-unified/`，留在 `old/` 只是为了保留历史。
> `old/` 下另外两个目录共用 17,427 条那套数据，差别在「是否含图片目录、是否作为部署包」。

## 仓库结构

```
README.md
LICENSE
docs/screenshots/                        四个版本的界面截图
shuixian-unified/                        现役合并版（可独立部署）
├── index.html  gallery.html  categories.html  detail.html  search.html
├── favorites.html  about.html  sponsor.html  submit.html  404.html
├── classic/                             经典版皮肤（子目录，与主站共用同一份 data/）
│   ├── index.html  gallery.html  classify.html  favorites.html
│   └── components/  css/  js/  images/
├── components/  css/  js/               现代版皮肤
├── data/                                数据集（两套皮肤共用）
├── images/                              2 张公众号二维码
└── _headers                             Cloudflare Pages 缓存策略
old/
├── shuixian-deploy-modern/              合并前的现代版（已归档，可独立部署）
├── shuixian-deploy-classic/             合并前的经典版（已归档，可独立部署）
├── shuixian-deploy/                     更早的部署版（含 Twitter 收录）
└── shuixian-prompts/                    本地开发版（完整数据 + 重分类脚本）
```

## 数据

每个版本各自带一份 `data/`，都采用**分层加载**：轻量列表负责首屏，完整数据在打开详情或复制时才按需加载。

| 文件 | 内容 |
| --- | --- |
| `data/list.part1~3.json` | 轻量列表（标题、分类、点赞、图片路径），首屏加载 |
| `data/prompts.part1~3.json` | 完整数据（含 `prompt` 正文），按需加载 |
| `data/categories.json` / `data/meta.json` | 分类结构（经典版用扁平映射，现代版用大类 → 小类树） |
| `data/list-twitter.json` `data/prompts-twitter.json` | Twitter 收录（仅 `old/shuixian-deploy` 有数据） |
| `data/twitter_manifest.json` | 指定 Twitter 分片文件清单 |

字段随版本递进变精简：

| 版本 | 字段 |
| --- | --- |
| `old/shuixian-deploy` | `id` `title` `prompt` `image` `images` `category` `likes` `author` `slug` `resultsCount` `thumb` `tweet` |
| 经典版（`shuixian-unified/classic`、`old/shuixian-deploy-classic`） | 同上，另带 `themes` `styles` `person` |
| 现代版（`shuixian-unified`、`old/shuixian-deploy-modern`） | `id` `title` `prompt` `image` `category` `likes` |

## 图片托管：为什么不在 git 里

原图 `images/originals`（2.8 G）与 Twitter 图 `images/twitter`（5.7 G）都在 **R2 对象存储**，
站点通过 `https://r2.qqsrc.com` 加载，不依赖本地文件，因此 `old/shuixian-prompts/images/` 整体被 `.gitignore` 排除。

- 主库图片路径：`images/originals/{id}.jpg`
- Twitter 图片路径：`images/twitter/{id}.jpg`
- 图床地址是各版本 `js/base.js` 里的 `IMG_BASE` 常量，改一处即可整体切换

各版本 `images/` 目录里只有 2 张公众号二维码，属于站点自身的静态资源。

## 本地预览

各版本起一个端口即可对照（都必须走 HTTP，直接双击 HTML 会被 `fetch` 的跨域限制挡住）：

```bash
python -m http.server 8094 --directory shuixian-unified
python -m http.server 8091 --directory old/shuixian-deploy
python -m http.server 8092 --directory old/shuixian-deploy-classic
python -m http.server 8093 --directory old/shuixian-deploy-modern
```

打开 <http://localhost:8094/> 就是合并版；点右上角「经典版 / 现代版」按钮切换皮肤。

## 部署与缓存

每个版本都是自包含的静态目录，可直接拖拽到 Cloudflare Pages 或任意静态空间。
`_headers` 里约定的缓存策略：

- `css/` `js/` `components/` `images/` —— 长缓存（1 年，immutable）
- `data/` —— 1 小时
- `*.html` —— 不缓存，每次回源校验

**改 CSS / JS / 组件后必须同时做两件事**，否则边缘节点会继续返回旧文件：

1. 递增各 HTML 里的 `?v=` 与该版本 `js/base.js` 里的 `ASSET_VERSION`
   （当前值：`shuixian-unified` 现代版 = `2`、其 `classic/` 子目录 = `24`、`old/shuixian-deploy-modern` = `2`、
   `old/shuixian-deploy-classic` = `24`、`old/shuixian-deploy` = `6`）
2. 部署完成后 Purge Cache，本地用 `Ctrl + Shift + R` 硬刷新确认

> **部署合并版**：把 `shuixian-unified/` 整个目录拖进 Cloudflare Pages 即可（它是自包含的，`classic/` 子目录一起带走）。
> 如果 CF Pages 之前是按子目录（如 `shuixian-deploy-modern`）配置的，记得改成 `shuixian-unified`。

   
## 相关项目

| 项目 | 说明 |
|---|---|
| [**shuixian-manju-skills**](https://github.com/BaYue-SYJ/shuixian-manju-skills) | 水仙的漫剧 6 件套：从小说到短剧成片的创作技能集（灵感来源于 shuohao-skills） |
| [**shuixian-threads-ai-radar**](https://github.com/BaYue-SYJ/threads-ai-radar) | 水仙的threads 爆款搜集源码 |
| [**zimeiti-workbuddy**](https://github.com/BaYue-SYJ/zimeiti-workbuddy) | Creator Buddy：公众号 / 小红书 / 短视频的全流程创作 Skill 工具箱 |
| [**web-html-image-skill**](https://github.com/BaYue-SYJ/web-html-image-skill) | web-image：用 HTML/CSS 渲染出图，不依赖生图模型，32 套预设风格 |

---


## 关于作者

如果这个东西帮你省了时间，可以请我喝杯咖啡 ☕；想直接聊也欢迎加微信。

| 赞赏码 | 微信 | 公众号 |
|:---:|:---:|:---:|
| <img src="docs/reward-qr.jpg" width="180" alt="赞赏码"> | <img src="docs/wechat-qr.jpg" width="180" alt="微信"> | <img src="docs/wechat-mp-qr.jpg" width="180" alt="公众号"> |
## 关于公众号
会经常写一些 AI 工具与提示词相关的东西。
如果需要加入公益免费交流群，可以加我VX:Kas2026  
做的都是公益的不收取任何费用，喜欢技术的可以一起交流。

## 社区

| [Linux.Do](https://linux.do) | Linux.Do /— 与社区分享、讨论和跟踪发展. | 认可 LINUX DO 社区 |
| --- | --- | --- |

---
[![Star History Chart](https://api.star-history.com/svg?repos=BaYue-SYJ/shuixian-prompts&type=Date)](https://star-history.com/#BaYue-SYJ/shuixian-prompts&Date)

![stars](https://img.shields.io/github/stars/BaYue-SYJ/shuixian-prompts?style=social)
![forks](https://img.shields.io/github/forks/BaYue-SYJ/shuixian-prompts?style=social)
> **项目授权要求**：fork 或使用请保留出处并链接回 [本仓库](https://github.com/BaYue-SYJ/shuixian-prompts)，衍生项目需写清来源；商用需先获授权。详见 [LICENSE](LICENSE)。



