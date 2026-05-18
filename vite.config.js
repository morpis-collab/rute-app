import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiPort = env.RUTE_API_PORT || env.PORT || '4321'

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'RUTE Cash Tracer',
          short_name: 'RUTE',
          description: 'Sistem Manajemen Usaha Kopi',
          theme_color: '#faf6ef',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'rute-logo.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'rute-logo.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
      }),
    ],
    server: {
      proxy: {
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
  }
})
