import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: true,
  },
  // This tells Vite to serve files from the root
  root: '.',
  publicDir: 'public',
});