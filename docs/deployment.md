# 部署指南

[返回 README](../README.md)

Whale Whois 包含动态查询 API。标准运行方式是 Node.js；
仓库另有 OpenNext / Cloudflare Workers 配置，用于 `beta` 分支部署。
静态文件托管不能直接运行该 API，包括 GitHub Pages。

## Node.js 部署

要求 Node.js 22 或更新版本，推荐使用 `.nvmrc` 指定的 Node.js 24。
在项目根目录安装锁定依赖，完成检查后构建并启动：

```bash
npm ci
npm test
npm run lint:all
npm run build
npm run typecheck
npm start
```

先构建再检查类型，因为 Next.js 会生成类型文件。
`npm start` 默认监听 3000 端口，可通过 `npm start -- -p 3001` 更改。
默认查询功能无需 `.env`、API Key、数据库或系统 `whois` 命令。

自行托管时使用进程管理器保持服务运行，并通过反向代理提供 HTTPS。
更新版本后重新安装依赖、构建并重启服务。
如果托管平台连接 GitHub，需要在该平台确认实际跟踪的生产分支；
仓库默认分支 `master` 本身不保证推送后自动更新生产网站。

## Cloudflare Workers beta

该方案使用 [OpenNext Cloudflare 适配器][opennext]，
把 Next.js 的 Node.js 运行时构建产物适配到 Workers。
API 仍使用 `runtime = 'nodejs'`，不要改成 Next.js Edge Runtime。

| 文件 | 用途 |
| --- | --- |
| [`open-next.config.ts`](../open-next.config.ts) | OpenNext Cloudflare 适配配置 |
| [`wrangler.beta.jsonc`](../wrangler.beta.jsonc) | `whois-beta` Worker、账号、资源与兼容标志 |
| [beta 工作流](../.github/workflows/deploy-beta.yml) | `beta` 分支的检查、构建与部署 |
| [`public/_headers`](../public/_headers) | Workers 静态资源缓存规则 |

配置使用 `nodejs_compat` 和 `global_fetch_strictly_public`，
入口为 `.open-next/worker.js`，静态资源目录为 `.open-next/assets`。
当前启用 `workers.dev`，访问地址以 Wrangler 部署输出为准。
不要将测试 Worker 地址替换为现有生产网站入口。

### 自行部署

1. 使用包含上述文件和 npm 脚本的 `beta` 分支。
2. 将 `wrangler.beta.jsonc` 的 `account_id` 改成自己的 Cloudflare 账号 ID。
3. 如修改 Worker `name`，同步修改 `WORKER_SELF_REFERENCE` 的 `service`。
4. 在自己的环境完成 Wrangler 身份验证，再安装、构建和预览。

```bash
npm ci
npm run build:beta
npm run typecheck
npm run preview:beta
```

预览通过后发布已构建的产物：

```bash
npm run deploy:beta
```

`deploy:beta` 不包含构建步骤，每次修改后先重新执行 `build:beta`。
`.open-next/`、`.wrangler/` 和 `.dev.vars*` 已被 Git 忽略。
构建产物与凭据不应提交到仓库。

### GitHub Actions

现有 [Deploy beta to Cloudflare](../.github/workflows/deploy-beta.yml)
工作流配置如下：

- 触发条件为推送到 `beta`，或在 `beta` 分支手动执行 `workflow_dispatch`。
- 使用 `.nvmrc` 的 Node.js 版本和 `npm ci`。
- 依次执行 `lint:all`、`test`、`build:beta`、`typecheck` 和 `deploy:beta`。
- 要求仓库 Actions secret `CLOUDFLARE_API_TOKEN`；缺少时提前失败。
- 部署目标为配置中的 `whois-beta`，工作流不部署 `master`。

GitHub 网页的 Run workflow 按钮要求工作流文件也存在于默认分支，
出现按钮后再选择 `beta` 执行；仅推送到 `beta` 可触发 push 部署，
但不保证出现手动运行入口。参见 [workflow_dispatch 说明][dispatch]。

维护者需在仓库 Settings → Secrets and variables → Actions 配置对应 secret。
Fork 部署还需更换 Cloudflare 账号与 Worker 配置。
只有工作流文件已推送到对应分支、凭据已配置且任务成功，才表示部署完成。
推送成功不代表部署成功，应以 Actions 运行和实际查询验证为准。

## 出站网络与上游限制

两种部署方式都需要验证实际网络条件：

- 能访问 IANA 引导表及各注册机构的 HTTP/HTTPS 服务。
- 允许 TCP 43 出站，`.cn` 等 WHOIS 查询及 RDAP 回退依赖该连接。
- 单次 HTTP 请求超时为 10 秒，单次 TCP WHOIS 为 12 秒。
  回退或转介可能产生多次请求，平台总请求时限应留足余量。
- WHOIS 响应上限为 1 MiB；网络资源 RDAP 响应上限为 2 MiB。
- `.es` WHOIS 需要按 [Dominios.es 说明][es-whois]申请出站 IP 授权。

Workers 的 Node.js 兼容模式与标准 Node.js 环境有差异，
适配构建成功不能证明所有注册局 TCP 查询均可用。
Cloudflare 对出站 TCP 的目标地址有[平台限制][tcp-sockets]，
注册局也可能限制来源或请求频率；部署后应单独检查 WHOIS 和 RDAP。

| 后缀 | 项目处理与部署要求 |
| --- | --- |
| `.cn` | CNNIC WHOIS，需要 TCP 43 出站 |
| `.jp` | JPRS 英文查询格式，解析对应字段 |
| `.tw` | 使用域名服务器 `whois.twnic.net.tw` |
| `.es` | 需授权部署服务器的出站 IP |

国别 WHOIS 地址来自本地映射，未收录后缀会尝试通过 IANA 查找。
域名 RDAP 明确返回未注册时直接返回 404；网络查询的自动模式遇到
RDAP 404 会再通过 WHOIS 核实。注册商补充失败时保留有效注册局记录。
查询结果字段与可用性受上游服务影响，不能仅凭页面能打开判断查询正常。

## 部署后验证

检查托管平台或 Actions 的构建与部署结果，再确认网站页面和 API 可访问。
在运行应用之外的终端执行实网脚本，将地址替换为实际部署入口：

```bash
npm run test:live -- --base https://your-host.example
npm run test:networks -- --base https://your-host.example
```

这两个脚本会访问真实注册局，任一检查失败时返回非零退出码。
建议结合错误原因检查网络、上游限流和 `.es` 授权情况。
完整命令、报告路径与自动化测试说明见 [开发与测试](development.md)。
历史记录见 [国别域名报告](cctld-verification.md)和
[IP / ASN 报告](network-verification.md)，结果以各报告日期为准。

[opennext]: https://opennext.js.org/cloudflare/get-started
[dispatch]: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch
[tcp-sockets]: https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/
[es-whois]: https://www.dominios.es/es/sobre-dominios/valores-anadidos/whois-43
