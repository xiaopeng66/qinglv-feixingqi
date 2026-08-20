# 情侣飞行棋

一款面向两人的本地互动棋盘游戏。掷骰子、完成任务、触发特殊格，先抵达终点的一方获胜。棋盘任务可按双方分别编辑，并支持导入、导出任务包。

## 功能

- 48 格环形棋盘，含起点、终点和普通任务格
- 前进、后退、暂停、重摇等特殊格
- 双方独立任务文案与完成标记
- 可选倒计时任务和游戏音效
- 自定义任务编辑，以及 JSON 任务包导入、导出
- 可作为网页运行，也可打包为 Android App

## 快速开始

需要 Node.js 18 或更高版本。

```powershell
npm install
npm run dev
```

打开终端显示的本地地址即可开始游戏。

## 验证与构建

```powershell
# 注册表测试与核心游戏逻辑冒烟测试
npm test

# 构建网页产物到 dist/
npm run build
```

## Android 构建

项目使用 Capacitor 6 和 Android Gradle Wrapper。先构建网页资源，再同步到 Android 工程并构建 APK：

```powershell
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

生成的调试 APK 位于 `android/app/build/outputs/apk/debug/`。正式分发前，请在 Android Studio 或 Gradle 中配置自己的签名密钥，并构建已签名的 release APK 或 AAB。

## 安装发行版

在 GitHub 的 Releases 页面下载对应版本的 `qinglv-feixingqi-v1.0.2-debug.apk`，传到 Android 设备后打开安装。该文件是调试签名包，Android 可能要求确认允许来自该来源的安装；请仅从本仓库的发行版页面下载。

## 项目结构

```text
src/                 网页游戏源码
src/app/             应用入口、启动页、游戏注册与挂载宿主
src/games/           各游戏的独立会话模块
src/views/           游戏与任务编辑界面
src/store.js          游戏状态和规则
src/taskPack.js       任务包导入、导出
android/              Capacitor Android 工程
smoke-test.mjs        核心逻辑冒烟测试
```

## 架构与新增游戏

应用使用 Vite、原生 ES Modules 与 Capacitor 6。飞行棋已通过游戏注册表、独立会话和独立存档命名空间与应用入口隔离；以后新增游戏不需要修改飞行棋规则或视图。具体约定见 [docs/ADDING_GAMES.md](docs/ADDING_GAMES.md)。

## 数据与隐私

游戏数据只保存在当前设备浏览器的本地存储中。任务包由用户主动导入或导出，项目不提供服务器同步功能。

## 版本

当前版本为 `v1.0.2`。具体更新内容见 [CHANGELOG.md](CHANGELOG.md)。
