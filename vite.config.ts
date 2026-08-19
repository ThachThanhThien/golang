import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages serves project sites under /<repo>/, so the production build needs
// a matching base path. CI sets BASE_PATH (e.g. "/react/"); local dev and build
// default to "/". Everything that fetches assets goes through import.meta.env.BASE_URL
// (see src/core/services/asset.ts), so setting base here is enough.
// `process` is provided by Node when Vite evaluates this config; declare it minimally
// so the file type-checks without adding @types/node to the project.
declare const process: { env: Record<string, string | undefined> };

// https://vite.dev/config/
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
});
