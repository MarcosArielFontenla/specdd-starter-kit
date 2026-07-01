---
agent: agent
description: Launch the specdd-kit wizard (install deps, bundle, dev server, open browser)
---

# /specdd-launch

Launch the **specdd-kit** wizard locally.

1. Verify Node.js 20+ is installed (`node --version`).
2. Change to `specdd-kit/website`.
3. Install dependencies: `npm install`.
4. Bundle the kit files: `npm run bundle-kit`.
5. Start the dev server: `npm run dev`.
6. Open the printed Astro URL (default `http://localhost:4321`) in Microsoft Edge.
7. Report the final URL, or surface any errors verbatim (do not hide failures).
