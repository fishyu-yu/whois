# Whale Whois · 域名与网络注册信息查询

![Whale Whois — 域名与网络信息查询](public/logo-lockup.svg)

一个可自行部署的 WHOIS / RDAP 查询工具。输入域名、IP、CIDR 或 ASN，
即可查看注册信息、数据来源和原始响应，并导出查询结果。

基于 Next.js 15、React 19、TypeScript 与 Tailwind CSS 4，使用 Node.js 直接查询上游服务。
无需 API Key、数据库或系统 `whois` 命令。

## 功能

- **域名查询**：支持常见通用域名、国别域名及中文域名，自动转换 IDN/Punycode。
- **网络查询**：支持 IPv4、IPv6、CIDR 和 ASN，覆盖五大区域互联网注册机构。
- **自动选择来源**：优先 RDAP，服务不可用时回退 TCP WHOIS；API 可指定查询来源。
- **可分享的查询路径**：支持直接访问、刷新、浏览器前进/后退和旧版编码链接。
- **结果导出**：下载 PNG、JSON 或 CSV；PNG 保留当前主题、结构化字段及查询时间。
- **使用体验**：适配手机与桌面，支持浅色/深色主题和保存在本机的查询历史。

网络结果表示资源的注册与分配信息；注册地区不等同于 IP 实际位置，
查询结果也不提供实时 BGP 路由信息。

## 本地运行

准备 Git、Node.js 22 或更新版本及 npm。推荐使用 `.nvmrc` 指定的 Node.js 24。

```bash
git clone https://github.com/fishyu-yu/whois.git
cd whois
npm ci
npm run dev
```

打开 <http://localhost:3000>。默认不需要创建 `.env` 文件。
更换端口可运行 `npm run dev -- -p 3001`。

## 使用示例

在搜索框输入查询值，或直接打开对应路径：

| 查询类型 | 输入示例 | 页面路径 |
| --- | --- | --- |
| 域名 | `baidu.cn` | `/baidu.cn` |
| IPv4 | `8.8.8.8` | `/8.8.8.8` |
| IPv6 | `2001:4860::8888` | `/2001:4860::8888` |
| IPv4 网段 | `8.8.8.9/24` | `/8.8.8.0/24` |
| IPv6 网段 | `2001:4860::/32` | `/2001:4860::/32` |
| ASN | `15169` 或 `AS15169` | `/AS15169` |

CIDR 会清除主机位，ASN 会统一大小写并移除前导零。
搜索框也接受 `/baidu.cn` 这样的站内查询路径。

结果页可展开原始数据、复制或下载。PNG 在浏览器本地生成，
不包含操作按钮和原始数据折叠区；需要保存原始查询文本时请选择 JSON 或 CSV。
历史记录保存在当前浏览器，不会在设备间同步。

## 查询原理与国别域名

域名查询通过 IANA 引导表选择 RDAP 服务，使用本地已核实的映射补充。
自动模式在 RDAP 不可用时通过 Node.js TCP 套接字查询 WHOIS。
注册商补充查询失败时仍保留有效的注册局记录。
域名 RDAP 明确返回未注册时直接返回 404；网络 RDAP 返回 404 时，
自动模式会再通过 WHOIS 核实资源是否存在。

针对国别注册局的差异，项目包含专门处理：

| 后缀 | 处理方式与限制 |
| --- | --- |
| `.cn` | 使用 CNNIC WHOIS，部署环境必须允许 TCP 43 出站 |
| `.jp` | 使用 JPRS 英文查询格式，解析对应字段 |
| `.tw` | 使用域名服务器 `whois.twnic.net.tw` |
| `.es` | WHOIS 需要注册局授权服务器的出站 IP |

国别 WHOIS 地址来自本地数据库；未收录后缀尝试通过 IANA 查找。
IP/ASN 使用 IANA 网络引导表，并支持区域机构之间的已核实转介，
包括 LACNIC 到 Registro.br；返回的资源范围必须包含所查询的资源。

历史实测结果与已知限制见：

- [国别域名验证报告](docs/cctld-verification.md)
- [IP / ASN 查询验收报告](docs/network-verification.md)

报告中的结果对应各自标注的验证日期，不代表上游服务始终可用。

## HTTP API

GET 和 POST 使用相同的校验与查询逻辑。

```text
GET /api/whois?q=baidu.cn&dataSource=auto
GET /api/whois?q=8.8.8.0%2F24&type=ip
GET /api/whois?q=AS15169&type=asn
```

```http
POST /api/whois
Content-Type: application/json

{
  "query": "baidu.cn",
  "type": "domain",
  "dataSource": "auto"
}
```

| 参数 | 说明 |
| --- | --- |
| `query` | POST 的必填查询值；GET 使用 `q` |
| `type` | `domain`、`ip`、`asn`；省略或使用 `auto` 时自动识别 |
| `dataSource` | 可选，默认为 `auto`，行为见下表 |

ASN 的有效范围为 1–4294967295，CIDR 使用 `type=ip`。

| 数据源 | 域名查询 | IP / ASN 查询 |
| --- | --- | --- |
| `auto` | 优先 RDAP，不可用时回退 WHOIS | 优先 RDAP，失败时通过 WHOIS 核实 |
| `rdap` | 仅 RDAP | 仅 RDAP |
| `whois` | WHOIS，尝试注册商补充查询 | 网络 WHOIS |
| `registrar` | 优先注册商 WHOIS，失败时保留注册局记录 | 不支持，返回 400 |
| `registry` | 仅注册局 WHOIS，不跟随注册商转介 | 等同于 `whois` |

