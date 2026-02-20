# 🤖 AGENTS.md - Agent工作指南

## 📌 自动加载文件说明

This file is automatically loaded when agents enter this project directory. 
**Please read this entire file before starting any work.**

本文件在agent进入项目目录时自动加载。**开始任何工作前，请完整阅读本文件。**

---

## ⚡ 快速开始 - 5分钟恢复工作状态

**🔴 刚刚进入新对话？按这个顺序做：**

1. **📸 查看最新工作快照** (30秒)
   ```bash
   # 阅读SESSION_SNAPSHOT.md - 了解当前进度、活跃PR、待做任务
   cat SESSION_SNAPSHOT.md
   ```

2. **🗺️ 查看全局计划** (1分钟)
   ```bash
   # 查看DEVELOPMENT_PLAN.md中相关阶段的细节
   head -100 DEVELOPMENT_PLAN.md
   ```

3. **📊 检查GitHub实时状态** (1分钟)
   ```bash
   # 查看最近提交
   git log --oneline | head -5
   
   # 查看所有开放的Copilot PR
   gh pr list --creator=Copilot --state=open
   
   # 查看开放的issues
   gh issue list --state=open
   ```

4. **✅ 验证本地环境** (2分钟)
   ```bash
   npm test
   npm run build
   npm run lint
   ```

5. **🌿 确认分支策略** (10秒)
   ```bash
   # 日常开发必须在 dev，main 仅用于发布
   git checkout dev && git pull origin dev
   ```

**✨ 完成！你现在完全恢复了上下文，可以继续工作。** 🚀

> **分支硬规则**：永远在 `dev` 开发；只有达到可发布阶段才从 `dev` 合并回 `main`。

---

## 🤖 两种 Agent 的职责划分

> **⚠️ 重要：在开始任何工作前，必须理解这个区别。**

本项目涉及两种不同的 Agent，它们的能力和职责完全不同：

### 本地 Agent（Local Agent）
**即：当前与用户对话的 GitHub Copilot（你）**

**能力**：
- ✅ 完整的本地文件系统读写权限
- ✅ 可运行终端命令（`npm test`, `npm run build`, `git` 等）
- ✅ 可使用所有 GitHub MCP 工具
- ✅ 与用户直接交互，理解自然语言描述的问题
- ✅ 可在本地解决 merge conflicts 后推送

**核心职责**：
1. **分析和规划** - 用户通常描述问题或需求（不是具体指令），本地 Agent 需要：
   - 理解用户意图
   - 分析现有代码和 issues
   - 规划解决方案（新建 issue / 选择已有 issue / 直接修复）
   - 决策：简单任务自己实现 vs 分配给远程 Agent
2. **审查 PR** - 远程 Agent 创建 PR 后，本地 Agent 负责：
   - 用 MCP 读取 PR 内容
   - **本地运行测试**（`npm test`, `npm run build`）
   - 检查代码质量
3. **解决冲突** - 如遇复杂 merge conflict：
   - 本地 checkout 分支
   - 手动解决冲突
   - 推送后再合并
4. **执行合并** - 使用 `mcp_io_github_git_merge_pull_request`

---

### 远程 Agent（Remote Agent）
**即：通过 `mcp_io_github_git_assign_copilot_to_issue` 分配的 Copilot**

**能力**：
- ✅ 读取 issue 内容和项目文件
- ✅ 创建分支、提交代码
- ✅ 创建 Pull Request
- ❌ **无法运行本地命令**（不能执行 npm test 等）
- ❌ **无法合并 PR**（需要本地 Agent 审查后合并）
- ❌ **无法解决复杂 merge conflicts**
- ❌ 无法与用户直接交互

**核心职责**：
1. 读取 issue 规范，理解需求
2. 实现代码（源码 + 测试 + 文档）
3. 创建 PR，引用对应 issue

---

### 完整协作流程

