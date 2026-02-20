# 🤖 Agent 完全自主工作流程

## 📌 用途

本文件描述 Agent 如何在新对话中**完全自主地处理所有开发任务**，无需人工监督。

**模式**: 🔴 完全自动化 - Zero Human Intervention

---

## 🎯 当前任务状态

### 待处理任务 (按优先级)
- **Issue #3**: Phase 2.1 - readImageFromPath Tool (🔴 HIGH 优先级)
- **Issue #5**: Phase 2.2 - imgFromBase64 Tool (🟡 MEDIUM)
- **Issue #4**: Phase 2.3 - imgFromUrl Tool (🟡 MEDIUM)
- **Issue #6**: Phase 3 - VLM Integration (⏳ 等待 Phase 2 完成)

**Agent 将按此顺序自动处理所有 issues。**

---

## � Agent 自主循环工作流

### 第一步：自动查找下一个任务 (30秒)

```bash
# Agent 自动执行：
mcp_io_github_git_list_issues(state: "open")

# 按优先级排序，选择最高优先级的 issue
# 读取 issue 详细规范
mcp_io_github_git_issue_read(issue_number: 3)
```

### 第二步：分配并开始工作 (1分钟)

```bash
# Agent 自动分配 issue 给自己
mcp_io_github_git_assign_copilot_to_issue(issue_number: 3)

# Agent 创建工作分支
git checkout -b feature/issue-3-read-image-from-path
```

### 第三步：本地验证 (5分钟)

```bash
# Agent 自动执行
npm run build  # ✓ 构建成功
npm run lint   # ✓ Lint 通过
npm test       # ✓ 所有测试通过
npm run format:check  # ✓ 格式正确
```

### 第四步：创建 PR 和 CI (1-15分钟)

```bash
# Agent 自动创建 PR
mcp_io_github_git_create_pull_request(
  title: "feat(tools): implement readImageFromPath tool",
  body: "Closes #3",
  labels: ["feature", "phase-2"]
)

# GitHub Actions 自动运行 CI：
# ✓ Build ✓ Lint ✓ Tests ✓ Coverage >= 80%
```

### 第五步：自动代码审查和合并 (3分钟)

```bash
# Agent 读取 PR 并验证所有检查清单项
mcp_io_github_git_pull_request_read(pr_number: 8)

# Agent 提交审查评论
mcp_io_github_git_pull_request_review_write(
  event: "COMMENT",
  body: "✅ All checks passed"
)

# Agent 自动批准
mcp_io_github_git_pull_request_review_write(event: "APPROVE")

# Agent 自动合并
mcp_io_github_git_merge_pull_request(
  merge_method: "squash"
)
```

### 第六步：连续处理下一个任务 (循环)

```bash
# Issue #3 完成 → Issue #5 开始
# 重复步骤 1-5，直到所有 issues 完成
```

---

## 🎯 预期总耗时

```
Issue #3: 45 分钟 (实现 + CI + 自动合并)
Issue #5: 45 分钟
Issue #4: 45 分钟
Issue #6: 45 分钟

总计: ~3 小时，完全自动，无需人工干预 🤖
```

---

## � 本地测试和调试 (Agent在开发时使用)

### 在提交PR之前，Agent应该在本地测试

If Agent is working on Phase 1 (extension development), they should verify the implementation locally before submitting PR:

```bash
# 步骤1: 构建项目
npm run build

# 步骤2: 启动本地调试
# 在VS Code中按F5
# 或运行: code --extensionDevelopmentPath=.
# 这会打开一个新的VS Code窗口，已加载扩展

# 步骤3: 在新窗口中测试
# - 打开Copilot Chat
# - 确认三个工具可见
# - 测试工具是否可调用
# - 检查返回的数据格式

# 步骤4: 验证代码质量
npm test
npm run lint
npm run format:check
```

### 快速启动调试 (F5)
当在本地开发时，最快的流程：

```bash
# 终端 1: 启动TypeScript监听编译
npm run build:watch

# 然后在VS Code中按 F5
# → 自动启动Extension Development Host
# → 加载您的最新代码
# → 可以设置断点进行调试

# 修改代码后：
# → build:watch自动重新编译
# → 在Development Host中按 Ctrl+R 重新加载扩展
```

### 参考文档
详见 [LOCAL_TESTING_GUIDE.md](LOCAL_TESTING_GUIDE.md)：
- 详细的F5启动指南
- 如何使用Copilot Chat测试工具
- 设置断点调试工具代码
- 常见问题和解决方案

---

### 当Phase 1完成后，分配Phase 2:

```bash
# 查看待分配的issues
gh issue list --state=open --label=phase-2

# 分配给Copilot agent (使用assign_copilot_to_issue工具):
# assign_copilot_to_issue(
#   owner: "Fadelis98",
#   repo: "copilot-read-image",
#   issue_number: 3,  # Phase 2.1
#   custom_instructions: "同第二个issue的自定义指令..."
# )
```

---

## 🆘 常见的Agent工作问题和解决方案

### ❌ 问题1: 自动化检查失败

**症状**: GitHub Actions显示红叉

**检查步骤**:
```bash
# 1. 查看具体失败
gh run view <run-id> --log

# 2. 可能的原因:
#  - 构建失败 → npm run build 
#  - 测试失败 → npm test
#  - 代码格式 → npm run format:check
#  - Linting → npm run lint

# 3. 通知Copilot在PR中的问题
# 在PR上评论，说明具体问题
gh pr comment 7 --body "Build failed: [具体错误]"
```

### ❌ 问题2: PR工作过程中有merge conflict

**症状**: PR显示"conflicting" 或 "behind main"

