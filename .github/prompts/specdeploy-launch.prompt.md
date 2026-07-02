---
agent: agent
description: Launch the specdeploy-kit wizard (install deps, bundle providers, dev server, open browser)
---

# /specdeploy-launch

Launch the **specdeploy-kit** wizard locally.

1. Verify Node.js 20+ is installed (`node --version`).
2. From the repo root, install everything once: `npm install`.
3. Bundle the providers: `npm run bundle-providers -w specdeploy-wizard`.
4. Start the dev server: `npm run dev -w specdeploy-wizard`.
5. Open the printed Astro URL (default `http://localhost:4323`) in Microsoft Edge.
6. Report the final URL, or surface any errors verbatim (do not hide failures).