```
用户描述问题/需求（自然语言，不一定是具体指令）
  │
  ▼
本地 Agent：分析 & 规划
  ├─ 理解用户意图
  ├─ 检查现有 issues 和代码库
  ├─ 规划方案（新建 issue / 选已有 issue / 直接修复）
  └─ 决策：
       ├─ [简单/紧急] 本地 Agent 直接实现 ──────────────┐
       └─ [复杂/独立] 分配给远程 Agent                   │
                │                                        │
                ▼                                        │
          远程 Agent：实现代码 + 创建 PR                  │
                │                                        │
                ▼                                        │
          GitHub Actions：CI 自动测试                     │
                │                                        │
                ▼                                        │
          本地 Agent：审查 PR ◄──────────────────────────┘
                ├─ MCP: pull_request_read（读取代码）
                ├─ 本地: npm test, npm run build
                ├─ 检查冲突：
                │     ├─ [无冲突] 批准并合并
                │     └─ [有冲突] checkout → 本地解决 → push → 合并
                └─ MCP: merge_pull_request
```

---

## 🎯 项目概述

**项目名称**: copilot-read-image  
**项目类型**: VS Code Extension for GitHub Copilot  
**目标**: 为GitHub Copilot提供图像读取和分析工具  
**当前版本**: 0.2.0  
**状态**: 🟡 Active Development  

### 核心业务价值
Enable GitHub Copilot to analyze images directly within chat workflows by providing:
- 🖼️ Local file image reading
- 📝 Base64 image decoding  
- 🌐 URL image fetching
- 🧠 Vision Language Model integration

---

## 📚 重要文档速查

**⭐ 跨对话状态恢复 (New Conversation?)**:
- [SESSION_SNAPSHOT.md](SESSION_SNAPSHOT.md) - 最新工作状态快照 **← 新对话从这里开始**
  - 当前进度
  - 活跃PR和Issues
  - 快速记忆助手
  - 关键链接和命令

**🤖 Agent 协作工作流**:
- [AGENT_AUTONOMOUS_WORKFLOW.md](AGENT_AUTONOMOUS_WORKFLOW.md) - 本地/远程 Agent 职责和协作流程
- [AGENT_AUTO_MERGE_GUIDE.md](AGENT_AUTO_MERGE_GUIDE.md) - PR 审查、冲突解决和合并指南

**必读文档 (Start Here)**:
- [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) - 5阶段开发路线图

**工作参考**:
- [MERGE_CHECKLIST.md](MERGE_CHECKLIST.md) - PR合并前验证清单
- [LOCAL_TESTING_GUIDE.md](LOCAL_TESTING_GUIDE.md) - 本地测试和调试指南

**快速查询**:
- [README.md](README.md) - 项目基本信息
- [CHANGELOG.md](CHANGELOG.md) - 版本历史记录

---

## 🚀 工作流程

### 当被分配一个Issue时

1. **读取Issue详情**
   - 理解需求和acceptance criteria
   - 查看是否有相关的epic或parent issue
   - 确认不与其他工作冲突

2. **创建工作分支**
   ```bash
   git checkout -b feature/issue-<number>-<description>
   # Example: feature/issue-2-vs-code-extension-setup
   ```

3. **规划实现**
   - 查阅 DEVELOPMENT_PLAN.md 中相应阶段的详细要求
   - 确定需要修改的文件
   - 考虑测试策略

4. **实现代码**
   - 遵循项目代码标准（见下文）
   - 定期提交，清晰的commit message
   - 添加必要的测试

5. **提交PR**
   - PR标题格式: `[type]: description` (例: `[feat]: implement readImageFromPath tool`)
   - 使用提供的PR模板 (`.github/PULL_REQUEST_TEMPLATE.md`)
   - 参考相关issue: `Closes #2`
   - PR描述要清晰详细

6. **自动化验证**
   - GitHub Actions自动运行（无需操作）
   - 监视检查是否通过
   - 如有失败，进行修复后再push

> **📝 文档更新提醒（本地 Agent 职责）**
> 每次完成以下操作后，必须更新 `SESSION_SNAPSHOT.md` 并 push 到 main：
> - **assign issue 给远程 Agent** → 更新 issue 状态为 "🤖 远程 Agent 开发中 → PR #N"
> - **PR 合并完成** → 将 issue 标记为 ✅，更新"当前行动项"为下一个任务，更新底部 Status 行
> - **发现新问题/需求** → 更新"待处理"列表

---

## 📋 代码标准 & 最佳实践

### TypeScript编码标准

**类型检查 - 严格模式**:
```typescript
// ✅ GOOD: 用TypeScript接口
interface ImageResult {
  filePath: string;
  sizeBytes: number;
  format: ImageFormat;
  data: Buffer;
}

// ❌ BAD: any类型
const result: any = ...  // 禁止！
```

