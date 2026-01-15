import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  publicDir: 'public',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'assets/audio/*.{mp3,ogg}'],
      manifest: {
        name: 'Ambient Sound Player',
        short_name: 'Soundscape',
        description: 'Minimalist ambient sound player for relaxation and focus.',
        theme_color: '#E8F4F8',
        background_color: '#FAFAFA',
        display: 'standalone',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,mp3,ogg,json}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'audio',
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 Days
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  build: {
    target: 'esnext'
  }
});
