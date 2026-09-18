# 水仙的AI提示词 · Shuixian's AI Prompts

[简体中文](README.md) · **English**

> Two AI prompt datasets + three front-end skins. Browse by category or keyword, open any entry for the full-size image, copy the prompt in one click.

**Live site:** <https://prompt.qqsrc.com/> · Fully static, no login required · Favorites are kept in your browser

**Works with:** ChatGPT  · Grok · Gemini · Midjourney · Stable Diffusion · Flux · Jimeng (即梦) · Kling (可灵) · Doubao (豆包) · Hailuo (海螺) · Wenxin Yige (文心一格)

## Preview

### classic — the 12-category / 79-subcategory skin

| Home | Gallery |
| --- | --- |
| ![classic home](docs/screenshots/classic/home.png) | ![classic gallery](docs/screenshots/classic/gallery.png) |

| Category filter (tap a category to jump straight into the gallery) |
| --- |
| ![classic category filter](docs/screenshots/classic/category.png) |

### modern — the page-per-view skin

| Home | Gallery (category tree on the left) |
| --- | --- |
| ![modern home](docs/screenshots/modern/home.png) | ![modern gallery](docs/screenshots/modern/gallery.png) |

| Prompt detail (its own page) |
| --- |
| ![modern detail](docs/screenshots/modern/detail.png) |

### old/shuixian-deploy — the previous live site

| Home | Gallery |
| --- | --- |
| ![old home](docs/screenshots/old/home.png) | ![old gallery](docs/screenshots/old/gallery.png) |
| **Prompt detail** | **Category filter** |
| ![old detail](docs/screenshots/old/lightbox.png) | ![old category filter](docs/screenshots/old/classify.png) |

## Version comparison

| Directory | Prompts | Images | Pages | What it is |
| --- | ---: | ---: | ---: | --- |
| `shuixian-deploy-classic/` | 5,452 | 7,386 | 4 | The classic skin with 12 categories / 79 subcategories — "pick a topic and wander around" |
| `shuixian-deploy-modern/` | 5,452 | 5,452 | 10 | One page per view (detail / search / categories / about / sponsor / submit / 404), with the leanest data schema |
| `old/shuixian-deploy/` | 17,427 | 19,827 | 4 | The previous live site, plus a Twitter-collected layer (3,948 entries), editorial gallery skin |
| `old/shuixian-prompts/` | 17,427 | — | 4 | Local development copy of the same dataset; images are not committed (see "Image hosting") |

> `shuixian-deploy-classic/` and `shuixian-deploy-modern/` share the same 5,452 prompts; they differ in information architecture and skin.
> The two directories under `old/` share the 17,427-prompt dataset; they differ in whether an image folder is present and whether the folder is meant as a deployable bundle.

## Repository layout

```
README.md  README.en.md
docs/screenshots/                        Screenshots of all three versions
shuixian-deploy-classic/                 Skin with 12 categories / 79 subcategories (deployable on its own)
├── index.html  gallery.html  classify.html  favorites.html
├── components/                          header / footer / lightbox / modals (injected by JS)
├── css/base.css                         All site styles
├── js/base.js                           Shared script: data loading, cards, lightbox, favorites
├── js/{home,gallery,classify,favorites}.js
├── data/                                Dataset
├── images/                              2 WeChat QR codes
└── _headers                             Cloudflare Pages caching rules
shuixian-deploy-modern/                  Page-per-view skin (deployable on its own)
├── index.html  gallery.html  categories.html  detail.html  search.html
├── favorites.html  about.html  sponsor.html  submit.html  404.html
├── components/  css/  js/  data/  images/  _headers
old/
├── shuixian-deploy/                     Previous deployable build (includes the Twitter collection)
└── shuixian-prompts/                    Local dev copy (full dataset + re-categorisation scripts)
```

## Data

Each version ships its own `data/` folder and loads it in two layers: a lightweight list for the first paint, and the full records only when a detail view is opened or a prompt is copied.

| File | Content |
| --- | --- |
| `data/list.part1~3.json` | Lightweight list (title, category, likes, image path) — loaded on first paint |
| `data/prompts.part1~3.json` | Full records (including the `prompt` body) — loaded on demand |
| `data/categories.json` / `data/meta.json` | Category structure (`classic` uses a flat map, `modern` uses a major → subcategory tree) |
| `data/list-twitter.json` `data/prompts-twitter.json` | Twitter collection (only `old/shuixian-deploy` carries data) |
| `data/twitter_manifest.json` | Lists the Twitter shard files |

