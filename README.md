# WHOIS/RDAP 域名查询工具

> 当前版本：v0.10.0（遵循语义化版本）

一个基于 Next.js 与 TypeScript 构建的现代化域名信息查询应用，支持 WHOIS 与 RDAP 双协议，提供结构化数据解析、结果导出、主题切换等功能，适合开发者、企业与研究场景的快速集成与使用。

## 1. 项目概述

- 支持多数据源：RDAP（注册局/注册商）、传统 WHOIS、自动选择
- 精准解析：自动将原始查询结果解析为结构化字段（域名、注册商、注册/到期时间、NS 等）
- 体验完善：本地缓存、结果导出与分享、亮/暗主题、PWA 支持
- 技术栈：Next.js 15、React 19、TypeScript、Tailwind CSS

## 2. 安装指南

### 环境要求

- Git（用于克隆仓库）
- Node.js ≥ 18.17（建议使用最新 LTS 版本）
- 包管理器：npm（也可使用 yarn/pnpm/bun）

### 安装与运行

1. 克隆并进入项目目录

```bash
git clone https://github.com/fishyu-yu/whois.git
cd whois
```

1. 安装依赖（任选其一）

```bash
# 使用 npm
npm install

# 使用 pnpm
pnpm install

# 使用 yarn
yarn install

# 使用 bun
bun install
```

1. 开发模式（默认端口 3000）

```bash
npm run dev
# 访问 http://localhost:3000
```

1. 生产构建与启动

```bash
npm run build
npm start
# 访问 http://localhost:3000
```

### 可选配置

- 端口变更：开发模式下可使用 PORT 环境变量或 -p 参数指定端口（示例：Windows PowerShell）

```powershell
$env:PORT=3001; npm run dev
# 或
npm run dev -- -p 3001
```

- 包管理器替换：如使用 pnpm/yarn/bun，请将上述命令中的 npm 替换为对应工具。

## 3. 使用说明

### 前端 UI

1. 启动服务后打开首页，输入域名（支持 IDN）
2. 在「查询来源」中选择数据源（默认自动选择）
3. 点击「查询」查看结构化结果与原始数据
4. 支持导出 JSON、分享结果

### API 调用

- 端点：POST /api/whois
- 请求体：

```json
{
  "query": "example.com",
  "type": "domain",
  "dataSource": "auto | rdap | whois | registrar | registry"
}
```

- 响应示例（部分）：

```json
{
  "success": true,
  "data": {
    "query": "example.com",
    "type": "domain",
    "dataSource": "rdap-registry",
    "rdapSource": "registry",
    "result": { "raw": "...", "parsed": { "domain_name": "EXAMPLE.COM" } }
  }
}
```

## 4. 配置选项

- 查询来源 dataSource（前端选择或 API 参数）
  - auto：自动选择最佳数据源（优先 RDAP，失败回退 WHOIS）
  - rdap：强制使用 RDAP（结构化 JSON，优先注册商，其次注册局）
  - whois：强制使用传统 WHOIS
  - registrar：偏向注册商数据（若不可用自动回退）
  - registry：偏向注册局数据（若不可用自动回退）
- 查询类型 type：当前仅支持 "domain"
- RDAP 服务器扩展：可在 src/lib/rdap-client.ts 中扩展 RDAP_SERVERS 映射
- ccTLD 数据库扩展：可在 src/lib/cctld-database.ts 中维护各国家/地区的注册局与 WHOIS 服务器
- PWA 与静态资源：public/manifest.json、public/sw.js；构建与缓存头在 next.config.ts 中配置

## 5. 贡献指南

我们欢迎问题反馈与特性贡献：

- 提交 Issue：描述问题、复现步骤与期望行为
- 开发流程：
  1. Fork 仓库并创建特性分支（例如 feature/xxx）
  2. 运行与自测：npm run dev / npm run build / npm run lint
  3. 提交 Pull Request，说明变更内容与影响范围
- 代码风格：遵循 TypeScript 与 ESLint 规则；尽量保持模块化与清晰职责

## 6. 许可证信息

本项目使用 MIT 许可证：

- 可自由使用、复制、修改、合并、发布、分发、再许可及销售软件的副本
- 需在软件的所有副本或主要部分中包含版权声明和许可声明
- 软件按“现状”提供，不附带任何明示或默示担保

详细许可文本见项目根目录的 LICENSE 文件。
