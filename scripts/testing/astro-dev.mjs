// Playwright owns this foreground process. Astro's CLI can detach automatically
// in agent environments, making webServer exit before the test suite starts.
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const workspaceRequire = createRequire(resolve(process.cwd(), 'package.json'));
const { dev } = await import(pathToFileURL(workspaceRequire.resolve('astro')).href);
const server = await dev({ root: process.cwd(), vite: { server: { strictPort: true } } });
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await server.stop();
}
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
