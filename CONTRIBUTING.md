# 贡献指南

欢迎修复查询与解析问题、改进界面和文档。提交前请先查看已有
[Issues](https://github.com/fishyu-yu/whois/issues) 和
[Pull requests](https://github.com/fishyu-yu/whois/pulls)，避免重复工作。
较大的功能或查询策略调整，可先提交功能建议，说明使用场景与预期行为。

## 开发环境

使用 Node.js 22 或更新版本；推荐 `.nvmrc` 指定的 Node.js 24。
使用 npm 和仓库的 `package-lock.json` 安装依赖：

```bash
git clone https://github.com/fishyu-yu/whois.git
cd whois
npm ci
npm run dev
```

打开 <http://localhost:3000>。默认无需 `.env` 文件。
API、查询来源和部署限制见 [README](README.md)。
真实 WHOIS 查询需要部署主机允许 TCP 43 出站，RDAP 需要 HTTP/HTTPS 出站。

## 修改与验证

从当前 `master` 创建自己的分支，将一个 PR 控制在一个明确的问题或功能内。
保持已有代码风格；修改查询校验、回退、转介或解析逻辑时，
在 `tests/` 中补充能复现该行为的单元或 API 测试。
修正文案和文档无需添加无关测试。

代码改动提交前运行：

```bash
npm test
npm run lint:all
npm run build
npm run typecheck
```

请在构建后运行类型检查，因为 Next.js 构建会生成路由类型。
`npm test` 使用模拟 RDAP 响应和本地 TCP 服务，无需访问外部注册局。
当前 `npm run lint:md` 只检查 README；修改其他 Markdown 文件时可运行：

```bash
npx --no-install markdownlint CONTRIBUTING.md .github/pull_request_template.md
```

修改页面、查询路径或导出功能时，再运行浏览器回归：

```bash
npx playwright install chromium
npm run build
npm run test:e2e
```

Windows 可在 PowerShell 设置 `$env:PLAYWRIGHT_CHANNEL='msedge'`，
使用已安装的 Edge。浏览器测试默认使用 3002 端口，
报告写入 `.local/playwright-report/` 和 `.local/playwright-results/`。

## 真实注册局验证

修改服务地址、国别域名映射或网络查询时，可补充少量实网验证。
先启动应用，再在另一个终端运行：

```bash
npm run test:live -- --domains baidu.cn,jprs.jp --base http://localhost:3000
npm run test:networks -- --base http://localhost:3000
```

实网验证与单元测试分开运行，结果可能受到网络、限流和注册局授权影响。
在 PR 中记录日期、部署环境、查询类型、来源及结果；失败时保留错误说明，
不要将上游暂时不可用改写为测试通过。新增端点应附注册局或 IANA 的依据。
历史验证记录可参考 [国别域名报告](docs/cctld-verification.md) 和
[IP / ASN 报告](docs/network-verification.md)，其中结论仅对应各自验证日期。

## 提交 Issue 和 PR

问题报告请提供可公开的域名、IP、CIDR 或 ASN 样例，复现步骤、
查询来源、预期结果、实际错误，以及浏览器或服务器环境。
查询失败时说明 HTTP/HTTPS 和 TCP 43 出站情况；不确定时写明“未验证”。
功能建议请说明遇到的问题和期望的使用方式。

PR 请概述行为变化和验证结果。涉及界面时可附脱敏截图；
未运行或不适用的检查请注明原因。
不要提交个人查询历史、未经脱敏的 WHOIS/RDAP 原始响应或导出结果、
联系人邮箱、电话、地址、令牌、`.env`、`.dev.vars` 或部署密钥。
测试样例优先使用虚构联系人与公共演示资源，实网报告保留在被忽略的 `.local/`。

项目许可证见 [LICENSE](LICENSE)。提交代码前请确认你有权提供这些内容。
