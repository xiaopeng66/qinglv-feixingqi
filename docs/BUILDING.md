# 构建说明

所有命令都在仓库根目录运行。不要手动在 `android/` 目录运行 `npx cap sync`，因为 Capacitor 配置和网页产物都位于根目录。

```powershell
# 网页构建与 Android 网页资源同步
npm run android:sync

# 完整构建：网页构建、同步、Android Debug APK 与 release/ 归档
npm run android:build

# 发布前验证：测试后执行完整 Android 构建
npm run release:prepare
```

`scripts/android.mjs` 固定了两个工作目录：Capacitor 在仓库根目录执行，Gradle Wrapper 在 `android/` 执行。构建完成后，APK 会以版本号命名并复制到 `release/`；该目录被 Git 忽略，不会把二进制产物混入源码提交。
