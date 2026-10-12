import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import netlify from '@astrojs/netlify';

export default defineConfig({
  integrations: [react()],
  output: 'server',
  adapter: netlify({ cacheOnDemandPages: false, imageCDN: false, devFeatures: { environmentVariables: false, images: false, edgeFunctions: true } }),
  site: 'https://cozy-gnome-o2.netlify.app',
  vite: {
    plugins: [tailwindcss()],
  },
});
