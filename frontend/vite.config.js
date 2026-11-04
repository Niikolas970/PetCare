import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // El backend permite CORS desde http://localhost:5173
  server: { port: 5173, strictPort: true },
});
