# Whale Whois UI/UX 重构交付记录

日期：2026-10-18（Asia/Shanghai）。

## 代码基线与范围

已执行 `git fetch origin --prune`，从 GitHub 最新 `origin/master`
（`06b4a37`）创建 `codex/warm-ui-modernization` 分支。本地原 `master`
未被重置。改造直接在现有 Next.js / React / Tailwind / Radix 项目上实施。

API 路由、公开 GET/POST 参数与响应契约、WHOIS/RDAP 网络客户端和解析器、
查询规范化/公共后缀逻辑、许可证、Logo 与 Wrangler 运行时配置均无代码变更。
没有新增运行时依赖、服务或数据库，没有操作生产环境。
后续按用户明确要求提交并推送至 GitHub `beta` 分支，
并部署独立的 Cloudflare `whois-beta` Worker、配置原生 Git 自动部署。
`master` 分支和现有生产网站未修改。

## 实现内容与设计决策

- 使用暖白、炭黑、中性文字和陶土色动作建立统一 OKLCH 语义 Token。
  保留 Whale 独立品牌，减少渐变、毛玻璃、重阴影及后台式装饰。
- 首页以一个标题和一个查询框为中心，提供真实类型识别、示例填入、
  子域名规范化提示和明确错误。首页标题的可访问名称仍为 `Whois 查询`。
- 搜索框固定提交按钮，支持 Enter、中文 IME、`/` 和 Ctrl/Cmd+K。
  全局快捷键不抢占输入框、编辑器、菜单及历史弹层。
- 查询中可以立即提交下一个对象，AbortController 取消旧请求，原有
  requestId 防线保留；浏览器前进/后退、刷新、分享路径仍与查询同步。
- 历史使用可收起左侧抽屉，桌面保持完整阅读宽度，手机使用同一套原生
  dialog 语义。支持初始焦点、Tab 循环、Escape、遮罩关闭和焦点恢复。
  沿用 `whois_history`、原对象结构与 20 条限制。
- 结果摘要展示查询对象、类型、实际来源、查询时间与核心组织信息。
  域名与网络使用一致布局；日期、国家和联系方式只按返回值呈现。
  注册地区不会被表述为实时地理位置，缺失联系人不会被推断为隐私保护。
- 所有长域名、IPv6、DNS、邮箱、地址和原始内容允许换行。手机导出栏
  使用两列布局，主要操作至少 44px；桌面结果最大宽度 1024px。
  Header 在 200% 文字缩放下自动换行；字段计数作为按钮之外的辅助信息，
  避免可见标签与可访问名称不一致。
- 全部字段、原始数据保留独立折叠与 ARIA 关联，默认收起。PNG 仍在
  隔离副本中展开完整字段，不改变页面折叠或滚动状态。
- 修复异步图片模块加载时切换查询导致旧结果被卸载、导出宽度丢失的
  竞态：在第一个 await 之前捕获副本。JSON/CSV/复制完整保留，域名 CSV
  补充此前缺失的注册机构特有字段。图片背景在编码前读取，避免模块加载
  期间切换主题造成新旧颜色混合。
- 图片模块和结果展示均按需加载，查询时并行预加载展示模块。保留原有
  Inter，使用可选加载与系统回退，避免慢连接下字体后续替换。
  首页首次
  加载 JavaScript 从本轮初始构建的 230kB 降至 221kB。
  联系人组件移出父组件，避免复制/导出状态更新
  时重复卸载。输入解析按输入值复用，不引入动画库或额外字体。
- 旧 560–700ms 布局/嵌套交错动画缩短为 150–280ms。Hero 以有界网格行
  和搜索区间距过渡，结果轻量出现；动画不阻止提交，也不制造请求延时。
  完整支持系统减少动态效果，Light / Dark / System 三种主题保留。

## 修改和新增文件

| 类别 | 文件 |
| --- | --- |
| 设计 Token | `src/app/globals.css` |
| 字体 | `src/app/layout.tsx` |
| 查询页面 | `src/components/query-page.tsx` |
| 历史抽屉（新增） | `src/components/history-panel.tsx` |
| 搜索框 | `src/components/whois-form.tsx` |
| 导航 | `src/components/header.tsx` |
| 布局 | `src/components/layout-wrapper.tsx` |
| 主题 | `src/components/theme-toggle.tsx` |
| 结果 | `src/components/whois-result.tsx` |
| 折叠 | `src/components/result-disclosure.tsx` |
| 按钮 | `src/components/ui/button.tsx` |
| 卡片 | `src/components/ui/card.tsx` |
| 输入 | `src/components/ui/input.tsx` |
| 图片竞态修复 | `src/lib/export-utils.ts` |
| 浏览器矩阵 | `playwright.config.ts` |
| 回归 | `tests/e2e/network.spec.ts` |
| UI 回归（新增） | `tests/e2e/ui.spec.ts` |
| 测试夹具（新增） | `tests/e2e/fixtures/whois.ts` |
| 验证配置 | `eslint.config.mjs`（排除本地 `.claude` 和构建产物，不排除业务代码/测试） |
| 文档 | 更新 `DESIGN_SYSTEM.md`、新增本文件 |
| 手动备用工作流 | `.github/workflows/deploy-beta.yml` |
| 自动部署文档 | `docs/deployment.md`、`docs/github.md` |

