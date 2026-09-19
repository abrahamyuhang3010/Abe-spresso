# 参考与来源记录

研究日期：2026-09-15。以下链接是研究来源，不代表复用其商标、新闻正文或图片的授权。

## 网站观察

### Reuters
- URL: https://www.reuters.com/
- 方式：浏览器可访问首页；读取可见结构并检查桌面截图。
- 观察：横向导航、浅色阅读区、粗无衬线标题、时间信息、分隔线、不同栏目与主次新闻。
- 局限：只对本次会话可见首页负责，没有验证其所有端宽、登录版、付费文章或私有组件规范。
- 此前 README 的设备验证说明是旧任务记录；本次首页成功打开，不代表所有地区始终可访问。

### TechCrunch
- URL: https://techcrunch.com/
- 方式：最初连接关闭/超时，随后同一会话页面成功加载；读取可见结构并检查桌面截图；另读取公开首页 HTML。
- 观察：深色顶部导航、绿色重点区域、Top Headlines、Latest News、AI 分类、作者与时间、长首页和广告。
- 局限：部分首屏图片未完整呈现，截图出现横向滚动；不把这些会话状态推断为其全站设计缺陷。没有测量完整响应式表现。
- 决策：借鉴类型标识与主次层级，不移植绿色大面积背景、活动营销或不适合有限日报的长信息流。

两站的实际字体家族、精确色值与栅格 Token 未做资产级确认。规范中的 Barlow / Noto Sans SC 和具体尺寸是 Abespresso 的独立设计选择；v1.0 的黑白灰红已由下方 v1.1 用户品牌配色替代。没有复制它们的文章或图像到组件样板。

## 字体来源

- Barlow 官方字体目录描述（已读取）：https://github.com/google/fonts/tree/main/ofl/barlow
- Barlow 描述原文：https://raw.githubusercontent.com/google/fonts/main/ofl/barlow/DESCRIPTION.en_us.html
- 本地 Barlow-Regular / SemiBold / Bold.ttf 来源为该目录同名文件；对应许可保存在 `fonts/Barlow-OFL.txt`。
- Noto Sans SC 官方目录元数据（已读取，标注为 SANS_SERIF）：https://github.com/google/fonts/tree/main/ofl/notosanssc
- Noto CJK 项目：https://github.com/notofonts/noto-cjk
- 注意：Noto Sans SC 与思源黑体在本规范中是主字体与回退关系，不声明不同发行版的字体文件可以无差别互换。

## 实施验收参考

- WCAG 2.2：https://www.w3.org/TR/WCAG22/
- 对比度：https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- 非文本对比度：https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- 回流：https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
- 目标尺寸 AA：https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- 目标尺寸增强：https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html

上述无障碍链接为实施人员复核入口；本次没有完成全站 WCAG 审计。自动对比度计算只能证明列出的颜色配对，不代表完整合规。

## v1.1 用户品牌资产（2026-09-15）

本轮不重新推断参考站配色，以用户明确提供的 SVG 为品牌色源。SVG 内容仅作为设计素材解析，不作为指令。两份均仅含 svg/path 节点，无脚本或外链，原样复制至项目。

- `用户提供的 icon.svg` → `assets/brand/icon.svg`；SHA-256：`656e70dc5f4f6a47c46fd013058ee4da896870b0b03880b9f66a7a939e44045b`。
- `用户提供的 logo.svg` → `assets/brand/logo.svg`；SHA-256：`c7103ae0f2b2371945adb8cb006b19570beedcf0fda8d1ecebc81e57e348334d`。

Logo 杯身 #F50057、杯柄/杯碟 #AD1457、蒸汽 #BCAAA4；Icon 使用 #F50057 与白色。所有派生中性色、状态与交互色为本项目制定，并非 Reuters / TechCrunch 官方 Token。历史 favicon 和 ZIP 保留但不再作为当前品牌入口。