**解决步骤**:
```bash
# 1. 通知Copilot更新分支
gh pr comment 7 --body "分支落后于main，请rebase"

# 2. 或手动解决(如需):
git fetch origin
git checkout copilot-branch
git merge origin/main  # 解决冲突
git push origin copilot-branch
```

### ❌ 问题3: Copilot未按要求实现

**症状**: 代码不符合Phase 1要求

**解决步骤**:
```bash
# 1. 在PR中添加详细的审查评论，说明:
#    - 缺少的组件
#    - 不符合要求的部分
#    - 参考DEVELOPMENT_PLAN.md的具体要求

gh pr comment 7 --body "
请按照DEVELOPMENT_PLAN.md Phase 1.1的要求:
- [ ] 添加vscode作为peerDependency
- [ ] 创建src/tools/目录结构
- [ ] 等等...
"

# 2. Copilot会自动读取评论并进行修改
# 3. 等待新的提交push和checks重新运行
```

### ❌ 问题4: 不确定是否满足要求

**解决步骤**:
```bash
# 1. 参考MERGE_CHECKLIST.md进行详细检查
cat MERGE_CHECKLIST.md

# 2. 运行验证命令
npm run build
npm test 
npm run lint
npm run format:check

# 3. 检查是否所有要求都满足
# 3a. 查看AGENTS.md中的"Phase 1完成的工作"
grep -A 10 "Phase 1需要完成的工作" AGENTS.md
```

---

## 🔗 关键快速链接

**GitHub相关**:
- PR #7: https://github.com/Fadelis98/copilot-read-image/pull/7
- Issues: https://github.com/Fadelis98/copilot-read-image/issues
- Actions: https://github.com/Fadelis98/copilot-read-image/actions

**项目文档**:
- [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) - Phase 1详细要求
- [AGENTS.md](AGENTS.md) - Agent工作指南
- [MERGE_CHECKLIST.md](MERGE_CHECKLIST.md) - 合并检查清单

---

## 📊 命令快速参考 - Agent管理

```bash
# 📋 检查状态
gh pr view 7                          # 查看PR概览
gh pr view 7 --json state,checks      # 查看PR状态和checks
./scripts/pr-manager.sh check 7       # 详细的readiness报告

# 📝 审查
git fetch origin pull/7/head:copilot-branch  # 检出PR分支
git diff main...HEAD                         # 查看变更
npm run build && npm test && npm run lint    # 本地验证

# 💬 交互
gh pr comment 7 --body "Review message"      # 添加评论
gh pr review 7 --approve                     # 批准
gh pr review 7 --request-changes              # 要求修改

# ✅ 合并
gh pr merge 7 --squash                       # 合并

# 📅 后续
./scripts/version-bump.sh bump               # 更新版本
git log --oneline | head -5                  # 查看新提交
```

---

## ⏱️ 典型的Agent工作周期时间表

**在新对话中继续工作**:

1. **快速状态检查** (2分钟)
   - 阅读SESSION_SNAPSHOT.md
   - 运行 `gh pr view 7`

2. **详细审查** (5-10分钟)
   - 审查PR变更
   - 本地测试
   - 验证Phase 1要求

3. **批准或反馈** (2分钟)
   - 批准：`gh pr review 7 --approve`
   - 反馈：`gh pr comment 7 --body "..."`

4. **合并或等待** (5分钟)
   - 合并：`gh pr merge 7 --squash`
   - 更新：`vim SESSION_SNAPSHOT.md`

**总计**: 15-25分钟完成一个完整的审查-合并周期

---

## 🎯 成功标志

### ✅ 当以下都完成时，PR #7可以合并：

1. ✓ 所有GitHub自动化检查通过
2. ✓ 代码通过本地验证 (build, test, lint)
3. ✓ 实现了Phase 1全部要求
4. ✓ 没有merge conflicts
5. ✓ 通过人工代码审查
6. ✓ DEVELOPMENT_PLAN.md Phase 1的所有项都完成
7. ✓ 符合MERGE_CHECKLIST.md的所有标准

### 🚀 合并后的下一步：

1. 更新Session Snapshot
2. 分配Issue #3, #4, #5 给Copilot (Phase 2)
3. 新对话中继续监督Phase 2进展

---

## 📚 从Phase 1学到的经验教训

**重要**: 在Phase 1的PR合并过程中，我们发现了Agent工作流程中的几个可改进之处。

**详细改进文档**: [AGENT_WORKFLOW_IMPROVEMENTS.md](AGENT_WORKFLOW_IMPROVEMENTS.md)

**关键发现** (6个问题):
1. 依赖安装不同步 → 使用 `npm ci` 和初始化脚本解决
2. Merge冲突处理不清晰 → 预检冲突并定义处理策略
3. 本地测试验证不完整 → 完整的检查清单
4. 错误处理不充分 → 标准化错误处理模式
5. 文档与实践脱节 → Agent合并前清单
6. F5调试被跳过 → 标记为**必需**步骤

**对Phase 2+ Agent的建议**:
- 使用 `./scripts/checkout-and-initialize.sh <branch>` 初始化工作环境
- 遵循 [AGENT_WORKFLOW_IMPROVEMENTS.md](AGENT_WORKFLOW_IMPROVEMENTS.md) 中的改进检查清单
- 对扩展类PR，F5调试测试是**必需**步骤，不是可选
- 在合并前预检merge conflicts
- 使用标准化的错误处理和日志记录

---

**Last Updated**: 2026-02-20  
**Purpose**: 指导在新对话中继续Agent工作管理，包括改进经验  
**Status**: 🟢 Ready for Use with Improvements