## 验证记录

验证在 Node.js 24.20.0、npm 11.19.0、Windows、本机 Next 生产构建上执行。

| 命令 | 结果 |
| --- | --- |
| `npm ci` | 成功，按原锁文件安装 811 个包；未修改依赖声明或锁文件 |
| `npm run typecheck` | 通过 |
| `npm run lint:code` | 通过，0 错误；7 个既有警告位于未修改的业务/配置文件 |
| `npm run lint:style` | 通过 |
| `npm test` | 34/34 通过 |
| `npm run build` | 通过，Next.js 15.5.27 Turbopack 生产构建 |
| `npm run test:e2e` | 最终冻结版本：143 通过、7 跳过、0 失败，耗时 2.2 分钟 |

首次安装受 Windows 沙箱 EPERM 限制；首次网络单元测试受回环连接 EACCES
限制；首次 Turbopack 构建受子进程通信限制。获得工具自动审批后，在允许
本地通信的环境中复测通过，没有降低测试断言来绕过环境问题。

第一轮浏览器测试发现原生 dialog 的 Tab 边界会进入浏览器工具栏，已通过
显式边界循环修复，再次执行完整套件。所有原有查询/导出测试保留，新增
IME、快捷键、历史焦点、取消、过期响应、长字段与异步 PNG 导出回归。
7 个跳过项是同一异步导出竞态在其他视口上的重复组合，该专项明确在
`1440-light` 执行通过；原有域名/IP/ASN PNG 导出仍覆盖完整原始视口矩阵。
导出副本设为 inert，等待模块期间也不会把 Tab 焦点带入屏幕外的控件。
新增该断言后，导出专项再次单独复测：1/1 通过（2.0 秒），同时覆盖切换
查询、切换主题、导出内容完整性与不可聚焦行为。

### 真实上游冒烟

通过未拦截的 `/api/whois?q=...` 验证：

| 查询 | HTTP | 实际来源 | 解析字段数量 |
| --- | --- | --- | --- |
| `google.com` | 200 | `rdap-registrar` | 22 |
| `8.8.8.8` | 200 | `rdap-rir` | 27 |
| `AS15169` | 200 | `rdap-rir` | 21 |

E2E 的固定数据仅存在于测试/审计浏览器的路由拦截中，生产代码没有 Mock。

### 后续授权的 Cloudflare beta 部署

已将 `whois-beta` 发布到 <https://whois-beta.yangzhan-ms.workers.dev>，
并在该 Worker 保存 GitHub 仓库 `fishyu-yu/whois` 的 Workers Builds 连接。
该独立 Worker 的生产分支为 `beta`，根目录 `/`，其他分支预览关闭；
此设置不改变 GitHub 默认分支 `master` 或现有生产入口。

原生构建依次执行 `lint:all`、`test`、`build:beta`、`typecheck`，
随后执行 `npm run deploy:beta`。复用现有 `whois build token`，
启用构建缓存并设置 `NEXT_TELEMETRY_DISABLED=1`，未新建 secret。
后续 beta 推送由 Cloudflare 自动构建；具体提交是否部署成功，
以 Cloudflare Builds 日志、部署状态及实际 API 验证为准。
连接保存时尚未发生首次自动构建；本次文档与工作流更新的 beta 推送，
将用于验证真实 Git 自动触发，结果以 Cloudflare 回读为准。

已在实际 Cloudflare beta 地址检查：首页 HTTP 200 且展示新界面；
以下未拦截的查询均 HTTP 200，响应均少于 2 秒：

| 查询 | 实际来源 | 解析字段数量 |
| --- | --- | --- |
| `google.com` | `rdap-registrar` | 22 |
| `8.8.8.8` | `rdap-rir` | 27 |
| `AS15169` | `rdap-rir` | 21 |
| `baidu.cn`（强制 WHOIS） | `registry` | 16 |

这是 beta 边缘运行时的验证，不能替代首次原生自动构建验证。
脱敏结果保存在被 Git 忽略的 `.local/cloudflare-beta-live-smoke.json`，
没有提交原始联系人数据。

