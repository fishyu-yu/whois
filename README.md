# WHOIS/RDAP 域名与网络查询工具

基于 Next.js 15、React 19、TypeScript 和 Tailwind CSS v4 的查询应用。
支持域名、IPv4、IPv6、CIDR 和 ASN 查询、结构化解析、原始数据查看、JSON/CSV 导出、主题切换和本机查询历史。

## 快速开始

需要 Git、Node.js 22 或更新版本和 npm，推荐使用 `.nvmrc` 指定的 Node.js 24。

```bash
git clone https://github.com/fishyu-yu/whois.git
cd whois
npm ci
npm run dev
```

打开 `http://localhost:3000`。项目不需要 API Key、数据库或 `.env` 文件。
可用 `npm run dev -- -p 3001` 修改端口。

生产模式：

```bash
npm run build
npm start
```

## 查询方式

域名自动查询先从 IANA RDAP 引导表选择服务，不支持 RDAP 或服务失败时回退到 WHOIS。
WHOIS 通过 Node.js TCP 套接字直接连接注册局，域名查询不依赖系统 `whois` 命令。
注册商查询失败时保留有效的注册局记录。

`.cn` 使用 CNNIC WHOIS。`.jp` 使用 JPRS 的英文查询格式。
`.tw` 的域名 WHOIS 为 `whois.twnic.net.tw`，不能使用 IP 地址库 `whois.twnic.net`。
中文域名在校验后转换成 ASCII/Punycode，再发送到查询服务。

### HTTP API

- `POST /api/whois`
- `GET /api/whois?q=baidu.cn&dataSource=auto`

POST 请求体示例：

```json
{
  "query": "baidu.cn",
  "type": "domain",
  "dataSource": "auto"
}
```

`type` 支持 `domain`、`ip`、`asn`；省略或指定 `auto` 时自动识别。
IP/CIDR 和 ASN 使用 IANA 网络引导表选择 RDAP 服务，自动模式失败时回退到原生 TCP WHOIS。
网络 RDAP 返回 404 时，自动模式也会通过 WHOIS 核实；强制 RDAP 模式保留上游错误。
所有查询均无需安装系统 `whois` 工具。支持五大区域注册机构，以及 LACNIC 到 Registro.br 的转介。
ASN 可输入 `AS15169` 或 `15169`，范围为 1–4294967295；CIDR 自动清除主机位。
例如 `8.8.8.9/24` 规范化为 `8.8.8.0/24`，也支持 `2001:4860::/32`。
GET 和 POST 使用相同的输入校验与查询逻辑。

域名查询的 `dataSource`：

| 值 | 行为 |
| --- | --- |
| `auto` | 默认；优先 RDAP，服务不可用时回退 WHOIS |
| `rdap` | 只查询 RDAP；不支持时明确报错 |
| `whois` | 直接查询 WHOIS，尝试注册商补充信息 |
| `registrar` | WHOIS 优先注册商，失败时返回注册局记录 |
| `registry` | 只返回注册局 WHOIS 数据，不跟随注册商转介 |

IP/ASN 的 `auto`、`rdap`、`whois` 分别为自动、仅 RDAP、仅 WHOIS；
`registry` 等同于网络 WHOIS，`registrar` 不适用并返回 400。
网络结果显示地址或 ASN 范围、所属组织、注册机构、日期和已公开的联系人。
注册地区来自注册记录，不代表 IP 的实际地理位置；IP 分配记录也不等同于实时 BGP 路由信息。

响应示例（节选）：

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

有效结果缓存 5 分钟。未注册或未找到网络记录返回 HTTP 404，非法参数返回 400，
上游连接失败、空响应或限流返回 502。
错误不会作为成功结果缓存，也不会把服务不可用误判为域名未注册。

## 配置与部署

