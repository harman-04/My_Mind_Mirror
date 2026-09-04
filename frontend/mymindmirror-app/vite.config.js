//import { defineConfig } from "vite";
//import react from "@vitejs/plugin-react";
//import tailwindcss from "@tailwindcss/vite";
//import { VitePWA } from "vite-plugin-pwa";
//import crypto from "node:crypto";
//
//if (!crypto.hash) {
//  crypto.hash = (algo, content) => {
//    return crypto.createHash(algo).update(content).digest("hex");
//  };
//}
//
//export default defineConfig(({ mode }) => ({
//  define: {
//    global: "window",
//  },
//  plugins: [
//    react({ jsxRuntime: 'automatic' }),
//    tailwindcss(),
//    mode === 'production' && VitePWA({
//      registerType: "autoUpdate",
//      manifestFilename: "manifest.json",
//      includeAssets: ["icon.png", "og-image.png"],
//      manifest: {
//        name: "MyMindMirror",
//        short_name: "MyMindMirror",
//        description: "AI-Powered Journaling & Personal Growth",
//        theme_color: "#1E1A3E",
//        background_color: "#1E1A3E",
//        display: "standalone",
//        start_url: "/",
//        icons: [
//          { src: "/icon.png", sizes: "192x192", type: "image/png" },
//          { src: "/icon.png", sizes: "512x512", type: "image/png" }
//        ]
//      },
//      workbox: {
//        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
//        globIgnores: ["**/icon.png", "**/logo.png"],
//        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
//        runtimeCaching: [
//          {
//            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
//            handler: "CacheFirst",
//            options: {
//              cacheName: "google-fonts-cache",
//              expiration: {
//                maxEntries: 10,
//                maxAgeSeconds: 60 * 60 * 24 * 365
//              }
//            }
//          },
//          {
//            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
//            handler: "CacheFirst",
//            options: {
//              cacheName: "gstatic-fonts-cache",
//              expiration: {
//                maxEntries: 10,
//                maxAgeSeconds: 60 * 60 * 24 * 365
//              }
//            }
//          }
//        ]
//      }
//    }),
//  ],
//
//  // 🚀 PHASE 6: ENTERPRISE BUILD CHUNKING
//  build: {
//    target: 'esnext',
//    minify: 'terser',
//    cssCodeSplit: true,
//    rollupOptions: {
//      output: {
//        manualChunks(id) {
//          if (id.includes('node_modules')) {
//            // Core React (Loads instantly on every page)
//            if (id.includes('react/') || id.includes('react-dom/') || id.includes('react-router')) {
//              return 'react-core';
//            }
//            // Heavy Charting Libraries (Only loads when a user opens a dashboard)
//            if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
//              return 'chart-vendor';
//            }
//            // Heavy Animation Libraries
//            if (id.includes('framer-motion')) {
//              return 'framer-vendor';
//            }
//            // Schedule & Calendar Tools
//            if (id.includes('react-big-calendar') || id.includes('date-fns')) {
//              return 'calendar-vendor';
//            }
//            // Data Management Tools
//            if (id.includes('@tanstack')) {
//              return 'tanstack-vendor';
//            }
//            // Everything else
//            return 'vendor';
//          }
//        }
//      }
//    }
//  },
//
//  test: {
//    globals: true,
//    environment: "jsdom",
//    setupFiles: "./src/test/setup.js",
//    css: true,
//  },
//}));

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import crypto from "node:crypto";

if (!crypto.hash) {
  crypto.hash = (algo, content) => {
    return crypto.createHash(algo).update(content).digest("hex");
  };
}

export default defineConfig(({ mode }) => ({
  define: {
    global: "window",
  },
  plugins: [
    react({ jsxRuntime: 'automatic' }),
    tailwindcss(),
    mode === 'production' && VitePWA({
      registerType: "autoUpdate",
      manifestFilename: "manifest.json",
      includeAssets: ["icon.png", "og-image.png"],
      manifest: {
        name: "MyMindMirror",
        short_name: "MyMindMirror",
        description: "AI-Powered Journaling & Personal Growth",
        // 🌟 AESTHETIC UPGRADE: Synced PWA OS colors to your new #131127 dark background!
        theme_color: "#131127",
        background_color: "#131127",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon.png", sizes: "192x192", type: "image/png" },
          { src: "/icon.png", sizes: "512x512", type: "image/png" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        globIgnores: ["**/icon.png", "**/logo.png"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          }
        ]
      }
    }),
  ],

  // 🌟 PERFORMANCE UPGRADE: Strips all console.logs in production automatically!
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },

  // 🚀 PHASE 6: ENTERPRISE BUILD CHUNKING
  build: {
    target: 'esnext',
    // 🌟 PERFORMANCE UPGRADE: Removed 'terser' minification. Vite uses 'esbuild' by default which builds 10x faster.
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000, // Silences Vite's arbitrary 500kb warning since we explicitly split our chunks
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Core React (Loads instantly on every page)
            if (id.includes('react/') || id.includes('react-dom/') || id.includes('react-router')) {
              return 'react-core';
            }
            // 🌟 PERFORMANCE UPGRADE: Isolated PDF generation tools! These are massive and would block the initial page load.
            if (id.includes('jspdf') || id.includes('file-saver') || id.includes('html2canvas')) {
              return 'export-vendor';
            }
            // Heavy Charting Libraries (Only loads when a user opens a dashboard)
            if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
              return 'chart-vendor';
            }
            // Heavy Animation Libraries
            if (id.includes('framer-motion')) {
              return 'framer-vendor';
            }
            // Schedule & Calendar Tools
            if (id.includes('react-big-calendar') || id.includes('date-fns')) {
              return 'calendar-vendor';
            }
            // Data Management Tools
            if (id.includes('@tanstack')) {
              return 'tanstack-vendor';
            }
            // Everything else
            return 'vendor';
          }
        }
      }
    }
  },

  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
    css: true,
  },
}));