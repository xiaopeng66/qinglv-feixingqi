import { defineConfig } from 'vite'

// base: './' 使用相对路径，确保打包后能在 Capacitor WebView 的 file:// 协议下正确加载资源
export default defineConfig({
  base: './',
  server: {
    port: 5173,
    host: true
  }
})
