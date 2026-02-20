# 🤖 AGENTS.md - Agent工作指南

## 📌 自动加载文件说明

This file is automatically loaded when agents enter this project directory. 
**Please read this entire file before starting any work.**

本文件在agent进入项目目录时自动加载。**开始任何工作前，请完整阅读本文件。**

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

**必读文档 (Start Here)**:
- [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) - 5阶段开发路线图
- [SYSTEM_STATUS.md](SYSTEM_STATUS.md) - 系统当前状态概览

**工作参考**:
- [AUTOMATION_GUIDE.md](AUTOMATION_GUIDE.md) - 自动化工作流详细指南
- [MERGE_CHECKLIST.md](MERGE_CHECKLIST.md) - PR合并前验证清单

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
│   ├── CODEOWNERS                 # 代码所有者配置
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── PULL_REQUEST_TEMPLATE.md   # PR模板
├── scripts/
│   ├── pr-manager.sh              # PR监控和管理脚本
│   └── version-bump.sh            # 版本管理脚本
├── src/
│   ├── tools/                     # VS Code工具实现 (待实现)
│   │   └── index.ts               # 工具导出 (待实现)
│   ├── utils/                     # 工具函数
│   │   ├── imageFormat.ts         # (从index.ts重构)
│   │   ├── mimeType.ts            # (待创建)
│   │   └── validation.ts          # (待创建)
│   ├── types/                     # TypeScript类型定义
│   │   └── index.ts               # (待创建)
│   ├── extension.ts               # VS Code扩展入口 (待创建)
│   └── index.ts                   # 原图像库代码 (将迁移/重构)
├── tests/
│   ├── index.test.ts              # 存在的测试
│   ├── readImageFromPath.test.ts  # (待创建)
│   ├── imgFromBase64.test.ts      # (待创建)
│   └── imgFromUrl.test.ts         # (待创建)
├── package.json                   # 依赖配置 (待更新)
├── tsconfig.json                  # TypeScript配置
├── tsconfig.eslint.json           # ESLint TS配置
├── jest.config.js                 # Jest配置
├── eslint.config.mjs              # ESLint配置
├── .prettierrc                    # Prettier配置
├── AGENTS.md                      # ← 本文件
├── SYSTEM_STATUS.md               # 系统状态概览
├── AUTOMATION_GUIDE.md            # 自动化工作流指南
├── MERGE_CHECKLIST.md             # 合并检查清单
├── DEVELOPMENT_PLAN.md            # 开发路线图
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
# 或: npm run debug
```

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

## 🎯 当前开发阶段 - Phase 1

**状态**: 🟡 IN PROGRESS (PR #7)  
**任务**: VS Code扩展架构和清单设置

### Phase 1需要完成的工作:
- [x] 创建 `src/extension.ts` 入口点
- [x] 配置 `package.json` 扩展清单
- [x] 定义 `contributes.languageModelTools`
- [x] 创建工具占位符实现
- [ ] 验证 GitHub Actions构建通过
- [ ] 确保所有测试通过

### 当完成Phase 1后:
1. PR #7将被合并到main
2. Phase 2 issues将自动分配给新agent
3. 工作转向具体工具实现

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