- 必须使用完整 Node.js 运行时，不能使用 Edge Runtime 或纯静态托管。
- RDAP 需要访问 IANA 及各注册局的 HTTP/HTTPS 服务。
- WHOIS 需要允许 TCP 43 出站访问；`.cn`、`.jp` 等后缀不能仅依赖 RDAP。
- `.es` 的 WHOIS 需要先向注册局申请出站 IP 授权。
  详见 [Dominios.es 接入说明](https://www.dominios.es/es/sobre-dominios/valores-anadidos/whois-43)。
- RDAP 服务地址优先使用 IANA 引导表，本地已核实的映射作为补充。
  WHOIS 使用国别数据库，未收录后缀尝试通过 IANA 查找服务器。
- 单次 RDAP 请求上限 10 秒，单次 WHOIS 请求上限 12 秒，WHOIS 响应上限 1 MiB。
  注册局和注册商分别查询时，总耗时可能更长。
- 网络 RDAP 响应上限 2 MiB，转介仅允许已核实的注册机构，返回范围必须包含查询资源。

## 项目结构

| 文件/目录 | 职责 |
| --- | --- |
| `src/app/page.tsx`、`src/app/[domain]/page.tsx` | 首页、分享链接与查询交互 |
| `src/components/whois-form.tsx` | 输入识别与校验 |
| `src/components/whois-result.tsx` | 字段展示、原始数据与导出 |
| `src/components/query-page.tsx` | 域名、IP、ASN 共用页面、分享链接与历史记录 |
| `src/app/api/whois/route.ts` | API 校验、数据源选择、缓存与错误响应 |
| `src/lib/rdap-client.ts`、`rdap-parser.ts` | RDAP 引导、查询与结构化解析 |
| `src/lib/whois-client.ts`、`whois-parser.ts` | TCP WHOIS、转介和各注册局格式解析 |
| `src/lib/network-client.ts`、`network-parser.ts` | 网络查询、转介、范围验证与解析 |
| `src/lib/query-utils.ts` | 前后端共用的查询类型识别、IPv6/CIDR 与 ASN 校验 |
| `src/lib/domain-utils.ts`、`cctld-database.ts` | 域名校验、IDN 与国别服务器信息 |
| `public/sw.js`、`public/manifest.json` | PWA 应用资源 |

## 检测与验证

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

自动测试使用本地 TCP 测试服务和模拟 RDAP 响应，不访问外部注册局。
覆盖 `.cn`、中文域名、GET/POST、注册商回退、未注册、服务错误、超时和大小限制。
网络测试另外覆盖 IPv6、CIDR 规范化、ASN 边界、IANA 选路、转介、记录范围匹配与 CSV 转义。

浏览器回归使用固定响应，覆盖 320/390/768/1440 宽度、浅色/深色主题、分享链接、
历史记录、表单错误、原始数据、复制及下载，并保存截图到 `.local/playwright-results/`：

```bash
npx playwright install chromium
npm run build
npm run test:e2e
```

已安装 Edge 的 Windows 环境可在 PowerShell 中设置 `$env:PLAYWRIGHT_CHANNEL='msedge'`，
直接使用本机浏览器。浏览器测试默认启动端口 3002 的生产服务。

真实 IP/ASN 网络检查（五大区域机构，含 IPv6/CIDR，默认自动和 WHOIS 两种模式）：

```bash
npm run test:networks -- --base http://localhost:3000
# 可额外验证强制 RDAP 模式
npm run test:networks -- --sources auto,rdap,whois
```

输出不包含联系人数据；失败会返回非零退出码，报告保存到 `.local/network-live-results.json`。

启动应用后执行真实网络检查：

```bash
npm run test:live -- --output cctld-results.json
# 只检查指定域名，或指定已启动的生产服务地址
npm run test:live -- --domains baidu.cn,jprs.jp --base http://localhost:3000
```

默认覆盖国别数据库中的 28 个后缀，每个选取一个已注册样例，并发数为 3。
检查同时验证 HTTP 状态、成功标志、原始数据和返回域名，任一失败时退出码为 1。
结果不包含联系人的个人数据；默认报告写入不提交到 Git 的 `.local/` 目录。
真实检查可能受注册局限流、网络和授权策略影响，不在普通自动测试中执行。

最近一次实测及限制见 [国别域名验证报告](docs/cctld-verification.md)。
IP/ASN 的功能、页面测试及上游限制见 [网络查询验收报告](docs/network-verification.md)。

## 许可证

许可条款见 [LICENSE](LICENSE)。
