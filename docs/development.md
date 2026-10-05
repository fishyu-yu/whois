# 开发与验证

[返回项目说明](../README.md)

## 本地开发

准备 Node.js 22 或更新版本及 npm，推荐使用 `.nvmrc` 指定的 Node.js 24。

```bash
npm ci
npm run dev
```

开发服务默认在 <http://localhost:3000>，
需要更换端口时运行 `npm run dev -- -p 3001`。
查询功能默认不需要 `.env`、数据库、API Key 或系统 `whois` 命令。
真实查询仍需要访问 IANA、注册局及注册商服务，WHOIS 需要 TCP 43 出站。

## 自动化检查

```bash
npm test
npm run lint:all
npm run build
npm run typecheck
```

先构建再执行 TypeScript 检查，以便使用 Next.js 生成的类型文件。
构建配置忽略 ESLint 错误，因此代码检查需要单独运行。

| 命令 | 内容 |
| --- | --- |
| `npm test` | 通过 Node 测试运行器及 `tsx` 执行单元和 API 测试 |
| `npm run lint:code` | ESLint 检查 |
| `npm run lint:style` | 检查 `src/**/*.css` |
| `npm run lint:md` | 检查 `README.md` 的 Markdown |
| `npm run lint:all` | 依次执行代码、CSS 和 README 检查 |
| `npm run build` | Next.js 生产构建 |
| `npm run typecheck` | `tsc --noEmit` |

`lint:md` 当前仅覆盖 README；修改文档时可额外执行：

```bash
npx markdownlint README.md "docs/**/*.md"
```

单元与 API 测试使用模拟 RDAP 响应和本地 TCP 服务，
不要求访问外部注册局。覆盖域名与国别字段解析、IDN、注册域名识别、
GET/POST、来源选择、回退、错误、超时、响应大小限制，
以及 IPv6/CIDR、ASN 边界、网络转介、资源范围校验和查询路径规范化。

## 浏览器回归

```bash
npx playwright install chromium
npm run build
npm run test:e2e
```

Windows 已安装 Microsoft Edge 时，可在同一 PowerShell 终端设置：

```powershell
$env:PLAYWRIGHT_CHANNEL='msedge'
npm run test:e2e
```

默认启动 3002 端口的生产服务，使用模拟 API 响应，
覆盖 320、390、768、1440 像素宽度及浅色、深色主题。
检查域名、IPv4、IPv6、CIDR、ASN 查询的布局、分享路径、刷新、
前进/后退、历史记录、输入错误和服务错误恢复，
以及折叠区独立操作、键盘操作、复制、PNG/JSON/CSV 导出和导出失败重试。

报告保存在 `.local/playwright-report/`，
截图、失败跟踪等测试产物保存在 `.local/playwright-results/`。
这些目录由 Git 忽略。配置见
[`playwright.config.ts`](../playwright.config.ts)。

## 真实注册局检查

先启动应用，再在另一个终端运行以下命令。
`--base` 可替换为部署地址，用于检查实际环境的出站网络和查询能力。

```bash
# 28 个国别后缀，每个选取一个已注册域名
npm run test:live -- --base http://localhost:3000

# 仅验证指定域名
npm run test:live -- --domains baidu.cn,jprs.jp --base http://localhost:3000

# 五大区域机构的 IP、CIDR 与 ASN；默认检查 auto 和 whois
npm run test:networks -- --base http://localhost:3000

# 同时检查强制 RDAP 模式
npm run test:networks -- --sources auto,rdap,whois --base http://localhost:3000
```

| 脚本 | 参数与默认值 |
| --- | --- |
| `test:live` | `--domains` 为逗号分隔域名；省略时检查内置 28 个样例 |
| `test:live` | `--source auto` 指定查询来源 |
| `test:live` | `--output .local/cctld-results.json` 指定报告路径 |
| `test:networks` | `--sources auto,whois` 为逗号分隔来源 |
| `test:networks` | `--output .local/network-live-results.json` 指定报告路径 |
| 两个脚本 | `--base http://localhost:3000` 指定服务地址 |

国别脚本校验 HTTP 状态、成功标志、原始记录非空，
以及返回域名与请求是否一致，比较时统一大小写和 IDN/ASCII。
网络脚本校验查询值、类型、区域机构、资源范围字段、原始数据和实际来源。
每次请求的客户端等待上限为 60 秒；任一检查失败时返回非零退出码。
报告只记录检查结果、来源、用时及错误等摘要，不保存原始记录或联系人字段。

真实查询受网络、上游限流、记录变化和注册局授权影响，
因此与普通自动化测试分开运行。
`.es` WHOIS 需要按
[Dominios.es 说明][es-whois]申请查询服务器的出站 IP 授权。
其他平台的网络条件见[部署说明](deployment.md)。

历史实测与已知限制见：

- [国别域名验证报告](cctld-verification.md)
- [IP / ASN 查询验收报告](network-verification.md)

报告中的结果对应其验证日期与环境，不能作为当前服务可用性的保证。

[es-whois]: https://www.dominios.es/es/sobre-dominios/valores-anadidos/whois-43

## 代码导航

| 路径 | 职责 |
| --- | --- |
| `src/app/[[...query]]/page.tsx` | 首页及统一查询路由 |
| `src/app/api/whois/route.ts` | HTTP API、校验、缓存与来源选择 |
| `src/components/query-page.tsx` | 查询状态、地址栏与最近 20 条本机历史 |
| `src/components/whois-form.tsx` | 输入、类型识别与注册域名提示 |
| `src/components/whois-result.tsx` | 结构化结果、原始数据、复制与导出入口 |
| `src/components/result-disclosure.tsx` | 结果详情的独立折叠区 |
| `src/lib/query-utils.ts` | IPv4/IPv6、CIDR 与 ASN 校验及规范化 |
| `src/lib/query-path.ts` | 输入、可读分享路径及旧版编码链接处理 |
| `src/lib/domain-utils.ts` | 域名校验、IDN 转换与注册域名识别 |
| `src/lib/cctld-database.ts` | 国别域名信息及 WHOIS 服务器映射 |
| `src/lib/rdap-client.ts` | 域名 RDAP 引导、请求、注册商补充与缓存 |
| `src/lib/rdap-parser.ts` | 域名 RDAP 字段解析及文本转换 |
| `src/lib/whois-client.ts` | TCP WHOIS、IANA 发现与注册商转介 |
| `src/lib/whois-parser.ts` | 域名 WHOIS 校验与字段解析 |
| `src/lib/network-client.ts` | IP/ASN 的 IANA 引导、RDAP、WHOIS 与转介 |
| `src/lib/network-parser.ts` | 网络字段解析及返回资源范围校验 |
| `src/lib/export-utils.ts` | PNG 生成、CSV 转义与文件下载 |
| `public/manifest.json`、`public/sw.js` | 安装式 Web 应用及资源缓存 |
| `tests/`、`tests/e2e/` | 单元、API 与浏览器回归测试 |
| `scripts/` | 国别域名与网络资源的实网检查脚本 |
| `docs/` | API、开发部署说明及有日期的验收记录 |

生产与 Cloudflare beta 部署步骤见[部署说明](deployment.md)。
