# 国别域名查询验证报告

验证日期：2026-09-19（Asia/Shanghai）。环境：Windows、Node.js 24.19.0、
Next.js 15.5.25 生产构建，API 运行于本机 127.0.0.1:3000。

## 结论与范围

覆盖项目国别数据库的 28 个后缀，每个选择 1 个已注册样例。
首次 25/28 成功；仅对 .hk、.uk 两个暂时连接失败的后缀各复测一次后成功，
最终 27/28 可查询。.es 未通过，注册局要求事先授权查询服务器的出站 IP。
该结果反映本次环境及样例，不表示所有国别后缀、所有域名或部署环境均可查询。

判定标准：HTTP 200、success=true、非空原始记录、返回的域名与请求一致
（比较时执行大小写及 IDN/ASCII 标准化）。不把空响应、错误页面或限流当成成功。

## .cn 问题定位与修复

- 原先写死的 CNNIC RDAP 地址连接失败；IANA 引导表未提供 .cn 域名 RDAP。
- 原 WHOIS 强制模式直接调用系统命令，在本机复现 HTTP 500“系统未安装 whois”。
- GET 默认 type=auto 走到系统 WHOIS 路径，没有复用域名自动查询逻辑。
- 所有域名 WHOIS 路径现统一使用 Node TCP 43，自动模式从 RDAP 回退 CNNIC。
- 修正 CNNIC 的 No matching record. 未注册判断，以及错误回退覆盖真实错误的问题。
- 修正共享校验正则中的字符范围，使中文域名能够转换为 ASCII 后查询。
- 修正 .tw WHOIS 地址、.hk 捆绑域名解析，以及 JPRS/Nominet 字段格式。
- API 成功缓存保留 5 分钟；浏览器和 Service Worker 不再永久缓存 GET 查询。

## 国别实测明细

首次运行时间（UTC）：2026-09-18T16:37:52.281Z。
复测时间（UTC）：2026-09-18T16:38:56.995Z。

| 后缀 | 样例 | 首次 | 复测 | 最终数据源 | 结果 |
| --- | --- | --- | --- | --- | --- |
| .cn | baidu.cn | 成功 | — | registry | 通过 |
| .hk | hkirc.hk | 失败 | 成功 | registry | 通过 |
| .tw | twnic.tw | 成功 | — | registry | 通过 |
| .jp | jprs.jp | 成功 | — | registry | 通过 |
| .kr | kisa.or.kr | 成功 | — | registry | 通过 |
| .sg | sgnic.sg | 成功 | — | rdap-registry | 通过 |
| .my | mynic.my | 成功 | — | registry | 通过 |
| .th | thnic.co.th | 成功 | — | rdap-registry | 通过 |
| .in | registry.in | 成功 | — | rdap-registry | 通过 |
| .io | github.io | 成功 | — | registrar | 通过 |
| .kg | domain.kg | 成功 | — | rdap-registry | 通过 |
| .uk | nominet.uk | 失败 | 成功 | rdap-registry | 通过 |
| .de | denic.de | 成功 | — | rdap-registry | 通过 |
| .fr | afnic.fr | 成功 | — | rdap-registry | 通过 |
| .it | nic.it | 成功 | — | registry | 通过 |
| .es | nic.es | 失败 | — | — | .es 出站 IP 需注册局授权 |
| .nl | sidn.nl | 成功 | — | rdap-registry | 通过 |
| .ru | nic.ru | 成功 | — | registry | 通过 |
| .us | nic.us | 成功 | — | registry | 通过 |
| .ca | cira.ca | 成功 | — | rdap-registry | 通过 |
| .mx | nic.mx | 成功 | — | registry | 通过 |
| .au | auda.org.au | 成功 | — | rdap-registry | 通过 |
| .nz | internetnz.nz | 成功 | — | registry | 通过 |
| .br | registro.br | 成功 | — | rdap-registry | 通过 |
| .ar | nic.ar | 成功 | — | registry | 通过 |
| .za | google.co.za | 成功 | — | registrar | 通过 |
| .ae | aeda.ae | 成功 | — | registry | 通过 |
| .sa | nic.net.sa | 成功 | — | registry | 通过 |

.hk 首次 WHOIS 连接超时；.uk 首次 RDAP 不可用且 WHOIS 主机解析失败。
相同代码和环境下复测成功，说明本次失败有上游连接波动因素。
.es 首轮返回连接拒绝；此前开发模式检查曾收到空响应。

## .cn 生产回归

| 样例/操作 | 预期与实测 |
| --- | --- |
| baidu.cn，自动和强制 WHOIS | HTTP 200，返回域名、注册商、日期与名称服务器 |
| baidu.com.cn，自动 | HTTP 200，完整保留多级域名 |
| 中文.cn，强制 WHOIS | HTTP 200，正确处理中文输入和注册局 Unicode 返回值 |
| 随机未注册 .cn 样例 | HTTP 404，域名未注册 |
| baidu.cn，强制 RDAP | HTTP 502，提示切换自动或 WHOIS |
| GET 默认模式、GET 强制 WHOIS | 均为 HTTP 200，Cache-Control: no-store |
| 首页输入 baidu.cn 并提交 | 浏览器显示“查询完成”、CNNIC 数据和四个名称服务器 |

## 自动检查

- 15 项自动回归测试全部通过，测试不依赖外部注册局。
- TypeScript 类型检查通过；ESLint 无错误，保留 9 条原有警告。
- CSS 与 README 格式检查通过。
- Next.js 生产构建通过。
- 依赖审计为 0 项告警；Next.js/React 保持原版本线并安装补丁。
  PostCSS、brace-expansion、js-yaml 使用兼容补丁覆盖。

复现命令见 README 的“检测与验证”。真实检查脚本在失败时返回非零退出码；
报告保留失败信息，不会为达到全绿而跳过 .es。

## 外部依据与部署限制

- [IANA .cn 记录](https://www.iana.org/domains/root/db/cn.html)：CNNIC WHOIS 主机。
- [IANA RDAP 引导表](https://data.iana.org/rdap/dns.json)：动态查询服务映射。
- [IANA .tw 记录](https://www.iana.org/domains/root/db/tw.html)：域名 WHOIS 正确地址。
- [Dominios.es 说明](https://www.dominios.es/es/sobre-dominios/valores-anadidos/whois-43)：
  WHOIS 43 端口要求已授权出站 IP；每个授权 IP 最多每分钟 10 次查询。

部署主机必须允许 TCP 43 出站连接。端口被平台封锁时，代码不能消除该限制。
IP/ASN 功能仍依赖系统 whois 工具，本轮目标是域名查询，未将其列为已通过项目。