最初 GitHub Actions 自动部署因缺少 `CLOUDFLARE_API_TOKEN`，
在凭据检查处失败。原生 Workers Builds 使用 Cloudflare 构建令牌，
无需该 GitHub secret。现有 Actions 已取消 push 触发器，
保留仅允许 `beta` 的手动备用部署，备用路径仍需要该 secret。
完整配置见 [部署指南](docs/deployment.md)。

## 视觉、无障碍与性能

Playwright 覆盖 320px 兼容宽度及要求的 360 / 390 / 768 / 1024 / 1440 /
1920px，两种明暗主题：首页、长 IPv6 摘要、展开完整数据均保存截图，
并检测文档/内容横向溢出、主要动作尺寸及浏览器错误。

axe-core 4.14.0 在 Chrome 155 对 390/1440px、浅色/深色的首页、ASN 收起、
ASN 展开和历史弹层共 16 种状态扫描：0 违规，包括实际文字对比度检查。
200% 文字缩放下的首页/结果/展开数据/历史抽屉在 390px 与 1440px 的
8 项几何检查均无横向溢出。

普通动态效果模式下，通过真实键盘和鼠标事件记录的 16 次实验室交互，
最大事件时长 16ms，最大输入延迟 4.3ms。这是受控交互样本，不等同于
生产用户的 INP 百分位数据，也没有用 Lighthouse TBT 替代 INP。

### Lighthouse

Lighthouse 13.5.0 / Chrome 155，在本机生产服务独占测量，使用默认移动
Slow 4G / 4×CPU 模拟和桌面 preset。没有与 E2E 并发测量，没有审计警告。

| 指标 | 移动端 | 桌面端 |
| --- | --- | --- |
| Performance | 96 | 100 |
| Accessibility | 100 | 100 |
| LCP | 2.744s | 0.575s |
| CLS | 0 | 0 |
| TBT | 22ms | 0ms |
| FCP | 1.222s | 0.329s |

桌面 LCP 和两端 CLS 达标。移动模拟 LCP 仍比 2.5s 目标高 0.244s，
不能报告为全面达标。按需拆分减少了首页 JS，并降低早期测试的阻塞时间；
最后一次字体策略调整没有改善该次模拟 LCP，不声称它带来量化提升。
真实现场 INP 仍需部署后采样。本机上游服务与桌面硬件结果不能代表全球
网络或真实手机；Lighthouse 导航测试也不测查询服务实际完成时间。

可复查的本地报告：

- `.local/audits/README.md`：工具、方法、实验与限制。
- `.local/audits/lighthouse-mobile.report.html` / `.json`。
- `.local/audits/lighthouse-desktop.report.html` / `.json`。
- `.local/audits/accessibility.json`：axe、200% 文字缩放及普通动效交互。
- `.local/playwright-report/index.html`：完整回归报告。
- `.local/test-e2e-final.log`：最终冻结版本的完整浏览器回归日志。
- `.local/test-export-focus.log`：导出焦点/查询/主题竞态的最终专项复测。

### 最终截图

自动化矩阵截图位于 `.local/playwright-results/`；下列干净截图使用未拦截的
真实 API（首页无查询数据），位于 `.local/visual-review/`：

- `home-1440-light.png` / `home-1440-dark.png`：桌面首页。
- `home-390-light.png` / `home-390-dark.png`：移动首页。
- `google-com-1440-light.png`：真实域名查询结果。
- `8-8-8-8-390-dark.png`：真实 IP 查询结果。
- `history-390-dark.png`：移动历史抽屉。
- `live-review.json`：来源、字段数、溢出/遮挡及浏览器错误检查。

已人工打开检查桌面与手机、明暗主题，以及真实结果和历史抽屉。
未发现横向溢出、字段被截断、控件重叠或阻断操作的遮罩。

## 已知限制与风险

- `npm ci` 对既有锁文件报告 24 项漏洞（3 low、3 moderate、18 high）。
  本次未升级依赖或执行可能影响 OpenNext/查询逻辑的自动修复。
- 真实注册信息随上游改变；实时网络耗时不属于前端动画时间。
- 慢速移动网络模拟 LCP 尚未达到 2.5s，见上方完整数值；未将高性能分数
  或本机快速响应当作该指标已达标的依据。
- 测试浏览器为本机 Chrome，未将桌面视口模拟等同于真实手机硬件或
  Safari / Firefox 验证。现场 INP 与全球网络表现需要部署后的真实样本。
- Node 生产构建完成，并在后续授权下发布独立 Cloudflare beta Worker。
  OpenNext 和 Wrangler 运行时配置保留；自动部署改用 Workers Builds，
  Actions 仅作手动备用。真实 Cloudflare 上游可用性仍应持续按实际查询核验。
