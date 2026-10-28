import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    server: { host: '127.0.0.1', port: 5173, strictPort: true,
      proxy: { '/api': { target: env.API_PROXY_TARGET || 'http://127.0.0.1:3001', changeOrigin: true } },
    },
    preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  };
});
