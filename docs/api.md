# HTTP API

[返回项目说明](../README.md)

GET 与 POST 共用校验、查询和缓存逻辑，返回 JSON。
以下路径相对于应用地址，例如 `http://localhost:3000`。

## 请求

```text
GET /api/whois?q=baidu.cn&dataSource=auto
GET /api/whois?q=8.8.8.0%2F24&type=ip
GET /api/whois?q=2001%3A4860%3A%3A%2F32&type=ip
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
| `query` | POST 必填的查询字符串；GET 使用 `q` |
| `type` | `domain`、`ip`、`asn`；省略或 `auto` 时自动识别 |
| `dataSource` | 可选，默认为 `auto`；可用值见下表 |

查询值会去除首尾空白。自动识别接受域名、IPv4、IPv6、CIDR，
以及 `AS15169` 或 `15169` 形式的 ASN。
非法网络输入不会被重新解释成域名。

## 校验与规范化

- 域名统一转成小写 ASCII；中文域名等 IDN 转成 Punycode。
  使用 `tldts` 内置的
  [Public Suffix List](https://publicsuffix.org/list/) ICANN 规则，
  将已识别的子域名转换为可注册域名。
  例如 `www.qq.com` 查询 `qq.com`，`www.xx.edu.kg` 查询 `xx.edu.kg`。
- 仅输入 `co.uk`、`edu.kg` 等公共后缀会返回 400。
  私有托管后缀不单独作为注册层级：`user.github.io` 查询 `github.io`。
  公共后缀规则未识别的后缀保留完整输入。
- IPv4、IPv6 和 CIDR 使用 `type=ip`。
  IPv4 前缀范围为 0–32，IPv6 为 0–128；CIDR 清除主机位，
  例如 `8.8.8.9/24` 返回 `8.8.8.0/24`。
  IPv6 使用规范化地址形式，不接受 `%eth0` 等区域标识。
- ASN 范围为 1–4294967295，统一为大写 `AS` 加整数，移除前导零。
  例如 `as0015169` 返回 `AS15169`。

成功响应的顶层 `query` 和 `data.query` 都是实际查询的规范化值。
完整域名会先校验，再移除子域名，避免非法标签被规范化隐藏。
API 不接受搜索框专用的 `/baidu.cn` 形式站内路径。

## 数据源

| `dataSource` | 域名查询 | IP / ASN 查询 |
| --- | --- | --- |
| `auto` | 优先 RDAP，不可用时回退 WHOIS | 优先 RDAP，失败时通过 WHOIS 核实 |
| `rdap` | 仅 RDAP | 仅 RDAP |
| `whois` | 注册局 WHOIS，尝试注册商补充 | 网络 WHOIS |
| `registrar` | 注册局 WHOIS，尝试注册商补充 | 不支持，返回 400 |
| `registry` | 仅注册局 WHOIS，不跟随注册商转介 | 等同于 `whois` |

域名 RDAP 和 WHOIS 均可能跟随注册商转介。
注册商补充查询失败时，保留已经取得的有效注册局记录。
`registrar` 不保证一定返回注册商数据；实际来源由响应中的
`data.dataSource` 表示。

域名 RDAP 明确返回未注册时直接返回 404，不再回退 WHOIS。
网络 RDAP 返回 404 时，`auto` 会通过 WHOIS 再次核实；
显式指定 `rdap` 则返回 RDAP 错误，不切换来源。
来源选择用于 API，当前网页搜索使用 `auto`。

## 响应

成功响应示例，原始记录与结构化字段仅展示节选：

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

| 字段 | 说明 |
| --- | --- |
| `query` | 规范化后的实际查询值 |
| `type` | 查询类型：`domain`、`ip` 或 `asn` |
| `success` | 查询是否成功 |
| `data` | 成功结果；失败为 `null` |
| `error` | 失败说明；成功为 `null` |
| `timestamp` | 顶层为响应生成时的 Unix 毫秒时间戳 |
| `data.raw` | 查询文本；不同协议的形式见下文 |
| `data.parsed` | 结构化字段，取决于查询类型和上游公开信息 |
| `data.timestamp` | 查询结果生成时的 ISO 时间字符串 |
| `data.dataSource` | 实际取得结果的数据源 |

`data.dataSource` 的值与请求选项不同：

| 值 | 实际来源 |
| --- | --- |
| `rdap-registry` | 域名注册局 RDAP |
| `rdap-registrar` | 域名注册商 RDAP |
| `registry` | 域名注册局 WHOIS |
| `registrar` | 域名注册商 WHOIS，并合并注册局结构化字段 |
| `rdap-rir` | 网络 RDAP |
| `whois-rir` | 网络 WHOIS |

原始数据的表示方式：

- 域名 WHOIS 的 `data.raw` 是最终采用的 WHOIS 文本。
  `registryRaw` 保存注册局文本，取得注册商响应时还包含 `registrarRaw`。
- 域名 RDAP 的 `data.raw` 是根据解析字段生成的 WHOIS 风格文本，
  完整注册局 JSON 保存在 `rdapRegistryRaw`，取得注册商响应时保存在
  `rdapRegistrarRaw`。`rdapSource` 为 `registry` 或 `registrar`。
- 网络 RDAP 的 `data.raw` 是格式化后的上游 JSON 字符串；
  网络 WHOIS 的 `data.raw` 是上游 WHOIS 文本。

缓存命中会保留 `data.timestamp`，顶层 `timestamp` 仍为本次响应时间。
常规失败响应包含 `query`、`type`、`success=false`、`data=null`、
`error` 与 `timestamp`。校验失败时查询值可能为空、类型为 `unknown`。
POST 请求体不是有效 JSON 时仅返回 `success`、`data` 和 `error`。

| HTTP 状态 | 含义 |
| --- | --- |
| `200` | 查询成功 |
| `400` | 输入非法、JSON 无效或查询选项不支持 |
| `404` | 域名未注册或网络资源记录未找到 |
| `502` | 上游不可用、超时、空响应、限流等查询失败 |

## 缓存与查询限制

成功结果按查询类型、规范化查询值和请求数据源缓存 5 分钟，最多 500 条。
缓存保存在服务进程内存中，不跨实例共享；失败结果不进入成功缓存。
域名 RDAP 客户端另有同样期限和容量的成功缓存。
API 响应配置为 `Cache-Control: no-store`，Service Worker 不缓存 API 请求。

单次 RDAP HTTP 请求超时为 10 秒，单次 WHOIS TCP 请求超时为 12 秒。
回退、IANA 引导和注册商转介可能产生多个请求，总时长可能超过单次超时。
WHOIS 响应上限为 1 MiB；网络 RDAP 响应上限为 2 MiB。
WHOIS 需要部署环境允许 TCP 43 出站。

网络记录的返回范围必须包含查询资源。
网络结果表示注册与分配信息，注册地区不等同于 IP 的实际位置，
也不提供实时 BGP 路由信息。
上游信息可能隐藏联系人、缺少字段或受到限流，不能保证字段完整。

实现入口为 [`src/app/api/whois/route.ts`](../src/app/api/whois/route.ts)。
部署条件见[部署说明](deployment.md)，检查命令见[开发与验证](development.md)。
