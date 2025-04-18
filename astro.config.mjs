// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkImgToMarkdown from './src/plugins/img-to-markdown';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://kajilab.net/',
  integrations: [sitemap()],

  markdown: {
    remarkPlugins: [remarkImgToMarkdown],
  },

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

  adapter: cloudflare({
    routes: {
      extend: {
        include: [
          {
            pattern: '/teapot',
          },
        ],
      },
    },
  }),

  experimental: {
    session: true,
  },
});