成功响应示例（节选）：

```json
{
  "query": "baidu.cn",
  "type": "domain",
  "success": true,
  "data": {
    "query": "baidu.cn",
    "type": "domain",
    "dataSource": "registry",
    "raw": "Domain Name: baidu.cn\n...",
    "parsed": {
      "domain_name": "baidu.cn"
    }
  },
  "error": null
}
```

`data.raw` 为查询文本，`data.parsed` 为结构化字段；实际字段取决于查询类型和上游公开信息。
失败时 `success` 为 `false`、`data` 为 `null`，`error` 提供错误说明。

| HTTP 状态 | 含义 |
| --- | --- |
| `200` | 查询成功 |
| `400` | 输入非法或不支持的查询选项 |
| `404` | 域名未注册或网络资源记录未找到 |
| `502` | 上游不可用、超时、空响应或限流等查询失败 |

成功结果按查询类型、规范化查询值和数据源在进程内缓存 5 分钟，最多 500 条。
失败结果不进入成功缓存，多实例之间不共享缓存。

## 生产部署

应用需要支持 Node.js 的部署环境，不能使用纯静态托管或 Edge Runtime。

```bash
npm ci
npm test
npm run lint:all
npm run build
npm run typecheck
npm start
```

`npm start` 默认监听 3000 端口，可通过 `npm start -- -p 3001` 更改。
自行托管时，应使用进程管理器保持服务运行，并通过反向代理提供 HTTPS。
更新版本后需要重新安装锁定依赖、构建并重启服务。

部署平台需要满足以下网络条件：

- 允许访问 IANA 和各注册机构的 HTTP/HTTPS 服务。
- 允许 TCP 43 出站，否则 `.cn` 等依赖 WHOIS 的查询会失败。
- 单次 RDAP 请求超时为 10 秒，单次 WHOIS 为 12 秒；
  回退与转介可能产生多次请求，平台总请求时限应留足余量。
- WHOIS 响应上限为 1 MiB，网络 RDAP 响应上限为 2 MiB。
- 查询 `.es` 前需按 [Dominios.es 说明][es-whois]申请出站 IP 授权。

仓库不包含绑定具体平台的自动部署工作流。
如果托管平台已连接 GitHub，请将生产分支设为 `master`，并在推送后确认构建与部署结果。
推送成功本身不代表线上服务已更新。
部署后可使用下方实网脚本，将 `--base` 设置为生产地址检查查询能力。

[es-whois]: https://www.dominios.es/es/sobre-dominios/valores-anadidos/whois-43

## 测试与验证

### 本地自动化检查

```bash
npm test
npm run lint:all
npm run build
npm run typecheck
```

单元与 API 测试使用模拟 RDAP 响应和本地 TCP 服务，无需访问外部注册局。
覆盖国别域名解析、中文域名、GET/POST、回退、错误、超时、响应大小限制，
以及 IPv6/CIDR、ASN 边界、转介、资源范围校验和查询路径规范化。

### 浏览器回归

```bash
npx playwright install chromium
npm run build
npm run test:e2e
```

Windows 已安装 Edge 时，可先在 PowerShell 设置：

```powershell
$env:PLAYWRIGHT_CHANNEL='msedge'
```

测试默认启动 3002 端口的生产服务，覆盖 320、390、768、1440 像素宽度及浅色/深色主题，
检查查询、分享路径、刷新、历史记录、错误恢复和 PNG/JSON/CSV 导出。
报告及截图位于 `.local/playwright-report/` 和 `.local/playwright-results/`。

### 真实注册局检查

先启动应用，再在另一个终端运行：

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

脚本校验响应状态与结果字段，任一检查失败时返回非零退出码。
报告默认保存到已被 Git 忽略的 `.local/` 目录，不包含联系人个人数据。
真实查询受出站网络、上游限流与注册局授权影响，因此与普通自动化测试分开运行。

## 代码导航

| 路径 | 职责 |
| --- | --- |
| `src/app/[[...query]]/page.tsx` | 首页及统一查询路由 |
| `src/app/api/whois/route.ts` | HTTP API、校验、缓存与来源选择 |
| `src/components/query-page.tsx` | 查询状态、地址栏与历史记录 |
| `src/components/whois-form.tsx` | 输入与查询类型识别 |
| `src/components/whois-result.tsx` | 结构化结果、原始数据与导出入口 |
| `src/lib/query-utils.ts`、`query-path.ts` | IP/ASN 校验、规范化与路径处理 |
| `src/lib/domain-utils.ts`、`cctld-database.ts` | 域名校验与国别服务器映射 |
| `src/lib/rdap-client.ts`、`rdap-parser.ts` | 域名 RDAP 查询与解析 |
| `src/lib/whois-client.ts`、`whois-parser.ts` | 域名 TCP WHOIS、转介与解析 |
| `src/lib/network-client.ts`、`network-parser.ts` | IP/ASN 查询、转介与资源范围验证 |
| `src/lib/export-utils.ts` | PNG、CSV 与下载工具 |
| `tests/`、`scripts/` | 自动化测试与实网验证脚本 |
| `docs/` | 有日期和环境说明的验收记录 |

## 许可证

许可条款见 [LICENSE](LICENSE)。
