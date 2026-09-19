# Abe-spresso

**A daily shot of AI.**

面向 AI 产品经理、创业者与从业者的新闻编辑式阅读原型：Today / Archive / Saved，每期 12 条（Top 5 + 7），中英文界面，独立收藏与已读状态。

> **当前状态：静态历史新闻原型，不是已上线的实时日报产品。**
> 12 条真实来源发布于 2024-10-22 至 2025-03-12；`2026-09-14` 是保留的原型期号，不是新闻日期。界面语言切换不翻译原文。真实账号、跨设备同步、采集、模型、数据库、编辑审批和 Cloudflare 生产部署均未接入。

## 快速开始

需要 Node.js **24.19.0**（见 `.nvmrc`）、npm **12.0.2**。网站运行时无 npm 依赖；npm 只用于本地工程、测试和打包。

```sh
# 如果使用 nvm
nvm install
nvm use

# 在所选 Node 环境中安装项目锁定的 npm
npm install --global npm@12.0.2
npm ci --ignore-scripts
npm run dev
```

打开 `http://127.0.0.1:4173/`。开发服务器仅绑定本机，按白名单提供源码页面及设计样板，不暴露整个仓库目录。

- 设计样板：`http://127.0.0.1:4173/design/styleguide.html`
- 更换端口：`PORT=4174 npm run dev`（POSIX shell）
- 停止服务：`Ctrl+C`
- `npm ci` 严格按锁文件安装；不要依赖其他项目或 `/tmp` 中的测试依赖。

## 检查与测试

```sh
npm run check           # 所有项目 JavaScript 的语法检查
npm test                # 设计系统 + jsdom 业务回归 + 构建/文件边界测试

# 已有 Google Chrome 可跳过安装；Linux CI 同时需要系统依赖
npm exec -- playwright install chrome
npm run test:browser    # 自动构建、启动临时本机服务、运行 Chrome 回归并关闭服务

npm run verify          # 语法 + 全部本地测试（需要已安装 Chrome）
npm run test:sources    # 可选：Python 3 联网复核 12 条新闻来源
```

浏览器测试使用独立上下文，不读取或覆盖日常浏览器的收藏/已读数据。它对 **`dist/` 构建产物**运行现有回归，并通过独立的 QA 服务验证设计样板；样板不会混入发布产物。

- 报告与截图：`.qa/browser/`，不提交 Git。
- 回归范围：中英 × 320 / 375 / 768 / 1024 / 1440、Today / Archive / Saved / 详情、收藏/已读、键盘焦点、全文 QA 夹具及错误状态。
- 可选环境变量：`QA_OUTPUT` 指定证据目录，`BROWSER_CHANNEL` 指定已安装的 Playwright Chromium channel（默认 `chrome`）。
- 如自行启动服务，可直接运行 `node tests/browser-regression.cjs`；`PREVIEW_URL` 默认 `http://127.0.0.1:4173`，`STYLEGUIDE_URL` 默认其 `/design/styleguide.html`。
- 来源联网测试与确定性 CI 分开，避免第三方限流、改版或网络故障被误判为代码回归；发布内容前仍应独立复核来源。

**测试通过不等于完成生产、版权、全站无障碍或跨浏览器认证。** 浏览器脚本生成截图和布局断言，不执行历史基线逐像素比较。

## 构建与发布边界

```sh
npm run build           # 仅生成 dist/，不执行上传或部署
npm run preview         # 构建并在本机预览 dist/，默认端口 4173
```

[`scripts/site-files.json`](scripts/site-files.json) 是静态发布文件白名单。构建按原路径、原字节复制文件，不重写新闻、路由、品牌、字体或 localStorage 键。

| 范围 | 内容 |
| --- | --- |
| GitHub 仓库 | 源码、依赖锁文件、工程脚本、测试、设计规范、生产蓝图、精选历史 QA 证据 |
| `dist/` | HTML/JS/CSS、实际使用的品牌与照片、设计 Token/组件 CSS、Barlow 字体及许可 |
| 仅本机 | `.env*`、`.dev.vars*`、依赖、缓存、`.qa/`、`dist/`、历史 ZIP 等忽略项 |

**未来部署必须使用 `dist/`，不要直接发布仓库根目录。** `design/` 中有运行必需的 CSS 和字体，不能整个目录排除；只有白名单内的文件进入产物。设计样板、内部文档、源码测试、旧 Logo 方案和 ZIP 都不发布。