**导入组织**:
```typescript
// 外部库 → Node.js内置 → 本地导入
import * as vscode from 'vscode';  // 外部
import * as fs from 'fs';           // 内置
import { readImage } from './utils'; // 本地
```

**错误处理**:
```typescript
// ✅ GOOD: 具体的错误处理
try {
  const data = await fs.promises.readFile(filePath);
} catch (error) {
  if (error instanceof Error && error.code === 'ENOENT') {
    throw new Error(`Image file not found: ${filePath}`);
  }
  throw error;
}

// ❌ BAD: 忽略错误
const data = await fs.promises.readFile(filePath).catch(() => null);
```

**命名约定**:
- 类和接口: PascalCase (ImageTool, LanguageModelResult)
- 函数和变量: camelCase (readImage, imageSize)
- 常量: UPPER_SNAKE_CASE (MAX_FILE_SIZE, FORMAT_SIGNATURES)
- 文件名: kebab-case (read-image-from-path.ts)

**文档注释 - JSDoc必需**:
```typescript
/**
 * Read an image from a local file path.
 * 
 * @param filePath - Absolute or relative path to image file
 * @returns ImageResult containing file metadata and binary data
 * @throws Error if file not found or unsupported format
 * 
 * @example
 * const result = await readImage('./screenshot.png');
 * console.log(result.format); // 'png'
 */
export async function readImage(filePath: string): Promise<ImageResult> {
  // ...
}
```

### 测试标准

**100% 关键路径覆盖**:
- 所有public API都需要单元测试
- 成功路径 + 错误路径都要测试
- 边界情况必须覆盖

**测试文件命名**: `<module>.test.ts`

**测试格式**:
```typescript
describe('readImage', () => {
  it('should read PNG file successfully', async () => {
    const result = await readImage('./test-fixtures/sample.png');
    expect(result.format).toBe('png');
    expect(result.data).toBeInstanceOf(Buffer);
  });

  it('should throw error for non-existent file', async () => {
    await expect(readImage('./nonexistent.png')).rejects.toThrow('not found');
  });
});
```

### Git提交规范

**Commit消息格式** (Conventional Commits):
```
type(scope): description

[optional body]
[optional footer]
```

**Types**:
- `feat`: 新功能
- `fix`: 缺陷修复
- `refactor`: 代码重构
- `test`: 测试相关
- `docs`: 文档更新
- `chore`: 工具/配置更改
- `style`: 代码格式(仅formatting，无逻辑改变)

**Scopes** (可选):
- 常用: `tools`, `utils`, `extension`, `tests`, `docs`, `ci`

**示例**:
```
feat(tools): implement readImageFromPath tool

- Add local file validation and security checks
- Support multiple image formats (PNG, JPEG, GIF, WebP, BMP)
- Return LanguageModelToolResult with image data

Closes #3
```

---

## 🏗️ 项目结构

**当前目录树**:
```
copilot-read-image/
├── .github/
│   ├── workflows/
│   │   └── pr-validation.yml      # GitHub Actions配置
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── PULL_REQUEST_TEMPLATE.md   # PR模板
├── scripts/
│   ├── checkout-and-initialize.sh # 分支检出初始化脚本
│   ├── pr-manager.sh              # PR监控和管理脚本
│   └── version-bump.sh            # 版本管理脚本
├── src/
│   ├── tools/
│   │   └── index.ts               # 三个工具占位符（Phase 2待实现）
│   ├── extension.ts               # VS Code扩展入口（已完成）
│   └── index.ts                   # 原图像库代码（readImage, detectFormat）
├── tests/
│   └── index.test.ts              # 现有单元测试（8个测试通过）
├── package.json                   # 扩展清单 + 依赖配置
├── tsconfig.json                  # TypeScript配置
├── tsconfig.eslint.json           # ESLint TS配置
├── jest.config.js                 # Jest配置
├── eslint.config.mjs              # ESLint配置
├── .prettierrc                    # Prettier配置
├── AGENTS.md                      # ← 本文件（Agent工作指南）
├── SESSION_SNAPSHOT.md            # 当前工作状态快照
├── AGENT_AUTONOMOUS_WORKFLOW.md   # 本地/远程Agent协作流程
├── AGENT_AUTO_MERGE_GUIDE.md      # PR审查和合并指南
├── MERGE_CHECKLIST.md             # 合并检查清单
├── DEVELOPMENT_PLAN.md            # 开发路线图
├── LOCAL_TESTING_GUIDE.md         # 本地调试指南
├── CHANGELOG.md                   # 版本历史
├── LICENSE                        # MIT许可
└── README.md                      # 项目说明
```

