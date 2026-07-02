import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [react()],
  server: { port: 4320 },
  devToolbar: { enabled: false },
  vite: {
    ssr: { noExternal: ['@specdd/ui', 'sdd-kit-wizard', 'specforge-wizard', 'specdeploy-wizard'] },
  },
});
