// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://kajilab.net/',
  integrations: [sitemap()],
  image: {
    domains: ['img.esa.io'],
  },
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use '@/styles/modules' as *;`,
        },
      },
    },
  },
  devToolbar: {
    enabled: false,
  },
});
