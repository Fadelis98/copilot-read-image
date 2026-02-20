# 🔬 Local Testing & Debugging Guide for VS Code Extension

## 📌 概述

This guide explains how to locally test and debug the copilot-read-image VS Code extension in development mode.

VS Code提供**Extension Development Host**机制，允许您在隔离的VS Code窗口中实时测试扩展。

---

## 🚀 快速开始 - 5分钟启动本地测试

### 前提条件
```bash
# 1. 确保项目依赖已安装
npm install

# 2. 确保扩展可以构建
npm run build
```

### 第一次启动扩展（调试模式）

#### 方式1: 使用VS Code UI（推荐）
1. 打开项目根目录的 **VS Code 窗口A**（现在就是）
2. 按 **F5** 或选择 Run → Start Debugging
3. 自动弹出 **VS Code Extension Development Host 窗口B**（新窗口，已加载扩展）
4. 在窗口B中打开Copilot Chat，三个工具应该可用
5. 切回窗口A可见调试输出和设置断点

#### 方式2: 使用命令行
```bash
# 在项目目录
code --extensionDevelopmentPath=. 
```
这会在新终端启动VS Code实例，加载当前项目作为扩展。

---

## 🛠️ VS Code配置详解

### `.vscode/launch.json` - 调试配置
我们提供了3个测试场景：

#### 1️⃣ **Extension Development Host** (默认)
```json
{
  "name": "Extension Development Host",
  "type": "extensionHost",
  "request": "launch",
  "preLaunchTask": "npm: build"  // 自动构建
}
```
**用途**: 最完整的开发设置
- 自动构建TypeScript
- 加载所有扩展
- 可设置断点
- **快捷键**: F5

**工作流**:
1. 按 F5 启动
2. 等待自动构建（几秒钟）
3. 新的VS Code窗口打开，已加载扩展

---

#### 2️⃣ **Extension Development Host (No Build)**
```json
{
  "name": "Extension Development Host (No Build)",
  "request": "launch"  // 不自动构建
}
```
**用途**: 当您已经构建过，想快速重启扩展
- 跳过构建步骤（加快启动）
- **快捷键**: F5，然后选择此配置

**使用场景**:
```bash
# 已经修改并构建了代码
npm run build

# 快速重启扩展测试
# 按F5 → 选择 "Extension Development Host (No Build)"
```

---

#### 3️⃣ **Extension Tests**
```json
{
  "name": "Extension Tests",
  "args": [..., "--extensionTestsPath=${workspaceFolder}/tests"]
}
```
**用途**: 运行单元测试
- 在Extension Host中运行jest测试
- 可调试测试代码

**使用场景**:
```bash
# 运行测试并允许在断点处停止
# 按F5 → 选择 "Extension Tests"
```

---

### `.vscode/tasks.json` - 构建任务
定义了所有npm脚本作为可运行的任务：

| 任务名 | 对应命令 | 快捷键 |
|--------|----------|--------|
| npm: build | npm run build | Ctrl+Shift+B |
| npm: test | npm test | - |
| npm: lint | npm run lint | - |
| Watch TypeScript | npm run build:watch | - |

**运行方式**:
```bash
# Ctrl+Shift+P 打开命令面板
# 输入 "Run Task" 或 "Tasks: Run Task"
# 选择任务名称

# 或使用快捷键
Ctrl+Shift+B  # 运行默认build任务
```

---

### `.vscode/settings.json` - 编辑器设置
- TypeScript/JSON格式化
- ESLint自动修复
- Prettier集成
- 使用工作区的TypeScript版本

### `.vscode/extensions.json` - 推荐扩展
推荐安装以优化开发体验：
- ESLint - 代码检查
- Prettier - 代码格式化
- Jest - 测试集成
- TypeScript Next - 最新TS支持

**安装方式**:
```
在VS Code中打开此项目
→ 左下角会提示安装推荐扩展
→ 点击"安装所有"
```

---

