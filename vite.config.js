import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      strict: false // Vite'in katı dosya yolu kontrolünü gevşetir
    }
  }
})
