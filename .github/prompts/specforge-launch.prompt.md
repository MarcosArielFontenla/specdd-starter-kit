---
agent: agent
description: Launch the specforge-kit wizard (install deps, bundle skills, dev server, open browser)
---

# /specforge-launch

Launch the **specforge-kit** wizard locally.

1. Verify Node.js 20+ is installed (`node --version`).
2. From the repo root, install everything once: `npm install`.
3. Bundle the skills: `npm run bundle-skills -w specforge-wizard`.
4. Start the dev server: `npm run dev -w specforge-wizard`.
5. Open the printed Astro URL (default `http://localhost:4322`) in Microsoft Edge.
6. Report the final URL, or surface any errors verbatim (do not hide failures).