## 📋 完整的测试流程

### 场景1: 开发新功能（典型流程）

```bash
# 1. 启动文件监听构建
npm run build:watch
# → TypeScript自动编译（后台）

# 2. 按F5启动调试
# → VS Code Development Host窗口打开
# → 扩展自动加载

# 3. 在Development Host中测试
# → 打开Copilot Chat
# → 测试图像工具
# → 查看输出和日志

# 4. 修改代码
# → build:watch自动检测到变更
# → 自动重新编译
# → (可能需要在主窗口按F5重新加载)

# 5. 重复测试
# → 在Development Host中...
```

### 场景2: 修复Bug快速循环

```bash
# 1. 已启动npm run build:watch

# 2. 代码有错误，窗口A中看到编译错误

# 3. 修复错误

# 4. build:watch自动重新编译

# 5. 在Development Host窗口（窗口B）
#    按 Ctrl+R 或 Cmd+R 重新加载扩展
#     → 立即测试修复

# 6. 如果仍有问题，继续修复
```

### 场景3: 调试工具代码

```bash
# 1. 按F5启动Debug Host

# 2. 在src/extension.ts或工具代码中设置断点
#    点击行号左边，应该出现红点

# 3. 在Development Host窗口测试工具调用

# 4. 代码执行到断点处停止

# 5. 在窗口A中可以：
#    - 查看变量值 (Variables面板)
#    - 单步执行 (F10: Step Over, F11: Step Into)
#    - 查看调用栈 (Call Stack面板)

示例：调试readImageFromPath工具
─────────────────────────────────
1. src/tools/readImageFromPath.ts 第15行设置断点
2. 在Development Host的Copilot中使用readImageFromPath工具
3. 触发断点，检查参数值和filePath是否正确
4. 单步执行验证逻辑
```

---

## 🔍 调试技巧

### 查看扩展输出

在Development Host中，打开Output面板查看扩展日志：
```bash
Ctrl+Shift+U  # 打开Output面板
# 下拉菜单选择 "copilot-read-image" 或 "Extension Host"
```

### 使用debugger语句
在代码中添加：
```typescript
debugger;  // 会在此处暂停（如果开启调试）
```

### 检查扩展是否加载

在Development Host的Developer Tools中：
```
Ctrl+Shift+K  # 打开Developer Tools
→ Console标签
→ 输入: vscode.extensions.getExtension('fadelis98.copilot-read-image')
→ 如果返回对象，说明扩展成功加载
```

### 重新加载扩展

在Development Host中，不需要关闭窗口，直接reload：
```
Ctrl+I (或 Cmd+I on Mac)
# 或者 VS Code命令面板 → "Developer: Reload Windows"
```

---

## 🧪 测试工具功能

### 测试场景1: 测试readImageFromPath工具
```
1. 在Development Host中打开一个文件夹 (File → Open Folder)
2. 打开Copilot Chat (Ctrl+Shift+I 或 Chat icon)
3. 使用提示：
   "@readImageFromPath /path/to/image.png"
   或者让Copilot主动选择工具
4. 观察：
   - 工具是否出现在可用工具列表中
   - Copilot是否能调用它
   - 返回的图像数据格式是否正确
```

### 测试场景2: 测试imgFromBase64工具
```
1. 在Copilot中提供Base64编码的图像：
   "@imgFromBase64 data:image/png;base64,iVBORw0KGgo..."
2. 观察：
   - Base64是否正确解码
   - MIME类型是否正确识别
```

### 测试场景3: 测试imgFromUrl工具
```
1. 在Copilot中提供图像URL：
   "@imgFromUrl https://example.com/image.png"
2. 观察：
   - URL是否成功获取
   - 防SSRF检查是否工作
   - Content-Type检查是否工作
   - 超时是否正确处理
```

---

## 🚨 常见问题

### ❌ 按F5没有反应

**症状**: 按F5但没有启动Debug Host

