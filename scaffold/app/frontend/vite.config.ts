import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
// Ports come from the central registry (slot {{project.slot}}). Browser tests run the API on {{project.ports.e2eApi}} so a local dev server can keep {{project.ports.api}}.
const api = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:{{project.ports.api}}';
export default defineConfig({
  plugins: [tailwindcss()],
  server: { port: {{project.ports.vite}}, strictPort: true, proxy: { '/api': api } },
});
