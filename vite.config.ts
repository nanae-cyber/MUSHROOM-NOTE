import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-192.png", "icon-512.png"],
      manifest: {
        name: "Kinoko Field Notes",
        short_name: "KinokoNotes",
        start_url: "/",
        display: "standalone",
        background_color: "#0b0f14",
        theme_color: "#0ea5e9",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: { cacheName: "images", expiration: { maxEntries: 200 } },
          },
        ],
      },
    }),
  ],

  // 開発サーバー（LANアクセス用）
  server: {
    host: true,
    port: 5173,
    cors: true,
  },

  // ★ 本番プレビュー（`npm run preview`）で
  //    クラウドフレアの https トンネルを許可する
  preview: {
    host: true,
    port: 4173, // 既定
    strictPort: true,
    // ここがポイント（どちらかでOK）
    // 1) 特定ドメインだけ許可
    // allowedHosts: ['street-reid-nuclear-equally.trycloudflare.com'],
    // 2) trycloudflare のサブドメイン全部を許可（こちら推奨）
    allowedHosts: [".trycloudflare.com"],
  },
});
