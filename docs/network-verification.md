# IP / ASN 查询验收报告

验收日期：2026-09-20（Asia/Shanghai）。
环境：Windows、Node.js 24.19.0、Next.js 生产构建、Microsoft Edge 无头浏览器。

## 实现范围

- IPv4、完整/压缩 IPv6、CIDR 和 ASN 共用前后端校验。
- CIDR 清除主机位；ASN 大小写、纯数字和前导零统一规范化。
- IANA 引导的 RDAP、原生 TCP WHOIS、区域机构转介、结果范围校验和成功缓存。
- 自动模式在 RDAP 失败或返回 404 时通过 WHOIS 核实；强制 RDAP 不切换来源。
- 网络结果复用域名页面的卡片、字体、间距、联系人、原始数据、复制和导出。
- 首页与分享链接使用同一页面，支持刷新、前进/后退、历史记录和主题切换。

## 自动化验收

| 检查 | 结果 |
| --- | --- |
| 单元与 API 测试 | 26/26 通过，包含原有 15 项域名回归 |
| 浏览器测试 | 40/40 通过 |
| TypeScript | 通过 |
| 生产构建 | 通过 |
| ESLint | 0 错误；保留 7 个原有文件的警告，修改文件无新增警告 |
| CSS、README Markdown 检查 | 通过 |
| `git diff --check` | 通过 |
| 安装依赖时 npm 审计 | 0 漏洞 |

浏览器测试覆盖 320、390、768、1440 像素宽度，以及浅色、深色主题。
每种组合检查域名、IPv4、IPv6、CIDR、ASN 的字体一致性和无横向溢出，
并检查分享链接刷新、前进/后退、历史记录、非法输入、服务错误恢复、主题切换、
原始数据展开、复制及 JSON/CSV 文件内容。

另用真实数据检查百度域名、Google IPv4、IPv6 和 ASN，分别在桌面浅色和手机深色下
保存截图并人工对照。未发现页面错位、水平溢出或浏览器运行异常。

## 实际网络查询

最终自动与 WHOIS 两种模式各 13 项，合计 **26/26 通过**。

| 注册机构 | IP 样例 | ASN 样例 |
| --- | --- | --- |
| ARIN | 8.8.8.8 | AS15169 |
| APNIC | 1.1.1.1 | AS4134 |
| RIPE NCC | 193.0.6.139 | AS3333 |
| LACNIC / Registro.br | 200.160.2.3 | AS28573 |
| AFRINIC | 196.216.2.1 | AS3741 |

额外覆盖 `2001:4860:4860::8888`、`8.8.8.0/24`、`2001:4860::/32`。
检查 HTTP 状态、响应类型、查询值、原始数据、区域机构、范围字段与数据来源。
另对 `baidu.cn` 实际查询并检查页面，域名仍使用 CNNIC WHOIS。

## 已修复的问题与上游限制

- IPv6/CIDR 分享链接中的编码分隔符导致刷新后识别失败：修复并覆盖刷新测试。
- LACNIC 对巴西资源转介到 Registro.br：加入已核实的服务地址及转介测试。
- ARIN 的 CIDR WHOIS 需要 `r` 标志：已按官方格式处理。
- ARIN CIDR 同时返回父子网段：选择最具体且覆盖整个查询范围的记录，
  避免混用父网段的名称、组织和联系人。
- AFRINIC RDAP 实测对已分配 IP 偶发返回结构化 404，WHOIS 同时有有效记录。
  包含强制 RDAP 的一轮实网测试为 38/39，唯一失败项为该上游行为。
  自动模式已增加 WHOIS 核实，并通过模拟和最终实网测试；
  显式 `dataSource=rdap` 仍忠实返回上游错误。

外部注册机构的网络、限流和记录变化不属于自动化测试可永久保证的范围。
失败不写入成功缓存。网络注册地区也不代表 IP 的实时地理位置。

## 复现与本地证据

```bash
npm test
npm run typecheck
npm run lint:all
npm run build
npm run test:e2e
npm run test:networks -- --base http://localhost:3000
```

浏览器测试首次运行需 `npx playwright install chromium`，或在 Windows 设置
`$env:PLAYWRIGHT_CHANNEL='msedge'` 使用已安装的 Edge。
真实查询需先启动生产服务。

原始实网报告：`.local/network-release-results.json`。
浏览器报告与截图：`.local/playwright-report/`、`.local/playwright-results/`。
真实数据截图：`.local/live-ui/`。这些本地文件不提交 Git。

协议与服务参考：

- [IANA IPv4 引导表](https://data.iana.org/rdap/ipv4.json)
- [IANA IPv6 引导表](https://data.iana.org/rdap/ipv6.json)
- [IANA ASN 引导表](https://data.iana.org/rdap/asn.json)
- [RDAP 查询格式 RFC 9082](https://www.rfc-editor.org/rfc/rfc9082.html)
- [ARIN WHOIS 查询语法](https://www.arin.net/resources/registry/whois/rws/cli/)