---

## ⚙️ 开发环境要求

**必需**:
- Node.js >= 18 (推荐18+)
- npm >= 9 (或yarn/pnpm)
- Git (当然)

**推荐的VS Code扩展** (用于开发):
- ESLint (dbaeumer.vscode-eslint)
- Prettier (esbenp.prettier-vscode)
- Jest (orta.vscode-jest)
- Thunder Client (rangav.vscode-thunder-client) - 用于API测试

**设置开发环境**:
```bash
# 1. Clone并进入项目
git clone https://github.com/Fadelis98/copilot-read-image.git
cd copilot-read-image

# 2. 安装依赖
npm ci  # 比npm install更严格，推荐用于CI

# 3. 验证环境
npm run build
npm test
npm run lint
```

---

## 🔍 常见任务速查

### 运行测试
```bash
npm test                    # 运行所有测试
npm test -- --watch       # 监视模式
npm test -- --coverage    # 生成覆盖率报告
```

### 代码检查
```bash
npm run lint              # 检查linting问题
npm run lint:fix          # 自动修复linting问题
npm run format:check      # 检查格式
npm run format            # 自动格式化
```

### 构建项目
```bash
npm run build             # TypeScript编译
npm run clean             # 删除dist目录
npm run build:watch       # 监视模式构建
```

### 调试扩展 (Phase 1之后)
```bash
# 在VS Code中按F5启动扩展调试主机
# 会自动打开一个新的VS Code窗口（Extension Development Host）
# 参考 LOCAL_TESTING_GUIDE.md 获取详细说明
```

### 本地测试（学习参考）
参考 [LOCAL_TESTING_GUIDE.md](LOCAL_TESTING_GUIDE.md)：
- 如何在VS Code中运行和调试扩展
- F5快速启动调试流程
- 使用Copilot Chat测试工具
- 设置断点调试
- 常见问题排查

### 创建版本发布
```bash
./scripts/version-bump.sh bump     # 交互式版本升级
# 或自动化:
./scripts/version-bump.sh auto patch "description"
```

---

## ⚠️ 禁止事项 (DO NOT)

❌ **代码质量相关**:
- 不要提交 `console.log()` 语句 (使用vscode.output或日志库)
- 不要使用 `any` 类型 (用 `unknown` 或具体类型替代)
- 不要修改 `package-lock.json` 手动 (运行npm命令自动更新)
- 不要跳过测试 (`.only()`, `.skip()` 禁止在生产代码中)

❌ **安全相关**:
- 不要硬编码API密钥或敏感信息
- 不要忽视错误处理
- 不要相信用户输入验证 (总是验证)

❌ **分支/提交相关**:
- 不要直接推送到main分支 (总是通过PR)
- 不要变基或强制推送到已发布分支
- 不要在提交时混合多个无关的功能

❌ **依赖相关**:
- 不要添加大的依赖包而不必要的 (考虑捆绑大小)
- 不要添加过期或不维护的包
- 不要手动修改package.json依赖版本 (用npm add/remove)

❌ **文档相关**:
- 不要忽视更新CHANGELOG.md
- 不要写不清楚的commit消息
- 不要遗漏函数的JSDoc注释

---

## 🎯 当前开发阶段 - Phase 2

**状态**: 🟡 READY TO START  
**任务**: 实现三个图像处理工具

### Phase 2需要完成的工作:
- [ ] Issue #3: 实现 `readImageFromPath` 工具（🔴 HIGH 优先）
- [ ] Issue #5: 实现 `imgFromBase64` 工具
- [ ] Issue #4: 实现 `imgFromUrl` 工具
- [ ] 为每个工具添加完整的单元测试（覆盖率 >= 80%）

