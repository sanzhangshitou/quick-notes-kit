# 轻记工具箱

轻记工具箱是一个基于 Electron、Vue 3 和 TypeScript 构建的本地桌面工具箱，面向 Windows 优先场景。它把本地记事本、动态验证码、格式转换和常用开发辅助工具整合到一个轻量应用里，支持托盘常驻、安装包分发和自动更新。

## 当前功能

- 本地记事本：SQLite 存储、自动保存、标签、导出
- 二次验证码：TOTP 管理、复制验证码、备份导入导出
- 数据转换：时间戳、JSON / PHP 数组、JSON 格式化、Base64、URL
- 开发辅助：正则测试、哈希校验、文本统计
- 常用工具：单位换算、颜色转换
- 桌面能力：托盘菜单、窗口隐藏/恢复、Windows 安装包、自动更新

## 技术栈

- Electron 39
- Vue 3
- TypeScript
- Vite / electron-vite
- electron-builder
- electron-updater
- ESLint + Prettier

## 目录结构

```text
src/
  main/                         主进程、托盘、自动更新、IPC、SQLite
  preload/                      安全桥接 API 与类型声明
  renderer/
    src/
      components/tools/         各个工具页面
      data/                     工具元数据
      assets/                   全局样式
      App.vue                   首页与功能页入口
build/                          各平台打包图标资源
resources/                      运行时资源，如托盘图标
out/                            构建输出
dist/                           默认打包产物
dist-release/                   独立验证时生成的发布包
```

## 开发命令

```bash
pnpm install        # 安装依赖
pnpm dev            # 启动开发环境
pnpm start          # 预览构建结果
pnpm lint           # ESLint 校验
pnpm typecheck      # TypeScript 校验
pnpm build          # 生产构建
pnpm build:win      # 生成 Windows 安装包
```

提交前建议至少执行：

```bash
pnpm lint
pnpm build
```

## 自动更新发布流程

自动更新使用 `electron-updater`，发布源为阿里云 OSS：

`https://qigede.oss-cn-shenzhen.aliyuncs.com/auto-updates`

发布新版时：

1. 修改 `package.json` 中的 `version`
2. 执行 `pnpm build:win`
3. 上传 `dist/` 中的这三个文件到 OSS 前缀目录：
   - `latest.yml`
   - `quick-notes-kit-x.y.z-setup.exe`
   - `quick-notes-kit-x.y.z-setup.exe.blockmap`
4. 建议最后再上传 `latest.yml`，避免客户端先读到新版本描述但安装包尚未就绪

## 本地数据与安全

- 记事本和 TOTP 数据保存在 Electron `userData` 目录
- 常见文件为 `notes.sqlite` 和 `totp.sqlite`
- TOTP 导入时会自动忽略重复账户
- 当前密钥为本地存储，未额外加密，不要提交真实数据或备份文件

## 开发约定

- 系统能力、数据库和 IPC 放在 `src/main/`
- 渲染进程只通过 `src/preload/` 暴露的 API 与主进程交互
- 新工具页面放在 `src/renderer/src/components/tools/`
- 需要文件系统、托盘、自动更新或 SQLite 时，再进入主进程实现

## 常见问题

### 首页版本号或更新提示不对

版本号和更新状态来自主进程。如果你刚修改版本或更新配置，先重新执行 `pnpm build` 或重新打包测试。

### Windows 图标没有立即更新

Windows 可能缓存旧图标。关闭应用、取消固定任务栏图标后重新启动，通常就会刷新。

### 目前有自动化测试吗

当前没有独立测试框架，主要依赖 `pnpm lint`、`pnpm typecheck` 和 `pnpm build` 做校验。
