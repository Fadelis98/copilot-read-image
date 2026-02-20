# 🤖 PR 审查、冲突解决和合并指南

**适用对象**: 本地 Agent（GitHub Copilot in VS Code）  
**前提**: 远程 Agent 已创建 PR，CI 已通过

---

## 📌 核心原则

- **远程 Agent** 负责：实现代码、创建 PR
- **本地 Agent（你）** 负责：审查 PR、解决冲突、执行合并
- 本地 Agent 有完整的终端权限，可以运行测试和解决冲突

---

## 🔄 标准 PR 审查和合并流程

### 第一步：读取 PR 内容

```bash
# 使用 GitHub MCP 读取 PR 详情
mcp_io_github_git_pull_request_read(pr_number: <N>)

# 同时检查 CI 状态
gh pr checks <N>
```

检查以下内容：
- PR 描述是否清晰，是否引用了对应 issue
- 文件变更是否符合 issue 规范
- CI 所有检查是否通过

---

### 第二步：本地验证

```bash
# 拉取 PR 分支到本地
git fetch origin pull/<N>/head:pr-<N>
git checkout pr-<N>

# 安装依赖（如有变化）
npm ci

# 运行完整验证
npm run build    # 构建必须成功
npm test         # 所有测试必须通过
npm run lint     # Lint 必须通过
```

> **为什么本地验证？** 远程 Agent 无法运行本地命令，CI 只能验证基本检查，
> 本地 Agent 需要确认在真实环境中一切正常。

---

### 第三步：检查是否有 Merge Conflict

```bash
# 检查与 main 的冲突情况
git fetch origin main
git merge --no-commit --no-ff origin/main

# 查看冲突文件
git diff --name-only --diff-filter=U
```

根据结果走不同路径：

---

### 路径 A：无冲突 → 直接批准并合并

```bash
# 取消测试性 merge
git merge --abort

# 切回 main
git checkout main

# 使用 MCP 批准 PR
mcp_io_github_git_pull_request_review_write(
  pr_number: <N>,
  event: "APPROVE",
  body: "✅ Local build, tests, and lint all pass. No conflicts."
)

# 使用 MCP 合并 PR（squash 保持历史清洁）
mcp_io_github_git_merge_pull_request(
  pr_number: <N>,
  merge_method: "squash"
)
```

---

### 路径 B：有冲突 → 本地解决后合并

#### B1. 简单冲突（文档、配置文件）

```bash
# 取消测试性 merge
git merge --abort

# checkout PR 分支
git checkout pr-<N>

# rebase 到最新 main
git rebase origin/main

# 解决冲突（编辑冲突文件）
# 对于文档冲突：保留两者内容或选择更新的版本
# 对于配置冲突：合并两者的配置项

git add <resolved-files>
git rebase --continue

# 推送解决后的分支
git push origin pr-<N>:refs/heads/<branch-name> --force-with-lease
```

#### B2. 复杂冲突（源代码逻辑冲突）

```bash
# checkout PR 分支
git checkout pr-<N>

# 查看冲突详情
git diff HEAD origin/main -- <conflicted-file>

# 手动编辑解决冲突
# 原则：
#   - 保留 PR 中的新功能逻辑
#   - 保留 main 中的其他改动
#   - 不能简单选择 --ours 或 --theirs

# 解决后重新测试
npm run build && npm test && npm run lint

# 提交解决结果
git add .
git commit -m "fix: resolve merge conflicts with main"
git push origin HEAD --force-with-lease
```

#### B3. 解决后执行合并

```bash
# 等待 CI 重新运行（如果 push 触发了新的 CI）
# 然后使用 MCP 合并
mcp_io_github_git_merge_pull_request(
  pr_number: <N>,
  merge_method: "squash"
)
```

---

## ✅ 审查检查清单

本地 Agent 在批准前需验证：

### 自动化验证（CI 已完成）
- [ ] Build 通过
- [ ] Lint 通过
- [ ] 所有测试通过
- [ ] 测试覆盖率 >= 80%

### 本地验证（本地 Agent 执行）
- [ ] `npm ci && npm run build` 成功
- [ ] `npm test` 全部通过
- [ ] `npm run lint` 无错误

### 代码审查（MCP 读取 PR 后检查）
- [ ] 实现了 issue 中的所有要求
- [ ] 无 `console.log()` 或 `debugger`
- [ ] 无 `any` 类型
- [ ] 有 JSDoc 注释
- [ ] 错误处理完整
- [ ] CHANGELOG.md 已更新
- [ ] Commit 消息符合规范

---

## 🚨 需要请求修改的情况

如果发现以下问题，使用 MCP 请求远程 Agent 修改：

```bash
mcp_io_github_git_pull_request_review_write(
  pr_number: <N>,
  event: "REQUEST_CHANGES",
  body: "具体说明需要修改的内容..."
)
```

触发条件：
- 测试覆盖率不足
- 缺少错误处理
- 安全漏洞（如路径遍历、SSRF）
- 未实现 issue 中的某个要求

---

## 📋 合并后的收尾工作

```bash
# 1. 更新本地 main
git checkout main
git pull origin main

# 2. 验证合并结果
git log --oneline -3
npm test

# 3. 清理本地临时分支
git branch -d pr-<N>

# 4. 更新 SESSION_SNAPSHOT.md
# 将已完成的 issue 标记为 ✅
# 更新"下一步"为下一个 issue
```

---

## 💡 决策参考

| 情况 | 行动 |
|------|------|
| CI 通过 + 本地验证通过 + 无冲突 | 直接批准并合并 |
| CI 通过 + 本地验证通过 + 简单冲突 | 本地 rebase 解决后合并 |
| CI 通过 + 本地验证通过 + 复杂冲突 | 本地手动解决后合并 |
| CI 失败 | 等待远程 Agent 修复，或本地 checkout 修复后 push |
| 代码质量问题 | REQUEST_CHANGES，让远程 Agent 修复 |
| 功能缺失 | REQUEST_CHANGES，说明缺失的需求 |

---

**最后更新**: 2026-02-20  
**维护者**: Local Agent (GitHub Copilot in VS Code)
