# WHOIS/RDAP 域名查询工具

基于 Next.js 15、React 19、TypeScript 和 Tailwind CSS v4 的查询应用。
支持域名信息查询、结构化解析、原始数据查看、JSON/CSV 导出、主题切换和本机查询历史。

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
IP/CIDR 和 ASN 查询仍需要运行环境安装系统 `whois` 工具。
GET 和 POST 使用相同的输入校验与查询逻辑。

域名查询的 `dataSource`：

| 值 | 行为 |
| --- | --- |
| `auto` | 默认；优先 RDAP，服务不可用时回退 WHOIS |
| `rdap` | 只查询 RDAP；不支持时明确报错 |
| `whois` | 直接查询 WHOIS，尝试注册商补充信息 |
| `registrar` | WHOIS 优先注册商，失败时返回注册局记录 |
| `registry` | 只返回注册局 WHOIS 数据，不跟随注册商转介 |

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

有效结果缓存 5 分钟。未注册返回 HTTP 404，非法参数返回 400，
上游连接失败、空响应或限流返回 502，IP/ASN 缺少系统工具返回 503。
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

## 项目结构

| 文件/目录 | 职责 |
| --- | --- |
| `src/app/page.tsx`、`src/app/[domain]/page.tsx` | 首页、分享链接与查询交互 |
| `src/components/whois-form.tsx` | 输入识别与校验 |
| `src/components/whois-result.tsx` | 字段展示、原始数据与导出 |
| `src/app/api/whois/route.ts` | API 校验、数据源选择、缓存与错误响应 |
| `src/lib/rdap-client.ts`、`rdap-parser.ts` | RDAP 引导、查询与结构化解析 |
| `src/lib/whois-client.ts`、`whois-parser.ts` | TCP WHOIS、转介和各注册局格式解析 |
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

## 许可证

许可条款见 [LICENSE](LICENSE)。
