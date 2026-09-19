# 来源、素材与权利边界

本文件记录来源，不把“可以访问或下载”当作转载授权，也不替第三方内容重新许可。

## 自有代码与品牌

本项目尚未选定开源许可证。`package.json` 中的 `UNLICENSED` 表示没有通过本包授予开源使用许可，不等于公共领域。

用户提供的 `assets/brand/icon.svg` 与 `assets/brand/logo.svg` 保持原样。它们不是可从代码许可自动推导使用权的通用开源图标。历史 Logo 设计包与提案保留在设计资料中，不是当前品牌入口。

## Barlow 字体

- 来源：Google Fonts 的 `ofl/barlow` 目录，参见 `design/REFERENCES.md`。
- 文件：`design/fonts/Barlow-Regular.ttf`、`Barlow-SemiBold.ttf`、`Barlow-Bold.ttf`。
- 许可原文：[`design/fonts/Barlow-OFL.txt`](design/fonts/Barlow-OFL.txt)，SIL Open Font License。
- 该许可随网站字体一起进入 `dist/`。
- Noto Sans SC 尚未随项目分发；当前字体栈使用本机回退。

## 主题照片

以下为原型使用的来源地址，尚需补齐公开商用前的逐图来源、许可与主体权利复核。它们不是所报道产品或事件的现场照片，也不是可随项目代码统一重新许可的素材。

| 本地文件 | 已记录来源 |
| --- | --- |
| `assets/robot.jpg` | https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=85 |
| `assets/servers.jpg` | https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=900&q=85 |
| `assets/chip.jpg` | https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=85 |
| `assets/code.jpg` | https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=800&q=85 |

后续应记录照片落地页、摄影师、核对日期与使用依据，不从 CDN 地址推断已完成授权核验。

## 新闻与视频

- 原始文章台账：[`design/news-sources.json`](design/news-sources.json)。12 条标题和连续短摘录保持原文，不是项目生成的新闻正文。
- 源站 HTTP、标题和摘录核对不等于独立事实核验，也不等于全文或图片转载授权。
- 当前新闻未提供第三方全文或原图；可选全文数据需遵循 [`design/ARTICLE-READER.md`](design/ARTICLE-READER.md) 的审批与逐图边界。
- Andrej Karpathy 的 *Intro to Large Language Models* 通过用户确认后加载的 YouTube 播放器提供，保留外部观看入口；没有下载、打包或重新分发视频文件。
- `tests/fixtures/article-content.cjs` 与 `tests/fixtures/reader-diagram.png` 是原创 QA 夹具，不作为真实新闻进入构建产物。

## 开发依赖

jsdom、Playwright 及其传递依赖仅用于本地开发和 CI，不打入网站运行资源。具体版本、完整性哈希与依赖树见 `package-lock.json`，各依赖保留各自许可。
