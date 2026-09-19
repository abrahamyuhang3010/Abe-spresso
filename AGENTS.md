# Abespresso 项目约束

## 设计入口（前端任务必须先读）
1. `.impeccable.md`：产品上下文。
2. `design/DESIGN-SYSTEM.md`：设计规范与页面/组件契约。
3. `design/tokens.css`：设计数值唯一来源。
4. `design/components.css`、`design/styleguide.html`：复用组件与样板。

最新明确的用户要求优先。新规范替代历史“宋体新闻标题”方向，Logo 历史资产不决定 UI 字体。

## 强约束
- 中英文标题和正文均为无衬线；Barlow 在字体栈前，Noto Sans SC 为指定中文主字体，保留思源黑体/苹方/雅黑回退。不得引入 Georgia、Songti、Noto Serif。
- 复用 `--ab-*` Token，正文≥1rem、详情1.125rem、元数据和按钮≥.875rem；不得新增9–11px文本。
- 使用用户 Logo 洋红 #F50057 / 深莓 #AD1457 / 蒸汽暖灰 #BCAAA4 派生的色彩系统；普通白字按钮用深莓色，不用亮洋红。新闻编辑式、有主次的图文网格；不用渐变、霓虹、仪表盘卡片墙、正文投影、装饰动画。
- 不新增全局覆盖文件，不用 `!important` 修补；业务组件在源定义处修改。旧样式逐组件迁移，不能把未迁移部分声称已达标。
- 保留 Today / Archive / Saved、每期12条（Top 5+7）、示例标识、来源角色及独立收藏/已读语义；不得擅改存储键、路由、日期和产品范围。
- 缩略图标使用 `assets/brand/icon.svg`；页面内品牌使用 `assets/brand/logo.svg`。不重绘、换色、拉伸或混用；字体仍遵守无衬线规则。
- 展示品牌暂为 Abe-spresso，标语 A daily shot of AI.；不擅自重新命名现有品牌资产。
- 新控件点击区域≥44px，可见键盘焦点，使用语义HTML；不嵌套交互；弹窗使用原生dialog并恢复焦点。
- 双语与320/375/768/1024/1440响应式需验证；CJK字体未打包时如实注明回退状态。
- 修改后执行 `tests/design-system.test.cjs`；业务改动还需执行 `tests/prototype.test.cjs`（需要jsdom），并执行 `tests/browser-regression.cjs`（需要 Playwright + Chrome）做浏览器视觉回归。交付说明区分通过、未验证和遗留项。

## 当前迁移边界
v1.2 已按组件迁移 `styles.css`（外壳/控件/浮层）与 `architecture.css`（编辑布局/页面组件）的字号、间距和断点；不得恢复先定义后覆盖的旧级联。CJK字体分片、跨浏览器和真实缩放验收仍未完成，详见 `design/VALIDATION.md`。不得为满足规范检查直接关闭测试、隐藏内容或删除既有功能。ZIP是旧快照，不自动代表当前源文件。