**解决**:
```bash
# 1. 检查是否安装了必要的npm包
npm list @types/vscode

# 2. 尝试手动启动
npm run build
code --extensionDevelopmentPath=.

# 3. 如果还是不行，检查launch.json配置
# 确保.vscode/launch.json存在并有效
cat .vscode/launch.json
```

### ❌ Development Host窗口启动但扩展没加载

**症状**: 在Development Host中看不到工具

**解决**:
```bash
# 1. 检查构建是否成功
npm run build
# 查看是否有 dist/extension.js

# 2. 在Development Host中打开Developer Tools
Ctrl+Shift+K
# 查看console中是否有错误

# 3. 确保package.json的main字段指向dist/extension.js
cat package.json | grep '"main"'

# 4. 检查activationEvents
cat package.json | grep -A 5 '"activationEvents"'
```

### ❌ 修改代码后Development Host没有更新

**症状**: 代码改了但测试看不到变化

**解决**:
```bash
# 1. 确保npm run build:watch在运行
#    或者手动运行: npm run build

# 2. 在Development Host中重新加载
#    Ctrl+R 或通过命令面板

# 3. 如果还是不行，关闭Development Host窗口
#    在主窗口按F5重新启动整个调试
```

### ❌ "activationEvent" 错误

**症状**: 扩展启动但激活事件没触发

**解决**:
```bash
# 确保package.json中有:
"activationEvents": [
  "onLanguageModel"  // 或其他需要的事件
]

# 且extension.ts中有activate函数:
export function activate(context: vscode.ExtensionContext) {
  // 注册工具...
}
```

---

## 📊 开发vs Production

| 方面 | 开发（F5） | 生产（vsix） |
|------|-----------|-----------|
| 加载方式 | 从源代码加载 | 从.vsix包加载 |
| 修改代码后 | 快速重新加载 | 需要重新打包 |
| 调试 | 完全调试支持 | 受限的调试 |
| 性能 | 正常 | 优化过 |
| 发布 | N/A | 发布到Marketplace |

---

## 🎯 测试检查清单

在提交PR之前，使用本地调试验证：

- [ ] 扩展加载时no errors in console
- [ ] 所有工具在Copilot中可见
- [ ] readImageFromPath工具可以读取本地文件
- [ ] imgFromBase64工具可以解码Base64
- [ ] imgFromUrl工具可以从URL获取图像
- [ ] 错误处理正常工作（非常见的文件等）
- [ ] 返回的图像数据格式正确（LanguageModelDataPart）
- [ ] 没有浏览器错误或警告（DevTools console）
- [ ] TypeScript编译无errors
- [ ] 单元测试全部通过 (npm test)
- [ ] 代码通过linting (npm run lint)

---

## 🔗 快速参考

```bash
# 开发工作流
npm install              # 初次设置
npm run build:watch     # 后台监听构建
# 然后按F5启动Debug Host

# 常用快捷键
F5                      # 启动/重启调试
Ctrl+B                  # 切换侧边栏
Ctrl+J                  # 切换底部面板
Ctrl+Shift+U            # 打开Output面板
Ctrl+Shift+K            # 打开Developer Tools
Ctrl+R (in DevHost)     # 重新加载扩展  
Ctrl+Shift+B            # 运行build任务

# 故障排除
npm run build           # 手动构建
npm test                # 运行单元测试
npm run lint            # 代码检查
npm run format:check    # 格式检查
```

---

## 📚 了解更多

- [VS Code Extension Development](https://code.visualstudio.com/api)
- [Debugging Extensions](https://code.visualstudio.com/api/working-with-extensions/debugging-extensions)  
- [Testing Extensions](https://code.visualstudio.com/api/working-with-extensions/testing-extensions)
- [Language Models in Copilot](https://code.visualstudio.com/api/extension-guides/language-model)

---

**Last Updated**: 2026-02-20  
**Status**: ✅ Ready for Local Testing  

🎉 **现在您可以在本地完整地开发和测试VS Code扩展！**
