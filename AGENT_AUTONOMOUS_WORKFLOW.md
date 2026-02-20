# 🤖 本地/远程 Agent 协作工作流

**本文件描述两种 Agent 如何协作完成开发任务。**

---

## 🌿 分支策略（必须遵守）

从现在开始，本项目采用固定双分支模型：

- `dev`：**唯一日常开发分支**（功能开发、修复、文档、重构都在这里）
- `main`：**公开/发布分支**（只接收“可发布状态”的合并）

### 强制规则

1. 新任务一律从 `dev` 开始，不直接在 `main` 开发
2. `main` 仅在达到“可发布阶段”后，从 `dev` 合并更新
3. 紧急修复默认也先进入 `dev`，验证后再同步到 `main`

### 标准操作流程

```bash
# 1) 开始开发：确保在 dev
git checkout dev
git pull origin dev

# 2) 开发与验证
npm run build && npm test && npm run lint

# 3) 推送 dev
git add .
git commit -m "feat/fix/docs: ..."
git push origin dev

# 4) 达到可发布阶段后，合并 dev -> main
git checkout main
git pull origin main
git merge --no-ff dev
git push origin main
```

> 若需要保持 `main` 极简公开内容，可在 `dev -> main` 前做发布裁剪并二次验证。

---

## 🧠 本地 Agent 的核心职责：分析与规划

用户通常**描述问题或需求**，而不是给出具体指令。本地 Agent 需要：

### 典型用户输入示例
- "图像读取功能还没实现"
- "Copilot 无法分析本地截图"
- "Phase 2 的工具都是空的，需要实现"
- "readImageFromPath 报错了"

### 本地 Agent 的分析流程

```
1. 理解用户意图
   └─ 是新功能？Bug 修复？性能问题？

2. 检查现有状态
   ├─ 查看 SESSION_SNAPSHOT.md（当前进度）
   ├─ 查看开放的 issues（mcp_io_github_git_list_issues）
   └─ 查看相关代码（src/ 目录）

3. 规划方案
   ├─ 是否已有对应 issue？
   │     ├─ 有 → 直接使用
   │     └─ 没有 → 创建新 issue（mcp_io_github_git_issue_write）
   └─ 任务复杂度？
         ├─ 简单/紧急 → 本地 Agent 直接实现
         └─ 复杂/独立 → 分配给远程 Agent
```

---

## 🔀 两种执行路径

### 路径 A：本地 Agent 直接实现

**适用场景**：
- 简单的 bug 修复
- 文档更新
- 小型配置改动
- 紧急修复

**流程**：
```bash
# 1. 从 dev 创建工作分支
git checkout dev
git pull origin dev
git checkout -b fix/issue-description

# 2. 实现代码
# ... 编辑文件 ...

# 3. 本地验证
npm run build && npm test && npm run lint

# 4. 提交并推送
git add . && git commit -m "fix: ..." && git push origin HEAD

# 5. 创建 PR（目标分支应为 dev）
mcp_io_github_git_create_pull_request(...)

# 6. 发布阶段再将 dev 合并到 main
# （参考上方“分支策略”）
```

---

### 路径 B：分配给远程 Agent

**适用场景**：
- 完整功能实现（如 Phase 2 的三个工具）
- 需要大量代码的独立模块
- 有详细 issue 规范的任务

**流程**：

```
本地 Agent
  │
  ├─ 确认 issue 存在且规范完整
  │   └─ mcp_io_github_git_issue_read(issue_number: 3)
  │
  ├─ 分配给远程 Agent
  │   └─ mcp_io_github_git_assign_copilot_to_issue(issue_number: 3)
  │
  └─ 等待远程 Agent 创建 PR...

远程 Agent（自动运行）
  │
  ├─ 读取 issue 规范
  ├─ 创建工作分支
  ├─ 实现代码 + 测试 + 文档
  └─ 创建 PR（引用 Closes #3）

GitHub Actions（自动）
  │
  ├─ Build ✓
  ├─ Lint ✓
  └─ Tests ✓

本地 Agent（回来审查）
  │
  ├─ 读取 PR：mcp_io_github_git_pull_request_read
  ├─ 本地验证：npm ci && npm run build && npm test
  ├─ 检查冲突
  │   ├─ [无冲突] → 批准并合并
  │   └─ [有冲突] → 本地解决后合并
  └─ 合并：mcp_io_github_git_merge_pull_request
```

> 详细的审查和合并步骤见 [AGENT_AUTO_MERGE_GUIDE.md](AGENT_AUTO_MERGE_GUIDE.md)

---

## 📋 当前待处理任务

### Phase 2：工具实现（3 个 issues）

| Issue | 工具 | 优先级 | 状态 |
|-------|------|--------|------|
| [#3](https://github.com/Fadelis98/copilot-read-image/issues/3) | readImageFromPath | 🔴 HIGH | 待分配 |
| [#5](https://github.com/Fadelis98/copilot-read-image/issues/5) | imgFromBase64 | 🟡 MEDIUM | 待分配 |
| [#4](https://github.com/Fadelis98/copilot-read-image/issues/4) | imgFromUrl | 🟡 MEDIUM | 待分配 |

### Phase 3：VLM 集成（1 个 issue）

| Issue | 内容 | 优先级 | 状态 |
|-------|------|--------|------|
| [#6](https://github.com/Fadelis98/copilot-read-image/issues/6) | VLM Integration | ⏳ Blocked | 等待 Phase 2 |

---

## 🚀 推荐的工作启动方式

### 新对话开始时

```bash
# 1. 了解当前状态
cat SESSION_SNAPSHOT.md

# 1.5 确认当前在 dev 分支（不是 main）
git checkout dev && git pull origin dev

# 2. 检查 GitHub 实时状态
git log --oneline | head -5
gh issue list --state=open
gh pr list --state=open

# 3. 验证本地环境
npm ci && npm run build && npm test
```

### 分配 Issue 给远程 Agent

```bash
# 确认 issue 内容完整
mcp_io_github_git_issue_read(method: "get", issue_number: 3)

# 分配给远程 Agent
mcp_io_github_git_assign_copilot_to_issue(
  owner: "Fadelis98",
  repo: "copilot-read-image",
  issue_number: 3
)
```

### 审查远程 Agent 的 PR

```bash
# 查找远程 Agent 创建的 PR
gh pr list --state=open

# 开始审查流程（见 AGENT_AUTO_MERGE_GUIDE.md）
```

---

## ⚠️ 常见误区

| 误区 | 正确理解 |
|------|---------|
| "远程 Agent 可以自己合并 PR" | ❌ 只有本地 Agent 可以合并 |
| "远程 Agent 可以运行 npm test" | ❌ 远程 Agent 无法执行本地命令 |
| "用户会给出具体的指令" | ❌ 用户通常描述问题，本地 Agent 需要分析规划 |
| "冲突可以忽略" | ❌ 复杂冲突必须在本地解决后再合并 |
| "CI 通过就可以直接合并" | ❌ 还需要本地 Agent 运行本地验证 |

---

**最后更新**: 2026-02-20  
**维护者**: Local Agent (GitHub Copilot in VS Code)
