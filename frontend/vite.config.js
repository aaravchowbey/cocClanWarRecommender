// File: vite.config.js
// Purpose: Vite configuration enabling React fast refresh via the official plugin.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