### Phase 1已完成（参考）:
- [x] `src/extension.ts` 入口点（已完成）
- [x] `package.json` 扩展清单（已完成）
- [x] `contributes.languageModelTools` 定义（已完成）
- [x] 工具占位符实现（已完成，PR #7 已合并）

### 当完成Phase 2后:
1. 三个工具 PR 合并到 main
2. 开始 Phase 3：VLM 集成和验证（Issue #6）

---

## 📞 获取帮助

**查找信息的优先级**:
1. 📖 此文件 (AGENTS.md)
2. 📋 [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) - 相关阶段的详细信息
3. 📌 [SYSTEM_STATUS.md](SYSTEM_STATUS.md) - 项目状态和进度
4. ⚙️ [AUTOMATION_GUIDE.md](AUTOMATION_GUIDE.md) - 工作流程和脚本使用

**卡住了?**:
- 查看 GitHub Issues 中的讨论
- 检查MERGE_CHECKLIST.md的故障排除部分
- 查看类似的已合并PR来学习模式

---

## 🚨 严重错误处理

**如果您发现以下情况,立即停止并通知**:

1. ❌ main分支的代码无法构建
2. ❌ 现有测试无故失败
3. ❌ PR validation workflow崩溃
4. ❌ 安全漏洞或数据泄露迹象

**恢复步骤**:
```bash
# 回滚最后一个提交
git revert HEAD
git push origin <branch>

# 或者如果在本地:
git reset --hard HEAD~1
```

---

## 📈 质量目标

**强制要求**:
- ✅ 构建必须成功 (npm run build)
- ✅ 所有测试必须通过 (npm test)
- ✅ 代码必须通过linting (npm run lint)
- ✅ 代码必须格式正确 (npm run format:check)

**建议目标**:
- 🎯 测试覆盖率 >= 80%
- 🎯 没有console.log语句
- 🎯 所有公共API都有JSDoc
- 🎯 commit message清晰且遵循规范

---

## 🎓 学习资源

**VS Code Extension API**:
- 官方文档: https://code.visualstudio.com/api
- Language Models API: https://code.visualstudio.com/api/extension-guides/language-model
- 示例项目: https://github.com/microsoft/vscode-extension-samples

**GitHub Copilot & AI**:
- Copilot文档: https://github.blog/ai-and-ml/
- Vision Language Models: 研究论文和实现

**TypeScript最佳实践**:
- TypeScript手册: https://www.typescriptlang.org/docs/
- 本项目的tsconfig.json注释

---

## 🔄 反馈循环

**PR被拒绝或需要修改时**:
1. ✅ 阅读反馈评论
2. ✅ 理解问题根本原因
3. ✅ 进行必要的修改
4. ✅ 重新push (自动触发验证)
5. ✅ 回复评论并请求再次审查

**迭代是正常的** - 高质量代码需要多轮审查和优化。

---

## ✅ 开始前的检查清单

在开始任何工作前，请确认:

- [ ] 我已经完整阅读了此文件 (AGENTS.md)
- [ ] 我查看了相关的GitHub issue
- [ ] 我理解了 DEVELOPMENT_PLAN.md 中的阶段目标
- [ ] 我检查了本项目中相似功能的现有实现
- [ ] 我确认本地开发环境已设置好 (npm install, npm test通过)
- [ ] 我创建了新分支 (feature/<issue>-<description>)
- [ ] 我了解了代码标准和测试要求

✅ **全部完成?** 让我们开始工作吧！🚀

---

## 📝 最后更新

- **更新日期**: 2026-02-20
- **维护者**: Automated System + Fadelis98
- **状态**: ✅ Active
- **版本**: 1.0.0 (Agent Workflow v1)

---

**欢迎加入! 让我们一起构建未来。** 🎉

> "The best code is not written alone. It's reviewed, tested, and refined by a community."

---

## 📌 快速参考

| 命令 | 目的 |
|------|------|
| `npm install` | 安装依赖 |
| `npm run build` | 构建项目 |
| `npm test` | 运行测试 |
| `npm run lint` | 检查代码质量 |
| `npm run format` | 自动格式化代码 |
| `git checkout -b feature/<name>` | 创建新分支 |
| `./scripts/pr-manager.sh check <PR>` | 检查PR状态 |
| `./scripts/version-bump.sh bump` | 升级版本 |

---

**Questions? Open an issue or check the documentation!**
