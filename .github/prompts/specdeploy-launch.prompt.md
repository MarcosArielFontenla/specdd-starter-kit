---
agent: agent
description: Launch the specdeploy-kit wizard (install deps, bundle providers, dev server, open browser)
---

# /specdeploy-launch

Launch the **specdeploy-kit** wizard locally.

1. Verify Node.js 20+ is installed (`node --version`).
2. Change to `specdeploy-kit/website`.
3. Install dependencies: `npm install`.
4. Bundle the providers: `npm run bundle-providers`.
5. Start the dev server: `npm run dev`.
6. Open the printed Astro URL (default `http://localhost:4323`) in Microsoft Edge.
7. Report the final URL, or surface any errors verbatim (do not hide failures).
