# PR 合并前检查清单

**模式**: 🤖 **完全自动化** - Agent 使用 GitHub MCP 工具自动验证所有项

This checklist is automatically validated by Copilot Agent before merging PRs.

## 📋 自动检查项 (Automated via GitHub Actions)

通过 GitHub Actions 自动验证：

- [ ] ✅ Build passes: `npm run build`
- [ ] ✅ Linting passes: `npm run lint`
- [ ] ✅ Format check passes: `npm run format:check`
- [ ] ✅ Tests pass: `npm test`
- [ ] ✅ No merge conflicts
- [ ] ✅ Branch is up-to-date with main

## 🤖 Agent 自动代码审查

**Agent 使用 `mcp_io_github_git_pull_request_read` 读取 PR 并自动验证：**

### 功能实现
- [ ] 代码实现了issue中指定的所有要求
- [ ] 没有多余的代码或"dead code"
- [ ] 代码遵循项目编码标准
- [ ] 变量名清晰易懂
- [ ] 函数/类有适当的文档注释

### 代码质量
- [ ] 没有 `console.log()` 或 `debugger` 语句
- [ ] 没有硬编码的值或"magic numbers"
- [ ] 适当处理错误和边界情况
- [ ] 没有安全漏洞或不安全的模式
- [ ] 性能无问题（没有无限循环等）

### 测试
- [ ] 添加了新功能的单元测试
- [ ] 所有新测试都通过
- [ ] 编写了集成测试(如果需要)
- [ ] 测试覆盖率 >= 80%
- [ ] 没有跳过的测试 (`skip()`, `todo()`)

### 国际化和可访问性
- [ ] 所有用户界面文本都是可本地化的
- [ ] 没有硬编码的特定语言文本
- [ ] 代码支持不同的语言环境

### 安全问题
- [ ] 没有暴露敏感信息（密钥、密码等）
- [ ] 输入验证正确
- [ ] 防御常见的Web攻击（SQL注入、XSS等）
- [ ] 依赖项版本是安全的

### 文档和Changelog
- [ ] README更新了（如果有API改动）
- [ ] CHANGELOG.md已更新
- [ ] 内联代码注释清晰
- [ ] JSDoc/TypeDoc注释，对于公共API

### Git历史
- [ ] Commit消息清晰有意义
- [ ] Commit历史逻辑清晰（不都是"fix"或"update"）
- [ ] 没有大的二进制文件被意外提交

## 🔍 功能测试 (Automated Testing)

**通过自动化测试验证（无需人工）：**

- [ ] 单元测试覆盖所有新功能
- [ ] 集成测试通过
- [ ] 没有 regression（现有测试仍通过）
- [ ] 错误处理测试完整
- [ ] 边界情况已测试

## 📦 打包和分发

如果是发布版本：

- [ ] 版本号已更新 (patch/minor/major)
- [ ] 所有构件可以生成（.vsix for VS Code）
- [ ] README中的版本号已更新
- [ ] GitHub Release标签已创建

## ✅ 最终检查

- [ ] PR描述清晰准确
- [ ] PR标题遵循规范 `[type]: description`
- [ ] 所有对话已解决
- [ ] 没有待处理的反馈
- [ ] 代码已准备好合并

## 🎯 Agent 自动合并流程

**Agent 完全自动化执行以下步骤：**

1. **读取 PR** 使用 `mcp_io_github_git_pull_request_read`:
   ```
   Agent 读取 PR 详情、文件变更、检查状态
   ```

2. **自动审查** 使用 `mcp_io_github_git_pull_request_review_write`:
   ```
   Agent 验证所有清单项，提交审查评论
   ```

3. **自动批准** 如果所有检查通过:
   ```
   mcp_io_github_git_pull_request_review_write(event: "APPROVE")
   ```

4. **自动合并** 使用 `mcp_io_github_git_merge_pull_request`:
   ```
   Agent 执行 squash merge，自动关闭相关 issue
   ```

5. **继续下一个** Agent 自动选择下一个优先级 issue 并重复流程

## 💡 人工参与（可选）

人工监督是**可选的**，仅用于：
- 审查 Agent 的工作质量（学习目的）
- 处理 Agent 无法自动解决的边缘情况

**正常情况下，Agent 完全自主运行，无需人工干预。**

3. **更新本地main**：
   ```bash
   git checkout main
   git pull origin main
   ```

4. **如果是版本发布**，标记release：
   ```bash
   git tag -a v<version> -m "Release v<version>"
   git push origin v<version>
   ```

## 📞 联系方式

对于合并相关的问题，请：
- 在PR中评论
- 参考相关的GitHub issue
- 提供具体的重现步骤（如果是问题）

---

**最后更新**: 2026-02-20

**下一步**: 一旦所有检查完成，可以安全地合并PR到main分支。
