---
agent: agent
description: Launch the specdd-kit wizard (install deps, bundle, dev server, open browser)
---

# /specdd-launch

Launch the **specdd-kit** wizard locally.

1. Verify Node.js 20+ is installed (`node --version`).
2. From the repo root, install everything once: `npm install`.
3. Bundle the kit files: `npm run bundle-kit -w sdd-kit-wizard`.
4. Start the dev server: `npm run dev -w sdd-kit-wizard`.
5. Open the printed Astro URL (default `http://localhost:4321`) in Microsoft Edge.
6. Report the final URL, or surface any errors verbatim (do not hide failures).
