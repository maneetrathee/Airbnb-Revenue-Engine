import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "apple-touch-icon.svg", "neighbourhoods.geojson"],
      manifest: {
        name: "RevEngine — Airbnb Revenue Intelligence",
        short_name: "RevEngine",
        description: "AI-powered Airbnb pricing and market intelligence for London hosts",
        theme_color: "#FF385C",
        background_color: "#111827",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
          {
            src: "pwa-192x192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
          },
          {
            src: "pwa-512x512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
          },
        ],
        shortcuts: [
          {
            name: "Market Intel",
            url: "/market",
            description: "RevPAR & occupancy data",
          },
          {
            name: "My Properties",
            url: "/properties",
            description: "Manage your properties",
          },
          {
            name: "Competitor Monitor",
            url: "/competitors",
            description: "Track competitor pricing",
          },
        ],
        screenshots: [],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.neon\.tech\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
          {
            urlPattern: /^https:\/\/.*onrender\.com\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "render-api-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 300 },
            },
          },
          {
            urlPattern: /^https:\/\/.*basemaps\.cartocdn\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "map-tiles-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 86400 },
            },
          },
        ],
      },
    }),
  ],
});
