# PR 合并前检查清单

This checklist is used to validate Copilot PRs before merging into main branch.

## 📋 自动检查项 (Automated)

通过GitHub Actions自动验证：

- [ ] ✅ Build passes: `npm run build`
- [ ] ✅ Linting passes: `npm run lint`
- [ ] ✅ Format check passes: `npm run format:check`
- [ ] ✅ Tests pass: `npm test`
- [ ] ✅ No merge conflicts
- [ ] ✅ Branch is up-to-date with main

## 🤔 代码审查 (Code Review)

由主要贡献者手动审查：

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

## 🔍 功能测试 (Functional Testing)

在合并前进行手动测试：

- [ ] 在本地检出代码并构建成功
- [ ] 所有声明的特性正确工作
- [ ] 没有regression（现有功能仍正常）
- [ ] 错误消息清晰有帮助
- [ ] UI响应迅速，没有卡顿

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

## 🎯 合并步骤

1. **使用 squash merge** 保持历史清晰：
   ```bash
   gh pr merge <PR_NUMBER> --squash
   ```

2. **验证合并成功**：
   ```bash
   git log --oneline main | head -5
   ```

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
