import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Относительные пути: сборка работает и на GitHub Pages (/agro-shift/), и в любой папке на хостинге
  base: './',
  plugins: [react()],
})