Fields get leaner with each version:

| Version | Fields |
| --- | --- |
| `old/shuixian-deploy` | `id` `title` `prompt` `image` `images` `category` `likes` `author` `slug` `resultsCount` `thumb` `tweet` |
| `classic` | Same as above, plus `themes` `styles` `person` |
| `modern` | `id` `title` `prompt` `image` `category` `likes` |

## Image hosting: why images are not in git

The originals under `images/originals` (2.8 GB) and the Twitter images under `images/twitter` (5.7 GB) live in **Cloudflare R2** object storage. The site loads them from `https://r2.qqsrc.com` and needs no local files, so `old/shuixian-prompts/images/` is excluded by `.gitignore`.

- Main library path: `images/originals/{id}.jpg`
- Twitter images: `images/twitter/{id}.jpg`
- The host lives in the `IMG_BASE` constant of each version's `js/base.js` — change it in one place to switch providers

Each version's `images/` folder holds only 2 WeChat QR codes, which the site itself uses.

## Local preview

Run one port per version to compare them side by side. All of them must be served over HTTP — opening the HTML files directly is blocked by `fetch`'s cross-origin rules:

```bash
python -m http.server 8091 --directory old/shuixian-deploy
python -m http.server 8092 --directory shuixian-deploy-classic
python -m http.server 8093 --directory shuixian-deploy-modern
```

## Deployment and caching

Every version is a self-contained static folder — drag it into Cloudflare Pages, or any static host.
The caching rules in `_headers`:

- `css/` `js/` `components/` `images/` — long cache (1 year, immutable)
- `data/` — 1 hour
- `*.html` — no cache, revalidated on every request

**After changing CSS / JS / components you must do two things**, otherwise edge nodes keep serving the old files:

1. Bump the `?v=` in each HTML file and `ASSET_VERSION` in that version's `js/base.js`
   (current values: `shuixian-deploy-classic` = `24`, `shuixian-deploy-modern` = `2`, `old/shuixian-deploy` = `6`)
2. Purge the cache after deploying, then hard-refresh locally with `Ctrl + Shift + R`

## Related projects

| Project | Description |
|---|---|
| [**shuixian-manju-skills**](https://github.com/BaYue-SYJ/shuixian-manju-skills) | A six-piece drama toolkit: skills that take you from novel to finished short drama (inspired by shuohao-skills) |
| [**shuixian-threads-ai-radar**](https://github.com/BaYue-SYJ/threads-ai-radar) | Source code behind the Threads viral-content radar |
| [**zimeiti-workbuddy**](https://github.com/BaYue-SYJ/zimeiti-workbuddy) | Creator Buddy: an end-to-end Skill toolbox for WeChat, Xiaohongshu and short video |
| [**web-html-image-skill**](https://github.com/BaYue-SYJ/web-html-image-skill) | web-image: render images with HTML/CSS, no image model required, 32 preset styles |

---

## About the author

If this saved you some time, you can buy me a coffee ☕ — or just add me on WeChat to say hi.

| Tips | WeChat | Official Account |
|:---:|:---:|:---:|
| <img src="docs/reward-qr.jpg" width="180" alt="Tips"> | <img src="docs/wechat-qr.jpg" width="180" alt="WeChat"> | <img src="docs/wechat-mp-qr.jpg" width="180" alt="Official Account"> |

## About the WeChat Official Account

I write about AI tools and prompts fairly regularly.
There is also a free public community group — add my WeChat: **Kas2026**.
Everything is free of charge; if you like tinkering, come and chat.

## Community

| [Linux.Do](https://linux.do) | Linux.Do /— share, discuss and follow along with the community. | Recognised by the LINUX DO community |
| --- | --- | --- |

---

[![Star History Chart](https://api.star-history.com/svg?repos=BaYue-SYJ/shuixian-prompts&type=Date)](https://star-history.com/#BaYue-SYJ/shuixian-prompts&Date)

![stars](https://img.shields.io/github/stars/BaYue-SYJ/shuixian-prompts?style=social)
![forks](https://img.shields.io/github/forks/BaYue-SYJ/shuixian-prompts?style=social)

> **License / attribution**: if you fork or reuse this project, please keep the credit and link back to [this repository](https://github.com/BaYue-SYJ/shuixian-prompts). Derivative projects must state where they came from. Commercial use requires prior permission. See [LICENSE](LICENSE) for details.
