# Whale Whois · 域名与网络注册信息查询

![Whale Whois — 域名与网络信息查询](public/logo-lockup.svg)

[![Node.js 22+][node-badge]](package.json)
[![Next.js 15][next-badge]](package.json)
[![AGPL-3.0-only][license-badge]](LICENSE)

一个可自行部署的 WHOIS / RDAP 查询工具。输入域名、IP、CIDR 或 ASN，
即可查看注册信息、查询来源和原始数据，并导出 PNG、JSON 或 CSV。

**[在线使用][website] · [API 文档](docs/api.md) ·
[部署指南](docs/deployment.md) · [反馈问题][issues]**

基于 Next.js 15、React 19、TypeScript 与 Tailwind CSS 4。
查询无需 API Key、数据库或系统 `whois` 命令。

## 功能

| 能力 | 说明 |
| --- | --- |
| 域名查询 | 支持通用域名、国别域名和中文域名，自动转换 IDN/Punycode |
| 注册域名识别 | 按公共后缀规则移除子域名，保留 `co.uk`、`edu.kg` 等多级后缀 |
| 网络查询 | 支持 IPv4、IPv6、CIDR 和 ASN，覆盖五大区域互联网注册机构 |
| 双协议查询 | 优先 RDAP，不可用时回退 TCP WHOIS；API 可指定数据源 |
| 结果阅读 | 展示结构化字段和实际来源，详情与原始数据可独立展开 |
| 分享与导出 | 查询地址可直接分享；支持 PNG、JSON、CSV 和复制原始数据 |
| 主题与历史 | 适配手机和桌面，支持浅色/深色主题及浏览器本地查询历史 |

网络结果反映资源的注册与分配信息，不代表 IP 的实时地理位置或 BGP 路由。
可查询字段取决于注册机构公开的数据，部分联系人信息可能被隐去。

## 快速开始

准备 Git、Node.js 22 或更新版本及 npm。
推荐使用 [.nvmrc](.nvmrc) 指定的 Node.js 24。

```bash
git clone https://github.com/fishyu-yu/whois.git
cd whois
npm ci
npm run dev
```

打开 <http://localhost:3000>。默认无需创建 `.env` 文件。
更换端口可运行 `npm run dev -- -p 3001`。

## 使用示例

在搜索框输入查询值，或将查询路径拼接到站点地址后直接访问：

| 查询类型 | 输入示例 | 查询路径 |
| --- | --- | --- |
| 域名 | `baidu.cn` | `/baidu.cn` |
| 子域名 | `www.qq.com` | `/qq.com` |
| 多级后缀域名 | `www.xx.edu.kg` | `/xx.edu.kg` |
| IPv4 | `8.8.8.8` | `/8.8.8.8` |
| IPv6 | `2001:4860::8888` | `/2001:4860::8888` |
| IPv4 网段 | `8.8.8.9/24` | `/8.8.8.0/24` |
| IPv6 网段 | `2001:4860::/32` | `/2001:4860::/32` |
| ASN | `15169` 或 `AS15169` | `/AS15169` |

域名查询会提示移除子域名后的目标；CIDR 会清除主机位，ASN 会统一格式。
仅输入 `co.uk`、`edu.kg` 等公共后缀时会提示输入错误。
搜索框也接受 `/baidu.cn` 这样的站内查询路径。

「全部查询字段」与「原始查询数据」默认收起，可点击标题独立展开。
PNG 在浏览器本地生成，保留当前主题、查询时间和全部结构化字段，
即使详情收起也会完整导出；原始数据请使用 JSON 或 CSV 保存。
查询历史最多保存 20 条，仅存于当前浏览器，不在设备间同步。

## HTTP API

GET 与 POST 共用查询逻辑，支持自动识别类型和指定数据源：

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

成功响应包含 `query`、`type`、`success`、`data` 和 `error`。
完整参数、来源选择、响应字段、状态码与缓存规则见 [API 文档](docs/api.md)。

## 部署

应用包含服务端查询 API，需要可运行服务端代码的环境。
标准部署使用 Node.js；仓库另提供
OpenNext / Cloudflare Workers 配置，用于 `beta` 分支部署。

| 方式 | 构建与运行 | 适用说明 |
| --- | --- | --- |
| Node.js | `npm run build` → `npm start` | 自行托管或支持 Node.js 的平台，需允许 TCP 43 出站 |
| Cloudflare beta | 见部署指南 | OpenNext / `nodejs_compat`，需验证 WHOIS 出站 |

Node.js 生产运行：

```bash
npm ci
npm run build
npm start
```

发布前的检查、Cloudflare 配置与自动部署步骤见 [部署指南](docs/deployment.md)。
GitHub 仓库默认分支为 `master`，现有网站入口为 [whois.f1shyu.com][website]。
GitHub Pages 当前未启用；它的静态托管无法直接运行本项目的查询 API。

部署环境必须能访问 IANA 和各注册机构的 HTTP/HTTPS 服务，
并允许 TCP 43 出站以支持 `.cn` 等依赖 WHOIS 的查询。
上游限流、超时及注册局授权会影响可用性，`.es` 还需要出站 IP 授权。

## 文档与验证

| 文档 | 内容 |
| --- | --- |
| [API 文档](docs/api.md) | 参数、响应、数据源、规范化与缓存 |
| [部署指南](docs/deployment.md) | Node.js、Cloudflare beta、网络要求及上线检查 |
| [开发与测试](docs/development.md) | 本地检查、浏览器回归、实网验证与代码导航 |
| [贡献指南](CONTRIBUTING.md) | 问题反馈、开发流程和 PR 要求 |
| [GitHub 仓库设置](docs/github.md) | 已核实的首页设置、分支与 Pages 状态 |
| [国别域名验证报告](docs/cctld-verification.md) | 国别注册局的历史实测与限制 |
| [IP / ASN 验收报告](docs/network-verification.md) | 网络资源查询的历史实测与限制 |

验收报告中的结果对应各自标注的日期与环境，不代表上游服务始终可用。
单元与 API 测试使用模拟响应和本地 TCP 服务；实网验证另行运行。

## 参与贡献

欢迎通过 [Issues][issues] 反馈查询异常或提出功能建议，
也可以提交 Pull Request 改进解析、查询兼容性、界面或文档。
开始前请阅读 [贡献指南](CONTRIBUTING.md)，提交样例时移除个人信息和凭据。

## 许可证

本项目使用 **AGPL-3.0-only**，许可条款见 [LICENSE](LICENSE)。

[website]: https://whois.f1shyu.com
[issues]: https://github.com/fishyu-yu/whois/issues
[node-badge]: https://img.shields.io/badge/Node.js-%E2%89%A522-43853D?logo=node.js&logoColor=white
[next-badge]: https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white
[license-badge]: https://img.shields.io/badge/license-AGPL--3.0--only-blue
