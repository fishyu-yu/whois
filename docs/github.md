# GitHub 仓库设置

[返回 README](../README.md)

本次于 **2026-10-05** 检查 [fishyu-yu/whois][repo] 的仓库元数据与
Settings → General / Pages 页面，基于现有设置补充首页信息。
此文记录检查时的状态，后续调整应以 GitHub 页面为准。

## 已核实的设置

| 项目 | 状态 |
| --- | --- |
| 仓库 | `fishyu-yu/whois`，公开仓库 |
| 默认分支 | `master` |
| Website | `https://whois.f1shyu.com` |
| GitHub Pages | 未启用；Source 为 Deploy from a branch，Branch 为 None |
| Issues / Pull requests | 已启用 |
| Wiki / Projects | 已启用 |
| Discussions | 未启用 |
| Releases | 检查时尚未发布 Release |

README 的在线入口沿用现有 Website。
该地址是仓库配置的网站入口，不能据此判断其托管平台或当前可用性。
本项目需要运行服务端查询 API，GitHub Pages 的静态托管不能直接运行应用。

## 首页简介与 Topics

原简介主要介绍域名查询，本次依据已实现功能补充网络资源查询和导出能力。
保存后的 About 简介为：

> Whale Whois：可自行部署的 WHOIS / RDAP 查询工具，支持域名、IPv4/IPv6、
> CIDR 与 ASN，提供注册域名识别、结构化解析和 PNG / JSON / CSV 导出。
> 基于 Next.js 与 TypeScript。

原 Topics 为空，本次添加了以下 10 个主题：

```text
whois, rdap, domain-lookup, ip-lookup, asn,
ipv6, cidr, nextjs, typescript, self-hosted
```

默认分支、Website、Pages 与仓库功能开关沿用现有设置。
About 与 Topics 已保存到 GitHub，并通过仓库 API 回读确认。

## 仓库文档与协作入口

新增的文档和模板对应项目现有能力：

| 文件 | 用途 |
| --- | --- |
| [`README.md`](../README.md) | 项目首页、在线入口、功能、快速开始和文档导航 |
| [`api.md`](api.md) | 查询参数、数据源与响应约定 |
| [`deployment.md`](deployment.md) | Node.js 与 Cloudflare beta 部署 |
| [`development.md`](development.md) | 自动化测试、实网验证与代码导航 |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) | 开发与贡献流程 |
| [问题表单](../.github/ISSUE_TEMPLATE/bug_report.yml) | 查询、解析、页面和部署异常 |
| [功能表单](../.github/ISSUE_TEMPLATE/feature_request.yml) | 使用场景与功能建议 |
| [Issue 配置](../.github/ISSUE_TEMPLATE/config.yml) | 保留空白 Issue，提供文档入口 |
| [PR 模板](../.github/pull_request_template.md) | 行为变化、验证结果和样例说明 |

默认分支 `master` 中的这些文件用于 GitHub 首页与新建 Issue / PR 的默认内容。
更新时需将文档与模板同步到默认分支；修改本地文件不会直接更新 GitHub README。
模板不依赖额外标签、指派人或 Discussions 设置。

## 分支与部署

`master` 是仓库的默认分支，`beta` 用于 Cloudflare 测试部署。
仓库的 [Cloudflare beta 工作流](../.github/workflows/deploy-beta.yml)
只对 `beta` 分支运行；它不改变默认分支，也不部署 `master`。

推送到 `beta` 会触发部署工作流；手动运行时也应选择 `beta`。
执行前需确认 Actions 凭据已配置，执行后核对任务状态、
实际 Worker 地址及查询能力。步骤见[部署指南](deployment.md)。

生产网站是否自动跟随 `master`，需要在实际托管平台确认。
GitHub Website、默认分支和 Pages 开关均不能证明生产部署已更新。

[repo]: https://github.com/fishyu-yu/whois
