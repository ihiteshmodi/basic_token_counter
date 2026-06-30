import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base: './' makes built asset paths relative so Electron can load them via file://
export default defineConfig({
  base: './',
  plugins: [react()],
})