这不是 Cloudflare 部署配置。域名、正式/预览环境、生产响应头、缓存、身份凭据、回滚与监控需在后续部署任务中单独配置、验收。不要把 API 密钥写进客户端 JS、构建产物或提交历史。

## GitHub CI

[CI 工作流](.github/workflows/ci.yml) 在推送 `main`、Pull Request 和手动触发时运行：

1. 按 `.nvmrc` 与 `package.json` 安装固定工具链。
2. `npm ci --ignore-scripts` 安装锁定的开发依赖。
3. 语法、设计系统、业务与文件边界测试。
4. 安装 Chrome，针对构建产物执行浏览器回归。
5. 上传 QA 证据；仅测试成功时上传静态网站产物，保留 7 天。

CI 只有仓库读取权限，不持有 Cloudflare 密钥，不执行部署。第三方 Actions 使用完整 commit SHA 固定。

**CI 文件不等于分支保护。** 如需阻止测试失败的代码合入，需在 GitHub 单独将 `Validate and package` 设置为 `main` 的必需检查，并配置 PR 合并规则。本轮不默认更改仓库权限、可见性或保护策略。

## 项目结构

```text
index.html / app.js / content.js   当前原型入口、交互与静态新闻
styles.css / architecture.css     外壳控件与编辑布局
assets/brand/                     用户指定的 icon.svg / logo.svg
assets/*.jpg                      主题示意配图
design/                          设计契约、Token、组件、字体、样板与评审资料
docs/production/                 尚未实现的生产架构与数据契约
docs/history/                    原 README 的历史变更记录
scripts/                         构建、受限本机预览、测试编排与文件白名单
tests/                           设计、业务、浏览器、工程与来源测试
.github/workflows/               仅验证和打包的 CI
```

## 设计与行为约束

修改前请阅读：

1. [`AGENTS.md`](AGENTS.md) 与 [产品上下文](.impeccable.md)
2. [设计规范](design/DESIGN-SYSTEM.md)
3. [Token](design/tokens.css)、[组件](design/components.css)、[样板](design/styleguide.html)
4. [卡片内容契约](design/CARD-CONTENT.md)与[原文阅读器契约](design/ARTICLE-READER.md)

保持无衬线字体与指定品牌资产；每期 Top 5 + 7；收藏和已读互不替代。存储键仍为 `afi-editorial-prototype-v1`，不要为工程整理更名。`assets/brand/icon.svg` 用于 favicon，`assets/brand/logo.svg` 用于页面品牌；旧 Logo 方案不决定现有 UI。

## 已知边界与下一阶段

- Noto Sans SC 未打包；中文当前使用系统回退。Barlow 已本地提供。
- Safari / Firefox、屏幕阅读器、真实 200% / 400% 浏览器缩放、真实设备和弱网性能仍待验收。
- 当前 12 条只有原文摘录；全文阅读器样例为测试夹具，不代表已取得第三方全文或逐图转载依据。
- 当前账号为本机演示，收藏/已读仅存当前浏览器，不是认证或云同步。
- 正式生产系统仍是设计文档：[架构](docs/production/ARCHITECTURE.md)、[Agent 契约](docs/production/AGENT-CONTRACTS.md)、[数据与配额](docs/production/DATA-AND-QUOTAS.md)。
- 工程准备与验收边界见 [ENGINEERING.md](docs/ENGINEERING.md)；设计检查历史见 [VALIDATION.md](design/VALIDATION.md)。
- 旧 ZIP 是本机历史快照，不是当前版本，不自动重新生成。历史 README 保存在 [变更记录](docs/history/PROTOTYPE-CHANGELOG.md)。

## 内容、素材与许可

本仓库**尚未选择或授予开源许可证**（`package.json` 标记 `UNLICENSED`）；公开可见不代表对代码、品牌或第三方素材授予统一许可。第三方权利说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

新闻标题、短摘录、发布方及真实日期见 [`content.js`](content.js)，来源核对台账见 [`design/news-sources.json`](design/news-sources.json)。四张照片仅为主题示意图；视频是延伸学习材料，不是对应新闻事件证据。正式公开商用前仍需完成素材使用依据复核。
